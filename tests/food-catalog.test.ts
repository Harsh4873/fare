import { describe, expect, it } from 'vitest';
import {
  headingName,
  searchLocalCatalog,
  searchUsdaRecords,
} from '../src/food-catalog/search';
import type { UsdaFoodRecord } from '../src/food-catalog/types';
import usdaFoods from '../src/food-catalog/usda-foods.json';

const records = usdaFoods as UsdaFoodRecord[];

describe('USDA catalog search', () => {
  it('returns a typical banana portion instead of mashed-cup weights', () => {
    const results = searchUsdaRecords(records, 'banana', 8);
    expect(results[0]?.name).toMatch(/banana/i);
    expect(results[0]?.serving.label).toMatch(/banana/i);
    expect(results[0]?.nutritionPerServing.calories).toBeGreaterThan(80);
    expect(results[0]?.provenance.kind).toBe('usda');
  });

  it('finds generic chicken breast with a plate-sized serving', () => {
    const results = searchUsdaRecords(records, 'chicken breast', 8);
    expect(results.some((item) => /chicken breast/i.test(item.name))).toBe(true);
    const breast = results.find((item) => /skin not eaten/i.test(item.name)) ?? results[0];
    expect(breast?.serving.quantity).toBeGreaterThan(80);
    expect(breast?.nutritionPerServing.proteinG).toBeGreaterThan(20);
  });

  it('keeps pantry banana ahead of the USDA raw banana duplicate', () => {
    const { menus, usda } = searchLocalCatalog('banana', { usda: records });
    expect(menus.some((item) => item.name === 'Banana')).toBe(true);
    expect(usda.some((item) => headingName(item.name) === 'banana')).toBe(false);
  });

  it('finds Chipotle menu items for the restaurants lane', () => {
    const { menus } = searchLocalCatalog('barbacoa', { usda: records });
    const item = menus.find((entry) => entry.brand === 'Chipotle' && /barbacoa/i.test(entry.name));
    expect(item?.provenance.kind).toBe('restaurant-guide');
  });
});
