import { describe, expect, it } from 'vitest';
import type { Nutrition } from '../src/model';
import {
  analyzeMeal,
  buildInsights,
  confidenceCopy,
  densityLabelFor,
  diffNutrition,
  formatSigned,
} from '../src/breakdown/engine';
import type { BreakdownFood, Confidence, MealComponent } from '../src/breakdown/types';

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

let foodCounter = 0;

function food(
  name: string,
  values: Partial<Nutrition>,
  overrides: Partial<BreakdownFood> = {},
): BreakdownFood {
  foodCounter += 1;
  return {
    id: `fixture-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${foodCounter}`,
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

let componentCounter = 0;

function component(item: BreakdownFood, quantity = 1): MealComponent {
  componentCounter += 1;
  return { id: `comp-${componentCounter}`, food: item, quantity };
}

describe('analyzeMeal', () => {
  it('totals scaled components and computes shares', () => {
    const ranch = component(food('Ranch', { calories: 220, proteinG: 1, fatG: 22 }), 2);
    const tortilla = component(food('Tortilla', { calories: 280, proteinG: 8, carbsG: 45 }));
    const analysis = analyzeMeal([ranch, tortilla]);
    expect(analysis.totals.calories).toBe(720);
    expect(analysis.totals.proteinG).toBe(10);
    expect(analysis.contributions[0].nutrition.calories).toBe(440);
    expect(analysis.contributions[0].share.calories).toBeCloseTo(440 / 720, 6);
    expect(analysis.contributions[1].share.proteinG).toBeCloseTo(0.8, 6);
  });

  it('keeps shares at zero when a metric total is zero', () => {
    const water = component(food('Water', { calories: 0 }));
    const analysis = analyzeMeal([water]);
    expect(analysis.contributions[0].share.calories).toBe(0);
    expect(analysis.contributions[0].proteinEfficiency).toBe(0);
  });

  it('computes protein and fiber efficiency per 100 kcal', () => {
    const edamame = component(food('Edamame', { calories: 25, proteinG: 3, fiberG: 2 }));
    const analysis = analyzeMeal([edamame]);
    expect(analysis.contributions[0].proteinEfficiency).toBeCloseTo(12, 5);
    expect(analysis.contributions[0].fiberEfficiency).toBeCloseTo(8, 5);
  });

  it('derives calorie density from per-serving values', () => {
    const oil = component(food('Oil', { calories: 119 }, { servingGrams: 14 }), 3);
    const lettuce = component(food('Lettuce', { calories: 15 }, { servingGrams: 60 }));
    const analysis = analyzeMeal([oil, lettuce]);
    expect(analysis.contributions[0].calorieDensity).toBeCloseTo(119 / 14, 5);
    expect(analysis.contributions[0].densityLabel).toBe('high');
    expect(analysis.contributions[1].densityLabel).toBe('low');
  });

  it('reports the worst component confidence and an exact range for official data', () => {
    const official = component(food('Official', { calories: 100 }));
    const analysis = analyzeMeal([official]);
    expect(analysis.confidence).toBe('high');
    expect(analysis.hasEstimates).toBe(false);
    expect(analysis.calorieRange).toEqual({ low: 100, high: 100 });
  });

  it('widens the calorie range for estimated components', () => {
    const official = component(food('Official', { calories: 100 }));
    const guess = component(
      food('Guess', { calories: 200 }, { confidence: 'low', sourceType: 'reconstruction' }),
    );
    const analysis = analyzeMeal([official, guess]);
    expect(analysis.confidence).toBe('low');
    expect(analysis.hasEstimates).toBe(true);
    expect(analysis.calorieRange.low).toBe(100 + Math.round(200 * 0.72));
    expect(analysis.calorieRange.high).toBe(100 + Math.round(200 * 1.32));
  });

  it('handles the empty meal', () => {
    const analysis = analyzeMeal([]);
    expect(analysis.totals.calories).toBe(0);
    expect(analysis.confidence).toBe('high');
    expect(analysis.calorieRange).toEqual({ low: 0, high: 0 });
    expect(buildInsights(analysis)).toEqual([]);
  });
});

describe('diffNutrition + formatSigned', () => {
  it('produces signed per-key differences, including negatives', () => {
    const before = nutrition({ calories: 1025, proteinG: 38 });
    const after = nutrition({ calories: 805, proteinG: 37 });
    const delta = diffNutrition(before, after);
    expect(delta.calories).toBe(-220);
    expect(delta.proteinG).toBe(-1);
    expect(delta.carbsG).toBe(0);
  });

  it('formats signed values with a neutral zero', () => {
    expect(formatSigned(220)).toBe('+220');
    expect(formatSigned(-220)).toBe('-220');
    expect(formatSigned(0)).toBe('±0');
    expect(formatSigned(-0.4)).toBe('±0');
    expect(formatSigned(-0.46, 1)).toBe('-0.5');
    expect(formatSigned(1234.4)).toBe('+1,234');
  });
});

describe('densityLabelFor', () => {
  it('labels density at the documented boundaries', () => {
    expect(densityLabelFor(1.49)).toBe('low');
    expect(densityLabelFor(1.5)).toBe('medium');
    expect(densityLabelFor(4)).toBe('medium');
    expect(densityLabelFor(4.01)).toBe('high');
  });
});

describe('confidenceCopy', () => {
  it('describes every confidence honestly', () => {
    const labels = (['high', 'medium', 'low'] as Confidence[]).map(
      (value) => confidenceCopy(value).label,
    );
    expect(labels).toEqual(['High confidence', 'Medium confidence', 'Low confidence']);
    expect(confidenceCopy('medium').description).toMatch(/portion/i);
    expect(confidenceCopy('low').description).toMatch(/vary/i);
  });
});

describe('buildInsights', () => {
  it('flags the biggest calorie driver above 25 percent', () => {
    const ranch = component(food('Ranch', { calories: 440 }, { tags: ['dressing'] }));
    const rest = component(food('Salad', { calories: 300 }));
    const insights = buildInsights(analyzeMeal([ranch, rest]));
    const driver = insights.find((insight) => insight.id === 'top-driver');
    expect(driver).toBeDefined();
    expect(driver?.body).toContain('Ranch');
    expect(driver?.body).toContain('59%');
  });

  it('stays silent about drivers below the threshold', () => {
    const meal = [
      component(food('A', { calories: 100 })),
      component(food('B', { calories: 100 })),
      component(food('C', { calories: 100 })),
      component(food('D', { calories: 100 })),
      component(food('E', { calories: 100 })),
    ];
    const insights = buildInsights(analyzeMeal(meal));
    expect(insights.find((insight) => insight.id === 'top-driver')).toBeUndefined();
  });

  it('warns when sauces exceed 20 percent of calories', () => {
    const sauce = component(food('Sauce', { calories: 100 }, { tags: ['sauce'] }));
    const main = component(food('Main', { calories: 300 }));
    const insights = buildInsights(analyzeMeal([sauce, main]));
    expect(insights.find((insight) => insight.id === 'sauce-heavy')?.tone).toBe('warning');
  });

  it('flags low protein payoff for calorie-heavy components', () => {
    const tortilla = component(food('Butter Tortilla', { calories: 300, proteinG: 2 }));
    const chicken = component(food('Chicken', { calories: 165, proteinG: 31 }));
    const insights = buildInsights(analyzeMeal([tortilla, chicken]));
    const flag = insights.find((insight) => insight.id === 'low-protein-payoff');
    expect(flag?.body).toContain('Butter Tortilla');
  });

  it('credits plant fiber and protein workhorses', () => {
    const beans = component(
      food('Beans', { calories: 130, proteinG: 8, fiberG: 7 }, { tags: ['legume'] }),
    );
    const chicken = component(food('Chicken', { calories: 165, proteinG: 31, fiberG: 0 }));
    const insights = buildInsights(analyzeMeal([beans, chicken]));
    expect(insights.find((insight) => insight.id === 'plant-fiber')?.tone).toBe('positive');
    const workhorse = insights.find((insight) => insight.id === 'protein-workhorse');
    expect(workhorse?.body).toContain('Chicken');
  });

  it('notes estimates and never exceeds four insights', () => {
    const meal = [
      component(food('Ranch', { calories: 440, proteinG: 1 }, { tags: ['dressing'] }), 1),
      component(food('Tortilla', { calories: 280, proteinG: 2 })),
      component(
        food('Paneer Guess', { calories: 300, proteinG: 18 }, { confidence: 'low' }),
      ),
      component(food('Beans', { calories: 130, proteinG: 8, fiberG: 7 }, { tags: ['legume'] })),
    ];
    const insights = buildInsights(analyzeMeal(meal));
    expect(insights.length).toBeLessThanOrEqual(4);
    const estimateNote = buildInsights(
      analyzeMeal([component(food('Guess', { calories: 100 }, { confidence: 'medium' }))]),
    ).find((insight) => insight.id === 'estimates');
    expect(estimateNote).toBeDefined();
  });
});
