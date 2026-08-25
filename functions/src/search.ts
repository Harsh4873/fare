import { signOAuth1Get, signedQueryString } from './oauth1.js';

export const FATSECRET_API_URL = 'https://platform.fatsecret.com/rest/server.api';

export interface SlimFatSecretFood {
  readonly foodId: string;
  readonly name: string;
  readonly brand?: string;
  readonly servingDescription?: string;
  readonly calories?: number;
  readonly fatG?: number;
  readonly carbsG?: number;
  readonly proteinG?: number;
  readonly url?: string;
  readonly foodType?: string;
}

export interface ParsedFoodDescription {
  readonly servingDescription?: string;
  readonly calories?: number;
  readonly fatG?: number;
  readonly carbsG?: number;
  readonly proteinG?: number;
}

export interface FatSecretCredentials {
  readonly consumerKey: string;
  readonly sharedSecret: string;
}

export interface SearchCacheEntry {
  readonly expiresAt: number;
  readonly foods: readonly SlimFatSecretFood[];
}

export interface SearchFoodsOptions {
  readonly query: string;
  readonly limit?: number;
  readonly credentials: FatSecretCredentials;
  readonly fetch?: typeof fetch;
  readonly now?: () => number;
  readonly cache?: Map<string, SearchCacheEntry>;
  readonly cacheMs?: number;
  readonly nonce?: string;
  readonly timestamp?: string;
}

const MAX_CACHE_ENTRIES = 50;
const DEFAULT_CACHE_MS = 10 * 60_000;

export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ');
}

export function parseFoodDescription(description: string): ParsedFoodDescription {
  const servingMatch = description.match(/^Per\s+(.+?)\s+-\s+/i);
  const numberFor = (label: string): number | undefined => {
    const match = description.match(new RegExp(`${label}:\\s*([\\d.]+)\\s*(?:kcal|g)`, 'i'));
    if (!match) return undefined;
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : undefined;
  };
  return {
    servingDescription: servingMatch?.[1]?.trim() || undefined,
    calories: numberFor('Calories'),
    fatG: numberFor('Fat'),
    carbsG: numberFor('Carbs'),
    proteinG: numberFor('Protein'),
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function foodList(payload: unknown): Record<string, unknown>[] {
  const foods = asRecord(asRecord(payload)?.foods)?.food;
  if (Array.isArray(foods)) {
    return foods.flatMap((item) => {
      const record = asRecord(item);
      return record ? [record] : [];
    });
  }
  const single = asRecord(foods);
  return single ? [single] : [];
}

export function slimFatSecretFood(raw: Record<string, unknown>): SlimFatSecretFood | undefined {
  const foodId = text(raw.food_id);
  const name = text(raw.food_name);
  if (!foodId || !name) return undefined;
  const parsed = text(raw.food_description) ? parseFoodDescription(text(raw.food_description) as string) : {};
  const url = text(raw.food_url);
  return {
    foodId,
    name,
    brand: text(raw.brand_name),
    servingDescription: parsed.servingDescription,
    calories: parsed.calories,
    fatG: parsed.fatG,
    carbsG: parsed.carbsG,
    proteinG: parsed.proteinG,
    url: url && /^https:/i.test(url) ? url : undefined,
    foodType: text(raw.food_type),
  };
}

function scoreFood(query: string, food: SlimFatSecretFood): number {
  const tokens = query.toLocaleLowerCase().split(/\s+/).filter((token) => token.length >= 2);
  const haystack = `${food.brand ?? ''} ${food.name}`.toLocaleLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) score += 10;
  }
  if (food.brand && tokens.some((token) => food.brand!.toLocaleLowerCase().includes(token))) score += 20;
  if (food.foodType === 'Brand') score += 8;
  if (tokens.some((token) => food.name.toLocaleLowerCase().startsWith(token))) score += 6;
  if ((food.calories ?? 0) > 0) score += 4;
  return score;
}

export function rankSlimFoods(query: string, foods: readonly SlimFatSecretFood[]): SlimFatSecretFood[] {
  return [...foods].sort((left, right) => {
    const delta = scoreFood(query, right) - scoreFood(query, left);
    return delta !== 0 ? delta : left.name.localeCompare(right.name);
  });
}

function cacheGet(cache: Map<string, SearchCacheEntry>, key: string, now: number): readonly SlimFatSecretFood[] | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= now) {
    cache.delete(key);
    return undefined;
  }
  return entry.foods;
}

function cacheSet(
  cache: Map<string, SearchCacheEntry>,
  key: string,
  foods: readonly SlimFatSecretFood[],
  now: number,
  cacheMs: number,
): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { foods, expiresAt: now + cacheMs });
}

export async function searchFatSecretFoods(options: SearchFoodsOptions): Promise<readonly SlimFatSecretFood[]> {
  const query = normalizeQuery(options.query);
  if (query.length < 2) throw new RangeError('Enter at least two characters before searching');
  const limit = Math.max(1, Math.min(20, Math.floor(options.limit ?? 12)));
  const now = options.now ?? Date.now;
  const current = now();
  const cacheKey = `${query.toLocaleLowerCase()}|${limit}`;
  const cached = options.cache ? cacheGet(options.cache, cacheKey, current) : undefined;
  if (cached) return cached;

  const fetchImpl = options.fetch ?? globalThis.fetch;
  const signed = await signOAuth1Get({
    url: FATSECRET_API_URL,
    params: {
      method: 'foods.search',
      search_expression: query,
      format: 'json',
      max_results: String(limit),
    },
    consumerKey: options.credentials.consumerKey,
    consumerSecret: options.credentials.sharedSecret,
    nonce: options.nonce ?? `${current.toString(16)}${Math.random().toString(16).slice(2, 10)}`,
    timestamp: options.timestamp ?? String(Math.floor(current / 1000)),
  });
  const url = `${FATSECRET_API_URL}?${signedQueryString(signed.signedParams)}`;
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error('FatSecret search failed');
  }
  const payload: unknown = await response.json();
  const foods = rankSlimFoods(
    query,
    foodList(payload).flatMap((raw) => {
      const food = slimFatSecretFood(raw);
      return food ? [food] : [];
    }),
  ).slice(0, limit);
  if (options.cache) cacheSet(options.cache, cacheKey, foods, current, options.cacheMs ?? DEFAULT_CACHE_MS);
  return foods;
}
