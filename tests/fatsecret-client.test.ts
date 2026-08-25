import { describe, expect, it, vi } from 'vitest';
import {
  FatSecretClient,
  FatSecretUnavailableError,
  fatSecretFoodToCatalog,
  resolveFatSecretProxyUrl,
} from '../src/fatsecret';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const slimFood = {
  foodId: '33810',
  name: 'Medium Hand Tossed Cheese',
  brand: "Domino's",
  servingDescription: '1 slice',
  calories: 200,
  fatG: 6,
  carbsG: 28,
  proteinG: 8,
  url: 'https://www.fatsecret.com/calories-nutrition/dominos/medium-hand-tossed-cheese',
};

describe('FatSecretClient', () => {
  it('searches only through searchOnSubmit and caches the exact query', async () => {
    const fetch = vi.fn(async (_input: string | URL | Request) => jsonResponse({
      query: "Domino's Pizza",
      foods: [slimFood],
    }));
    const client = new FatSecretClient({
      fetch,
      baseUrl: 'http://127.0.0.1:8788',
      now: () => 1,
    });
    const first = await client.searchOnSubmit("  Domino's   Pizza ", { limit: 8 });
    const second = await client.searchOnSubmit("Domino's Pizza", { limit: 8 });
    expect(first.foods).toHaveLength(1);
    expect(second).toBe(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toContain('http://127.0.0.1:8788');
    expect(String(fetch.mock.calls[0][0])).toContain('q=Domino');
    expect(String(fetch.mock.calls[0][0])).not.toContain('platform.fatsecret.com');
    expect(String(fetch.mock.calls[0][0])).not.toContain('oauth');
    await expect(client.searchOnSubmit('x')).rejects.toThrow(/at least two/i);
  });

  it('has no typeahead or keystroke search method', () => {
    const client = new FatSecretClient({ fetch: async () => jsonResponse({ foods: [] }), baseUrl: 'http://127.0.0.1:8788' });
    expect('searchAsYouType' in client).toBe(false);
    expect('autocomplete' in client).toBe(false);
    expect(typeof client.searchOnSubmit).toBe('function');
  });

  it('throws when no proxy URL is configured', async () => {
    const client = new FatSecretClient({
      fetch: async () => jsonResponse({ foods: [] }),
      baseUrl: undefined,
    });
    await expect(client.searchOnSubmit('pizza')).rejects.toBeInstanceOf(FatSecretUnavailableError);
  });

  it('maps slim foods to catalog items with FatSecret provenance', () => {
    const item = fatSecretFoodToCatalog(slimFood, '2026-08-25T00:00:00.000Z');
    expect(item.id).toBe('fatsecret:33810');
    expect(item.brand).toBe("Domino's");
    expect(item.serving.label).toBe('1 slice');
    expect(item.nutritionPerServing).toMatchObject({ calories: 200, fatG: 6, carbsG: 28, proteinG: 8, sodiumMg: 0 });
    expect(item.provenance).toMatchObject({
      kind: 'fatsecret',
      providerName: 'FatSecret',
      externalId: '33810',
      dataQuality: 'complete',
    });
  });

  it('uses the production env URL and otherwise only a local dev path', () => {
    expect(resolveFatSecretProxyUrl({ VITE_FATSECRET_PROXY_URL: ' https://example.invalid/search/ ' })).toBe('https://example.invalid/search');
    expect(resolveFatSecretProxyUrl({ DEV: true })).toBe('/api/fatsecret');
    expect(resolveFatSecretProxyUrl({ DEV: false })).toBeUndefined();
  });
});
