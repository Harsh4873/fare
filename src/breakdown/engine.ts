/**
 * Breakdown's pure calculation engine.
 *
 * Everything here is deterministic arithmetic over structured data: totals,
 * per-component contribution shares, protein/fiber efficiency, calorie
 * density, honest uncertainty ranges, and rule-generated insights. No AI is
 * ever responsible for a nutrition number.
 */

import { EMPTY_NUTRITION, type Nutrition } from '../model';
import { addNutrition, scaleNutrition } from '../nutrition';
import {
  CALORIE_RANGE_FACTORS,
  METRIC_KEYS,
  worstConfidence,
  type ComponentContribution,
  type Confidence,
  type Insight,
  type MealAnalysis,
  type MealComponent,
  type MetricKey,
} from './types';

const NUTRITION_KEYS = [
  'calories',
  'proteinG',
  'carbsG',
  'fatG',
  'saturatedFatG',
  'fiberG',
  'sugarG',
  'sodiumMg',
] as const satisfies readonly (keyof Nutrition)[];

/** kcal per gram thresholds: water-rich foods sit low, oils and nuts high. */
export function densityLabelFor(kcalPerGram: number): 'low' | 'medium' | 'high' {
  if (kcalPerGram < 1.5) return 'low';
  if (kcalPerGram <= 4) return 'medium';
  return 'high';
}

/**
 * Per-key signed difference (after minus before). Deliberately avoids
 * addNutrition/scaleNutrition, which clamp negatives to zero.
 */
export function diffNutrition(before: Nutrition, after: Nutrition): Nutrition {
  return Object.fromEntries(
    NUTRITION_KEYS.map((key) => [key, after[key] - before[key]]),
  ) as unknown as Nutrition;
}

/** '+220', '-220', or '±0' for values that round away to nothing. */
export function formatSigned(value: number, digits = 0): string {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  if (rounded === 0) return '±0';
  const text = Math.abs(rounded).toLocaleString('en-US', {
    maximumFractionDigits: digits,
  });
  return rounded > 0 ? `+${text}` : `-${text}`;
}

export function confidenceCopy(confidence: Confidence): { label: string; description: string } {
  if (confidence === 'high') {
    return {
      label: 'High confidence',
      description: 'Official nutrition information or an exact product match.',
    };
  }
  if (confidence === 'medium') {
    return {
      label: 'Medium confidence',
      description: 'Nutrition source is reliable, but the portion size is estimated.',
    };
  }
  return {
    label: 'Low confidence',
    description: 'This value may vary substantially depending on preparation and serving size.',
  };
}

export function analyzeMeal(components: readonly MealComponent[]): MealAnalysis {
  const scaled = components.map((component) => ({
    component,
    nutrition: scaleNutrition(component.food.nutrition, component.quantity),
  }));
  const totals = scaled.length
    ? addNutrition(...scaled.map((entry) => entry.nutrition))
    : { ...EMPTY_NUTRITION };

  const contributions: ComponentContribution[] = scaled.map(({ component, nutrition }) => {
    const share = Object.fromEntries(
      METRIC_KEYS.map((key) => [key, totals[key] > 0 ? nutrition[key] / totals[key] : 0]),
    ) as Record<MetricKey, number>;
    const proteinEfficiency = nutrition.calories > 0
      ? (nutrition.proteinG / nutrition.calories) * 100
      : 0;
    const fiberEfficiency = nutrition.calories > 0
      ? (nutrition.fiberG / nutrition.calories) * 100
      : 0;
    const grams = component.food.servingGrams;
    const calorieDensity = grams && grams > 0
      ? component.food.nutrition.calories / grams
      : undefined;
    return {
      component,
      nutrition,
      share,
      proteinEfficiency,
      fiberEfficiency,
      calorieDensity,
      densityLabel: calorieDensity === undefined ? undefined : densityLabelFor(calorieDensity),
    };
  });

  let low = 0;
  let high = 0;
  for (const { component, nutrition } of scaled) {
    const factors = CALORIE_RANGE_FACTORS[component.food.confidence];
    low += nutrition.calories * factors.low;
    high += nutrition.calories * factors.high;
  }

  return {
    totals,
    contributions,
    confidence: worstConfidence(components.map((component) => component.food.confidence)),
    calorieRange: { low: Math.round(low), high: Math.round(high) },
    hasEstimates: components.some((component) => component.food.confidence !== 'high'),
  };
}

