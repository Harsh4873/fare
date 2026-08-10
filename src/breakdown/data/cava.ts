/**
 * Curated CAVA menu dataset for Breakdown.
 *
 * Values come from CAVA's published nutrition guide, rounded to label-style
 * numbers. Serving sizes mirror the builder line: one base or salad scoop, one
 * main serving, one dip or spread scoop, one topping scoop, one dressing ladle.
 */

import type { Nutrition } from '../../model';
import type { BreakdownFood, FoodTag, Restaurant } from '../types';

const CAVA_ID = 'cava';
const NUTRITION_URL = 'https://cava.com/nutrition';
const LAST_VERIFIED = '2026-08-09';

const CATEGORIES = [
  'Bases',
  'Mains',
  'Dips + Spreads',
  'Toppings',
  'Dressings',
] as const;

type CavaCategory = (typeof CATEGORIES)[number];

interface ItemSpec {
  readonly id: string;
  readonly name: string;
  readonly category: CavaCategory;
  readonly servingLabel: string;
  readonly servingGrams?: number;
  readonly nutrition: Nutrition;
  readonly tags?: readonly FoodTag[];
  readonly aliases?: readonly string[];
}

function item(spec: ItemSpec): BreakdownFood {
  return {
    ...spec,
    restaurantId: CAVA_ID,
    sourceType: 'restaurant-official',
    sourceName: 'CAVA nutrition guide',
    sourceUrl: NUTRITION_URL,
    confidence: 'high',
    lastVerified: LAST_VERIFIED,
  };
}

