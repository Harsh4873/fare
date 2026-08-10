/**
 * Curated Chipotle menu dataset for Breakdown.
 *
 * Values come from Chipotle's published nutrition information, rounded to
 * label-style numbers. Servings mirror the assembly line: one tortilla, one
 * protein scoop, one rice or bean scoop, one topping or salsa portion.
 */

import type { Nutrition } from '../../model';
import type { BreakdownFood, FoodTag, Restaurant } from '../types';

const CHIPOTLE_ID = 'chipotle';
const NUTRITION_URL = 'https://www.chipotle.com/nutrition-calculator';
const LAST_VERIFIED = '2026-08-09';

const CATEGORIES = [
  'Bases',
  'Proteins',
  'Rice + Beans',
  'Toppings',
  'Salsas + Sauces',
] as const;

type ChipotleCategory = (typeof CATEGORIES)[number];

interface ItemSpec {
  readonly id: string;
  readonly name: string;
  readonly category: ChipotleCategory;
  readonly servingLabel: string;
  readonly servingGrams?: number;
  readonly nutrition: Nutrition;
  readonly tags?: readonly FoodTag[];
  readonly aliases?: readonly string[];
}

function item(spec: ItemSpec): BreakdownFood {
  return {
    ...spec,
    restaurantId: CHIPOTLE_ID,
    sourceType: 'restaurant-official',
    sourceName: 'Chipotle nutrition information',
    sourceUrl: NUTRITION_URL,
    confidence: 'high',
    lastVerified: LAST_VERIFIED,
  };
}

