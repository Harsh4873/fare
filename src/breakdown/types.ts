/**
 * Breakdown's shared contract.
 *
 * Breakdown answers "where do this meal's calories and macros actually come
 * from," so every value carries its source and an honest confidence level.
 * Restaurant data curated from official nutrition guides beats generic
 * equivalents; reconstructions and estimates are always labelled as such.
 */

import type { Nutrition } from '../model';

/** Where a nutrition value ultimately came from, best first. */
export type BreakdownSourceType =
  | 'restaurant-official'
  | 'usda-generic'
  | 'reconstruction'
  | 'estimate';

export type Confidence = 'high' | 'medium' | 'low';

/** Metrics the breakdown chart and table can pivot on. */
export type MetricKey =
  | 'calories'
  | 'proteinG'
  | 'carbsG'
  | 'fatG'
  | 'fiberG'
  | 'sodiumMg';

export const METRIC_KEYS: readonly MetricKey[] = [
  'calories',
  'proteinG',
  'carbsG',
  'fatG',
  'fiberG',
  'sodiumMg',
];

/**
 * Tags drive deterministic insights and dietary filtering. Keep this list
 * closed so rules stay predictable.
 */
export type FoodTag =
  | 'sauce'
  | 'dressing'
  | 'vegetable'
  | 'legume'
  | 'grain'
  | 'protein-main'
  | 'dairy'
  | 'cheese'
  | 'nut'
  | 'fruit'
  | 'oil'
  | 'vegan'
  | 'vegetarian'
  | 'spicy';

/** A food Breakdown can add to a meal, with per-serving nutrition. */
export interface BreakdownFood {
  /** Stable slug, prefixed by restaurant id for menu items ('salata-falafel'). */
  readonly id: string;
  readonly name: string;
  /** Present only for restaurant menu items. */
  readonly restaurantId?: string;
  /** Builder grouping; for restaurant items this must be one of the restaurant's categories. */
  readonly category: string;
  /** Human serving description: '2 oz ladle', '3 pieces', '1 tortilla'. */
  readonly servingLabel: string;
  /** Serving weight when known; enables calorie-density labels. */
  readonly servingGrams?: number;
  /** Per single serving. All eight keys present; use 0 when a value is unknown. */
  readonly nutrition: Nutrition;
  readonly sourceType: BreakdownSourceType;
  /** e.g. 'Salata nutrition guide', 'USDA FoodData Central'. */
  readonly sourceName: string;
  readonly sourceUrl?: string;
  readonly confidence: Confidence;
  /** YYYY-MM-DD the source value was last checked. */
  readonly lastVerified?: string;
  readonly tags?: readonly FoodTag[];
  /** Lowercase alternate names to help fuzzy matching. */
  readonly aliases?: readonly string[];
  /**
   * Serving multipliers worth offering when the portion itself is a guess
   * (e.g. [0.5, 1, 1.5] for an estimated 150 g paneer portion).
   */
  readonly portionOptions?: readonly number[];
}

/** A restaurant with curated official nutrition data. */
export interface Restaurant {
  readonly id: string;
  readonly name: string;
  readonly website: string;
  /** Where the official nutrition data lives. */
  readonly nutritionUrl: string;
  /** YYYY-MM-DD the dataset was last reconciled with the official guide. */
  readonly lastVerified: string;
  /** Ordered builder categories, e.g. ['Bases', 'Proteins', 'Toppings', 'Dressings']. */
  readonly categories: readonly string[];
  readonly items: readonly BreakdownFood[];
}

/**
 * A dish without direct nutrition data, reconstructed from likely generic
 * components. Always presented as a low-confidence estimate.
 */
export interface DishTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** foodId references items in the generic foods catalog. */
  readonly components: ReadonlyArray<{
    readonly foodId: string;
    readonly quantity: number;
  }>;
  readonly aliases?: readonly string[];
}

/** One line of a meal being analyzed: an embedded food snapshot times a quantity. */
export interface MealComponent {
  /** Instance id (createId('comp')); several components may share a food. */
  readonly id: string;
  /**
   * Embedded snapshot rather than a reference so a meal stays stable even if
   * the catalog changes underneath it.
   */
  readonly food: BreakdownFood;
  /** Serving multiplier; 2 means two servings of the food. */
  readonly quantity: number;
}