export const CAVA: Restaurant = {
  id: CAVA_ID,
  name: 'CAVA',
  website: 'https://cava.com',
  nutritionUrl: NUTRITION_URL,
  lastVerified: LAST_VERIFIED,
  categories: CATEGORIES,
  items: [
    // Bases
    item({
      id: 'cava-saffron-basmati-rice',
      name: 'Saffron Basmati Rice',
      category: 'Bases',
      servingLabel: '1 scoop',
      servingGrams: 140,
      nutrition: {
        calories: 190, proteinG: 4, carbsG: 39, fatG: 2,
        saturatedFatG: 0, fiberG: 1, sugarG: 0, sodiumMg: 410,
      },
      tags: ['grain', 'vegan', 'vegetarian'],
      aliases: ['basmati rice', 'saffron rice', 'yellow rice'],
    }),
    item({
      id: 'cava-brown-basmati-rice',
      name: 'Brown Basmati Rice',
      category: 'Bases',
      servingLabel: '1 scoop',
      servingGrams: 140,
      nutrition: {
        calories: 170, proteinG: 4, carbsG: 34, fatG: 2,
        saturatedFatG: 0, fiberG: 3, sugarG: 0, sodiumMg: 300,
      },
      tags: ['grain', 'vegan', 'vegetarian'],
      aliases: ['brown rice'],
    }),
    item({
      id: 'cava-black-lentils',
      name: 'Black Lentils',
      category: 'Bases',
      servingLabel: '1 scoop',
      servingGrams: 120,
      nutrition: {
        calories: 130, proteinG: 8, carbsG: 21, fatG: 1,
        saturatedFatG: 0, fiberG: 5, sugarG: 1, sodiumMg: 250,
      },
      tags: ['legume', 'vegan', 'vegetarian'],
      aliases: ['lentils'],
    }),
    item({
      id: 'cava-supergreens',
      name: 'SuperGreens',
      category: 'Bases',
      servingLabel: '1 salad base',
      servingGrams: 70,
      nutrition: {
        calories: 25, proteinG: 2, carbsG: 4, fatG: 0.5,
        saturatedFatG: 0, fiberG: 2, sugarG: 1, sodiumMg: 30,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['super greens', 'baby kale blend'],
    }),
    item({
      id: 'cava-splendid-greens',
      name: 'Splendid Greens',
      category: 'Bases',
      servingLabel: '1 salad base',
      servingGrams: 70,
      nutrition: {
        calories: 15, proteinG: 1, carbsG: 3, fatG: 0,
        saturatedFatG: 0, fiberG: 1, sugarG: 1, sodiumMg: 15,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['splendid greens blend', 'romaine kale blend'],
    }),
    item({
      id: 'cava-arugula',
      name: 'Arugula',
      category: 'Bases',
      servingLabel: '1 salad base',
      servingGrams: 60,
      nutrition: {
        calories: 15, proteinG: 1, carbsG: 2, fatG: 0.5,
        saturatedFatG: 0, fiberG: 1, sugarG: 1, sodiumMg: 15,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['rocket', 'arugula base'],
    }),
    item({
      id: 'cava-baby-spinach',
      name: 'Baby Spinach',
      category: 'Bases',
      servingLabel: '1 salad base',
      servingGrams: 60,
      nutrition: {
        calories: 15, proteinG: 2, carbsG: 2, fatG: 0,
        saturatedFatG: 0, fiberG: 1, sugarG: 0, sodiumMg: 45,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['spinach', 'spinach base'],
    }),
    item({
      id: 'cava-chopped-romaine',
      name: 'Chopped Romaine',
      category: 'Bases',
      servingLabel: '1 salad base',
      servingGrams: 70,
      nutrition: {
        calories: 10, proteinG: 1, carbsG: 2, fatG: 0,
        saturatedFatG: 0, fiberG: 1, sugarG: 1, sodiumMg: 5,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['romaine base', 'romaine lettuce'],
    }),
    item({
      id: 'cava-pita',
      name: 'Pita',
      category: 'Bases',
      servingLabel: '1 pita',
      servingGrams: 110,
      nutrition: {
        calories: 300, proteinG: 10, carbsG: 55, fatG: 4,
        saturatedFatG: 0.5, fiberG: 2, sugarG: 2, sodiumMg: 520,
      },
      tags: ['grain', 'vegan', 'vegetarian'],
      aliases: ['pita bread', 'white pita'],
    }),

    // Mains
    item({
      id: 'cava-grilled-chicken',
      name: 'Grilled Chicken',
      category: 'Mains',
      servingLabel: '1 serving',
      servingGrams: 115,
      nutrition: {
        calories: 250, proteinG: 32, carbsG: 2, fatG: 12,
        saturatedFatG: 2.5, fiberG: 0, sugarG: 1, sodiumMg: 560,
      },
      tags: ['protein-main'],
      aliases: ['chicken', 'grilled chicken breast'],
    }),
    item({
      id: 'cava-harissa-honey-chicken',
      name: 'Harissa Honey Chicken',
      category: 'Mains',
      servingLabel: '1 serving',
      servingGrams: 120,
      nutrition: {
        calories: 230, proteinG: 27, carbsG: 12, fatG: 8,
        saturatedFatG: 1.5, fiberG: 0, sugarG: 10, sodiumMg: 640,
      },
      tags: ['protein-main', 'spicy'],
      aliases: ['harissa chicken', 'hot honey chicken'],
    }),
    item({
      id: 'cava-grilled-steak',
      name: 'Grilled Steak',
      category: 'Mains',
      servingLabel: '1 serving',
      servingGrams: 110,
      nutrition: {
        calories: 250, proteinG: 25, carbsG: 2, fatG: 15,
        saturatedFatG: 6, fiberG: 0, sugarG: 0, sodiumMg: 620,
      },
      tags: ['protein-main'],
      aliases: ['steak'],
    }),
    item({
      id: 'cava-braised-lamb',
      name: 'Braised Lamb',
      category: 'Mains',
      servingLabel: '1 serving',
      servingGrams: 90,
      nutrition: {
        calories: 210, proteinG: 18, carbsG: 2, fatG: 14,
        saturatedFatG: 5, fiberG: 0, sugarG: 1, sodiumMg: 440,
      },
      tags: ['protein-main'],
      aliases: ['lamb', 'braised lamb shoulder'],
    }),
    item({
      id: 'cava-spicy-lamb-meatballs',
      name: 'Spicy Lamb Meatballs',
      category: 'Mains',
      servingLabel: '1 serving',
      servingGrams: 115,
      nutrition: {
        calories: 300, proteinG: 17, carbsG: 6, fatG: 23,
        saturatedFatG: 9, fiberG: 1, sugarG: 2, sodiumMg: 630,
      },
      tags: ['protein-main', 'spicy'],
      aliases: ['lamb meatballs', 'meatballs'],
    }),
    item({
      id: 'cava-crispy-falafel',
      name: 'Crispy Falafel',
      category: 'Mains',
      servingLabel: '3 pieces',
      servingGrams: 100,
      nutrition: {
        calories: 350, proteinG: 9, carbsG: 26, fatG: 24,
        saturatedFatG: 2, fiberG: 6, sugarG: 2, sodiumMg: 550,
      },
      tags: ['protein-main', 'legume', 'vegan', 'vegetarian'],
      aliases: ['falafel', 'falafel balls'],
    }),
    item({
      id: 'cava-roasted-vegetables',
      name: 'Roasted Vegetables',
      category: 'Mains',
      servingLabel: '1 serving',
      servingGrams: 115,
      nutrition: {
        calories: 90, proteinG: 2, carbsG: 10, fatG: 5,
        saturatedFatG: 0.5, fiberG: 3, sugarG: 5, sodiumMg: 320,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['roasted veggies', 'seasonal vegetables'],
    }),

    // Dips + Spreads
    item({
      id: 'cava-traditional-hummus',
      name: 'Traditional Hummus',
      category: 'Dips + Spreads',
      servingLabel: '1 scoop',
      servingGrams: 30,
      nutrition: {
        calories: 45, proteinG: 1, carbsG: 4, fatG: 3,
        saturatedFatG: 0, fiberG: 1, sugarG: 0, sodiumMg: 125,
      },
      tags: ['sauce', 'legume', 'vegan', 'vegetarian'],
      aliases: ['hummus'],
    }),
    item({
      id: 'cava-roasted-red-pepper-hummus',
      name: 'Roasted Red Pepper Hummus',
      category: 'Dips + Spreads',
      servingLabel: '1 scoop',
      servingGrams: 30,
      nutrition: {
        calories: 40, proteinG: 1, carbsG: 4, fatG: 2.5,
        saturatedFatG: 0, fiberG: 1, sugarG: 1, sodiumMg: 135,
      },
      tags: ['sauce', 'legume', 'vegan', 'vegetarian'],
      aliases: ['red pepper hummus'],
    }),
    item({
      id: 'cava-tzatziki',
      name: 'Tzatziki',
      category: 'Dips + Spreads',
      servingLabel: '1 scoop',
      servingGrams: 30,
      nutrition: {
        calories: 35, proteinG: 1, carbsG: 2, fatG: 2.5,
        saturatedFatG: 1.5, fiberG: 0, sugarG: 1, sodiumMg: 105,
      },
      tags: ['sauce', 'dairy', 'vegetarian'],
      aliases: ['tzatziki sauce', 'cucumber yogurt dip'],
    }),
    item({
      id: 'cava-crazy-feta',
      name: 'Crazy Feta',
      category: 'Dips + Spreads',
      servingLabel: '1 scoop',
      servingGrams: 30,
      nutrition: {
        calories: 70, proteinG: 2, carbsG: 1, fatG: 6,
        saturatedFatG: 3, fiberG: 0, sugarG: 0, sodiumMg: 190,
      },
      tags: ['sauce', 'cheese', 'dairy', 'spicy', 'vegetarian'],
      aliases: ['jalapeno feta', 'crazy feta dip'],
    }),
    item({
      id: 'cava-harissa',
      name: 'Harissa',
      category: 'Dips + Spreads',
      servingLabel: '1 scoop',
      servingGrams: 30,
      nutrition: {
        calories: 70, proteinG: 1, carbsG: 5, fatG: 5,
        saturatedFatG: 0.5, fiberG: 1, sugarG: 2, sodiumMg: 200,
      },
      tags: ['sauce', 'spicy', 'vegan', 'vegetarian'],
      aliases: ['harissa dip', 'red pepper harissa'],
    }),
    item({
      id: 'cava-roasted-eggplant-dip',
      name: 'Roasted Eggplant Dip',
      category: 'Dips + Spreads',
      servingLabel: '1 scoop',
      servingGrams: 30,
      nutrition: {
        calories: 30, proteinG: 0, carbsG: 3, fatG: 2,
        saturatedFatG: 0, fiberG: 1, sugarG: 2, sodiumMg: 115,
      },
      tags: ['sauce', 'vegetable', 'vegan', 'vegetarian'],
      aliases: ['eggplant dip', 'baba ganoush'],
    }),

    // Toppings
    item({
      id: 'cava-shredded-romaine',
      name: 'Shredded Romaine',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 30,
      nutrition: {
        calories: 5, proteinG: 0, carbsG: 1, fatG: 0,
        saturatedFatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['romaine', 'shredded lettuce'],
    }),
    item({
      id: 'cava-cabbage-slaw',
      name: 'Cabbage Slaw',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 40,
      nutrition: {
        calories: 35, proteinG: 1, carbsG: 3, fatG: 2,
        saturatedFatG: 0, fiberG: 1, sugarG: 2, sodiumMg: 150,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['slaw', 'red cabbage slaw'],
    }),
    item({
      id: 'cava-tomato-onion',
      name: 'Tomato + Onion',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 55,
      nutrition: {
        calories: 20, proteinG: 0, carbsG: 4, fatG: 0,
        saturatedFatG: 0, fiberG: 1, sugarG: 2, sodiumMg: 125,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['tomato and onion', 'tomato onion salad'],
    }),
    item({
      id: 'cava-persian-cucumber',
      name: 'Persian Cucumber',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 45,
      nutrition: {
        calories: 15, proteinG: 1, carbsG: 2, fatG: 0.5,
        saturatedFatG: 0, fiberG: 1, sugarG: 1, sodiumMg: 15,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['cucumber', 'diced cucumber'],
    }),
    item({
      id: 'cava-kalamata-olives',
      name: 'Kalamata Olives',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 15,
      nutrition: {
        calories: 35, proteinG: 0, carbsG: 2, fatG: 3,
        saturatedFatG: 0.5, fiberG: 0, sugarG: 0, sodiumMg: 260,
      },
      tags: ['fruit', 'vegan', 'vegetarian'],
      aliases: ['olives', 'black olives'],
    }),
    item({
      id: 'cava-crumbled-feta',
      name: 'Crumbled Feta',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 15,
      nutrition: {
        calories: 35, proteinG: 2, carbsG: 1, fatG: 3,
        saturatedFatG: 2, fiberG: 0, sugarG: 0, sodiumMg: 135,
      },
      tags: ['cheese', 'dairy', 'vegetarian'],
      aliases: ['feta', 'feta cheese'],
    }),
    item({
      id: 'cava-pickled-onions',
      name: 'Pickled Onions',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 20,
      nutrition: {
        calories: 10, proteinG: 0, carbsG: 2, fatG: 0,
        saturatedFatG: 0, fiberG: 0, sugarG: 1, sodiumMg: 105,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['pickled red onions'],
    }),
    item({
      id: 'cava-fire-roasted-corn',
      name: 'Fire-Roasted Corn',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 60,
      nutrition: {
        calories: 60, proteinG: 2, carbsG: 11, fatG: 1,
        saturatedFatG: 0, fiberG: 1, sugarG: 3, sodiumMg: 105,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['corn', 'roasted corn'],
    }),
    item({
      id: 'cava-avocado',
      name: 'Avocado',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 65,
      nutrition: {
        calories: 110, proteinG: 1, carbsG: 6, fatG: 10,
        saturatedFatG: 1.5, fiberG: 4, sugarG: 0, sodiumMg: 0,
      },
      tags: ['fruit', 'vegan', 'vegetarian'],
      aliases: ['avocado half', 'fresh avocado'],
    }),
    item({
      id: 'cava-pita-crisps',
      name: 'Pita Crisps',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 18,
      nutrition: {
        calories: 70, proteinG: 2, carbsG: 11, fatG: 2.5,
        saturatedFatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 105,
      },
      tags: ['grain', 'vegan', 'vegetarian'],
      aliases: ['pita chips', 'crisps'],
    }),
    item({
      id: 'cava-salt-brined-pickles',
      name: 'Salt-Brined Pickles',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 30,
      nutrition: {
        calories: 5, proteinG: 0, carbsG: 1, fatG: 0,
        saturatedFatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 290,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['pickles', 'brined pickles'],
    }),

    // Dressings
    item({
      id: 'cava-garlic-dressing',
      name: 'Garlic Dressing',
      category: 'Dressings',
      servingLabel: '1 ladle',
      servingGrams: 40,
      nutrition: {
        calories: 180, proteinG: 0, carbsG: 2, fatG: 19,
        saturatedFatG: 3, fiberG: 0, sugarG: 0, sodiumMg: 200,
      },
      tags: ['dressing', 'vegan', 'vegetarian'],
      aliases: ['garlic sauce', 'toum'],
    }),
    item({
      id: 'cava-lemon-herb-tahini',
      name: 'Lemon Herb Tahini',
      category: 'Dressings',
      servingLabel: '1 ladle',
      servingGrams: 40,
      nutrition: {
        calories: 90, proteinG: 2, carbsG: 4, fatG: 8,
        saturatedFatG: 1, fiberG: 1, sugarG: 0, sodiumMg: 190,
      },
      tags: ['dressing', 'nut', 'vegan', 'vegetarian'],
      aliases: ['tahini', 'tahini dressing'],
    }),
    item({
      id: 'cava-greek-vinaigrette',
      name: 'Greek Vinaigrette',
      category: 'Dressings',
      servingLabel: '1 ladle',
      servingGrams: 40,
      nutrition: {
        calories: 140, proteinG: 0, carbsG: 1, fatG: 15,
        saturatedFatG: 2, fiberG: 0, sugarG: 1, sodiumMg: 230,
      },
      tags: ['dressing', 'vegan', 'vegetarian'],
      aliases: ['greek dressing'],
    }),
    item({
      id: 'cava-hot-harissa-vinaigrette',
      name: 'Hot Harissa Vinaigrette',
      category: 'Dressings',
      servingLabel: '1 ladle',
      servingGrams: 40,
      nutrition: {
        calories: 120, proteinG: 0, carbsG: 3, fatG: 12,
        saturatedFatG: 1.5, fiberG: 0, sugarG: 2, sodiumMg: 230,
      },
      tags: ['dressing', 'spicy', 'vegan', 'vegetarian'],
      aliases: ['harissa vinaigrette', 'hot harissa'],
    }),
    item({
      id: 'cava-olive-oil',
      name: 'Olive Oil',
      category: 'Dressings',
      servingLabel: '1 drizzle',
      servingGrams: 14,
      nutrition: {
        calories: 120, proteinG: 0, carbsG: 0, fatG: 14,
        saturatedFatG: 2, fiberG: 0, sugarG: 0, sodiumMg: 0,
      },
      tags: ['oil', 'vegan', 'vegetarian'],
      aliases: ['extra virgin olive oil', 'evoo'],
    }),
    item({
      id: 'cava-sriracha-greek-yogurt',
      name: 'Sriracha Greek Yogurt',
      category: 'Dressings',
      servingLabel: '1 ladle',
      servingGrams: 40,
      nutrition: {
        calories: 40, proteinG: 2, carbsG: 3, fatG: 2,
        saturatedFatG: 1, fiberG: 0, sugarG: 2, sodiumMg: 115,
      },
      tags: ['dressing', 'dairy', 'spicy', 'vegetarian'],
      aliases: ['sriracha yogurt', 'spicy yogurt'],
    }),
    item({
      id: 'cava-yogurt-dill',
      name: 'Yogurt Dill',
      category: 'Dressings',
      servingLabel: '1 ladle',
      servingGrams: 40,
      nutrition: {
        calories: 50, proteinG: 1, carbsG: 2, fatG: 4,
        saturatedFatG: 1, fiberG: 0, sugarG: 1, sodiumMg: 115,
      },
      tags: ['dressing', 'dairy', 'vegetarian'],
      aliases: ['yogurt dill dressing', 'dill yogurt'],
    }),
    item({
      id: 'cava-skhug',
      name: 'Skhug',
      category: 'Dressings',
      servingLabel: '1 spoonful',
      servingGrams: 20,
      nutrition: {
        calories: 80, proteinG: 0, carbsG: 1, fatG: 8,
        saturatedFatG: 1, fiberG: 0, sugarG: 0, sodiumMg: 135,
      },
      tags: ['sauce', 'spicy', 'vegan', 'vegetarian'],
      aliases: ['zhug', 'green hot sauce'],
    }),
  ],
};
