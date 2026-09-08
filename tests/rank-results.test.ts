import { describe, expect, it } from 'vitest';
import { rankFoodResults } from '../src/food-catalog/rank-results';
import { rankUsuals } from '../src/memory';
import { createStarterState, type Food } from '../src/model';
import type { CatalogFood } from '../src/food-catalog/types';

const now = '2026-09-08T12:00:00.000Z';
const nutrition = { calories: 100, proteinG: 4, carbsG: 12, fatG: 4, saturatedFatG: 0, fiberG: 1, sugarG: 1, sodiumMg: 10 };
function item(id: string, name: string, kind: CatalogFood['provenance']['kind'] = 'usda'): CatalogFood {
  return { id, name, serving: { quantity: 100, unit: 'g', label: '100 g' }, nutritionPerServing: nutrition,
    provenance: { kind, externalId: id, providerName: kind, dataQuality: 'complete', warnings: [] }, categories: [] };
}
function saved(catalog: CatalogFood): Food {
  return { ...catalog, aliases: [], id: `saved-${catalog.id}`, pinned: false, createdAt: now, updatedAt: now };
}

describe('unified food results', () => {
  it('ranks by relevance across providers instead of grouping by source', () => {
    const results = rankFoodResults('rice', [], [item('1', 'Rice with lentils'), item('2', 'Rice', 'fatsecret'), item('3', 'Rice bowl', 'open-food-facts')]);
    expect(results.map((result) => result.kind === 'catalog' && result.item.name)).toEqual(['Rice', 'Rice bowl', 'Rice with lentils']);
  });
  it('uses logging frequency to lift a regular food among comparable matches', () => {
    const state = createStarterState(now);
    const regular = saved(item('regular', 'Rice bowl'));
    state.foods.push(regular);
    for (let i = 0; i < 8; i++) state.entries.push({ id: `entry-${i}`, createdAt: now, updatedAt: now, consumedAt: now,
      dateKey: '2026-09-08', mealSlot: 'lunch', origin: 'food', foodId: regular.id,
      snapshot: { ...regular, servings: 1, nutrition } });
    const usuals = rankUsuals(state, { query: 'rice', dateKey: '2026-09-08', mealSlot: 'lunch' });
    const results = rankFoodResults('rice', usuals, [item('new', 'Rice cake')]);
    expect(results[0].kind).toBe('usual');
    expect(results[0].key).toBe('usual:saved-regular');
  });
  it('keeps exact matches above weak partial matches even with a habit bonus', () => {
    const state = createStarterState(now);
    state.foods.push({ ...saved(item('frequent', 'Rice cake with peanut butter')), pinned: true });
    const usuals = rankUsuals(state, { query: 'rice', dateKey: '2026-09-08' });
    expect(rankFoodResults('rice', usuals, [item('exact', 'Rice')])[0].key).toBe('catalog:usda:exact');
  });
  it('shows an already-saved product once without replacing its nutrition snapshot', () => {
    const state = createStarterState(now);
    const catalog = item('12345678', 'Rice crackers', 'open-food-facts');
    const food = { ...saved(catalog), barcode: '12345678' };
    state.foods.push(food);
    const results = rankFoodResults('rice', rankUsuals(state, { query: 'rice', dateKey: '2026-09-08' }), [{ ...catalog, nutritionPerServing: { ...nutrition, calories: 999 } }]);
    expect(results).toHaveLength(1);
    expect(results[0].kind === 'usual' && results[0].suggestion.food?.nutritionPerServing.calories).toBe(100);
  });
  it('preserves different products and serving sizes with the same name', () => {
    expect(rankFoodResults('rice', [], [item('1', 'Rice'), { ...item('2', 'Rice', 'fatsecret'), serving: { quantity: 1, unit: 'cup', label: '1 cup' } }])).toHaveLength(2);
  });
  it('finds saved foods when the query spans brand and name', () => {
    const state = createStarterState(now);
    state.foods.push({ ...saved(item('1', 'Rice')), brand: 'Example Kitchen' });
    expect(rankUsuals(state, { query: 'Example rice', dateKey: '2026-09-08' })).toHaveLength(1);
  });
  it('drops unrelated old-query products and blank searches', () => {
    expect(rankFoodResults('tofu', [], [item('1', 'Rice')])).toEqual([]);
    expect(rankFoodResults('', [], [item('1', 'Rice')])).toEqual([]);
  });
});
