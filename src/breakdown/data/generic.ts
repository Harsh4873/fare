/**
 * Generic staple foods with USDA FoodData Central-derived per-serving values,
 * plus dish templates that reconstruct dishes without direct nutrition data
 * from likely ingredients. Generic foods carry medium confidence: the
 * nutrition source is reliable, the user's portion is the estimate.
 */

import type { Nutrition } from '../../model';
import type { BreakdownFood, DishTemplate, FoodTag } from '../types';

const SOURCE_NAME = 'USDA FoodData Central';
const SOURCE_URL = 'https://fdc.nal.usda.gov/';
const LAST_VERIFIED = '2026-08-09';

type GenericCategory =
  | 'Grains'
  | 'Proteins'
  | 'Legumes'
  | 'Vegetables'
  | 'Fruits'
  | 'Dairy'
  | 'Nuts + Fats'
  | 'Sauces + Extras';

interface ItemSpec {
  readonly id: string;
  readonly name: string;
  readonly category: GenericCategory;
  readonly servingLabel: string;
  readonly servingGrams: number;
  readonly nutrition: Nutrition;
  readonly tags?: readonly FoodTag[];
  readonly aliases?: readonly string[];
  readonly portionOptions?: readonly number[];
}

const SCALABLE = [0.5, 1, 1.5, 2] as const;

function item(spec: ItemSpec): BreakdownFood {
  return {
    ...spec,
    sourceType: 'usda-generic',
    sourceName: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    confidence: 'medium',
    lastVerified: LAST_VERIFIED,
  };
}

