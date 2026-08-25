import { normalizeQuery, searchFatSecretFoods, type SearchCacheEntry, type SlimFatSecretFood } from './search.js';

export const ALLOWED_ORIGINS = new Set([
  'https://harsh.bet',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

export interface ProxyEnv {
  readonly consumerKey?: string;
  readonly sharedSecret?: string;
  readonly fetch?: typeof fetch;
  readonly now?: () => number;
  readonly cache?: Map<string, SearchCacheEntry>;
}

const defaultCache = new Map<string, SearchCacheEntry>();

function json(body: unknown, status: number, extra?: Headers): Response {
  const headers = extra ?? new Headers();
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers });
}

export function corsHeaders(origin: string | null): Headers {
  const headers = new Headers();
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Accept, Content-Type');
    headers.set('Access-Control-Max-Age', '86400');
  }
  return headers;
}

function publicFood(food: SlimFatSecretFood) {
  return {
    foodId: food.foodId,
    name: food.name,
    brand: food.brand,
    servingDescription: food.servingDescription,
    calories: food.calories,
    fatG: food.fatG,
    carbsG: food.carbsG,
    proteinG: food.proteinG,
    url: food.url,
  };
}

export async function handleFatSecretRequest(request: Request, env: ProxyEnv = {}): Promise<Response> {
  const origin = request.headers.get('Origin');
  const cors = corsHeaders(origin);

  if (request.method === 'OPTIONS') {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, cors);
  }

  const url = new URL(request.url);
  const query = normalizeQuery(url.searchParams.get('q') ?? url.searchParams.get('query') ?? '');
  const limitRaw = Number(url.searchParams.get('limit') ?? 12);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 12;

  if (query.length < 2) {
    return json({ error: 'Enter at least two characters before searching' }, 400, cors);
  }

  const consumerKey = env.consumerKey?.trim();
  const sharedSecret = env.sharedSecret?.trim();
  if (!consumerKey || !sharedSecret) {
    return json({ error: 'Brand catalog proxy is not configured' }, 503, cors);
  }

  try {
    const foods = await searchFatSecretFoods({
      query,
      limit,
      credentials: { consumerKey, sharedSecret },
      fetch: env.fetch,
      now: env.now,
      cache: env.cache ?? defaultCache,
    });
    return json({ query, foods: foods.map(publicFood) }, 200, cors);
  } catch {
    return json({ error: 'Brand catalog search failed' }, 502, cors);
  }
}
