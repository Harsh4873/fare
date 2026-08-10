/**
 * Curated Salata menu dataset for Breakdown.
 *
 * Values come from Salata's published nutrition guide, rounded to label-style
 * numbers. Serving sizes mirror the builder line: one salad base, one tortilla,
 * one scoop of protein or topping, one 2 oz dressing ladle.
 */

import type { Nutrition } from '../../model';
import type { BreakdownFood, FoodTag, Restaurant } from '../types';

const SALATA_ID = 'salata';
const NUTRITION_URL = 'https://salata.com/nutrition';
const LAST_VERIFIED = '2026-08-09';

const CATEGORIES = [
  'Bases',
  'Tortillas',
  'Proteins',
  'Toppings',
  'Dressings',
] as const;

type SalataCategory = (typeof CATEGORIES)[number];

interface ItemSpec {
  readonly id: string;
  readonly name: string;
  readonly category: SalataCategory;
  readonly servingLabel: string;
  readonly servingGrams?: number;
  readonly nutrition: Nutrition;
  readonly tags?: readonly FoodTag[];
  readonly aliases?: readonly string[];
}

function item(spec: ItemSpec): BreakdownFood {
  return {
    ...spec,
    restaurantId: SALATA_ID,
    sourceType: 'restaurant-official',
    sourceName: 'Salata nutrition guide',
    sourceUrl: NUTRITION_URL,
    confidence: 'high',
    lastVerified: LAST_VERIFIED,
  };
}

