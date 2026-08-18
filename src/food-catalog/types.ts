import type { Nutrition, NutritionProvenance, Serving } from '../model';

/** A food from USDA, a restaurant guide, or Open Food Facts, ready to log. */
export interface CatalogFood {
  readonly id: string;
  readonly name: string;
  readonly brand?: string;
  readonly serving: Serving;
  readonly nutritionPerServing: Nutrition;
  readonly provenance: NutritionProvenance;
  readonly categories: readonly string[];
  readonly aliases?: readonly string[];
  readonly barcode?: string;
  readonly imageUrl?: string;
  readonly detail?: string;
}

export interface UsdaFoodRecord {
  readonly id: number;
  readonly name: string;
  readonly originalName?: string;
  readonly category: string;
  readonly quantity: number;
  readonly unit: string;
  readonly label: string;
  readonly calories: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
  readonly saturatedFatG: number;
  readonly fiberG: number;
  readonly sugarG: number;
  readonly sodiumMg: number;
}
