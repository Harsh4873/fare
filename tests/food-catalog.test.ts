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

  it('matches brand plus item name across fields', () => {
    const { menus } = searchLocalCatalog('chipotle guacamole', { usda: records });
    expect(menus.some((entry) => entry.brand === 'Chipotle' && /guacamole/i.test(entry.name))).toBe(true);
  });

  it('finds pantry mac and cheese for the everyday phrase', () => {
    const { menus } = searchLocalCatalog('mac and cheese', { usda: records });
    expect(menus.some((entry) => /macaroni and cheese/i.test(entry.name))).toBe(true);
  });

  it('still returns pizza when an unknown chain name is in the query', () => {
    const { menus, usda } = searchLocalCatalog('dominos pizza', { usda: records });
    const pizza = [...menus, ...usda].find((entry) => /pizza/i.test(entry.name));
    expect(pizza).toBeDefined();
    expect(pizza?.brand).not.toMatch(/domino/i);
  });

  it('finds cheese pizza for Costco-style queries without claiming Costco', () => {
    const { menus, usda } = searchLocalCatalog('costco pizza', { usda: records });
    expect([...menus, ...usda].some((entry) => /pizza/i.test(entry.name))).toBe(true);
    expect([...menus, ...usda].some((entry) => /costco/i.test(entry.name) || /costco/i.test(entry.brand ?? ''))).toBe(false);
  });

  it('finds macaroni and cheese for Panera-style queries without claiming Panera', () => {
    const { menus, usda } = searchLocalCatalog('panera mac and cheese', { usda: records });
    const mac = [...menus, ...usda].find((entry) => /macaroni and cheese/i.test(entry.name));
    expect(mac).toBeDefined();
    expect(/panera/i.test(mac?.name ?? '') || /panera/i.test(mac?.brand ?? '')).toBe(false);
  });
});
