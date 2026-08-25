import type { Nutrition, NutritionDataQuality, NutritionProvenance } from './model';
import type { CatalogFood } from './food-catalog/types';

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface FatSecretFood {
  readonly foodId: string;
  readonly name: string;
  readonly brand?: string;
  readonly servingDescription?: string;
  readonly calories?: number;
  readonly fatG?: number;
  readonly carbsG?: number;
  readonly proteinG?: number;
  readonly url?: string;
}

export interface FatSecretSearchResult {
  readonly query: string;
  readonly foods: readonly FatSecretFood[];
}

export interface FatSecretClientOptions {
  readonly fetch?: FetchLike;
  readonly baseUrl?: string;
  readonly now?: () => number;
  readonly searchCacheMs?: number;
}

export interface ExplicitSearchOptions {
  readonly limit?: number;
  readonly signal?: AbortSignal;
}

interface CacheEntry<T> {
  readonly expiresAt: number;
  readonly value: T;
}

export class FatSecretUnavailableError extends Error {
  constructor(message = 'FatSecret brand search is not configured') {
    super(message);
    this.name = 'FatSecretUnavailableError';
  }
}

export class FatSecretRequestError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'FatSecretRequestError';
    this.status = status;
  }
}

export function resolveFatSecretProxyUrl(env: {
  VITE_FATSECRET_PROXY_URL?: string;
  DEV?: boolean;
} = import.meta.env): string | undefined {
  const fromEnv = env.VITE_FATSECRET_PROXY_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (env.DEV) return '/api/fatsecret';
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function number(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseFatSecretFood(raw: unknown): FatSecretFood | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const foodId = text(record.foodId) ?? text(record.food_id);
  const name = text(record.name) ?? text(record.food_name);
  if (!foodId || !name) return undefined;
  const url = text(record.url);
  return {
    foodId,
    name,
    brand: text(record.brand) ?? text(record.brand_name),
    servingDescription: text(record.servingDescription),
    calories: number(record.calories),
    fatG: number(record.fatG),
    carbsG: number(record.carbsG),
    proteinG: number(record.proteinG),
    url: url && /^https:/i.test(url) ? url : undefined,
  };
}

function qualityFor(food: FatSecretFood): { quality: NutritionDataQuality; warnings: string[] } {
  const macros = [food.calories, food.proteinG, food.carbsG, food.fatG].filter((value) => (value ?? 0) > 0).length;
  const warnings = [
    'FatSecret search values are per the listed serving. Sodium, fiber, and saturated fat are not included.',
  ];
  if (macros < 4) warnings.unshift('One or more core nutrition fields are missing.');
  return {
    quality: macros === 4 ? 'complete' : macros > 0 ? 'partial' : 'insufficient',
    warnings,
  };
}

export function fatSecretFoodToCatalog(food: FatSecretFood, fetchedAt: string): CatalogFood {
  const { quality, warnings } = qualityFor(food);
  const nutrition: Nutrition = {
    calories: Math.max(0, food.calories ?? 0),
    proteinG: Math.max(0, food.proteinG ?? 0),
    carbsG: Math.max(0, food.carbsG ?? 0),
    fatG: Math.max(0, food.fatG ?? 0),
    saturatedFatG: 0,
    fiberG: 0,
    sugarG: 0,
    sodiumMg: 0,
  };
  const provenance: NutritionProvenance = {
    kind: 'fatsecret',
    providerName: 'FatSecret',
    externalId: food.foodId,
    sourceUrl: food.url,
    fetchedAt,
    dataQuality: quality,
    warnings,
  };
  const label = food.servingDescription?.trim() || '1 serving';
  return {
    id: `fatsecret:${food.foodId}`,
    name: food.name,
    brand: food.brand,
    serving: { quantity: 1, unit: 'serving', label },
    nutritionPerServing: nutrition,
    provenance,
    categories: food.brand ? [food.brand] : [],
    detail: food.brand,
  };
}

export class FatSecretClient {
  private readonly fetch: FetchLike;
  private readonly now: () => number;
  private readonly baseUrl: string | undefined;
  private readonly searchCacheMs: number;
  private readonly searchCache = new Map<string, CacheEntry<FatSecretSearchResult>>();

  constructor(options: FatSecretClientOptions = {}) {
    const platformFetch = globalThis.fetch;
    if (!options.fetch && !platformFetch) {
      throw new Error('FatSecretClient requires fetch');
    }
    this.fetch = options.fetch ?? platformFetch as FetchLike;
    this.now = options.now ?? Date.now;
    this.baseUrl = ('baseUrl' in options ? options.baseUrl : resolveFatSecretProxyUrl())?.replace(/\/$/, '');
    this.searchCacheMs = options.searchCacheMs ?? 10 * 60_000;
  }

  /**
   * Call only after an explicit submit/tap. Fare does not query FatSecret while typing.
   */
  async searchOnSubmit(
    rawQuery: string,
    options: ExplicitSearchOptions = {},
  ): Promise<FatSecretSearchResult> {
    const query = rawQuery.trim().replace(/\s+/g, ' ');
    if (query.length < 2) {
      throw new RangeError('Enter at least two characters before searching');
    }
    if (!this.baseUrl) {
      throw new FatSecretUnavailableError();
    }
    const limit = Math.max(1, Math.min(20, Math.floor(options.limit ?? 8)));
    const cacheKey = `${query.toLocaleLowerCase()}|${limit}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expiresAt > this.now()) return cached.value;

    const href = this.baseUrl + "?q=" + encodeURIComponent(query) + "&limit=" + String(limit);

    const response = await this.fetch(href, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: options.signal,
    });
    if (!response.ok) {
      throw new FatSecretRequestError(`FatSecret proxy failed (${response.status})`, response.status);
    }
    const payload = asRecord(await response.json());
    const foods = (Array.isArray(payload?.foods) ? payload.foods : []).flatMap((raw) => {
      const food = parseFatSecretFood(raw);
      return food ? [food] : [];
    });
    const result: FatSecretSearchResult = Object.freeze({
      query: text(payload?.query) ?? query,
      foods: Object.freeze(foods),
    });
    this.searchCache.set(cacheKey, { value: result, expiresAt: this.now() + this.searchCacheMs });
    return result;
  }

  clearCache(): void {
    this.searchCache.clear();
  }
}
