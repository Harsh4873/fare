/**
 * Breakdown's food catalog registry.
 *
 * Restaurant datasets are curated from official published nutrition guides;
 * generic staples carry USDA-derived values; dish templates reconstruct
 * dishes from likely ingredients and are always labelled low confidence.
 */

import { createId } from '../../model';
import type {
  BreakdownFood,
  DishTemplate,
  MealComponent,
  Restaurant,
} from '../types';
import { CAVA } from './cava';
import { CHIPOTLE } from './chipotle';
import { GENERIC_FOODS, DISH_TEMPLATES } from './generic';
import { SALATA } from './salata';
import { SUBWAY } from './subway';
import { SWEETGREEN } from './sweetgreen';

export { GENERIC_FOODS, DISH_TEMPLATES };

export const RESTAURANTS: readonly Restaurant[] = [
  SALATA,
  CAVA,
  CHIPOTLE,
  SUBWAY,
  SWEETGREEN,
];

const foodIndex = new Map<string, BreakdownFood>();
for (const restaurant of RESTAURANTS) {
  for (const item of restaurant.items) foodIndex.set(item.id, item);
}
for (const item of GENERIC_FOODS) foodIndex.set(item.id, item);

export function restaurantById(id: string | undefined): Restaurant | undefined {
  return RESTAURANTS.find((restaurant) => restaurant.id === id);
}

export function foodById(id: string): BreakdownFood | undefined {
  return foodIndex.get(id);
}

export function allFoods(): readonly BreakdownFood[] {
  return [...foodIndex.values()];
}

/**
 * Foods a search should consider, in-context restaurant first so its menu
 * wins over generic equivalents.
 */
export function searchPool(restaurantId?: string): readonly BreakdownFood[] {
  const restaurant = restaurantById(restaurantId);
  if (!restaurant) return [...GENERIC_FOODS];
  return [...restaurant.items, ...GENERIC_FOODS];
}

/**
 * Expands a dish template into meal components, scaled by how many servings
 * of the dish were requested. The underlying values are USDA-derived, but the
 * dish composition itself is a guess, so every expanded component is
 * downgraded to a low-confidence reconstruction.
 */
export function expandTemplate(template: DishTemplate, multiplier = 1): MealComponent[] {
  const safeMultiplier = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  const components: MealComponent[] = [];
  for (const part of template.components) {
    const food = foodById(part.foodId);
    if (!food) continue;
    components.push({
      id: createId('comp'),
      quantity: Math.round(part.quantity * safeMultiplier * 100) / 100,
      food: {
        ...food,
        sourceType: 'reconstruction',
        confidence: 'low',
        sourceName: `Likely-ingredient estimate for ${template.name}`,
      },
    });
  }
  return components;
}
