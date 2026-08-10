import { describe, expect, it } from 'vitest';
import type { Nutrition } from '../src/model';
import {
  matchItems,
  normalizeText,
  parseMealText,
  similarity,
} from '../src/breakdown/parse';
import type { BreakdownFood, DishTemplate } from '../src/breakdown/types';

function nutrition(partial: Partial<Nutrition> = {}): Nutrition {
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

function food(id: string, name: string, overrides: Partial<BreakdownFood> = {}): BreakdownFood {
  return {
    id,
    name,
    category: 'Fixture',
    servingLabel: '1 serving',
    nutrition: nutrition({ calories: 100 }),
    sourceType: 'restaurant-official',
    sourceName: 'Fixture guide',
    confidence: 'high',
    ...overrides,
  };
}

const CATALOG: BreakdownFood[] = [
  food('salata-ranch', 'Spicy Chipotle Ranch', { restaurantId: 'salata', aliases: ['chipotle ranch', 'ranch'] }),
  food('salata-tortilla', 'Cool Cucumber Tortilla', { restaurantId: 'salata', aliases: ['cucumber tortilla'] }),
  food('salata-falafel', 'Falafel', { restaurantId: 'salata' }),
  food('salata-avocado', 'Avocado', { restaurantId: 'salata' }),
  food('salata-edamame', 'Edamame', { restaurantId: 'salata' }),
  food('salata-black-beans', 'Black Beans', { restaurantId: 'salata' }),
  food('salata-chickpeas', 'Chickpeas', { restaurantId: 'salata' }),
  food('salata-veggies', 'Mixed Vegetables', { restaurantId: 'salata', aliases: ['veggies'] }),
  food('generic-avocado', 'Avocado', { sourceType: 'usda-generic', confidence: 'medium' }),
  food('generic-paneer', 'Paneer', { sourceType: 'usda-generic', confidence: 'medium' }),
];

const TEMPLATES: DishTemplate[] = [
  {
    id: 'template-ptm',
    name: 'Paneer Tikka Masala',
    description: 'estimate',
    components: [{ foodId: 'generic-paneer', quantity: 1.5 }],
    aliases: ['paneer tikka'],
  },
];

describe('normalizeText + similarity', () => {
  it('normalizes case, punctuation, and whitespace', () => {
    expect(normalizeText('  Spicy,  Chipotle-RANCH!! ')).toBe('spicy chipotle ranch');
  });

  it('scores identity at 1 and disjoint strings near 0', () => {
    expect(similarity('falafel', 'Falafel')).toBe(1);
    expect(similarity('falafel', 'zzqq')).toBeLessThan(0.2);
    expect(similarity('', 'anything')).toBe(0);
  });

  it('tolerates typos and partial names', () => {
    expect(similarity('chipotel ranch', 'Spicy Chipotle Ranch')).toBeGreaterThanOrEqual(0.55);
    expect(similarity('ranch', 'Spicy Chipotle Ranch')).toBeGreaterThanOrEqual(0.55);
  });

  it('does not saturate on near-anagrams or shared letter runs', () => {
    expect(similarity('tea', 'Steak')).toBeLessThan(0.55);
    expect(similarity('salata wrap', 'Kalamata Olives')).toBeLessThan(0.55);
    expect(similarity('almonds', 'Miso-Glazed Salmon')).toBeLessThan(0.55);
    expect(similarity('tea', 'Steak')).toBeLessThan(similarity('chipotel ranch', 'Spicy Chipotle Ranch'));
  });

  it('reserves 1.0 for normalized-equal names so exact aliases win ties', () => {
    expect(similarity('spicy chipotle ranch', 'Spicy Chipotle Ranch')).toBe(1);
    expect(similarity('chipotel ranch', 'Spicy Chipotle Ranch')).toBeLessThan(1);
  });
});

describe('parseMealText', () => {
  it('parses the spec example with quantities', () => {
    const items = parseMealText(
      'salata wrap cool cucumber tortilla, falafel, avocado, edamame, black beans, chickpeas, veggies and 2 spicy chipotle ranch',
    );
    expect(items).toHaveLength(8);
    expect(items[0].text).toBe('salata wrap cool cucumber tortilla');
    expect(items[7]).toEqual({ text: 'spicy chipotle ranch', quantity: 2 });
    for (const item of items.slice(0, 7)) expect(item.quantity).toBe(1);
  });

  it('understands number words, trailing multipliers, and fractions', () => {
    expect(parseMealText('two falafel')[0]).toEqual({ text: 'falafel', quantity: 2 });
    expect(parseMealText('ranch x2')[0]).toEqual({ text: 'ranch', quantity: 2 });
    expect(parseMealText('2x ranch')[0]).toEqual({ text: 'ranch', quantity: 2 });
    expect(parseMealText('double avocado')[0]).toEqual({ text: 'avocado', quantity: 2 });
    expect(parseMealText('half avocado')[0]).toEqual({ text: 'avocado', quantity: 0.5 });
    expect(parseMealText('1.5 rice')[0]).toEqual({ text: 'rice', quantity: 1.5 });
  });

  it('splits on connective words and drops empty segments', () => {
    const items = parseMealText('rice with beans and salsa; extra: ,, ');
    expect(items.map((item) => item.text)).toEqual(['rice', 'beans', 'salsa', 'extra']);
  });

  it('clamps runaway quantities', () => {
    expect(parseMealText('99 ranch')[0].quantity).toBe(10);
  });

  it('treats size descriptors as measurements, not serving counts', () => {
    expect(parseMealText('6 inch turkey')[0]).toEqual({ text: 'turkey', quantity: 1 });
    expect(parseMealText('4 oz chicken')[0]).toEqual({ text: 'chicken', quantity: 1 });
    expect(parseMealText('100 g paneer')[0]).toEqual({ text: 'paneer', quantity: 1 });
  });

  it('reads a footlong as two 6-inch servings', () => {
    expect(parseMealText('footlong turkey')[0]).toEqual({ text: 'turkey', quantity: 2 });
  });
});

describe('matchItems', () => {
  it('accepts exact matches at full score', () => {
    const [result] = matchItems(parseMealText('falafel'), { foods: CATALOG });
    expect(result.food?.id).toBe('salata-falafel');
    expect(result.score).toBeGreaterThanOrEqual(0.9);
  });

  it('matches misspellings above the acceptance threshold', () => {
    const [result] = matchItems(parseMealText('chipotel ranch'), { foods: CATALOG });
    expect(result.food?.id).toBe('salata-ranch');
  });

  it('prefers the in-context restaurant on ties', () => {
    const [result] = matchItems(parseMealText('avocado'), {
      restaurantId: 'salata',
      foods: CATALOG,
    });
    expect(result.food?.id).toBe('salata-avocado');
  });

  it('resolves the whole spec sentence against the catalog', () => {
    const results = matchItems(
      parseMealText('salata wrap cool cucumber tortilla, falafel, avocado, edamame, black beans, chickpeas, veggies and 2 spicy chipotle ranch'),
      { restaurantId: 'salata', foods: CATALOG },
    );
    const ids = results.map((result) => result.food?.id);
    expect(ids).toEqual([
      'salata-tortilla',
      'salata-falafel',
      'salata-avocado',
      'salata-edamame',
      'salata-black-beans',
      'salata-chickpeas',
      'salata-veggies',
      'salata-ranch',
    ]);
    expect(results[7].item.quantity).toBe(2);
  });

  it('returns no food for gibberish but keeps the best score', () => {
    const [result] = matchItems(parseMealText('zzxqwv'), { foods: CATALOG });
    expect(result.food).toBeUndefined();
    expect(result.score).toBeLessThan(0.55);
  });

  it('prefers a strong template over a weaker direct food', () => {
    const [result] = matchItems(parseMealText('paneer tika masala'), {
      foods: CATALOG,
      templates: TEMPLATES,
    });
    expect(result.template?.id).toBe('template-ptm');
    expect(result.food).toBeUndefined();
    expect(result.score).toBeGreaterThanOrEqual(0.6);
  });

  it('limits alternatives to three and excludes the winner', () => {
    const [result] = matchItems(parseMealText('avocado'), {
      restaurantId: 'salata',
      foods: CATALOG,
    });
    expect(result.alternatives.length).toBeLessThanOrEqual(3);
    expect(result.alternatives.some((alt) => alt.id === result.food?.id)).toBe(false);
  });
});