export const GENERIC_FOODS: readonly BreakdownFood[] = [
  // Grains
  item({ id: 'generic-white-rice', name: 'White Rice (cooked)', category: 'Grains', servingLabel: '1 cup cooked', servingGrams: 158, nutrition: { calories: 205, proteinG: 4, carbsG: 45, fatG: 0.5, saturatedFatG: 0, fiberG: 0.5, sugarG: 0, sodiumMg: 2 }, tags: ['grain', 'vegan', 'vegetarian'], aliases: ['rice', 'steamed rice'], portionOptions: SCALABLE }),
  item({ id: 'generic-brown-rice', name: 'Brown Rice (cooked)', category: 'Grains', servingLabel: '1 cup cooked', servingGrams: 195, nutrition: { calories: 220, proteinG: 5, carbsG: 46, fatG: 2, saturatedFatG: 0.5, fiberG: 3.5, sugarG: 0, sodiumMg: 2 }, tags: ['grain', 'vegan', 'vegetarian'], portionOptions: SCALABLE }),
  item({ id: 'generic-basmati-rice', name: 'Basmati Rice (cooked)', category: 'Grains', servingLabel: '1 cup cooked', servingGrams: 163, nutrition: { calories: 210, proteinG: 5, carbsG: 45, fatG: 0.5, saturatedFatG: 0, fiberG: 1, sugarG: 0, sodiumMg: 2 }, tags: ['grain', 'vegan', 'vegetarian'], aliases: ['basmati'], portionOptions: SCALABLE }),
  item({ id: 'generic-quinoa', name: 'Quinoa (cooked)', category: 'Grains', servingLabel: '1 cup cooked', servingGrams: 185, nutrition: { calories: 220, proteinG: 8, carbsG: 39, fatG: 3.5, saturatedFatG: 0.5, fiberG: 5, sugarG: 1.5, sodiumMg: 13 }, tags: ['grain', 'vegan', 'vegetarian'], portionOptions: SCALABLE }),
  item({ id: 'generic-oats', name: 'Rolled Oats (dry)', category: 'Grains', servingLabel: '1/2 cup dry', servingGrams: 40, nutrition: { calories: 150, proteinG: 5, carbsG: 27, fatG: 3, saturatedFatG: 0.5, fiberG: 4, sugarG: 1, sodiumMg: 0 }, tags: ['grain', 'vegan', 'vegetarian'], aliases: ['oatmeal'], portionOptions: SCALABLE }),
  item({ id: 'generic-pasta', name: 'Pasta (cooked)', category: 'Grains', servingLabel: '1 cup cooked', servingGrams: 140, nutrition: { calories: 220, proteinG: 8, carbsG: 43, fatG: 1.5, saturatedFatG: 0, fiberG: 2.5, sugarG: 1, sodiumMg: 1 }, tags: ['grain', 'vegetarian'], aliases: ['spaghetti', 'noodles'], portionOptions: SCALABLE }),
  item({ id: 'generic-bread-slice', name: 'Bread', category: 'Grains', servingLabel: '1 slice', servingGrams: 32, nutrition: { calories: 80, proteinG: 4, carbsG: 14, fatG: 1, saturatedFatG: 0, fiberG: 2, sugarG: 1.5, sodiumMg: 150 }, tags: ['grain', 'vegetarian'], aliases: ['toast', 'whole wheat bread'] }),
  item({ id: 'generic-naan', name: 'Naan', category: 'Grains', servingLabel: '1 piece', servingGrams: 90, nutrition: { calories: 260, proteinG: 9, carbsG: 45, fatG: 5, saturatedFatG: 1.5, fiberG: 2, sugarG: 3, sodiumMg: 420 }, tags: ['grain', 'vegetarian'], aliases: ['naan bread'] }),
  item({ id: 'generic-roti', name: 'Roti (chapati)', category: 'Grains', servingLabel: '1 piece', servingGrams: 40, nutrition: { calories: 110, proteinG: 3, carbsG: 18, fatG: 3, saturatedFatG: 0.5, fiberG: 2, sugarG: 0, sodiumMg: 120 }, tags: ['grain', 'vegan', 'vegetarian'], aliases: ['chapati', 'phulka'] }),
  item({ id: 'generic-potato', name: 'Potato (boiled)', category: 'Grains', servingLabel: '1 medium', servingGrams: 173, nutrition: { calories: 160, proteinG: 4, carbsG: 37, fatG: 0, saturatedFatG: 0, fiberG: 4, sugarG: 2, sodiumMg: 10 }, tags: ['vegetable', 'vegan', 'vegetarian'], aliases: ['aloo', 'potatoes'] }),
  item({ id: 'generic-sweet-potato', name: 'Sweet Potato (baked)', category: 'Grains', servingLabel: '1 medium', servingGrams: 130, nutrition: { calories: 110, proteinG: 2, carbsG: 26, fatG: 0, saturatedFatG: 0, fiberG: 4, sugarG: 8, sodiumMg: 40 }, tags: ['vegetable', 'vegan', 'vegetarian'] }),
  // Proteins
  item({ id: 'generic-chicken-breast', name: 'Chicken Breast (cooked)', category: 'Proteins', servingLabel: '100 g cooked', servingGrams: 100, nutrition: { calories: 165, proteinG: 31, carbsG: 0, fatG: 3.5, saturatedFatG: 1, fiberG: 0, sugarG: 0, sodiumMg: 75 }, tags: ['protein-main'], aliases: ['grilled chicken', 'chicken'], portionOptions: SCALABLE }),
  item({ id: 'generic-chicken-thigh', name: 'Chicken Thigh (cooked)', category: 'Proteins', servingLabel: '100 g cooked', servingGrams: 100, nutrition: { calories: 210, proteinG: 26, carbsG: 0, fatG: 11, saturatedFatG: 3, fiberG: 0, sugarG: 0, sodiumMg: 90 }, tags: ['protein-main'], portionOptions: SCALABLE }),
  item({ id: 'generic-ground-beef', name: 'Ground Beef 85/15 (cooked)', category: 'Proteins', servingLabel: '100 g cooked', servingGrams: 100, nutrition: { calories: 250, proteinG: 26, carbsG: 0, fatG: 15, saturatedFatG: 6, fiberG: 0, sugarG: 0, sodiumMg: 80 }, tags: ['protein-main'], aliases: ['beef', 'minced beef'], portionOptions: SCALABLE }),
  item({ id: 'generic-salmon', name: 'Salmon (cooked)', category: 'Proteins', servingLabel: '100 g cooked', servingGrams: 100, nutrition: { calories: 208, proteinG: 20, carbsG: 0, fatG: 13, saturatedFatG: 3, fiberG: 0, sugarG: 0, sodiumMg: 60 }, tags: ['protein-main'], portionOptions: SCALABLE }),
  item({ id: 'generic-shrimp', name: 'Shrimp (cooked)', category: 'Proteins', servingLabel: '100 g cooked', servingGrams: 100, nutrition: { calories: 100, proteinG: 24, carbsG: 0, fatG: 0.5, saturatedFatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 110 }, tags: ['protein-main'], aliases: ['prawns'], portionOptions: SCALABLE }),
  item({ id: 'generic-egg', name: 'Egg', category: 'Proteins', servingLabel: '1 large', servingGrams: 50, nutrition: { calories: 70, proteinG: 6, carbsG: 0.5, fatG: 5, saturatedFatG: 1.5, fiberG: 0, sugarG: 0, sodiumMg: 70 }, tags: ['protein-main', 'vegetarian'], aliases: ['eggs'] }),
  item({ id: 'generic-tofu', name: 'Tofu (firm)', category: 'Proteins', servingLabel: '100 g', servingGrams: 100, nutrition: { calories: 145, proteinG: 16, carbsG: 3, fatG: 9, saturatedFatG: 1.5, fiberG: 2, sugarG: 0, sodiumMg: 10 }, tags: ['protein-main', 'vegan', 'vegetarian'], portionOptions: SCALABLE }),
  item({ id: 'generic-tempeh', name: 'Tempeh', category: 'Proteins', servingLabel: '100 g', servingGrams: 100, nutrition: { calories: 195, proteinG: 20, carbsG: 8, fatG: 11, saturatedFatG: 2.5, fiberG: 5, sugarG: 0, sodiumMg: 10 }, tags: ['protein-main', 'vegan', 'vegetarian'], portionOptions: SCALABLE }),
  item({ id: 'generic-paneer', name: 'Paneer', category: 'Proteins', servingLabel: '100 g', servingGrams: 100, nutrition: { calories: 300, proteinG: 18, carbsG: 4, fatG: 24, saturatedFatG: 15, fiberG: 0, sugarG: 3, sodiumMg: 20 }, tags: ['protein-main', 'dairy', 'vegetarian'], aliases: ['indian cottage cheese'], portionOptions: SCALABLE }),
  item({ id: 'generic-greek-yogurt', name: 'Greek Yogurt (nonfat)', category: 'Proteins', servingLabel: '170 g cup', servingGrams: 170, nutrition: { calories: 100, proteinG: 17, carbsG: 6, fatG: 0.5, saturatedFatG: 0, fiberG: 0, sugarG: 5, sodiumMg: 60 }, tags: ['protein-main', 'dairy', 'vegetarian'], aliases: ['yogurt', 'dahi'] }),
  item({ id: 'generic-cottage-cheese', name: 'Cottage Cheese (2%)', category: 'Proteins', servingLabel: '1/2 cup', servingGrams: 113, nutrition: { calories: 90, proteinG: 12, carbsG: 5, fatG: 2.5, saturatedFatG: 1.5, fiberG: 0, sugarG: 4, sodiumMg: 350 }, tags: ['protein-main', 'dairy', 'vegetarian'] }),
  item({ id: 'generic-whey-protein', name: 'Whey Protein Powder', category: 'Proteins', servingLabel: '1 scoop', servingGrams: 31, nutrition: { calories: 120, proteinG: 24, carbsG: 3, fatG: 1.5, saturatedFatG: 1, fiberG: 0, sugarG: 2, sodiumMg: 130 }, tags: ['protein-main', 'dairy', 'vegetarian'], aliases: ['protein powder', 'protein shake'] }),
  // Legumes
  item({ id: 'generic-lentils', name: 'Lentils (cooked)', category: 'Legumes', servingLabel: '1 cup cooked', servingGrams: 198, nutrition: { calories: 230, proteinG: 18, carbsG: 40, fatG: 0.5, saturatedFatG: 0, fiberG: 15, sugarG: 2, sodiumMg: 4 }, tags: ['legume', 'vegan', 'vegetarian'], aliases: ['dal', 'daal', 'masoor'], portionOptions: SCALABLE }),
  item({ id: 'generic-black-beans', name: 'Black Beans (cooked)', category: 'Legumes', servingLabel: '1 cup cooked', servingGrams: 172, nutrition: { calories: 227, proteinG: 15, carbsG: 41, fatG: 1, saturatedFatG: 0, fiberG: 15, sugarG: 0, sodiumMg: 2 }, tags: ['legume', 'vegan', 'vegetarian'], portionOptions: SCALABLE }),
  item({ id: 'generic-chickpeas', name: 'Chickpeas (cooked)', category: 'Legumes', servingLabel: '1 cup cooked', servingGrams: 164, nutrition: { calories: 269, proteinG: 15, carbsG: 45, fatG: 4, saturatedFatG: 0.5, fiberG: 12, sugarG: 8, sodiumMg: 11 }, tags: ['legume', 'vegan', 'vegetarian'], aliases: ['garbanzo beans', 'chana'], portionOptions: SCALABLE }),
  item({ id: 'generic-kidney-beans', name: 'Kidney Beans (cooked)', category: 'Legumes', servingLabel: '1 cup cooked', servingGrams: 177, nutrition: { calories: 225, proteinG: 15, carbsG: 40, fatG: 1, saturatedFatG: 0, fiberG: 13, sugarG: 0.5, sodiumMg: 2 }, tags: ['legume', 'vegan', 'vegetarian'], aliases: ['rajma'], portionOptions: SCALABLE }),
  item({ id: 'generic-edamame', name: 'Edamame (shelled)', category: 'Legumes', servingLabel: '1 cup shelled', servingGrams: 155, nutrition: { calories: 188, proteinG: 18, carbsG: 14, fatG: 8, saturatedFatG: 1, fiberG: 8, sugarG: 3, sodiumMg: 9 }, tags: ['legume', 'vegan', 'vegetarian'], portionOptions: SCALABLE }),
  // Vegetables
  item({ id: 'generic-broccoli', name: 'Broccoli', category: 'Vegetables', servingLabel: '1 cup chopped', servingGrams: 91, nutrition: { calories: 31, proteinG: 2.5, carbsG: 6, fatG: 0.5, saturatedFatG: 0, fiberG: 2.5, sugarG: 1.5, sodiumMg: 30 }, tags: ['vegetable', 'vegan', 'vegetarian'] }),
  item({ id: 'generic-spinach', name: 'Spinach (raw)', category: 'Vegetables', servingLabel: '2 cups raw', servingGrams: 60, nutrition: { calories: 14, proteinG: 2, carbsG: 2, fatG: 0, saturatedFatG: 0, fiberG: 1.5, sugarG: 0, sodiumMg: 47 }, tags: ['vegetable', 'vegan', 'vegetarian'], aliases: ['palak'] }),
  item({ id: 'generic-salad-greens', name: 'Mixed Salad Greens', category: 'Vegetables', servingLabel: '2 cups', servingGrams: 60, nutrition: { calories: 15, proteinG: 1, carbsG: 3, fatG: 0, saturatedFatG: 0, fiberG: 1.5, sugarG: 1, sodiumMg: 20 }, tags: ['vegetable', 'vegan', 'vegetarian'], aliases: ['lettuce', 'greens'] }),
  item({ id: 'generic-tomato', name: 'Tomato', category: 'Vegetables', servingLabel: '1 medium', servingGrams: 123, nutrition: { calories: 22, proteinG: 1, carbsG: 5, fatG: 0, saturatedFatG: 0, fiberG: 1.5, sugarG: 3, sodiumMg: 6 }, tags: ['vegetable', 'vegan', 'vegetarian'], aliases: ['tomatoes'] }),
  item({ id: 'generic-cucumber', name: 'Cucumber', category: 'Vegetables', servingLabel: '1/2 cup sliced', servingGrams: 52, nutrition: { calories: 8, proteinG: 0.5, carbsG: 2, fatG: 0, saturatedFatG: 0, fiberG: 0.5, sugarG: 1, sodiumMg: 1 }, tags: ['vegetable', 'vegan', 'vegetarian'] }),
  item({ id: 'generic-carrot', name: 'Carrot', category: 'Vegetables', servingLabel: '1 medium', servingGrams: 61, nutrition: { calories: 25, proteinG: 0.5, carbsG: 6, fatG: 0, saturatedFatG: 0, fiberG: 1.5, sugarG: 3, sodiumMg: 42 }, tags: ['vegetable', 'vegan', 'vegetarian'], aliases: ['carrots'] }),
  item({ id: 'generic-onion', name: 'Onion', category: 'Vegetables', servingLabel: '1/2 cup chopped', servingGrams: 80, nutrition: { calories: 32, proteinG: 1, carbsG: 7, fatG: 0, saturatedFatG: 0, fiberG: 1.5, sugarG: 3, sodiumMg: 3 }, tags: ['vegetable', 'vegan', 'vegetarian'], aliases: ['onions'] }),
  item({ id: 'generic-bell-pepper', name: 'Bell Pepper', category: 'Vegetables', servingLabel: '1 medium', servingGrams: 119, nutrition: { calories: 30, proteinG: 1, carbsG: 7, fatG: 0, saturatedFatG: 0, fiberG: 2.5, sugarG: 4, sodiumMg: 5 }, tags: ['vegetable', 'vegan', 'vegetarian'], aliases: ['capsicum', 'peppers'] }),
  item({ id: 'generic-cauliflower', name: 'Cauliflower', category: 'Vegetables', servingLabel: '1 cup chopped', servingGrams: 107, nutrition: { calories: 27, proteinG: 2, carbsG: 5, fatG: 0, saturatedFatG: 0, fiberG: 2, sugarG: 2, sodiumMg: 32 }, tags: ['vegetable', 'vegan', 'vegetarian'], aliases: ['gobi'] }),
  item({ id: 'generic-mixed-vegetables', name: 'Mixed Vegetables (cooked)', category: 'Vegetables', servingLabel: '1 cup cooked', servingGrams: 160, nutrition: { calories: 60, proteinG: 3, carbsG: 12, fatG: 0.5, saturatedFatG: 0, fiberG: 4, sugarG: 3, sodiumMg: 45 }, tags: ['vegetable', 'vegan', 'vegetarian'], aliases: ['veggies', 'vegetables'], portionOptions: SCALABLE }),
  // Fruits
  item({ id: 'generic-banana', name: 'Banana', category: 'Fruits', servingLabel: '1 medium', servingGrams: 118, nutrition: { calories: 105, proteinG: 1, carbsG: 27, fatG: 0.5, saturatedFatG: 0, fiberG: 3, sugarG: 14, sodiumMg: 1 }, tags: ['fruit', 'vegan', 'vegetarian'] }),
  item({ id: 'generic-apple', name: 'Apple', category: 'Fruits', servingLabel: '1 medium', servingGrams: 182, nutrition: { calories: 95, proteinG: 0.5, carbsG: 25, fatG: 0.5, saturatedFatG: 0, fiberG: 4, sugarG: 19, sodiumMg: 2 }, tags: ['fruit', 'vegan', 'vegetarian'] }),
  item({ id: 'generic-berries', name: 'Mixed Berries', category: 'Fruits', servingLabel: '1 cup', servingGrams: 148, nutrition: { calories: 70, proteinG: 1, carbsG: 17, fatG: 0.5, saturatedFatG: 0, fiberG: 4, sugarG: 10, sodiumMg: 1 }, tags: ['fruit', 'vegan', 'vegetarian'], aliases: ['blueberries', 'strawberries'] }),
  item({ id: 'generic-mango', name: 'Mango', category: 'Fruits', servingLabel: '1 cup pieces', servingGrams: 165, nutrition: { calories: 99, proteinG: 1.5, carbsG: 25, fatG: 0.5, saturatedFatG: 0, fiberG: 2.5, sugarG: 23, sodiumMg: 2 }, tags: ['fruit', 'vegan', 'vegetarian'] }),
  item({ id: 'generic-orange', name: 'Orange', category: 'Fruits', servingLabel: '1 medium', servingGrams: 131, nutrition: { calories: 62, proteinG: 1, carbsG: 15, fatG: 0, saturatedFatG: 0, fiberG: 3, sugarG: 12, sodiumMg: 0 }, tags: ['fruit', 'vegan', 'vegetarian'] }),
  // Dairy
  item({ id: 'generic-milk', name: 'Whole Milk', category: 'Dairy', servingLabel: '1 cup', servingGrams: 244, nutrition: { calories: 150, proteinG: 8, carbsG: 12, fatG: 8, saturatedFatG: 4.5, fiberG: 0, sugarG: 12, sodiumMg: 105 }, tags: ['dairy', 'vegetarian'], aliases: ['milk'] }),
  item({ id: 'generic-cheddar', name: 'Cheddar Cheese', category: 'Dairy', servingLabel: '1 oz', servingGrams: 28, nutrition: { calories: 115, proteinG: 7, carbsG: 0.5, fatG: 9.5, saturatedFatG: 6, fiberG: 0, sugarG: 0, sodiumMg: 180 }, tags: ['cheese', 'dairy', 'vegetarian'], aliases: ['cheese'] }),
  item({ id: 'generic-mozzarella', name: 'Mozzarella', category: 'Dairy', servingLabel: '1 oz', servingGrams: 28, nutrition: { calories: 85, proteinG: 6, carbsG: 1, fatG: 6, saturatedFatG: 4, fiberG: 0, sugarG: 0, sodiumMg: 175 }, tags: ['cheese', 'dairy', 'vegetarian'] }),
  item({ id: 'generic-butter', name: 'Butter', category: 'Dairy', servingLabel: '1 tbsp', servingGrams: 14, nutrition: { calories: 100, proteinG: 0, carbsG: 0, fatG: 11, saturatedFatG: 7, fiberG: 0, sugarG: 0, sodiumMg: 90 }, tags: ['dairy', 'oil', 'vegetarian'], portionOptions: SCALABLE }),
  item({ id: 'generic-heavy-cream', name: 'Heavy Cream', category: 'Dairy', servingLabel: '2 tbsp', servingGrams: 30, nutrition: { calories: 100, proteinG: 1, carbsG: 1, fatG: 10, saturatedFatG: 7, fiberG: 0, sugarG: 1, sodiumMg: 8 }, tags: ['dairy', 'vegetarian'], aliases: ['cream'], portionOptions: SCALABLE }),
  item({ id: 'generic-ghee', name: 'Ghee', category: 'Dairy', servingLabel: '1 tbsp', servingGrams: 13, nutrition: { calories: 120, proteinG: 0, carbsG: 0, fatG: 14, saturatedFatG: 9, fiberG: 0, sugarG: 0, sodiumMg: 0 }, tags: ['dairy', 'oil', 'vegetarian'], aliases: ['clarified butter'], portionOptions: SCALABLE }),
  // Nuts + Fats
  item({ id: 'generic-almonds', name: 'Almonds', category: 'Nuts + Fats', servingLabel: '1 oz (23 nuts)', servingGrams: 28, nutrition: { calories: 164, proteinG: 6, carbsG: 6, fatG: 14, saturatedFatG: 1, fiberG: 3.5, sugarG: 1, sodiumMg: 0 }, tags: ['nut', 'vegan', 'vegetarian'] }),
  item({ id: 'generic-peanut-butter', name: 'Peanut Butter', category: 'Nuts + Fats', servingLabel: '2 tbsp', servingGrams: 32, nutrition: { calories: 190, proteinG: 8, carbsG: 8, fatG: 16, saturatedFatG: 3, fiberG: 2, sugarG: 3, sodiumMg: 140 }, tags: ['nut', 'vegan', 'vegetarian'], portionOptions: SCALABLE }),
  item({ id: 'generic-walnuts', name: 'Walnuts', category: 'Nuts + Fats', servingLabel: '1 oz', servingGrams: 28, nutrition: { calories: 185, proteinG: 4, carbsG: 4, fatG: 18.5, saturatedFatG: 1.5, fiberG: 2, sugarG: 1, sodiumMg: 1 }, tags: ['nut', 'vegan', 'vegetarian'] }),
  item({ id: 'generic-olive-oil', name: 'Olive Oil', category: 'Nuts + Fats', servingLabel: '1 tbsp', servingGrams: 14, nutrition: { calories: 119, proteinG: 0, carbsG: 0, fatG: 13.5, saturatedFatG: 2, fiberG: 0, sugarG: 0, sodiumMg: 0 }, tags: ['oil', 'vegan', 'vegetarian'], aliases: ['oil', 'cooking oil'], portionOptions: SCALABLE }),
  item({ id: 'generic-coconut-milk', name: 'Coconut Milk (canned)', category: 'Nuts + Fats', servingLabel: '1/2 cup', servingGrams: 113, nutrition: { calories: 223, proteinG: 2, carbsG: 3, fatG: 24, saturatedFatG: 21, fiberG: 0, sugarG: 2, sodiumMg: 15 }, tags: ['nut', 'vegan', 'vegetarian'], portionOptions: SCALABLE }),
  item({ id: 'generic-avocado', name: 'Avocado', category: 'Nuts + Fats', servingLabel: '1/2 fruit', servingGrams: 100, nutrition: { calories: 120, proteinG: 1.5, carbsG: 6, fatG: 11, saturatedFatG: 1.5, fiberG: 5, sugarG: 0.5, sodiumMg: 5 }, tags: ['fruit', 'vegan', 'vegetarian'] }),
  // Sauces + Extras
  item({ id: 'generic-tomato-sauce', name: 'Tomato Sauce', category: 'Sauces + Extras', servingLabel: '1/2 cup', servingGrams: 122, nutrition: { calories: 40, proteinG: 2, carbsG: 8, fatG: 0.5, saturatedFatG: 0, fiberG: 2, sugarG: 5, sodiumMg: 550 }, tags: ['sauce', 'vegetable', 'vegan', 'vegetarian'], aliases: ['marinara', 'tomato gravy'], portionOptions: SCALABLE }),
  item({ id: 'generic-cream-sauce', name: 'Cream Sauce', category: 'Sauces + Extras', servingLabel: '1/4 cup', servingGrams: 60, nutrition: { calories: 110, proteinG: 2, carbsG: 4, fatG: 10, saturatedFatG: 6, fiberG: 0, sugarG: 2, sodiumMg: 220 }, tags: ['sauce', 'dairy', 'vegetarian'], aliases: ['white sauce', 'alfredo'], portionOptions: SCALABLE }),
  item({ id: 'generic-soy-sauce', name: 'Soy Sauce', category: 'Sauces + Extras', servingLabel: '1 tbsp', servingGrams: 16, nutrition: { calories: 10, proteinG: 1, carbsG: 1, fatG: 0, saturatedFatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 900 }, tags: ['sauce', 'vegan', 'vegetarian'] }),
  item({ id: 'generic-hummus', name: 'Hummus', category: 'Sauces + Extras', servingLabel: '2 tbsp', servingGrams: 30, nutrition: { calories: 70, proteinG: 2, carbsG: 4, fatG: 5, saturatedFatG: 0.5, fiberG: 1.5, sugarG: 0, sodiumMg: 130 }, tags: ['sauce', 'legume', 'vegan', 'vegetarian'] }),
  item({ id: 'generic-tahini', name: 'Tahini', category: 'Sauces + Extras', servingLabel: '1 tbsp', servingGrams: 15, nutrition: { calories: 89, proteinG: 2.5, carbsG: 3, fatG: 8, saturatedFatG: 1, fiberG: 1.5, sugarG: 0, sodiumMg: 17 }, tags: ['sauce', 'nut', 'vegan', 'vegetarian'] }),
  item({ id: 'generic-mayonnaise', name: 'Mayonnaise', category: 'Sauces + Extras', servingLabel: '1 tbsp', servingGrams: 14, nutrition: { calories: 94, proteinG: 0, carbsG: 0, fatG: 10, saturatedFatG: 1.5, fiberG: 0, sugarG: 0, sodiumMg: 90 }, tags: ['sauce', 'vegetarian'], aliases: ['mayo'] }),
  item({ id: 'generic-ketchup', name: 'Ketchup', category: 'Sauces + Extras', servingLabel: '1 tbsp', servingGrams: 17, nutrition: { calories: 17, proteinG: 0, carbsG: 4.5, fatG: 0, saturatedFatG: 0, fiberG: 0, sugarG: 3.5, sodiumMg: 154 }, tags: ['sauce', 'vegan', 'vegetarian'] }),
  item({ id: 'generic-salsa', name: 'Salsa', category: 'Sauces + Extras', servingLabel: '2 tbsp', servingGrams: 32, nutrition: { calories: 10, proteinG: 0.5, carbsG: 2, fatG: 0, saturatedFatG: 0, fiberG: 0.5, sugarG: 1, sodiumMg: 190 }, tags: ['sauce', 'vegetable', 'vegan', 'vegetarian'] }),
  item({ id: 'generic-guacamole', name: 'Guacamole', category: 'Sauces + Extras', servingLabel: '2 tbsp', servingGrams: 30, nutrition: { calories: 45, proteinG: 0.5, carbsG: 2, fatG: 4, saturatedFatG: 0.5, fiberG: 1.5, sugarG: 0, sodiumMg: 75 }, tags: ['sauce', 'vegan', 'vegetarian'], aliases: ['guac'] }),
  item({ id: 'generic-ranch-dressing', name: 'Ranch Dressing', category: 'Sauces + Extras', servingLabel: '2 tbsp', servingGrams: 30, nutrition: { calories: 130, proteinG: 0.5, carbsG: 2, fatG: 13.5, saturatedFatG: 2, fiberG: 0, sugarG: 1.5, sodiumMg: 260 }, tags: ['dressing', 'vegetarian'], aliases: ['ranch'] }),
  item({ id: 'generic-honey', name: 'Honey', category: 'Sauces + Extras', servingLabel: '1 tbsp', servingGrams: 21, nutrition: { calories: 64, proteinG: 0, carbsG: 17, fatG: 0, saturatedFatG: 0, fiberG: 0, sugarG: 17, sodiumMg: 1 }, tags: ['vegetarian'] }),
  item({ id: 'generic-sugar', name: 'Sugar', category: 'Sauces + Extras', servingLabel: '1 tsp', servingGrams: 4, nutrition: { calories: 16, proteinG: 0, carbsG: 4, fatG: 0, saturatedFatG: 0, fiberG: 0, sugarG: 4, sodiumMg: 0 }, tags: ['vegan', 'vegetarian'] }),
];

