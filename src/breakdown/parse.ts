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
};

const FILLER_WORDS = new Set(['of', 'the', 'my', 'some', 'please', 'order']);

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

function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return false;
  return bigramDice(a, b) >= FUZZY_TOKEN_THRESHOLD;
}

/**
 * 0..1 similarity: typo-tolerant token overlap blended with character
 * bigrams, plus a containment boost when every token of the shorter string
 * appears (fuzzily) in the longer one.
 */
export function similarity(a: string, b: string): number {
  const normalA = normalizeText(a);
  const normalB = normalizeText(b);
  if (!normalA || !normalB) return 0;
  if (normalA === normalB) return 1;

  const tokensA = normalA.split(' ');
  const tokensB = normalB.split(' ');
  const matchedB = new Set<number>();
  let matches = 0;
  for (const token of tokensA) {
    const index = tokensB.findIndex((candidate, position) =>
      !matchedB.has(position) && tokensMatch(token, candidate));
    if (index >= 0) {
      matchedB.add(index);
      matches += 1;
    }
  }
  const tokenDice = (2 * matches) / (tokensA.length + tokensB.length);
  const charDice = bigramDice(normalA, normalB);
  let score = 0.55 * tokenDice + 0.45 * charDice;

  const shorter = tokensA.length <= tokensB.length ? tokensA : tokensB;
  const contained = shorter.length > 0 && matches >= shorter.length;
  if (contained) score = Math.min(1, score + 0.15);
  return Math.min(1, score);
}

function clampQuantity(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.min(10, Math.max(0.25, value));
}

function extractQuantity(segment: string): ParsedItem | undefined {
  let text = segment.trim();
  let quantity: number | undefined;

  const patterns: Array<{ regex: RegExp; pick: (match: RegExpMatchArray) => number }> = [
    { regex: /^x\s*(\d+(?:\.\d+)?)\s+/i, pick: (match) => Number(match[1]) },
    { regex: /^(\d+)\s*\/\s*(\d+)\s+/, pick: (match) => Number(match[1]) / Number(match[2]) },
    { regex: /^(\d+(?:\.\d+)?)\s*x\s+/i, pick: (match) => Number(match[1]) },
    { regex: /^(\d+(?:\.\d+)?)\s+/, pick: (match) => Number(match[1]) },
    { regex: /\s+x\s*(\d+(?:\.\d+)?)$/i, pick: (match) => Number(match[1]) },
    { regex: /\s+(\d+(?:\.\d+)?)\s*x$/i, pick: (match) => Number(match[1]) },
  ];
  for (const { regex, pick } of patterns) {
    const match = text.match(regex);
    if (match) {
      quantity = pick(match);
      text = text.replace(regex, ' ').trim();
      break;
    }
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