/** A saved Breakdown meal variant (local-only persistence). */
export interface BreakdownMeal {
  readonly id: string;
  readonly name: string;
  readonly restaurantId?: string;
  readonly components: readonly MealComponent[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Per-component analysis produced by the engine. */
export interface ComponentContribution {
  readonly component: MealComponent;
  /** Quantity-scaled nutrition for this component. */
  readonly nutrition: Nutrition;
  /** Fraction (0..1) of the meal total per metric; 0 when the meal total is 0. */
  readonly share: Readonly<Record<MetricKey, number>>;
  /** Grams of protein per 100 kcal; 0 when the component has no calories. */
  readonly proteinEfficiency: number;
  /** Grams of fiber per 100 kcal; 0 when the component has no calories. */
  readonly fiberEfficiency: number;
  /** kcal per gram, only when servingGrams is known. */
  readonly calorieDensity?: number;
  readonly densityLabel?: 'low' | 'medium' | 'high';
}

/** Whole-meal analysis: totals plus honest uncertainty. */
export interface MealAnalysis {
  readonly totals: Nutrition;
  /** Same order as the input components. */
  readonly contributions: readonly ComponentContribution[];
  /** Worst component confidence; 'high' for an empty meal. */
  readonly confidence: Confidence;
  /** Calorie range once per-component uncertainty is applied; low === high when exact. */
  readonly calorieRange: { readonly low: number; readonly high: number };
  /** True when any component is below high confidence. */
  readonly hasEstimates: boolean;
}

/** A deterministic, rule-generated insight about the analyzed meal. */
export interface Insight {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly tone: 'neutral' | 'positive' | 'warning';
}

/** Constraints for the deterministic optimizer. */
export interface OptimizeGoals {
  readonly maxCalories?: number;
  readonly minProteinG?: number;
  readonly minFiberG?: number;
  readonly maxSodiumMg?: number;
  /** Most components the optimizer may touch (1–3 keeps meals recognizable). */
  readonly maxChanges: number;
  /** Component ids the optimizer must never modify or remove. */
  readonly lockedComponentIds: readonly string[];
  readonly allowRemovals: boolean;
  readonly allowQuantityChanges: boolean;
  readonly allowSwaps: boolean;
  /** Swap candidates must carry every one of these tags (e.g. ['vegan']). */
  readonly requireTags?: readonly FoodTag[];
}

/** One concrete modification inside a suggestion. */
export interface OptimizeChange {
  readonly kind: 'remove' | 'quantity' | 'swap';
  readonly componentId: string;
  /** Human description: 'Spicy Chipotle Ranch ×2 → ×1'. */
  readonly description: string;
  readonly before: MealComponent;
  /** Absent for removals. */
  readonly after?: MealComponent;
}

/** A candidate modified meal, ranked best-first by the optimizer. */
export interface OptimizeSuggestion {
  readonly changes: readonly OptimizeChange[];
  /** The resulting meal components. */
  readonly components: readonly MealComponent[];
  readonly totals: Nutrition;
  /** Signed deltas vs the original meal. */
  readonly delta: Nutrition;
  readonly meetsAllGoals: boolean;
  /** Lower is better; internal ranking score, exposed for tests. */
  readonly score: number;
}

/** A free-text meal line after quantity extraction. */
export interface ParsedItem {
  /** Cleaned item text with quantity words removed. */
  readonly text: string;
  readonly quantity: number;
}

/** A parsed item resolved against the catalog. */
export interface MatchResult {
  readonly item: ParsedItem;
  /** Best food match, if any cleared the score threshold. */
  readonly food?: BreakdownFood;
  /** Matched dish reconstruction template, when one beats direct foods. */
  readonly template?: DishTemplate;
  /** 0..1 similarity of the winning match; 0 when nothing matched. */
  readonly score: number;
  /** Next-best distinct candidates, at most 3, for user correction. */
  readonly alternatives: readonly BreakdownFood[];
}

export const CONFIDENCE_ORDER: readonly Confidence[] = ['high', 'medium', 'low'];

/** Uncertainty multipliers applied to a component's calories, by confidence. */
export const CALORIE_RANGE_FACTORS: Readonly<
  Record<Confidence, { readonly low: number; readonly high: number }>
> = {
  high: { low: 1, high: 1 },
  medium: { low: 0.88, high: 1.12 },
  low: { low: 0.72, high: 1.32 },
};

export function worstConfidence(values: readonly Confidence[]): Confidence {
  let worst: Confidence = 'high';
  for (const value of values) {
    if (CONFIDENCE_ORDER.indexOf(value) > CONFIDENCE_ORDER.indexOf(worst)) worst = value;
  }
  return worst;
}
