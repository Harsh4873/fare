/**
 * Free-text meal parsing for Breakdown.
 *
 * Splits "salata wrap, falafel and 2 spicy chipotle ranch" into quantified
 * items, then fuzzy-matches each against the catalog. Matching is
 * deterministic string similarity — typo-tolerant token overlap blended with
 * character bigrams — never an AI guess.
 */

import type {
  BreakdownFood,
  DishTemplate,
  MatchResult,
  ParsedItem,
} from './types';

const ACCEPT_THRESHOLD = 0.55;
const ALTERNATIVE_THRESHOLD = 0.35;
const TEMPLATE_THRESHOLD = 0.6;
const RESTAURANT_BOOST = 0.12;
const FUZZY_TOKEN_THRESHOLD = 0.66;

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  double: 2,
  triple: 3,
  half: 0.5,
  /** A footlong is two 6-inch servings in the Subway dataset. */
  footlong: 2,
};

const FILLER_WORDS = new Set(['of', 'the', 'my', 'some', 'please', 'order']);

/**
 * Size and weight descriptors: a bare number followed by one of these is a
 * measurement ("6 inch turkey", "4 oz chicken"), not a serving count.
 */
const UNIT_WORDS = new Set([
  'inch', 'inches', 'in', 'cm', 'mm',
  'oz', 'ounce', 'ounces',
  'g', 'gram', 'grams', 'kg',
  'lb', 'lbs', 'pound', 'pounds',
  'ml', 'liter', 'litre',
]);

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9./\s-]+/g, ' ')
    .replace(/[-/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bigrams(value: string): Map<string, number> {
  const grams = new Map<string, number>();
  const compact = value.replace(/\s+/g, '');
  for (let index = 0; index < compact.length - 1; index += 1) {
    const gram = compact.slice(index, index + 2);
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }
  return grams;
}

function bigramDice(a: string, b: string): number {
  if (a === b) return 1;
  const gramsA = bigrams(a);
  const gramsB = bigrams(b);
  let sizeA = 0;
  let sizeB = 0;
  let overlap = 0;
  for (const count of gramsA.values()) sizeA += count;
  for (const count of gramsB.values()) sizeB += count;
  if (sizeA === 0 || sizeB === 0) return a === b ? 1 : 0;
  for (const [gram, count] of gramsA) {
    overlap += Math.min(count, gramsB.get(gram) ?? 0);
  }
  return (2 * overlap) / (sizeA + sizeB);
}

/**
 * Token-level fuzzy quality: 1 for equality, the bigram overlap for a
 * plausible typo (same first letter, length 3+), 0 otherwise. The first-letter
 * guard stops accidental near-anagrams ("tea" vs "steak", "salata" vs
 * "kalamata") from counting as typo matches.
 */
function tokenQuality(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 3 || b.length < 3) return 0;
  if (a[0] !== b[0]) return 0;
  const dice = bigramDice(a, b);
  return dice >= FUZZY_TOKEN_THRESHOLD ? dice : 0;
}

/**
 * 0..1 similarity: typo-tolerant token overlap (fuzzy hits earn partial
 * credit, so a marginal typo never counts like an exact word) blended with
 * character bigrams. A containment boost applies when every token of the
 * shorter string appears in the longer one — for a single-token query only
 * when it matched exactly. Only normalized-equal strings reach 1.0 outright.
 */
export function similarity(a: string, b: string): number {
  const normalA = normalizeText(a);
  const normalB = normalizeText(b);
  if (!normalA || !normalB) return 0;
  if (normalA === normalB) return 1;

  const tokensA = normalA.split(' ');
  const tokensB = normalB.split(' ');
  const matchedB = new Set<number>();
  let matchCount = 0;
  let qualitySum = 0;
  let allExact = true;
  for (const token of tokensA) {
    let bestIndex = -1;
    let bestQuality = 0;
    tokensB.forEach((candidate, position) => {
      if (matchedB.has(position)) return;
      const quality = tokenQuality(token, candidate);
      if (quality > bestQuality) {
        bestQuality = quality;
        bestIndex = position;
      }
    });
    if (bestIndex >= 0) {
      matchedB.add(bestIndex);
      matchCount += 1;
      qualitySum += bestQuality;
      if (bestQuality < 1) allExact = false;
    }
  }
  const tokenDice = (2 * qualitySum) / (tokensA.length + tokensB.length);
  const charDice = bigramDice(normalA, normalB);
  let score = 0.55 * tokenDice + 0.45 * charDice;

  const shorterLength = Math.min(tokensA.length, tokensB.length);
  const contained = shorterLength > 0 && matchCount >= shorterLength;
  const boostAllowed = shorterLength > 1 || (contained && allExact);
  if (contained && boostAllowed) score = Math.min(1, score + 0.15);
  return Math.min(1, score);
}

function clampQuantity(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.min(10, Math.max(0.25, value));
}

function extractQuantity(segment: string): ParsedItem | undefined {
  let text = segment.trim();
  let quantity: number | undefined;

  const patterns: Array<{
    regex: RegExp;
    pick: (match: RegExpMatchArray) => number;
    bareNumber?: boolean;
  }> = [
    { regex: /^x\s*(\d+(?:\.\d+)?)\s+/i, pick: (match) => Number(match[1]) },
    { regex: /^(\d+)\s*\/\s*(\d+)\s+/, pick: (match) => Number(match[1]) / Number(match[2]) },
    { regex: /^(\d+(?:\.\d+)?)\s*x\s+/i, pick: (match) => Number(match[1]) },
    { regex: /^(\d+(?:\.\d+)?)\s+/, pick: (match) => Number(match[1]), bareNumber: true },
    { regex: /\s+x\s*(\d+(?:\.\d+)?)$/i, pick: (match) => Number(match[1]) },
    { regex: /\s+(\d+(?:\.\d+)?)\s*x$/i, pick: (match) => Number(match[1]) },
  ];
  for (const { regex, pick, bareNumber } of patterns) {
    const match = text.match(regex);
    if (!match) continue;
    const remainder = text.replace(regex, ' ').trim();
    if (bareNumber) {
      const nextToken = normalizeText(remainder).split(' ')[0];
      if (nextToken && UNIT_WORDS.has(nextToken)) {
        // "6 inch turkey" is a size, not six servings: drop the measurement
        // and keep a single serving.
        text = remainder.slice(remainder.toLowerCase().indexOf(nextToken) + nextToken.length).trim() || remainder;
        break;
      }
    }
    quantity = pick(match);
    text = remainder;
    break;
  }

  let tokens = normalizeText(text).split(' ').filter(Boolean);
  if (quantity === undefined && tokens.length > 1) {
    const word = NUMBER_WORDS[tokens[0]];
    if (word !== undefined) {
      quantity = word;
      tokens = tokens.slice(1);
    }
  }
  tokens = tokens.filter((token) => !FILLER_WORDS.has(token));
  const cleaned = tokens.join(' ');
  if (!cleaned || /^[\d.\s]+$/.test(cleaned)) return undefined;
  return { text: cleaned, quantity: clampQuantity(quantity ?? 1) };
}

export function parseMealText(input: string): readonly ParsedItem[] {
  return input
    .split(/\r?\n|,|;|&|\+/)
    .flatMap((piece) => piece.split(/\s+(?:and|with|plus)\s+/i))
    .map(extractQuantity)
    .filter((item): item is ParsedItem => Boolean(item));
}

function foodScore(text: string, food: BreakdownFood): number {
  let bestScore = similarity(text, food.name);
  for (const alias of food.aliases ?? []) {
    bestScore = Math.max(bestScore, similarity(text, alias));
  }
  return bestScore;
}

function templateScore(text: string, template: DishTemplate): number {
  let bestScore = similarity(text, template.name);
  for (const alias of template.aliases ?? []) {
    bestScore = Math.max(bestScore, similarity(text, alias));
  }
  return bestScore;
}

export interface MatchOptions {
  readonly restaurantId?: string;
  readonly foods: readonly BreakdownFood[];
  readonly templates?: readonly DishTemplate[];
}

export function matchItems(
  items: readonly ParsedItem[],
  options: MatchOptions,
): readonly MatchResult[] {
  return items.map((item) => {
    const scored = options.foods
      .map((food) => {
        const raw = foodScore(item.text, food);
        const boosted = options.restaurantId && food.restaurantId === options.restaurantId
          ? Math.min(1, raw + RESTAURANT_BOOST)
          : raw;
        return { food, score: boosted };
      })
      .sort((left, right) =>
        right.score - left.score ||
        Number(right.food.restaurantId === options.restaurantId) -
          Number(left.food.restaurantId === options.restaurantId) ||
        left.food.id.localeCompare(right.food.id));

    const bestFood = scored[0];
    let bestTemplate: { template: DishTemplate; score: number } | undefined;
    for (const template of options.templates ?? []) {
      const score = templateScore(item.text, template);
      if (score >= TEMPLATE_THRESHOLD && (!bestTemplate || score > bestTemplate.score)) {
        bestTemplate = { template, score };
      }
    }

    if (bestTemplate && bestTemplate.score > (bestFood?.score ?? 0)) {
      return {
        item,
        template: bestTemplate.template,
        score: bestTemplate.score,
        alternatives: scored
          .filter((entry) => entry.score >= ALTERNATIVE_THRESHOLD)
          .slice(0, 3)
          .map((entry) => entry.food),
      };
    }

    const accepted = bestFood && bestFood.score >= ACCEPT_THRESHOLD ? bestFood : undefined;
    const alternatives = scored
      .filter((entry) =>
        entry.score >= ALTERNATIVE_THRESHOLD &&
        entry.food.id !== accepted?.food.id)
      .slice(0, 3)
      .map((entry) => entry.food);

    return {
      item,
      food: accepted?.food,
      score: bestFood?.score ?? 0,
      alternatives,
    };
  });
}
