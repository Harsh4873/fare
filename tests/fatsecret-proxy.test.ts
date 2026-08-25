import { describe, expect, it, vi } from 'vitest';
import { handleFatSecretRequest } from '../functions/src/handler';
import { parseFoodDescription, rankSlimFoods, slimFatSecretFood } from '../functions/src/search';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const rawFood = {
  food_id: '33810',
  food_name: 'Medium Hand Tossed Cheese',
  food_type: 'Brand',
  brand_name: "Domino's",
  food_url: 'https://www.fatsecret.com/calories-nutrition/dominos/medium-hand-tossed-cheese',
  food_description: 'Per 1 slice - Calories: 200kcal | Fat: 6.00g | Carbs: 28.00g | Protein: 8.00g',
};

describe('FatSecret description parser', () => {
  it('parses serving and macros from a Per-serving description', () => {
    expect(parseFoodDescription(rawFood.food_description)).toEqual({
      servingDescription: '1 slice',
      calories: 200,
      fatG: 6,
      carbsG: 28,
      proteinG: 8,
    });
  });

  it('slims a raw FatSecret food object', () => {
    expect(slimFatSecretFood(rawFood)).toMatchObject({
      foodId: '33810',
      name: 'Medium Hand Tossed Cheese',
      brand: "Domino's",
      servingDescription: '1 slice',
      calories: 200,
    });
  });

  it('ranks name-prefix matches ahead of extra-word variants without promoting meat', () => {
    const ranked = rankSlimFoods('panera mac and cheese', [
      { foodId: '2', name: 'Bacon Mac & Cheese - Bowl', brand: 'Panera Bread', foodType: 'Brand', calories: 1050 },
      { foodId: '1', name: 'Mac & Cheese - Cup', brand: 'Panera Bread', foodType: 'Brand', calories: 480 },
    ]);
    expect(ranked[0]?.name).toMatch(/^Mac & Cheese/i);
  });
});

describe('FatSecret proxy handler', () => {
  it('answers CORS preflight only for allowed origins', async () => {
    const allowed = await handleFatSecretRequest(new Request('http://127.0.0.1:8788/', {
      method: 'OPTIONS',
      headers: { Origin: 'https://harsh.bet' },
    }));
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://harsh.bet');

    const denied = await handleFatSecretRequest(new Request('http://127.0.0.1:8788/', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example' },
    }));
    expect(denied.status).toBe(403);
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('does not reflect a disallowed Origin on GET', async () => {
    const response = await handleFatSecretRequest(new Request('http://127.0.0.1:8788/?q=pizza', {
      headers: { Origin: 'https://evil.example' },
    }), {
      consumerKey: 'demo_consumer_key',
      sharedSecret: 'demo_shared_secret',
      fetch: async () => jsonResponse({ foods: { food: [] } }),
    });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('returns a slim list from a mocked FatSecret payload', async () => {
    const fetch = vi.fn(async (input: string | URL | Request) => {
      expect(String(input)).toContain('platform.fatsecret.com/rest/server.api');
      expect(String(input)).toContain('method=foods.search');
      expect(String(input)).toContain('oauth_signature=');
      return jsonResponse({ foods: { food: [rawFood] } });
    });
    const response = await handleFatSecretRequest(
      new Request('http://127.0.0.1:8788/?q=dominos%20pizza&limit=8', {
        headers: { Origin: 'http://localhost:5173' },
      }),
      {
        consumerKey: 'demo_consumer_key',
        sharedSecret: 'demo_shared_secret',
        fetch,
        cache: new Map(),
      },
    );
    expect(response.status).toBe(200);
    const body = await response.json() as { query: string; foods: Array<{ foodId: string; brand?: string }> };
    expect(body.query).toBe('dominos pizza');
    expect(body.foods[0]?.foodId).toBe('33810');
    expect(body.foods[0]?.brand).toBe("Domino's");
    expect(JSON.stringify(body)).not.toContain('demo_shared_secret');
    expect(JSON.stringify(body)).not.toContain('oauth_signature');
  });

  it('accepts a single foods.food object', async () => {
    const response = await handleFatSecretRequest(
      new Request('http://127.0.0.1:8788/?q=panera%20mac'),
      {
        consumerKey: 'demo_consumer_key',
        sharedSecret: 'demo_shared_secret',
        fetch: async () => jsonResponse({
          foods: {
            food: {
              food_id: '1',
              food_name: 'Mac & Cheese Cup',
              brand_name: 'Panera Bread',
              food_type: 'Brand',
              food_description: 'Per 1 cup - Calories: 470kcal | Fat: 30.00g | Carbs: 36.00g | Protein: 17.00g',
            },
          },
        }),
        cache: new Map(),
      },
    );
    const body = await response.json() as { foods: Array<{ name: string; brand?: string; calories?: number }> };
    expect(body.foods).toHaveLength(1);
    expect(body.foods[0]?.brand).toBe('Panera Bread');
    expect(body.foods[0]?.calories).toBe(470);
  });

  it('rejects short queries and missing credentials without leaking secrets', async () => {
    const short = await handleFatSecretRequest(new Request('http://127.0.0.1:8788/?q=p'));
    expect(short.status).toBe(400);
    const missing = await handleFatSecretRequest(new Request('http://127.0.0.1:8788/?q=pizza'));
    expect(missing.status).toBe(503);
    const text = await missing.text();
    expect(text).not.toMatch(/consumer_key|oauth_signature|demo_shared_secret/i);
    expect(text).toContain('not configured');
  });

  it('requires a bearer token when the production handler asks for auth', async () => {
    const denied = await handleFatSecretRequest(
      new Request('https://us-central1-pickledgerpro.cloudfunctions.net/fatsecretSearch?q=pizza', {
        headers: { Origin: 'https://harsh.bet' },
      }),
      {
        consumerKey: 'demo_consumer_key',
        sharedSecret: 'demo_shared_secret',
        requireAuth: true,
        verifyIdToken: async () => true,
        fetch: async () => jsonResponse({ foods: { food: [] } }),
      },
    );
    expect(denied.status).toBe(401);

    const allowed = await handleFatSecretRequest(
      new Request('https://us-central1-pickledgerpro.cloudfunctions.net/fatsecretSearch?q=pizza', {
        headers: { Origin: 'https://harsh.bet', Authorization: 'Bearer owner-token' },
      }),
      {
        consumerKey: 'demo_consumer_key',
        sharedSecret: 'demo_shared_secret',
        requireAuth: true,
        verifyIdToken: async (token) => token === 'owner-token',
        fetch: async () => jsonResponse({ foods: { food: [rawFood] } }),
        cache: new Map(),
      },
    );
    expect(allowed.status).toBe(200);
  });
});
