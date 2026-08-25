#!/usr/bin/env node
/**
 * Live FatSecret foods.search spike. Reads FATSECRET_CONSUMER_KEY and
 * FATSECRET_SHARED_SECRET from the environment only. Prints names/brands,
 * never credentials.
 */
import { handleFatSecretRequest } from '../functions/src/handler.ts';

const query = process.argv.slice(2).join(' ') || "Domino's Pizza";
const request = new Request(`http://127.0.0.1:8788/?q=${encodeURIComponent(query)}&limit=8`);
const response = await handleFatSecretRequest(request, {
  consumerKey: process.env.FATSECRET_CONSUMER_KEY,
  sharedSecret: process.env.FATSECRET_SHARED_SECRET,
});
const body = await response.json();
if (!response.ok) {
  console.error('status', response.status, body.error ?? 'failed');
  process.exit(1);
}
for (const food of body.foods ?? []) {
  const kcal = food.calories == null ? '' : `${food.calories} kcal`;
  console.log([food.brand, food.name, food.servingDescription, kcal].filter(Boolean).join(' · '));
}
console.log(`(${(body.foods ?? []).length} hits)`);