/**
 * Likely-ingredient reconstructions for dishes without direct nutrition data.
 * Quantities approximate a single restaurant-style serving; every expanded
 * component is labelled a low-confidence estimate.
 */
export const DISH_TEMPLATES: readonly DishTemplate[] = [
  {
    id: 'template-paneer-tikka-masala',
    name: 'Paneer Tikka Masala',
    description: 'A likely-ingredient estimate: paneer simmered in a creamy tomato gravy. Actual restaurant versions vary widely in cream and oil.',
    components: [
      { foodId: 'generic-paneer', quantity: 1.5 },
      { foodId: 'generic-tomato-sauce', quantity: 1 },
      { foodId: 'generic-heavy-cream', quantity: 1 },
      { foodId: 'generic-butter', quantity: 1 },
      { foodId: 'generic-onion', quantity: 1 },
    ],
    aliases: ['paneer tikka masala', 'paneer makhani', 'paneer curry'],
  },
  {
    id: 'template-butter-chicken',
    name: 'Butter Chicken',
    description: 'A likely-ingredient estimate: chicken thigh in a buttery tomato-cream sauce.',
    components: [
      { foodId: 'generic-chicken-thigh', quantity: 1.5 },
      { foodId: 'generic-tomato-sauce', quantity: 1 },
      { foodId: 'generic-heavy-cream', quantity: 1 },
      { foodId: 'generic-butter', quantity: 1.5 },
      { foodId: 'generic-sugar', quantity: 1 },
    ],
    aliases: ['murgh makhani', 'chicken makhani'],
  },
  {
    id: 'template-chicken-tikka-masala',
    name: 'Chicken Tikka Masala',
    description: 'A likely-ingredient estimate: grilled chicken breast in spiced tomato-cream gravy.',
    components: [
      { foodId: 'generic-chicken-breast', quantity: 1.5 },
      { foodId: 'generic-tomato-sauce', quantity: 1 },
      { foodId: 'generic-heavy-cream', quantity: 1 },
      { foodId: 'generic-butter', quantity: 1 },
      { foodId: 'generic-onion', quantity: 0.5 },
    ],
    aliases: ['tikka masala'],
  },
  {
    id: 'template-chana-masala',
    name: 'Chana Masala',
    description: 'A likely-ingredient estimate: chickpeas in a spiced onion-tomato gravy.',
    components: [
      { foodId: 'generic-chickpeas', quantity: 1 },
      { foodId: 'generic-tomato-sauce', quantity: 1 },
      { foodId: 'generic-onion', quantity: 1 },
      { foodId: 'generic-olive-oil', quantity: 1 },
    ],
    aliases: ['chole', 'chickpea curry'],
  },
  {
    id: 'template-dal-tadka',
    name: 'Dal Tadka',
    description: 'A likely-ingredient estimate: tempered lentils with ghee, onion, and tomato.',
    components: [
      { foodId: 'generic-lentils', quantity: 1 },
      { foodId: 'generic-ghee', quantity: 1 },
      { foodId: 'generic-onion', quantity: 0.5 },
      { foodId: 'generic-tomato', quantity: 1 },
    ],
    aliases: ['dal fry', 'yellow dal', 'lentil curry'],
  },
  {
    id: 'template-palak-paneer',
    name: 'Palak Paneer',
    description: 'A likely-ingredient estimate: paneer in a creamed spinach gravy.',
    components: [
      { foodId: 'generic-paneer', quantity: 1 },
      { foodId: 'generic-spinach', quantity: 3 },
      { foodId: 'generic-heavy-cream', quantity: 0.5 },
      { foodId: 'generic-ghee', quantity: 1 },
      { foodId: 'generic-onion', quantity: 0.5 },
    ],
    aliases: ['saag paneer', 'spinach paneer'],
  },
  {
    id: 'template-vegetable-biryani',
    name: 'Vegetable Biryani',
    description: 'A likely-ingredient estimate: basmati rice layered with vegetables and ghee.',
    components: [
      { foodId: 'generic-basmati-rice', quantity: 1.5 },
      { foodId: 'generic-mixed-vegetables', quantity: 1 },
      { foodId: 'generic-ghee', quantity: 1.5 },
      { foodId: 'generic-onion', quantity: 0.5 },
    ],
    aliases: ['veg biryani', 'biryani'],
  },
  {
    id: 'template-aloo-gobi',
    name: 'Aloo Gobi',
    description: 'A likely-ingredient estimate: potato and cauliflower sauteed with oil and onion.',
    components: [
      { foodId: 'generic-potato', quantity: 1 },
      { foodId: 'generic-cauliflower', quantity: 1.5 },
      { foodId: 'generic-olive-oil', quantity: 1.5 },
      { foodId: 'generic-onion', quantity: 0.5 },
    ],
    aliases: ['potato cauliflower curry'],
  },
  {
    id: 'template-tofu-stir-fry',
    name: 'Vegetable Stir Fry with Tofu',
    description: 'A likely-ingredient estimate: tofu and mixed vegetables in a soy-based sauce.',
    components: [
      { foodId: 'generic-tofu', quantity: 1.5 },
      { foodId: 'generic-mixed-vegetables', quantity: 1.5 },
      { foodId: 'generic-soy-sauce', quantity: 2 },
      { foodId: 'generic-olive-oil', quantity: 1 },
    ],
    aliases: ['tofu stir fry', 'veggie stir fry'],
  },
  {
    id: 'template-chicken-burrito-bowl',
    name: 'Chicken Burrito Bowl',
    description: 'A likely-ingredient estimate for a homemade burrito bowl with rice, beans, chicken, and toppings.',
    components: [
      { foodId: 'generic-white-rice', quantity: 1 },
      { foodId: 'generic-black-beans', quantity: 0.5 },
      { foodId: 'generic-chicken-breast', quantity: 1 },
      { foodId: 'generic-salsa', quantity: 2 },
      { foodId: 'generic-guacamole', quantity: 1 },
      { foodId: 'generic-cheddar', quantity: 1 },
    ],
    aliases: ['burrito bowl', 'rice bowl'],
  },
];