export const CHIPOTLE: Restaurant = {
  id: CHIPOTLE_ID,
  name: 'Chipotle',
  website: 'https://www.chipotle.com',
  nutritionUrl: NUTRITION_URL,
  lastVerified: LAST_VERIFIED,
  categories: CATEGORIES,
  items: [
    // Bases
    item({
      id: 'chipotle-flour-tortilla',
      name: 'Flour Tortilla (burrito)',
      category: 'Bases',
      servingLabel: '1 burrito tortilla',
      servingGrams: 110,
      nutrition: { calories: 320, proteinG: 8, carbsG: 50, fatG: 9, saturatedFatG: 0.5, fiberG: 3, sugarG: 0, sodiumMg: 600 },
      tags: ['grain', 'vegetarian'],
      aliases: ['burrito tortilla', 'flour tortilla'],
    }),
    item({
      id: 'chipotle-soft-taco-tortillas',
      name: 'Soft Flour Tortillas (3 tacos)',
      category: 'Bases',
      servingLabel: '3 taco tortillas',
      servingGrams: 84,
      nutrition: { calories: 250, proteinG: 6, carbsG: 39, fatG: 7, saturatedFatG: 0.5, fiberG: 3, sugarG: 0, sodiumMg: 480 },
      tags: ['grain', 'vegetarian'],
      aliases: ['soft tacos', 'taco tortillas'],
    }),
    item({
      id: 'chipotle-crispy-corn-tortillas',
      name: 'Crispy Corn Tortillas (3 shells)',
      category: 'Bases',
      servingLabel: '3 crispy shells',
      servingGrams: 60,
      nutrition: { calories: 210, proteinG: 3, carbsG: 30, fatG: 9, saturatedFatG: 1, fiberG: 3, sugarG: 0, sodiumMg: 15 },
      tags: ['grain', 'vegan', 'vegetarian'],
      aliases: ['crispy tacos', 'corn shells'],
    }),
    item({
      id: 'chipotle-supergreens-mix',
      name: 'Supergreens Salad Mix',
      category: 'Bases',
      servingLabel: '1 salad base',
      servingGrams: 85,
      nutrition: { calories: 15, proteinG: 1, carbsG: 3, fatG: 0, saturatedFatG: 0, fiberG: 2, sugarG: 1, sodiumMg: 25 },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['salad mix', 'lettuce base', 'supergreens'],
    }),
    item({
      id: 'chipotle-tortilla-chips',
      name: 'Tortilla Chips',
      category: 'Bases',
      servingLabel: '1 regular bag',
      servingGrams: 128,
      nutrition: { calories: 540, proteinG: 7, carbsG: 73, fatG: 25, saturatedFatG: 3, fiberG: 7, sugarG: 1, sodiumMg: 390 },
      tags: ['grain', 'vegan', 'vegetarian'],
      aliases: ['chips'],
    }),
    // Proteins
    item({
      id: 'chipotle-chicken',
      name: 'Chicken',
      category: 'Proteins',
      servingLabel: '4 oz scoop',
      servingGrams: 113,
      nutrition: { calories: 180, proteinG: 32, carbsG: 0, fatG: 7, saturatedFatG: 3, fiberG: 0, sugarG: 0, sodiumMg: 310 },
      tags: ['protein-main'],
      aliases: ['grilled chicken', 'adobo chicken'],
    }),
    item({
      id: 'chipotle-steak',
      name: 'Steak',
      category: 'Proteins',
      servingLabel: '4 oz scoop',
      servingGrams: 113,
      nutrition: { calories: 150, proteinG: 21, carbsG: 1, fatG: 6, saturatedFatG: 2.5, fiberG: 0, sugarG: 0, sodiumMg: 330 },
      tags: ['protein-main'],
      aliases: ['grilled steak'],
    }),
    item({
      id: 'chipotle-barbacoa',
      name: 'Barbacoa',
      category: 'Proteins',
      servingLabel: '4 oz scoop',
      servingGrams: 113,
      nutrition: { calories: 170, proteinG: 24, carbsG: 2, fatG: 7, saturatedFatG: 2.5, fiberG: 1, sugarG: 0, sodiumMg: 530 },
      tags: ['protein-main', 'spicy'],
      aliases: ['shredded beef'],
    }),
    item({
      id: 'chipotle-carnitas',
      name: 'Carnitas',
      category: 'Proteins',
      servingLabel: '4 oz scoop',
      servingGrams: 113,
      nutrition: { calories: 210, proteinG: 23, carbsG: 0, fatG: 12, saturatedFatG: 4, fiberG: 0, sugarG: 0, sodiumMg: 450 },
      tags: ['protein-main'],
      aliases: ['pork', 'shredded pork'],
    }),
    item({
      id: 'chipotle-sofritas',
      name: 'Sofritas',
      category: 'Proteins',
      servingLabel: '4 oz scoop',
      servingGrams: 113,
      nutrition: { calories: 150, proteinG: 8, carbsG: 9, fatG: 10, saturatedFatG: 1.5, fiberG: 3, sugarG: 2, sodiumMg: 560 },
      tags: ['protein-main', 'vegan', 'vegetarian', 'spicy'],
      aliases: ['tofu', 'braised tofu'],
    }),
    // Rice + Beans
    item({
      id: 'chipotle-white-rice',
      name: 'Cilantro-Lime White Rice',
      category: 'Rice + Beans',
      servingLabel: '4 oz scoop',
      servingGrams: 113,
      nutrition: { calories: 210, proteinG: 4, carbsG: 40, fatG: 4, saturatedFatG: 0.5, fiberG: 1, sugarG: 0, sodiumMg: 350 },
      tags: ['grain', 'vegan', 'vegetarian'],
      aliases: ['white rice'],
    }),
    item({
      id: 'chipotle-brown-rice',
      name: 'Cilantro-Lime Brown Rice',
      category: 'Rice + Beans',
      servingLabel: '4 oz scoop',
      servingGrams: 113,
      nutrition: { calories: 210, proteinG: 4, carbsG: 36, fatG: 6, saturatedFatG: 1, fiberG: 2, sugarG: 0, sodiumMg: 190 },
      tags: ['grain', 'vegan', 'vegetarian'],
      aliases: ['brown rice'],
    }),
    item({
      id: 'chipotle-cauliflower-rice',
      name: 'Cilantro-Lime Cauliflower Rice',
      category: 'Rice + Beans',
      servingLabel: '4 oz scoop',
      servingGrams: 113,
      nutrition: { calories: 40, proteinG: 1, carbsG: 7, fatG: 1.5, saturatedFatG: 0, fiberG: 2, sugarG: 2, sodiumMg: 330 },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['cauliflower rice'],
    }),
    item({
      id: 'chipotle-black-beans',
      name: 'Black Beans',
      category: 'Rice + Beans',
      servingLabel: '4 oz scoop',
      servingGrams: 113,
      nutrition: { calories: 130, proteinG: 8, carbsG: 22, fatG: 1.5, saturatedFatG: 0, fiberG: 7, sugarG: 1, sodiumMg: 210 },
      tags: ['legume', 'vegan', 'vegetarian'],
      aliases: ['beans'],
    }),
    item({
      id: 'chipotle-pinto-beans',
      name: 'Pinto Beans',
      category: 'Rice + Beans',
      servingLabel: '4 oz scoop',
      servingGrams: 113,
      nutrition: { calories: 130, proteinG: 8, carbsG: 21, fatG: 1.5, saturatedFatG: 0, fiberG: 8, sugarG: 1, sodiumMg: 210 },
      tags: ['legume', 'vegan', 'vegetarian'],
    }),
    // Toppings
    item({
      id: 'chipotle-fajita-veggies',
      name: 'Fajita Veggies',
      category: 'Toppings',
      servingLabel: '2.5 oz scoop',
      servingGrams: 71,
      nutrition: { calories: 20, proteinG: 1, carbsG: 5, fatG: 0, saturatedFatG: 0, fiberG: 1, sugarG: 2, sodiumMg: 150 },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['peppers and onions', 'fajitas'],
    }),
    item({
      id: 'chipotle-romaine-lettuce',
      name: 'Romaine Lettuce',
      category: 'Toppings',
      servingLabel: '1 oz portion',
      servingGrams: 28,
      nutrition: { calories: 5, proteinG: 0, carbsG: 1, fatG: 0, saturatedFatG: 0, fiberG: 1, sugarG: 0, sodiumMg: 0 },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['lettuce'],
    }),
    item({
      id: 'chipotle-cheese',
      name: 'Monterey Jack Cheese',
      category: 'Toppings',
      servingLabel: '1 oz portion',
      servingGrams: 28,
      nutrition: { calories: 110, proteinG: 6, carbsG: 1, fatG: 8, saturatedFatG: 5, fiberG: 0, sugarG: 0, sodiumMg: 190 },
      tags: ['cheese', 'dairy', 'vegetarian'],
      aliases: ['shredded cheese', 'cheese'],
    }),
    item({
      id: 'chipotle-queso-blanco',
      name: 'Queso Blanco',
      category: 'Toppings',
      servingLabel: '2 oz portion',
      servingGrams: 57,
      nutrition: { calories: 120, proteinG: 5, carbsG: 4, fatG: 9, saturatedFatG: 6, fiberG: 0, sugarG: 1, sodiumMg: 250 },
      tags: ['cheese', 'dairy', 'sauce', 'vegetarian'],
      aliases: ['queso'],
    }),
    item({
      id: 'chipotle-sour-cream',
      name: 'Sour Cream',
      category: 'Toppings',
      servingLabel: '1.5 oz portion',
      servingGrams: 43,
      nutrition: { calories: 110, proteinG: 2, carbsG: 2, fatG: 10, saturatedFatG: 7, fiberG: 0, sugarG: 2, sodiumMg: 30 },
      tags: ['dairy', 'sauce', 'vegetarian'],
    }),
    item({
      id: 'chipotle-guacamole',
      name: 'Guacamole',
      category: 'Toppings',
      servingLabel: '3.5 oz portion',
      servingGrams: 99,
      nutrition: { calories: 230, proteinG: 2, carbsG: 8, fatG: 22, saturatedFatG: 3.5, fiberG: 6, sugarG: 1, sodiumMg: 370 },
      tags: ['sauce', 'vegan', 'vegetarian'],
      aliases: ['guac'],
    }),
    // Salsas + Sauces
    item({
      id: 'chipotle-fresh-tomato-salsa',
      name: 'Fresh Tomato Salsa',
      category: 'Salsas + Sauces',
      servingLabel: '3.5 oz portion',
      servingGrams: 99,
      nutrition: { calories: 25, proteinG: 1, carbsG: 4, fatG: 0, saturatedFatG: 0, fiberG: 1, sugarG: 2, sodiumMg: 550 },
      tags: ['sauce', 'vegetable', 'vegan', 'vegetarian'],
      aliases: ['pico de gallo', 'mild salsa'],
    }),
    item({
      id: 'chipotle-corn-salsa',
      name: 'Roasted Chili-Corn Salsa',
      category: 'Salsas + Sauces',
      servingLabel: '3.5 oz portion',
      servingGrams: 99,
      nutrition: { calories: 80, proteinG: 3, carbsG: 16, fatG: 1.5, saturatedFatG: 0, fiberG: 3, sugarG: 4, sodiumMg: 330 },
      tags: ['sauce', 'vegetable', 'vegan', 'vegetarian'],
      aliases: ['corn salsa'],
    }),
    item({
      id: 'chipotle-green-salsa',
      name: 'Tomatillo-Green Chili Salsa',
      category: 'Salsas + Sauces',
      servingLabel: '2 oz portion',
      servingGrams: 57,
      nutrition: { calories: 15, proteinG: 0, carbsG: 4, fatG: 0, saturatedFatG: 0, fiberG: 1, sugarG: 2, sodiumMg: 260 },
      tags: ['sauce', 'spicy', 'vegan', 'vegetarian'],
      aliases: ['green salsa', 'medium salsa'],
    }),
    item({
      id: 'chipotle-red-salsa',
      name: 'Tomatillo-Red Chili Salsa',
      category: 'Salsas + Sauces',
      servingLabel: '1 oz portion',
      servingGrams: 28,
      nutrition: { calories: 30, proteinG: 1, carbsG: 5, fatG: 0.5, saturatedFatG: 0, fiberG: 1, sugarG: 2, sodiumMg: 500 },
      tags: ['sauce', 'spicy', 'vegan', 'vegetarian'],
      aliases: ['red salsa', 'hot salsa'],
    }),
    item({
      id: 'chipotle-honey-vinaigrette',
      name: 'Chipotle-Honey Vinaigrette',
      category: 'Salsas + Sauces',
      servingLabel: '2 oz packet',
      servingGrams: 57,
      nutrition: { calories: 220, proteinG: 1, carbsG: 12, fatG: 16, saturatedFatG: 2.5, fiberG: 0, sugarG: 12, sodiumMg: 850 },
      tags: ['dressing', 'spicy', 'vegetarian'],
      aliases: ['vinaigrette', 'salad dressing'],
    }),
  ],
};
