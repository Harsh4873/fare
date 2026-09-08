import type { UsualSuggestion } from '../memory';
import type { NutritionProvenance } from '../model';
import { fieldScore } from './search';
import type { CatalogFood } from './types';

export type FoodSearchResult =
  | { kind: 'usual'; key: string; score: number; suggestion: UsualSuggestion }
  | { kind: 'catalog'; key: string; score: number; item: CatalogFood };

function identity(provenance: NutritionProvenance, barcode?: string): string | undefined {
  if (barcode) return `barcode:${barcode}`;
  if (!provenance.externalId) return undefined;
  if (provenance.kind === 'open-food-facts') return `barcode:${provenance.externalId}`;
  return `${provenance.kind}:${provenance.externalId}`;
}

/** One relevance scale for every provider, with bounded bonuses for personal habits. */
export function rankFoodResults(query: string, usuals: readonly UsualSuggestion[], catalog: readonly CatalogFood[]): FoodSearchResult[] {
  if (!query.trim()) return [];
  const seen = new Set<string>();
  const results: FoodSearchResult[] = [];
  for (const suggestion of usuals) {
    const food = suggestion.food;
    const score = fieldScore(suggestion.name, suggestion.brand ?? '', food?.aliases ?? suggestion.meal?.aliases ?? [], query);
    if (score === undefined) continue;
    const key = food ? identity(food.provenance, food.barcode) : undefined;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    const { frequency, recency, meal, pinned } = suggestion.breakdown;
    results.push({ kind: 'usual', key: `usual:${suggestion.id}`, suggestion,
      score: score + Math.min(55, frequency + recency + meal + pinned) });
  }
  for (const item of catalog) {
    const key = identity(item.provenance, item.barcode) ?? item.id;
    if (seen.has(key)) continue;
    const score = fieldScore(item.name, item.brand ?? '', item.aliases ?? [], query);
    if (score === undefined) continue;
    seen.add(key);
    results.push({ kind: 'catalog', key: `catalog:${key}`, score, item });
  }
  return results.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}
