import { allFoods, restaurantById } from '../breakdown/data';
import type { BreakdownFood } from '../breakdown/types';
import type { Nutrition, NutritionDataQuality, NutritionProvenance } from '../model';
import type { CatalogFood, UsdaFoodRecord } from './types';

const USDA_SOURCE = 'https://fdc.nal.usda.gov/';

let usdaRecords: readonly UsdaFoodRecord[] | undefined;
let usdaLoad: Promise<readonly UsdaFoodRecord[]> | undefined;

export async function loadUsdaCatalog(): Promise<readonly UsdaFoodRecord[]> {
  if (usdaRecords) return usdaRecords;
  usdaLoad ??= import('./usda-foods.json').then((module) => {
    usdaRecords = module.default as UsdaFoodRecord[];
    return usdaRecords;
  });
  return usdaLoad;
}

export function usdaCatalogLoaded(): boolean {
  return usdaRecords !== undefined;
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function headingName(value: string): string {
  return normalizeSearchText(value.replace(/\(.*?\)/g, '').split(',')[0] ?? value);
}

function tokensFor(query: string): string[] {
  return normalizeSearchText(query).split(' ').filter((token) => token.length > 0);
}

function fieldScore(name: string, brand: string, aliases: readonly string[], query: string): number | undefined {
  const tokens = tokensFor(query);
  if (tokens.length === 0) return undefined;
  const fields = [normalizeSearchText(name), normalizeSearchText(brand), ...aliases.map(normalizeSearchText)];
  if (!fields.some((field) => tokens.every((token) => field.includes(token)))) return undefined;
  const nameText = normalizeSearchText(name);
  const joined = tokens.join(' ');
  let score = 12;
  if (nameText === joined) score += 80;
  else if (nameText.startsWith(joined)) score += 48;
  else if (headingName(name) === joined) score += 36;
  if (nameText.startsWith(tokens[0])) score += 8;
  score += Math.max(0, 28 - nameText.length * 0.35);
  return score;
}

function nutritionFromRecord(record: UsdaFoodRecord): Nutrition {
  return {
    calories: record.calories,
    proteinG: record.proteinG,
    carbsG: record.carbsG,
    fatG: record.fatG,
    saturatedFatG: record.saturatedFatG,
    fiberG: record.fiberG,
    sugarG: record.sugarG,
    sodiumMg: record.sodiumMg,
  };
}

export function usdaRecordToCatalog(record: UsdaFoodRecord): CatalogFood {
  return {
    id: `usda:${record.id}`,
    name: record.name,
    brand: 'USDA',
    serving: {
      quantity: record.quantity,
      unit: record.unit,
      label: record.label,
    },
    nutritionPerServing: nutritionFromRecord(record),
    provenance: {
      kind: 'usda',
      providerName: 'USDA FoodData Central',
      externalId: String(record.id),
      sourceUrl: `${USDA_SOURCE}food-details/${record.id}/nutrients`,
      dataQuality: 'complete',
      warnings: [
        'USDA survey food for a typical portion, not a package label. Slide the amount to match what you ate.',
      ],
    },
    categories: [record.category],
    aliases: record.originalName && record.originalName !== record.name ? [record.originalName] : [],
    detail: record.category,
  };
}

function qualityFor(confidence: BreakdownFood['confidence']): NutritionDataQuality {
  return confidence === 'high' ? 'verified' : confidence === 'medium' ? 'complete' : 'partial';
}

export function menuFoodToCatalog(food: BreakdownFood): CatalogFood {
  const restaurant = restaurantById(food.restaurantId);
  const official = food.sourceType === 'restaurant-official';
  const provenance: NutritionProvenance = {
    kind: official ? 'restaurant-guide' : 'usda',
    providerName: food.sourceName,
    externalId: food.id,
    sourceUrl: food.sourceUrl,
    dataQuality: qualityFor(food.confidence),
    warnings: official
      ? [`From the published ${restaurant?.name ?? 'restaurant'} nutrition guide.`]
      : ['Typical portion from USDA-derived pantry data. Slide the amount to match your plate.'],
  };
  return {
    id: food.id,
    name: food.name,
    brand: restaurant?.name ?? (official ? undefined : 'Pantry'),
    serving: {
      quantity: food.servingGrams && food.servingGrams > 0 ? food.servingGrams : 1,
      unit: food.servingGrams && food.servingGrams > 0 ? 'g' : 'serving',
      label: food.servingLabel,
    },
    nutritionPerServing: food.nutrition,
    provenance,
    categories: [food.category],
    aliases: food.aliases ?? [],
    detail: restaurant ? `${restaurant.name} · ${food.category}` : food.category,
  };
}

export function searchUsdaRecords(
  records: readonly UsdaFoodRecord[],
  query: string,
  limit = 12,
): CatalogFood[] {
  const scored = records.flatMap((record) => {
    const aliases = record.originalName ? [record.originalName, record.category] : [record.category];
    let score = fieldScore(record.name, '', aliases, query);
    if (score === undefined) return [];
    const original = record.originalName ?? '';
    if (/\bNS as to\b/i.test(original) || /,\s*NFS\b/i.test(original)) score += 6;
    if (/from fast food|from restaurant|from pre-cooked/i.test(original)) score -= 14;
    return [{ score, record }];
  });
  scored.sort((left, right) => right.score - left.score || left.record.name.localeCompare(right.record.name));
  return scored.slice(0, Math.max(1, limit)).map((entry) => usdaRecordToCatalog(entry.record));
}

export function searchMenuFoods(query: string, limit = 8): CatalogFood[] {
  const scored = allFoods().flatMap((food) => {
    const restaurant = restaurantById(food.restaurantId);
    const score = fieldScore(food.name, restaurant?.name ?? '', food.aliases ?? [], query);
    if (score === undefined) return [];
    return [{
      score: score + (food.sourceType === 'restaurant-official' ? 18 : 28),
      food,
    }];
  });
  scored.sort((left, right) => right.score - left.score || left.food.name.localeCompare(right.food.name));
  return scored.slice(0, Math.max(1, limit)).map((entry) => menuFoodToCatalog(entry.food));
}

export interface LocalCatalogResults {
  readonly menus: readonly CatalogFood[];
  readonly usda: readonly CatalogFood[];
}

export function searchLocalCatalog(
  query: string,
  options: { limit?: number; usda?: readonly UsdaFoodRecord[] } = {},
): LocalCatalogResults {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { menus: [], usda: [] };
  const menus = searchMenuFoods(trimmed, 8);
  const headings = new Set(menus.map((item) => headingName(item.name)));
  const records = options.usda ?? usdaRecords ?? [];
  const usda = searchUsdaRecords(records, trimmed, options.limit ?? 12)
    .filter((item) => !headings.has(headingName(item.name)));
  return { menus, usda };
}
