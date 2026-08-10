/**
 * Local persistence for saved Breakdown meal variants, plus the bridge that
 * turns an analyzed meal into a diary-ready nutrition snapshot.
 *
 * Variants are deliberately device-local (localStorage) rather than synced:
 * they are working documents, not diary history. Logging a meal writes an
 * ordinary immutable Fare entry snapshot through the existing store.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  createId,
  createNutritionSnapshot,
  type NutritionSnapshot,
} from '../model';
import { roundNutrition } from '../nutrition';
import type {
  BreakdownFood,
  BreakdownMeal,
  Confidence,
  MealAnalysis,
  MealComponent,
} from './types';

const STORAGE_KEY = 'fare-breakdown-v1';
export const BREAKDOWN_MEAL_LIMIT = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseFood(value: unknown): BreakdownFood | undefined {
  if (!isRecord(value)) return undefined;
  const nutrition = value.nutrition;
  if (!isRecord(nutrition)) return undefined;
  const keys = ['calories', 'proteinG', 'carbsG', 'fatG', 'saturatedFatG', 'fiberG', 'sugarG', 'sodiumMg'] as const;
  if (keys.some((key) => !isFiniteNumber(nutrition[key]) || (nutrition[key] as number) < 0)) return undefined;
  const sourceTypes = ['restaurant-official', 'usda-generic', 'reconstruction', 'estimate'];
  const confidences: Confidence[] = ['high', 'medium', 'low'];
  if (
    typeof value.id !== 'string' || !value.id ||
    typeof value.name !== 'string' || !value.name ||
    typeof value.category !== 'string' || !value.category ||
    typeof value.servingLabel !== 'string' || !value.servingLabel ||
    typeof value.sourceType !== 'string' || !sourceTypes.includes(value.sourceType) ||
    typeof value.sourceName !== 'string' || !value.sourceName ||
    typeof value.confidence !== 'string' || !confidences.includes(value.confidence as Confidence)
  ) return undefined;
  return {
    id: value.id,
    name: value.name,
    restaurantId: typeof value.restaurantId === 'string' ? value.restaurantId : undefined,
    category: value.category,
    servingLabel: value.servingLabel,
    servingGrams: isFiniteNumber(value.servingGrams) && value.servingGrams > 0 ? value.servingGrams : undefined,
    nutrition: Object.fromEntries(keys.map((key) => [key, nutrition[key] as number])) as unknown as BreakdownFood['nutrition'],
    sourceType: value.sourceType as BreakdownFood['sourceType'],
    sourceName: value.sourceName,
    sourceUrl: typeof value.sourceUrl === 'string' ? value.sourceUrl : undefined,
    confidence: value.confidence as Confidence,
    lastVerified: typeof value.lastVerified === 'string' ? value.lastVerified : undefined,
    tags: Array.isArray(value.tags) ? (value.tags.filter((tag) => typeof tag === 'string') as BreakdownFood['tags']) : undefined,
    aliases: Array.isArray(value.aliases) ? value.aliases.filter((alias): alias is string => typeof alias === 'string') : undefined,
    portionOptions: Array.isArray(value.portionOptions) ? value.portionOptions.filter(isFiniteNumber) : undefined,
  };
}

function parseComponent(value: unknown): MealComponent | undefined {
  if (!isRecord(value)) return undefined;
  const food = parseFood(value.food);
  if (!food) return undefined;
  if (typeof value.id !== 'string' || !value.id) return undefined;
  if (!isFiniteNumber(value.quantity) || value.quantity <= 0 || value.quantity > 50) return undefined;
  return { id: value.id, food, quantity: value.quantity };
}

/** Defensive parse of persisted variants; silently drops anything malformed. */
export function parseBreakdownMeals(raw: unknown): BreakdownMeal[] {
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.meals)) return [];
  const meals: BreakdownMeal[] = [];
  for (const value of raw.meals) {
    if (!isRecord(value)) continue;
    if (typeof value.id !== 'string' || !value.id) continue;
    if (typeof value.name !== 'string' || !value.name.trim()) continue;
    if (typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') continue;
    if (!Array.isArray(value.components)) continue;
    const components = value.components.map(parseComponent).filter((item): item is MealComponent => Boolean(item));
    if (!components.length) continue;
    meals.push({
      id: value.id,
      name: value.name,
      restaurantId: typeof value.restaurantId === 'string' ? value.restaurantId : undefined,
      components,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    });
  }
  return meals.slice(0, BREAKDOWN_MEAL_LIMIT);
}

function readStoredMeals(): BreakdownMeal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return parseBreakdownMeals(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeStoredMeals(meals: readonly BreakdownMeal[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, meals }));
  } catch {
    /* storage may be full or unavailable; variants are conveniences, not history */
  }
}

export interface BreakdownMealStore {
  savedMeals: readonly BreakdownMeal[];
  saveMeal: (name: string, components: readonly MealComponent[], restaurantId?: string) => BreakdownMeal;
  deleteMeal: (id: string) => void;
}

export function useBreakdownMeals(): BreakdownMealStore {
  const [savedMeals, setSavedMeals] = useState<readonly BreakdownMeal[]>(readStoredMeals);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setSavedMeals(readStoredMeals());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const saveMeal = useCallback((name: string, components: readonly MealComponent[], restaurantId?: string) => {
    const now = new Date().toISOString();
    const meal: BreakdownMeal = {
      id: createId('bmeal'),
      name: name.trim() || 'Saved breakdown',
      restaurantId,
      components: components.map((component) => ({ ...component })),
      createdAt: now,
      updatedAt: now,
    };
    setSavedMeals((current) => {
      const next = [meal, ...current].slice(0, BREAKDOWN_MEAL_LIMIT);
      writeStoredMeals(next);
      return next;
    });
    return meal;
  }, []);

  const deleteMeal = useCallback((id: string) => {
    setSavedMeals((current) => {
      const next = current.filter((meal) => meal.id !== id);
      writeStoredMeals(next);
      return next;
    });
  }, []);

  return { savedMeals, saveMeal, deleteMeal };
}

/**
 * Converts an analyzed Breakdown meal into an immutable diary snapshot.
 * Provenance stays honest: estimated components are listed as warnings and
 * anything below high confidence downgrades the recorded data quality.
 */
export function buildDiarySnapshot(
  name: string,
  analysis: MealAnalysis,
): NutritionSnapshot {
  const totals = roundNutrition(analysis.totals, 1);
  const estimated = analysis.contributions
    .filter((contribution) => contribution.component.food.confidence !== 'high')
    .map((contribution) => contribution.component.food.name);
  const warnings: string[] = [];
  if (estimated.length) {
    const shown = estimated.slice(0, 3).join(', ');
    const extra = estimated.length > 3 ? ` and ${estimated.length - 3} more` : '';
    warnings.push(`Estimated components: ${shown}${extra}.`);
  }
  if (analysis.calorieRange.low !== analysis.calorieRange.high) {
    warnings.push(
      `Calories may range ${analysis.calorieRange.low}-${analysis.calorieRange.high} kcal depending on portions.`,
    );
  }
  return createNutritionSnapshot({
    name: name.trim() || 'Breakdown meal',
    serving: { quantity: 1, unit: 'meal', label: '1 meal' },
    servings: 1,
    nutritionPerServing: totals,
    nutrition: totals,
    provenance: {
      kind: 'manual',
      providerName: 'Fare Breakdown',
      dataQuality: analysis.confidence === 'high' ? 'complete' : 'partial',
      warnings,
    },
  });
}