function percent(share: number): number {
  return Math.round(share * 100);
}

function hasTag(contribution: ComponentContribution, tags: readonly string[]): boolean {
  return (contribution.component.food.tags ?? []).some((tag) => tags.includes(tag));
}

/**
 * Deterministic, rule-generated insights in priority order, capped at four.
 * An LLM may rephrase these later; it never invents the underlying numbers.
 */
export function buildInsights(analysis: MealAnalysis): readonly Insight[] {
  const { contributions, totals } = analysis;
  if (!contributions.length || totals.calories <= 0) return [];
  const insights: Insight[] = [];
  const byCalories = [...contributions].sort(
    (left, right) => right.nutrition.calories - left.nutrition.calories,
  );

  const top = byCalories[0];
  if (top.share.calories > 0.25) {
    const quantitySuffix = top.component.quantity !== 1 ? ` ×${top.component.quantity}` : '';
    insights.push({
      id: 'top-driver',
      title: 'Biggest calorie driver',
      body: `${top.component.food.name}${quantitySuffix} contributes ${Math.round(top.nutrition.calories)} kcal — about ${percent(top.share.calories)}% of this meal.`,
      tone: 'neutral',
    });
  }

  if (byCalories.length >= 3) {
    const topThree = byCalories.slice(0, 3);
    const combined = topThree.reduce((sum, entry) => sum + entry.share.calories, 0);
    if (combined >= 0.6) {
      const names = topThree.map((entry) => entry.component.food.name);
      insights.push({
        id: 'top-three',
        title: 'Three components set the total',
        body: `${names[0]}, ${names[1]}, and ${names[2]} together account for about ${percent(combined)}% of the calories.`,
        tone: 'neutral',
      });
    }
  }

  const sauceCalories = contributions
    .filter((entry) => hasTag(entry, ['sauce', 'dressing']))
    .reduce((sum, entry) => sum + entry.nutrition.calories, 0);
  if (sauceCalories / totals.calories > 0.2) {
    insights.push({
      id: 'sauce-heavy',
      title: 'Sauces are doing heavy lifting',
      body: `Dressings and sauces add ${Math.round(sauceCalories)} kcal — about ${percent(sauceCalories / totals.calories)}% of the meal.`,
      tone: 'warning',
    });
  }

  const lowPayoff = byCalories.find(
    (entry) => entry.nutrition.calories >= 200 && entry.proteinEfficiency < 2,
  );
  if (lowPayoff) {
    insights.push({
      id: 'low-protein-payoff',
      title: 'Low protein payoff',
      body: `${lowPayoff.component.food.name} brings ${Math.round(lowPayoff.nutrition.calories)} kcal but only ${Math.round(lowPayoff.nutrition.proteinG)} g protein.`,
      tone: 'warning',
    });
  }

  const plantFiber = contributions
    .filter((entry) => hasTag(entry, ['vegetable', 'legume']))
    .reduce((sum, entry) => sum + entry.nutrition.fiberG, 0);
  if (totals.fiberG >= 5 && plantFiber / totals.fiberG >= 0.5) {
    insights.push({
      id: 'plant-fiber',
      title: 'Fiber is coming from plants',
      body: `About ${percent(plantFiber / totals.fiberG)}% of the fiber comes from vegetables and legumes (${Math.round(plantFiber)} g of ${Math.round(totals.fiberG)} g).`,
      tone: 'positive',
    });
  }

  const workhorse = [...contributions]
    .filter((entry) => entry.nutrition.calories >= 50)
    .sort((left, right) => right.proteinEfficiency - left.proteinEfficiency)[0];
  if (workhorse && workhorse.proteinEfficiency >= 8) {
    insights.push({
      id: 'protein-workhorse',
      title: 'Protein workhorse',
      body: `${workhorse.component.food.name} delivers ${workhorse.proteinEfficiency.toFixed(1)} g protein per 100 kcal — the best in this meal.`,
      tone: 'positive',
    });
  }

  if (analysis.hasEstimates) {
    insights.push({
      id: 'estimates',
      title: 'Some values are estimates',
      body: 'At least one component is estimated, so totals are shown as a range rather than false precision.',
      tone: 'neutral',
    });
  }

  return insights.slice(0, 4);
}