export const SALATA: Restaurant = {
  id: SALATA_ID,
  name: 'Salata',
  website: 'https://salata.com',
  nutritionUrl: NUTRITION_URL,
  lastVerified: LAST_VERIFIED,
  categories: CATEGORIES,
  items: [
    // Bases
    item({
      id: 'salata-iceberg-lettuce',
      name: 'Iceberg Lettuce',
      category: 'Bases',
      servingLabel: '1 salad base',
      servingGrams: 100,
      nutrition: {
        calories: 10, proteinG: 1, carbsG: 2, fatG: 0,
        saturatedFatG: 0, fiberG: 1, sugarG: 1, sodiumMg: 10,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['iceberg', 'iceberg base'],
    }),
    item({
      id: 'salata-romaine-lettuce',
      name: 'Romaine Lettuce',
      category: 'Bases',
      servingLabel: '1 salad base',
      servingGrams: 100,
      nutrition: {
        calories: 15, proteinG: 1, carbsG: 3, fatG: 0,
        saturatedFatG: 0, fiberG: 2, sugarG: 1, sodiumMg: 10,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['romaine', 'romaine base'],
    }),
    item({
      id: 'salata-spring-mix',
      name: 'Spring Mix',
      category: 'Bases',
      servingLabel: '1 salad base',
      servingGrams: 90,
      nutrition: {
        calories: 20, proteinG: 2, carbsG: 3, fatG: 0,
        saturatedFatG: 0, fiberG: 2, sugarG: 1, sodiumMg: 15,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['mixed greens', 'spring mix base'],
    }),
    item({
      id: 'salata-baby-spinach',
      name: 'Baby Spinach',
      category: 'Bases',
      servingLabel: '1 salad base',
      servingGrams: 90,
      nutrition: {
        calories: 20, proteinG: 2, carbsG: 3, fatG: 0,
        saturatedFatG: 0, fiberG: 2, sugarG: 0, sodiumMg: 65,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['spinach', 'spinach base'],
    }),
    item({
      id: 'salata-chopped-kale',
      name: 'Chopped Kale',
      category: 'Bases',
      servingLabel: '1 salad base',
      servingGrams: 90,
      nutrition: {
        calories: 35, proteinG: 2, carbsG: 6, fatG: 1,
        saturatedFatG: 0, fiberG: 2, sugarG: 1, sodiumMg: 30,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['kale', 'kale base'],
    }),
    item({
      id: 'salata-arugula',
      name: 'Arugula',
      category: 'Bases',
      servingLabel: '1 salad base',
      servingGrams: 85,
      nutrition: {
        calories: 20, proteinG: 2, carbsG: 3, fatG: 1,
        saturatedFatG: 0, fiberG: 1, sugarG: 2, sodiumMg: 25,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['rocket', 'arugula base'],
    }),

    // Tortillas
    item({
      id: 'salata-cool-cucumber-tortilla',
      name: 'Cool Cucumber Tortilla',
      category: 'Tortillas',
      servingLabel: '1 tortilla',
      servingGrams: 100,
      nutrition: {
        calories: 280, proteinG: 7, carbsG: 46, fatG: 7,
        saturatedFatG: 3, fiberG: 2, sugarG: 3, sodiumMg: 690,
      },
      tags: ['grain', 'vegetarian'],
      aliases: ['cucumber tortilla', 'cool cucumber wrap', 'cucumber wrap'],
    }),
    item({
      id: 'salata-honey-wheat-tortilla',
      name: 'Honey Wheat Tortilla',
      category: 'Tortillas',
      servingLabel: '1 tortilla',
      servingGrams: 96,
      nutrition: {
        calories: 270, proteinG: 7, carbsG: 45, fatG: 6,
        saturatedFatG: 2.5, fiberG: 3, sugarG: 4, sodiumMg: 610,
      },
      tags: ['grain', 'vegetarian'],
      aliases: ['wheat tortilla', 'honey wheat wrap'],
    }),
    item({
      id: 'salata-jalapeno-cheddar-tortilla',
      name: 'Jalapeno Cheddar Tortilla',
      category: 'Tortillas',
      servingLabel: '1 tortilla',
      servingGrams: 94,
      nutrition: {
        calories: 260, proteinG: 7, carbsG: 43, fatG: 6,
        saturatedFatG: 3, fiberG: 2, sugarG: 2, sodiumMg: 640,
      },
      tags: ['grain', 'spicy', 'vegetarian'],
      aliases: ['jalapeno tortilla', 'jalapeno cheddar wrap'],
    }),
    item({
      id: 'salata-sun-dried-tomato-tortilla',
      name: 'Sun Dried Tomato Tortilla',
      category: 'Tortillas',
      servingLabel: '1 tortilla',
      servingGrams: 96,
      nutrition: {
        calories: 270, proteinG: 7, carbsG: 44, fatG: 7,
        saturatedFatG: 3, fiberG: 2, sugarG: 3, sodiumMg: 660,
      },
      tags: ['grain', 'vegetarian'],
      aliases: ['sundried tomato tortilla', 'tomato tortilla', 'sun dried tomato wrap'],
    }),
    item({
      id: 'salata-spinach-tortilla',
      name: 'Spinach Tortilla',
      category: 'Tortillas',
      servingLabel: '1 tortilla',
      servingGrams: 94,
      nutrition: {
        calories: 260, proteinG: 7, carbsG: 44, fatG: 6,
        saturatedFatG: 2.5, fiberG: 2, sugarG: 2, sodiumMg: 630,
      },
      tags: ['grain', 'vegetarian'],
      aliases: ['spinach wrap', 'green tortilla'],
    }),

    // Proteins
    item({
      id: 'salata-grilled-chicken',
      name: 'Grilled Chicken',
      category: 'Proteins',
      servingLabel: '1 scoop',
      servingGrams: 70,
      nutrition: {
        calories: 90, proteinG: 17, carbsG: 1, fatG: 2,
        saturatedFatG: 0.5, fiberG: 0, sugarG: 0, sodiumMg: 240,
      },
      tags: ['protein-main'],
      aliases: ['chicken', 'grilled chicken breast'],
    }),
    item({
      id: 'salata-baja-chicken',
      name: 'Baja Chicken',
      category: 'Proteins',
      servingLabel: '1 scoop',
      servingGrams: 70,
      nutrition: {
        calories: 100, proteinG: 16, carbsG: 2, fatG: 3,
        saturatedFatG: 1, fiberG: 0, sugarG: 1, sodiumMg: 330,
      },
      tags: ['protein-main', 'spicy'],
      aliases: ['baja spiced chicken', 'spicy chicken'],
    }),
    item({
      id: 'salata-carne-asada-steak',
      name: 'Carne Asada Steak',
      category: 'Proteins',
      servingLabel: '1 scoop',
      servingGrams: 70,
      nutrition: {
        calories: 110, proteinG: 15, carbsG: 1, fatG: 5,
        saturatedFatG: 2, fiberG: 0, sugarG: 0, sodiumMg: 280,
      },
      tags: ['protein-main'],
      aliases: ['steak', 'carne asada'],
    }),
    item({
      id: 'salata-grilled-shrimp',
      name: 'Grilled Shrimp',
      category: 'Proteins',
      servingLabel: '1 scoop',
      servingGrams: 60,
      nutrition: {
        calories: 60, proteinG: 11, carbsG: 1, fatG: 1,
        saturatedFatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 330,
      },
      tags: ['protein-main'],
      aliases: ['shrimp'],
    }),
    item({
      id: 'salata-baja-shrimp',
      name: 'Baja Shrimp',
      category: 'Proteins',
      servingLabel: '1 scoop',
      servingGrams: 60,
      nutrition: {
        calories: 70, proteinG: 11, carbsG: 2, fatG: 2,
        saturatedFatG: 0.5, fiberG: 0, sugarG: 1, sodiumMg: 390,
      },
      tags: ['protein-main', 'spicy'],
      aliases: ['spicy shrimp', 'baja spiced shrimp'],
    }),
    item({
      id: 'salata-marinated-tofu',
      name: 'Marinated Tofu',
      category: 'Proteins',
      servingLabel: '1 scoop',
      servingGrams: 70,
      nutrition: {
        calories: 80, proteinG: 7, carbsG: 3, fatG: 4.5,
        saturatedFatG: 0.5, fiberG: 1, sugarG: 1, sodiumMg: 190,
      },
      tags: ['protein-main', 'vegan', 'vegetarian'],
      aliases: ['tofu'],
    }),
    item({
      id: 'salata-falafel',
      name: 'Falafel',
      category: 'Proteins',
      servingLabel: '3 pieces',
      servingGrams: 70,
      nutrition: {
        calories: 130, proteinG: 5, carbsG: 14, fatG: 6,
        saturatedFatG: 0.5, fiberG: 3, sugarG: 1, sodiumMg: 280,
      },
      tags: ['protein-main', 'legume', 'vegan', 'vegetarian'],
      aliases: ['falafel balls', 'chickpea falafel'],
    }),

    // Toppings
    item({
      id: 'salata-avocado',
      name: 'Avocado',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 45,
      nutrition: {
        calories: 70, proteinG: 1, carbsG: 4, fatG: 6,
        saturatedFatG: 1, fiberG: 3, sugarG: 0, sodiumMg: 0,
      },
      tags: ['fruit', 'vegan', 'vegetarian'],
      aliases: ['avocado scoop', 'fresh avocado'],
    }),
    item({
      id: 'salata-edamame',
      name: 'Edamame',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 25,
      nutrition: {
        calories: 25, proteinG: 2, carbsG: 2, fatG: 1,
        saturatedFatG: 0, fiberG: 1, sugarG: 0, sodiumMg: 5,
      },
      tags: ['legume', 'vegetable', 'vegan', 'vegetarian'],
      aliases: ['soybeans', 'shelled edamame'],
    }),
    item({
      id: 'salata-black-beans',
      name: 'Black Beans',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 35,
      nutrition: {
        calories: 35, proteinG: 2, carbsG: 6, fatG: 0,
        saturatedFatG: 0, fiberG: 2, sugarG: 0, sodiumMg: 105,
      },
      tags: ['legume', 'vegan', 'vegetarian'],
      aliases: ['beans'],
    }),
    item({
      id: 'salata-chickpeas',
      name: 'Chickpeas',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 30,
      nutrition: {
        calories: 30, proteinG: 2, carbsG: 5, fatG: 0.5,
        saturatedFatG: 0, fiberG: 1, sugarG: 0, sodiumMg: 55,
      },
      tags: ['legume', 'vegan', 'vegetarian'],
      aliases: ['garbanzo beans', 'garbanzos'],
    }),
    item({
      id: 'salata-roasted-corn',
      name: 'Roasted Corn',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 30,
      nutrition: {
        calories: 30, proteinG: 1, carbsG: 6, fatG: 0.5,
        saturatedFatG: 0, fiberG: 1, sugarG: 2, sodiumMg: 5,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['corn', 'corn kernels'],
    }),
    item({
      id: 'salata-shredded-carrots',
      name: 'Shredded Carrots',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 25,
      nutrition: {
        calories: 10, proteinG: 0, carbsG: 2, fatG: 0,
        saturatedFatG: 0, fiberG: 1, sugarG: 1, sodiumMg: 15,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['carrots'],
    }),
    item({
      id: 'salata-cucumbers',
      name: 'Cucumbers',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 30,
      nutrition: {
        calories: 5, proteinG: 0, carbsG: 1, fatG: 0,
        saturatedFatG: 0, fiberG: 0, sugarG: 1, sodiumMg: 0,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['cucumber', 'sliced cucumbers'],
    }),
    item({
      id: 'salata-grape-tomatoes',
      name: 'Grape Tomatoes',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 35,
      nutrition: {
        calories: 10, proteinG: 0, carbsG: 2, fatG: 0,
        saturatedFatG: 0, fiberG: 1, sugarG: 1, sodiumMg: 5,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['tomatoes', 'cherry tomatoes'],
    }),
    item({
      id: 'salata-red-cabbage',
      name: 'Red Cabbage',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 20,
      nutrition: {
        calories: 5, proteinG: 0, carbsG: 1, fatG: 0,
        saturatedFatG: 0, fiberG: 0, sugarG: 1, sodiumMg: 5,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['cabbage', 'shredded cabbage'],
    }),
    item({
      id: 'salata-bell-peppers',
      name: 'Bell Peppers',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 25,
      nutrition: {
        calories: 5, proteinG: 0, carbsG: 1, fatG: 0,
        saturatedFatG: 0, fiberG: 0, sugarG: 1, sodiumMg: 0,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['peppers', 'red bell peppers'],
    }),
    item({
      id: 'salata-broccoli',
      name: 'Broccoli',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 30,
      nutrition: {
        calories: 10, proteinG: 1, carbsG: 2, fatG: 0,
        saturatedFatG: 0, fiberG: 1, sugarG: 0, sodiumMg: 10,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['broccoli florets'],
    }),
    item({
      id: 'salata-mushrooms',
      name: 'Mushrooms',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 20,
      nutrition: {
        calories: 5, proteinG: 1, carbsG: 1, fatG: 0,
        saturatedFatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['sliced mushrooms'],
    }),
    item({
      id: 'salata-red-onions',
      name: 'Red Onions',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 15,
      nutrition: {
        calories: 5, proteinG: 0, carbsG: 1, fatG: 0,
        saturatedFatG: 0, fiberG: 0, sugarG: 1, sodiumMg: 0,
      },
      tags: ['vegetable', 'vegan', 'vegetarian'],
      aliases: ['onions', 'sliced red onions'],
    }),
    item({
      id: 'salata-jalapenos',
      name: 'Jalapenos',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 15,
      nutrition: {
        calories: 5, proteinG: 0, carbsG: 1, fatG: 0,
        saturatedFatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 220,
      },
      tags: ['vegetable', 'spicy', 'vegan', 'vegetarian'],
      aliases: ['pickled jalapenos', 'jalapeno peppers'],
    }),
    item({
      id: 'salata-kalamata-olives',
      name: 'Kalamata Olives',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 15,
      nutrition: {
        calories: 45, proteinG: 0, carbsG: 1, fatG: 4.5,
        saturatedFatG: 0.5, fiberG: 0, sugarG: 0, sodiumMg: 300,
      },
      tags: ['fruit', 'vegan', 'vegetarian'],
      aliases: ['olives', 'black olives'],
    }),
    item({
      id: 'salata-hard-boiled-egg',
      name: 'Hard-Boiled Egg',
      category: 'Toppings',
      servingLabel: '1 egg',
      servingGrams: 50,
      nutrition: {
        calories: 70, proteinG: 6, carbsG: 0, fatG: 5,
        saturatedFatG: 1.5, fiberG: 0, sugarG: 0, sodiumMg: 70,
      },
      tags: ['vegetarian'],
      aliases: ['egg', 'boiled egg'],
    }),
    item({
      id: 'salata-shredded-cheddar',
      name: 'Shredded Cheddar',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 28,
      nutrition: {
        calories: 110, proteinG: 7, carbsG: 1, fatG: 9,
        saturatedFatG: 5, fiberG: 0, sugarG: 0, sodiumMg: 180,
      },
      tags: ['cheese', 'dairy', 'vegetarian'],
      aliases: ['cheddar', 'cheddar cheese'],
    }),
    item({
      id: 'salata-feta',
      name: 'Feta Cheese',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 28,
      nutrition: {
        calories: 70, proteinG: 4, carbsG: 1, fatG: 6,
        saturatedFatG: 4, fiberG: 0, sugarG: 0, sodiumMg: 320,
      },
      tags: ['cheese', 'dairy', 'vegetarian'],
      aliases: ['feta', 'feta crumbles'],
    }),
    item({
      id: 'salata-shaved-parmesan',
      name: 'Shaved Parmesan',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 15,
      nutrition: {
        calories: 60, proteinG: 5, carbsG: 1, fatG: 4,
        saturatedFatG: 2.5, fiberG: 0, sugarG: 0, sodiumMg: 200,
      },
      tags: ['cheese', 'dairy', 'vegetarian'],
      aliases: ['parmesan', 'parmesan cheese'],
    }),
    item({
      id: 'salata-candied-pecans',
      name: 'Candied Pecans',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 15,
      nutrition: {
        calories: 100, proteinG: 1, carbsG: 7, fatG: 8,
        saturatedFatG: 1, fiberG: 1, sugarG: 6, sodiumMg: 25,
      },
      tags: ['nut', 'vegetarian'],
      aliases: ['pecans', 'glazed pecans'],
    }),
    item({
      id: 'salata-sliced-almonds',
      name: 'Sliced Almonds',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 14,
      nutrition: {
        calories: 80, proteinG: 3, carbsG: 3, fatG: 7,
        saturatedFatG: 0.5, fiberG: 2, sugarG: 1, sodiumMg: 0,
      },
      tags: ['nut', 'vegan', 'vegetarian'],
      aliases: ['almonds'],
    }),
    item({
      id: 'salata-sunflower-seeds',
      name: 'Sunflower Seeds',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 16,
      nutrition: {
        calories: 90, proteinG: 3, carbsG: 3, fatG: 8,
        saturatedFatG: 1, fiberG: 1, sugarG: 0, sodiumMg: 0,
      },
      tags: ['nut', 'vegan', 'vegetarian'],
      aliases: ['seeds', 'sunflower kernels'],
    }),
    item({
      id: 'salata-crispy-onions',
      name: 'Crispy Onions',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 14,
      nutrition: {
        calories: 80, proteinG: 1, carbsG: 7, fatG: 6,
        saturatedFatG: 1, fiberG: 0, sugarG: 1, sodiumMg: 75,
      },
      tags: ['vegan', 'vegetarian'],
      aliases: ['fried onions', 'onion crisps'],
    }),
    item({
      id: 'salata-croutons',
      name: 'Croutons',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 14,
      nutrition: {
        calories: 60, proteinG: 1, carbsG: 8, fatG: 2,
        saturatedFatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 105,
      },
      tags: ['grain', 'vegetarian'],
      aliases: ['garlic croutons'],
    }),
    item({
      id: 'salata-dried-cranberries',
      name: 'Dried Cranberries',
      category: 'Toppings',
      servingLabel: '1 scoop',
      servingGrams: 16,
      nutrition: {
        calories: 50, proteinG: 0, carbsG: 13, fatG: 0,
        saturatedFatG: 0, fiberG: 1, sugarG: 11, sodiumMg: 0,
      },
      tags: ['fruit', 'vegan', 'vegetarian'],
      aliases: ['craisins', 'cranberries'],
    }),

    // Dressings
    item({
      id: 'salata-spicy-chipotle-ranch',
      name: 'Spicy Chipotle Ranch',
      category: 'Dressings',
      servingLabel: '2 oz ladle',
      servingGrams: 57,
      nutrition: {
        calories: 220, proteinG: 1, carbsG: 4, fatG: 22,
        saturatedFatG: 3.5, fiberG: 0, sugarG: 2, sodiumMg: 480,
      },
      tags: ['dressing', 'dairy', 'spicy', 'vegetarian'],
      aliases: ['chipotle ranch', 'spicy ranch'],
    }),
    item({
      id: 'salata-buttermilk-ranch',
      name: 'Buttermilk Ranch',
      category: 'Dressings',
      servingLabel: '2 oz ladle',
      servingGrams: 57,
      nutrition: {
        calories: 200, proteinG: 1, carbsG: 3, fatG: 21,
        saturatedFatG: 3.5, fiberG: 0, sugarG: 2, sodiumMg: 380,
      },
      tags: ['dressing', 'dairy', 'vegetarian'],
      aliases: ['ranch', 'ranch dressing'],
    }),
    item({
      id: 'salata-caesar',
      name: 'Caesar',
      category: 'Dressings',
      servingLabel: '2 oz ladle',
      servingGrams: 57,
      nutrition: {
        calories: 210, proteinG: 1, carbsG: 2, fatG: 22,
        saturatedFatG: 3.5, fiberG: 0, sugarG: 1, sodiumMg: 400,
      },
      tags: ['dressing', 'dairy'],
      aliases: ['caesar dressing'],
    }),
    item({
      id: 'salata-blue-cheese',
      name: 'Blue Cheese',
      category: 'Dressings',
      servingLabel: '2 oz ladle',
      servingGrams: 57,
      nutrition: {
        calories: 230, proteinG: 1, carbsG: 2, fatG: 24,
        saturatedFatG: 4.5, fiberG: 0, sugarG: 1, sodiumMg: 440,
      },
      tags: ['dressing', 'dairy', 'cheese', 'vegetarian'],
      aliases: ['bleu cheese', 'blue cheese dressing'],
    }),
    item({
      id: 'salata-balsamic-vinaigrette',
      name: 'Balsamic Vinaigrette',
      category: 'Dressings',
      servingLabel: '2 oz ladle',
      servingGrams: 57,
      nutrition: {
        calories: 150, proteinG: 0, carbsG: 8, fatG: 13,
        saturatedFatG: 2, fiberG: 0, sugarG: 7, sodiumMg: 300,
      },
      tags: ['dressing', 'vegan', 'vegetarian'],
      aliases: ['balsamic', 'balsamic dressing'],
    }),
    item({
      id: 'salata-fresh-lemon-vinaigrette',
      name: 'Fresh Lemon Vinaigrette',
      category: 'Dressings',
      servingLabel: '2 oz ladle',
      servingGrams: 57,
      nutrition: {
        calories: 130, proteinG: 0, carbsG: 6, fatG: 12,
        saturatedFatG: 1.5, fiberG: 0, sugarG: 5, sodiumMg: 250,
      },
      tags: ['dressing', 'vegan', 'vegetarian'],
      aliases: ['lemon vinaigrette', 'lemon dressing'],
    }),
    item({
      id: 'salata-honey-mustard',
      name: 'Honey Mustard',
      category: 'Dressings',
      servingLabel: '2 oz ladle',
      servingGrams: 57,
      nutrition: {
        calories: 190, proteinG: 1, carbsG: 10, fatG: 16,
        saturatedFatG: 2.5, fiberG: 0, sugarG: 9, sodiumMg: 300,
      },
      tags: ['dressing', 'vegetarian'],
      aliases: ['honey dijon', 'honey mustard dressing'],
    }),
    item({
      id: 'salata-greek',
      name: 'Greek',
      category: 'Dressings',
      servingLabel: '2 oz ladle',
      servingGrams: 57,
      nutrition: {
        calories: 180, proteinG: 0, carbsG: 3, fatG: 19,
        saturatedFatG: 2.5, fiberG: 0, sugarG: 2, sodiumMg: 420,
      },
      tags: ['dressing', 'vegan', 'vegetarian'],
      aliases: ['greek dressing', 'greek vinaigrette'],
    }),
    item({
      id: 'salata-fat-free-sun-dried-tomato',
      name: 'Fat Free Sun Dried Tomato',
      category: 'Dressings',
      servingLabel: '2 oz ladle',
      servingGrams: 57,
      nutrition: {
        calories: 45, proteinG: 0, carbsG: 10, fatG: 0,
        saturatedFatG: 0, fiberG: 0, sugarG: 8, sodiumMg: 480,
      },
      tags: ['dressing', 'vegan', 'vegetarian'],
      aliases: ['fat free tomato', 'sun dried tomato dressing'],
    }),
    item({
      id: 'salata-fat-free-cilantro-lime',
      name: 'Fat Free Cilantro Lime',
      category: 'Dressings',
      servingLabel: '2 oz ladle',
      servingGrams: 57,
      nutrition: {
        calories: 35, proteinG: 0, carbsG: 8, fatG: 0,
        saturatedFatG: 0, fiberG: 0, sugarG: 6, sodiumMg: 390,
      },
      tags: ['dressing', 'vegan', 'vegetarian'],
      aliases: ['cilantro lime', 'fat free lime'],
    }),
  ],
};
