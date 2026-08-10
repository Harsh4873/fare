import { describe, expect, it } from 'vitest';
import {
  DISH_TEMPLATES,
  GENERIC_FOODS,
  RESTAURANTS,
  allFoods,
  expandTemplate,
  foodById,
  restaurantById,
  searchPool,
} from '../src/breakdown/data';
import type { BreakdownFood } from '../src/breakdown/types';

const NUTRITION_KEYS = [
  'calories',
  'proteinG',
  'carbsG',
  'fatG',
  'saturatedFatG',
  'fiberG',
  'sugarG',
  'sodiumMg',
] as const;

function assertPlausible(food: BreakdownFood) {
  for (const key of NUTRITION_KEYS) {
    const value = food.nutrition[key];
    expect(Number.isFinite(value), `${food.id}.${key} must be finite`).toBe(true);
    expect(value, `${food.id}.${key} must be >= 0`).toBeGreaterThanOrEqual(0);
  }
  const { calories, proteinG, carbsG, fatG, saturatedFatG, sugarG } = food.nutrition;
  const derived = 4 * proteinG + 4 * carbsG + 9 * fatG;
  const tolerance = Math.max(30, calories * 0.35);
  expect(
    Math.abs(calories - derived),
    `${food.id} calories ${calories} vs macro-derived ${derived}`,
  ).toBeLessThanOrEqual(tolerance);
  expect(saturatedFatG, `${food.id} saturated fat exceeds fat`).toBeLessThanOrEqual(fatG + 0.1);
  expect(sugarG, `${food.id} sugar exceeds carbs`).toBeLessThanOrEqual(carbsG + 0.1);
  expect(calories, `${food.id} calories implausibly high`).toBeLessThanOrEqual(1500);
}

describe('breakdown catalog integrity', () => {
  it('ships the five launch restaurants', () => {
    expect(RESTAURANTS.map((restaurant) => restaurant.id).sort()).toEqual(
      ['cava', 'chipotle', 'salata', 'subway', 'sweetgreen'],
    );
    for (const restaurant of RESTAURANTS) {
      expect(restaurant.items.length).toBeGreaterThanOrEqual(25);
      expect(restaurant.categories.length).toBeGreaterThanOrEqual(4);
      expect(restaurant.nutritionUrl).toMatch(/^https:\/\//);
      expect(restaurant.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('keeps every food id unique across the whole catalog', () => {
    const ids = allFoods().map((food) => food.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps restaurant items inside their restaurant categories with official provenance', () => {
    for (const restaurant of RESTAURANTS) {
      for (const item of restaurant.items) {
        expect(item.restaurantId, `${item.id} restaurantId`).toBe(restaurant.id);
        expect(item.id.startsWith(`${restaurant.id}-`), `${item.id} slug prefix`).toBe(true);
        expect(restaurant.categories, `${item.id} category ${item.category}`).toContain(item.category);
        expect(item.sourceType).toBe('restaurant-official');
        expect(item.confidence).toBe('high');
        expect(item.servingLabel.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps generic foods USDA-labelled with medium confidence', () => {
    expect(GENERIC_FOODS.length).toBeGreaterThanOrEqual(40);
    for (const food of GENERIC_FOODS) {
      expect(food.restaurantId).toBeUndefined();
      expect(food.id.startsWith('generic-'), `${food.id} slug prefix`).toBe(true);
      expect(food.sourceType).toBe('usda-generic');
      expect(food.confidence).toBe('medium');
      expect(food.servingGrams, `${food.id} servingGrams`).toBeGreaterThan(0);
    }
  });

  it('keeps every nutrition value plausible', () => {
    for (const food of allFoods()) assertPlausible(food);
  });

  it('pins the spec-contract Salata values', () => {
    const salata = restaurantById('salata');
    expect(salata).toBeDefined();
    const byName = (needle: string) =>
      salata?.items.find((item) => item.name.toLowerCase().includes(needle));
    expect(byName('cool cucumber')?.nutrition.calories).toBe(280);
    expect(byName('falafel')?.nutrition.calories).toBe(130);
    expect(byName('spicy chipotle ranch')?.nutrition.calories).toBe(220);
    expect(byName('avocado')?.nutrition.calories).toBe(70);
    expect(byName('edamame')?.nutrition.calories).toBe(25);
  });

  it('covers the marquee menu items used in examples', () => {
    const names = (id: string) =>
      restaurantById(id)?.items.map((item) => item.name.toLowerCase()) ?? [];
    expect(names('subway').some((name) => name.includes('italian herbs'))).toBe(true);
    expect(names('subway').some((name) => name.includes('veggie patty'))).toBe(true);
    expect(names('subway').some((name) => name.includes('chipotle southwest'))).toBe(true);
    expect(names('chipotle').some((name) => name.includes('guacamole'))).toBe(true);
    expect(names('cava').some((name) => name.includes('hummus'))).toBe(true);
    expect(names('sweetgreen').some((name) => name.includes('avocado'))).toBe(true);
  });

  it('keeps dish templates referentially intact and expandable', () => {
    expect(DISH_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    for (const template of DISH_TEMPLATES) {
      expect(template.components.length).toBeGreaterThanOrEqual(2);
      for (const part of template.components) {
        expect(foodById(part.foodId), `${template.id} references ${part.foodId}`).toBeDefined();
        expect(part.quantity).toBeGreaterThan(0);
      }
      const expanded = expandTemplate(template);
      expect(expanded.length).toBe(template.components.length);
      for (const component of expanded) {
        expect(component.food.sourceType).toBe('reconstruction');
        expect(component.food.confidence).toBe('low');
      }
    }
  });

  it('builds search pools with the in-context restaurant first', () => {
    const pool = searchPool('salata');
    const firstGenericIndex = pool.findIndex((food) => food.id.startsWith('generic-'));
    const lastSalataIndex = pool.map((food) => food.restaurantId).lastIndexOf('salata');
    expect(firstGenericIndex).toBeGreaterThan(lastSalataIndex);
    expect(searchPool(undefined).every((food) => food.id.startsWith('generic-'))).toBe(true);
  });
});
