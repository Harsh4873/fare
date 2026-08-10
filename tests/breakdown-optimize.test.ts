import { describe, expect, it } from 'vitest';
import type { Nutrition } from '../src/model';
import { optimizeMeal } from '../src/breakdown/optimize';
import type {
  BreakdownFood,
  MealComponent,
  OptimizeGoals,
} from '../src/breakdown/types';

function nutrition(partial: Partial<Nutrition>): Nutrition {
  return {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    saturatedFatG: 0,
    fiberG: 0,
    sugarG: 0,
    sodiumMg: 0,
    ...partial,
  };
}

function food(
  id: string,
  name: string,
  values: Partial<Nutrition>,
  overrides: Partial<BreakdownFood> = {},
): BreakdownFood {
  return {
    id,
    name,
    category: 'Fixture',
    servingLabel: '1 serving',
    nutrition: nutrition(values),
    sourceType: 'restaurant-official',
    sourceName: 'Fixture guide',
    confidence: 'high',
    ...overrides,
  };
}

function component(id: string, item: BreakdownFood, quantity = 1): MealComponent {
  return { id, food: item, quantity };
}

/** The spec's Salata wrap: ~1,050 kcal with a double ranch. */
function salataWrap(): MealComponent[] {
  return [
    component('c-tortilla', food('f-tortilla', 'Cool Cucumber Tortilla', { calories: 280, proteinG: 8, carbsG: 45, fatG: 7, fiberG: 3 })),
    component('c-falafel', food('f-falafel', 'Falafel', { calories: 130, proteinG: 12, carbsG: 15, fatG: 6, fiberG: 4 })),
    component('c-ranch', food('f-ranch', 'Spicy Chipotle Ranch', { calories: 220, proteinG: 1, carbsG: 4, fatG: 22 }, { category: 'Dressings', restaurantId: 'salata', tags: ['dressing'] }), 2),
    component('c-avocado', food('f-avocado', 'Avocado', { calories: 70, proteinG: 1, carbsG: 4, fatG: 6, fiberG: 3 })),
    component('c-edamame', food('f-edamame', 'Edamame', { calories: 25, proteinG: 8, carbsG: 2, fatG: 1, fiberG: 2 })),
    component('c-beans', food('f-beans', 'Black Beans', { calories: 35, proteinG: 4, carbsG: 6, fiberG: 2 })),
    component('c-chickpeas', food('f-chickpeas', 'Chickpeas', { calories: 30, proteinG: 4, carbsG: 5, fiberG: 2 })),
    component('c-veggies', food('f-veggies', 'Mixed Vegetables', { calories: 40, proteinG: 2, carbsG: 8, fiberG: 3 })),
  ];
}

const BASE_GOALS: OptimizeGoals = {
  maxChanges: 2,
  lockedComponentIds: [],
  allowRemovals: true,
  allowQuantityChanges: true,
  allowSwaps: false,
};

describe('optimizeMeal', () => {
  it('solves the spec scenario: under 800 kcal while keeping protein', () => {
    const suggestions = optimizeMeal(salataWrap(), {
      ...BASE_GOALS,
      maxCalories: 800,
      minProteinG: 30,
    });
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(3);
    const best = suggestions[0];
    expect(best.meetsAllGoals).toBe(true);
    expect(best.totals.calories).toBeLessThanOrEqual(800);
    expect(best.totals.proteinG).toBeGreaterThanOrEqual(30);
    expect(best.delta.calories).toBeLessThan(0);
    const touchesRanch = suggestions.some((suggestion) =>
      suggestion.changes.some((change) => change.componentId === 'c-ranch'));
    expect(touchesRanch).toBe(true);
  });

  it('never touches locked components', () => {
    const suggestions = optimizeMeal(salataWrap(), {
      ...BASE_GOALS,
      maxCalories: 800,
      lockedComponentIds: ['c-ranch'],
    });
    for (const suggestion of suggestions) {
      expect(suggestion.changes.some((change) => change.componentId === 'c-ranch')).toBe(false);
    }
  });

  it('respects the change budget', () => {
    const suggestions = optimizeMeal(salataWrap(), {
      ...BASE_GOALS,
      maxCalories: 600,
      maxChanges: 1,
    });
    for (const suggestion of suggestions) {
      expect(suggestion.changes.length).toBe(1);
    }
  });

  it('increases protein-efficient components when protein is short', () => {
    const suggestions = optimizeMeal(salataWrap(), {
      ...BASE_GOALS,
      minProteinG: 45,
      allowRemovals: false,
    });
    expect(suggestions.length).toBeGreaterThan(0);
    const grew = suggestions.some((suggestion) =>
      suggestion.changes.some((change) =>
        change.kind === 'quantity' && (change.after?.quantity ?? 0) > change.before.quantity));
    expect(grew).toBe(true);
    expect(suggestions[0].totals.proteinG).toBeGreaterThan(40);
  });

  it('only swaps within the same shelf and honors required tags', () => {
    const ranch = salataWrap().find((entry) => entry.id === 'c-ranch');
    if (!ranch) throw new Error('fixture missing ranch');
    const pool: BreakdownFood[] = [
      food('f-lemon', 'Lemon Vinaigrette', { calories: 60, fatG: 6 }, { category: 'Dressings', restaurantId: 'salata', tags: ['dressing', 'vegan', 'vegetarian'] }),
      food('f-caesar', 'Caesar', { calories: 150, fatG: 15 }, { category: 'Dressings', restaurantId: 'salata', tags: ['dressing', 'vegetarian'] }),
      food('f-other-restaurant', 'Other Ranch', { calories: 10 }, { category: 'Dressings', restaurantId: 'cava', tags: ['dressing', 'vegan'] }),
      food('f-wrong-shelf', 'Falafel Light', { calories: 90 }, { category: 'Proteins', restaurantId: 'salata', tags: ['vegan'] }),
    ];
    const suggestions = optimizeMeal([ranch], {
      ...BASE_GOALS,
      maxCalories: 300,
      allowRemovals: false,
      allowQuantityChanges: false,
      allowSwaps: true,
      requireTags: ['vegan'],
    }, pool);
    expect(suggestions.length).toBeGreaterThan(0);
    for (const suggestion of suggestions) {
      for (const change of suggestion.changes) {
        expect(change.kind).toBe('swap');
        expect(change.after?.food.id).toBe('f-lemon');
      }
    }
  });

  it('is deterministic', () => {
    const goals = { ...BASE_GOALS, maxCalories: 800, minProteinG: 30 };
    const first = optimizeMeal(salataWrap(), goals);
    const second = optimizeMeal(salataWrap(), goals);
    expect(second).toEqual(first);
  });

  it('returns nothing when the meal already meets every goal', () => {
    const suggestions = optimizeMeal(salataWrap(), {
      ...BASE_GOALS,
      maxCalories: 2000,
      minProteinG: 10,
    });
    expect(suggestions).toEqual([]);
  });

  it('returns nothing for an empty meal', () => {
    expect(optimizeMeal([], { ...BASE_GOALS, maxCalories: 100 })).toEqual([]);
  });
});
