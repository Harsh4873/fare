/**
 * Ovo-lacto gate for every food Fare can offer.
 * Eggs, dairy, and honey stay. Meat, poultry, fish, shellfish, and gelatin do not.
 *
 * A diet word such as "vegetarian" never clears the rest of the name.
 * "Meatless" and a trailing USDA qualifier ("hot dog, vegetarian") mark a
 * substitute. "No meat" only means the pieces were left out, so broth dishes
 * and named animal foods still fail.
 */

export function normalizeDietText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`ʼ]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const HARD_REJECT = [
  'gelatin',
  'gelatine',
  'gelatina',
  'aspic',
  'isinglass',
  'collagen',
  'colageno',
  'jello',
  'jell o',
  'worcestershire',
  'anchovy',
  'anchovies',
  'fish sauce',
  'oyster sauce',
  'caesar',
] as const;

/** Candy names that are gelatin unless the name itself says otherwise. */
const GELATIN_CANDY = [
  'marshmallow',
  'gummy',
  'gummi',
  'fruit snack',
  'nougat',
  'candy nfs',
] as const;

const ANIMAL_TERMS = [
  'chicken',
  'turkey',
  'duck',
  'goose',
  'geese',
  'quail',
  'pheasant',
  'poultry',
  'fowl',
  'hen',
  'beef',
  'steak',
  'beefsteak',
  'ribeye',
  'rib eye',
  'filet mignon',
  'fillet mignon',
  'porterhouse',
  'sirloin',
  'tenderloin',
  'new york strip',
  't bone',
  'tbone',
  'prime rib',
  'short rib',
  'spare rib',
  'sparerib',
  'baby back',
  'babyback',
  'riblet',
  'rib',
  'mcrib',
  'oxtail',
  'ox tail',
  'pork',
  'bacon',
  'ham',
  'sausage',
  'pepperoni',
  'salami',
  'prosciutto',
  'chorizo',
  'pancetta',
  'guanciale',
  'bresaola',
  'mortadella',
  'pastrami',
  'capicola',
  'coppa',
  'nduja',
  'speck',
  'lardon',
  'brisket',
  'meatball',
  'meatloaf',
  'meat loaf',
  'lamb',
  'mutton',
  'veal',
  'venison',
  'bison',
  'goat',
  'rabbit',
  'caribou',
  'deer',
  'kielbasa',
  'bratwurst',
  'frankfurter',
  'wiener',
  'bologna',
  'liverwurst',
  'liver',
  'scrapple',
  'carnitas',
  'barbacoa',
  'andouille',
  'merguez',
  'gyro',
  'kebab',
  'kabob',
  'kabab',
  'seekh',
  'lard',
  'tallow',
  'suet',
  'schmaltz',
  'foie gras',
  'foie',
  'crackling',
  'chitterling',
  'chicharron',
  'tripe',
  'gizzard',
  'sweetbread',
  'offal',
  'jerky',
  'fat back',
  'fatback',
  'dripping',
  'animal fat',
  'head cheese',
  'hamburger',
  'cheeseburger',
  'chiliburger',
  'whopper',
  'big mac',
  'mcdouble',
  'mcnugget',
  'quarter pounder',
  'sloppy joe',
  'corn dog',
  'reuben',
  'spam',
  'pig in a blanket',
  'cuban sandwich',
  'french dip',
  'club sandwich',
  'barbecue sandwich',
  'bbq sandwich',
  'italian sandwich',
  'italian sub',
  'hot dog',
  'buffalo wing',
  'hot wing',
  'boneless wing',
  'carne',
  'cerdo',
  'jamon',
  'al pastor',
  'carbonara',
  'bolognese',
  'shepherd s pie',
  'shepherds pie',
  'fish',
  'seafood',
  'shellfish',
  'salmon',
  'tuna',
  'cod',
  'tilapia',
  'halibut',
  'trout',
  'haddock',
  'pollock',
  'catfish',
  'swordfish',
  'mahi',
  'sardine',
  'eel',
  'herring',
  'mackerel',
  'snapper',
  'grouper',
  'seabass',
  'sea bass',
  'bass',
  'perch',
  'pike',
  'carp',
  'flounder',
  'caviar',
  'surimi',
  'shrimp',
  'prawn',
  'crab',
  'lobster',
  'clam',
  'mussel',
  'oyster',
  'scallop',
  'squid',
  'octopus',
  'calamari',
  'crawfish',
  'crayfish',
  'langoustine',
  'scampi',
  'bonito',
  'katsuobushi',
  'dashi',
  'crustacean',
  'mollusc',
  'mollusk',
  'roe',
  'escargot',
  'snail',
  'frog leg',
  'tongue',
  'mincemeat',
  'meat',
  'gravy',
  'broth',
  'bone broth',
  'bone stock',
  'nam pla',
  'nuoc mam',
  'pescado',
  'lox',
  'gravlax',
  'unagi',
] as const;

const SAFE_PHRASES = [
  'cape cod',
  'crackers oyster',
  'oyster cracker',
  'oyster mushroom',
  'goat milk',
  'goat cheese',
  'goat yogurt',
  'goat kefir',
  'goat butter',
  'cheese goat',
  'duck sauce',
  'duck egg',
  'goose egg',
  'quail egg',
  'gooseberry',
  'gooseberries',
  'hamburger bun',
  'hamburger roll',
  'hot dog bun',
  'buffalo mozzarella',
  'buffalo milk',
  'vegetable broth',
  'veggie broth',
  'mushroom broth',
  'miso broth',
  'tomato broth',
  'tomato gravy',
  'meat alternative',
  'meat substitute',
  'meat analog',
  'beefsteak tomato',
  'little caesars',
  'hen of the woods',
  'lambs lettuce',
  'lamb lettuce',
] as const;

/** Whole USDA survey categories that are meat, poultry, or seafood. */
export const EXCLUDED_USDA_CATEGORIES = new Set([
  'Meat mixed dishes',
  'Chicken, whole pieces',
  'Poultry mixed dishes',
  'Fish',
  'Seafood mixed dishes',
  'Deli and cured meat sandwiches',
  'Cold cuts and cured meats',
  'Turkey, duck, other poultry',
  'Shellfish',
  'Pork',
  'Sausages',
  'Chicken fillet sandwiches',
  'Meat and BBQ sandwiches',
  'Seafood sandwiches',
  'Lamb, goat, game',
  'Chicken patties, nuggets and tenders',
  'Liver and organ meats',
  'Baby food: meat and dinners',
  'Bacon',
  'Ground beef',
  'Frankfurters',
  'Beef, excludes ground',
]);

const IRREGULAR_PLURALS: Readonly<Record<string, readonly string[]>> = {
  fish: ['fishes'],
  octopus: ['octopi'],
  tomato: ['tomatoes'],
  goose: ['geese'],
  chicharron: ['chicharrones'],
};

function inflect(term: string): string[] {
  const parts = term.split(' ');
  const last = parts.at(-1) ?? term;
  const head = parts.slice(0, -1);
  const lasts = new Set<string>([last]);
  if (/(?:s|x|z|ch|sh)$/.test(last)) lasts.add(`${last}es`);
  else if (/[^aeiou]y$/.test(last)) lasts.add(`${last.slice(0, -1)}ies`);
  else if (!last.endsWith('s')) lasts.add(`${last}s`);
  for (const extra of IRREGULAR_PLURALS[last] ?? []) lasts.add(extra);
  return [...lasts].map((item) => [...head, item].join(' '));
}

function termPattern(terms: readonly string[], flags = 'i'): RegExp {
  const variants = new Set<string>();
  for (const term of terms) {
    for (const variant of inflect(term)) variants.add(variant);
  }
  const body = [...variants]
    .sort((left, right) => right.length - left.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'))
    .join('|');
  return new RegExp(`\\b(?:${body})\\b`, flags);
}

const hardRejectPattern = termPattern(HARD_REJECT);
const animalPattern = termPattern(ANIMAL_TERMS);
const gelatinCandyPattern = termPattern(GELATIN_CANDY);
const safePhrasePattern = termPattern(SAFE_PHRASES, 'gi');

function stripSafePhrases(text: string): string {
  safePhrasePattern.lastIndex = 0;
  return text.replace(safePhrasePattern, ' ').replace(/\s+/g, ' ').trim();
}

/** Removes negated diet claims so the word "vegetarian" cannot waive the rest. */
function withoutDietNegations(text: string): string {
  return text
    .replace(/\bnon vegetarians?\b/g, ' ')
    .replace(/\bnon vegans?\b/g, ' ')
    .replace(/\bnot suitable for vegetarians?\b/g, ' ')
    .replace(/\bunsuitable for vegetarians?\b/g, ' ')
    .replace(/\bnot suitable for vegans?\b/g, ' ')
    .replace(/\bunsuitable for vegans?\b/g, ' ')
    .replace(/\bnot an? vegetarians?\b/g, ' ')
    .replace(/\bnot an? vegans?\b/g, ' ')
    .replace(/\bisn?t vegetarians?\b/g, ' ')
    .replace(/\bisn?t vegans?\b/g, ' ')
    .replace(/\bnot vegetarians?\b/g, ' ')
    .replace(/\bnot vegans?\b/g, ' ')
    .replace(/\bnot plant based\b/g, ' ')
    .replace(/\bisn?t plant based\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasMeatlessFlag(text: string): boolean {
  return /\b(?:meatless|meat free)\b/.test(text);
}

/**
 * USDA splits a substitute with a comma: "Hot dog sandwich, vegetarian, on bun".
 * A leading claim such as "vegetarian chicken" is not its own segment, so the
 * animal word still counts.
 */
function hasDietSegment(value: string): boolean {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .split(',')
    .some((segment) => {
      const text = segment.replace(/[''`ʼ]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
      return text === 'vegetarian' || text === 'vegan' || text === 'plant based';
    });
}

/** "Vegetarian hot dog" is the whole name. Extra words, such as a brand's chicken, still count. */
function isNamedHotDogSubstitute(text: string): boolean {
  return /^(?:vegetarian|vegan|veggie|plant based)\s+hot dogs?$/.test(text);
}

function cancelsAnimalTerms(original: string, text: string): boolean {
  return hasMeatlessFlag(text) || hasDietSegment(original) || isNamedHotDogSubstitute(text);
}

function waivesInferredDish(text: string): boolean {
  return /\b(?:meatless|meat free|no meat|vegan|vegetarian|plant based|veggie|vegetable)\b/.test(text);
}

function waivesBrothDish(text: string): boolean {
  return /\b(?:meatless|meat free|vegan|vegetarian|plant based|veggie|vegetable)\b/.test(text);
}

function waivesGelatinCandy(text: string): boolean {
  return /\b(?:vegan|vegetarian|plant based|gelatin free)\b/.test(text);
}

function hasGelatinAdditive(text: string): boolean {
  return /\be\s*441\b/.test(text);
}

/** "Gelificante" is gelatin unless the same text names a plant gelling agent. */
function hasAnimalGellingWord(text: string): boolean {
  if (!/\b(?:gelificante|gelifiant)\b/.test(text)) return false;
  return !/\b(?:pectin|pectina|agar|carrageenan|carragenina|gellan|konjac|xanthan|guar)\b/.test(text);
}

const CHILI_WORD = '(?:chilies|chillies|chilis|chillis|chili|chilli)';

function isLegumeOrVegetableChili(text: string): boolean {
  const food = '(?:beans?|lentils?|veggies|veggie|vegetables|vegetable)';
  const count = '(?:(?:three|3|two|2|four|4|five|5)\\s+)?';
  const leading = new RegExp(`\\b${count}${food}\\s+${CHILI_WORD}\\b`);
  const trailing = new RegExp(`\\b${CHILI_WORD}\\s+${food}\\b`);
  return leading.test(text) || trailing.test(text);
}

function isMeatChili(text: string): boolean {
  if (!new RegExp(`\\b${CHILI_WORD}\\b`).test(text)) return false;
  if (/\bsalsas?\b/.test(text)) return false;
  if (new RegExp(`\\b${CHILI_WORD}\\s+(?:peppers?|sauces?|oils?|paste|flakes?|powder|crisps?|garlic|corn)\\b`).test(text)) {
    return false;
  }
  if (new RegExp(`\\b(?:sweet|hot|thai|schezwan|szechuan)\\s+${CHILI_WORD}\\b`).test(text)) return false;
  if (isLegumeOrVegetableChili(text)) return false;
  return true;
}

function isAnimalBrothDish(text: string): boolean {
  if (/\bpho\b/.test(text)) return true;
  if (/\begg drop\b/.test(text)) return true;
  if (/\bborscht\b/.test(text)) return true;
  if (/\bmiso\b/.test(text) && /\bsoups?\b/.test(text)) return true;
  if (/\bfrench onion\b/.test(text) && /\bsoups?\b/.test(text)) return true;
  if (/\bseaweeds?\b/.test(text) && /\bsoups?\b/.test(text)) return true;
  return false;
}

function isUnlabeledAnimalDish(text: string): boolean {
  if (/\bsushi\b/.test(text) && !/\b(avocado|vegetable|veggie|cucumber|egg|tofu|tamago)\b/.test(text)) {
    return true;
  }
  if (/\bcalifornia\b/.test(text) && /\b(sushi|roll)\b/.test(text)) return true;
  if (/\bwonton\b/.test(text) && !/\bcrackers?\b/.test(text)) return true;
  if (/\bbao bun\b/.test(text)) return true;
  if (/\b(pad thai|lo mein|gumbo|paella)\b/.test(text)) return true;
  if (/\bchow mein\b/.test(text) && !/\b(noodles?|crackers?)\b/.test(text)) return true;
  if (/\bramen bowl\b/.test(text) || /\bramen noodles\b/.test(text)) return true;
  if (/\brice fried\b/.test(text) || /\bfried rice\b/.test(text)) return true;
  if (/\b(pollo|pozole|pepperpot|pepper pot|bisque|mulligatawany|mulligatawny)\b/.test(text)) return true;
  if (/\bde res\b/.test(text) || /\bitalian wedding\b/.test(text) || /\bhot and sour\b/.test(text)) return true;
  if (/\bmatzo ball\b/.test(text) || /\bsoup tortilla\b/.test(text) || /\btortilla soup\b/.test(text)) return true;
  if (/\b(soup nfs|soup noodle|soup rice|soup barley)\b/.test(text)) return true;
  // Survey recipes that are meat or seafood even when the short name leaves that out.
  if (/\b(moo goo gai pan|dirty rice|frito pie|mexican pizza|egg foo yung)\b/.test(text)) return true;
  if (/\b(taco|burrito|enchilada|tamale|fajita|empanada) nfs\b/.test(text)) return true;
  if (/\bburrito bowl nfs\b/.test(text)) return true;
  if (/\bns as to filling\b/.test(text)) return true;
  if (/\bpasta with sauce nfs\b/.test(text)) return true;
  if (/\bhot pocket nfs\b/.test(text)) return true;
  if (/\blean pocket\b/.test(text) || /\bbreakfast pocket\b/.test(text)) return true;
  return false;
}

/**
 * Unspecified table fat or shortening can be lard or tallow.
 * A named plant oil, margarine, or butter is dairy or vegetable and stays.
 */
function isAmbiguousAnimalFat(text: string): boolean {
  if (/\btable fats?\b/.test(text)) {
    return !/\b(?:vegetable|veggie|olive|canola|coconut|avocado|sunflower|safflower|soybean|peanut|sesame|flaxseed|almond|walnut|margarine|butter)\b/.test(text);
  }
  return /\bshortenings?\b/.test(text) && /\banimals?\b/.test(text);
}

/**
 * True when the text does not name meat, poultry, fish, shellfish, or gelatin.
 * Allow-markers such as "meatless" apply to dish names. Ingredient lists should
 * pass `honorAllowMarkers: false` so one vegetarian word cannot bless the rest.
 */
export function isOvoLactoFood(
  value: string,
  options?: { readonly honorAllowMarkers?: boolean },
): boolean {
  const stripped = stripSafePhrases(normalizeDietText(value));
  if (!stripped) return true;
  const honor = options?.honorAllowMarkers !== false;
  const text = honor ? withoutDietNegations(stripped) : stripped;
  if (!text) return true;
  const gelatinChecked = text.replace(/\bgelatin free\b/g, ' ');
  if (hardRejectPattern.test(gelatinChecked)) return false;
  if (hasGelatinAdditive(text)) return false;
  if (hasAnimalGellingWord(text)) return false;
  if (gelatinCandyPattern.test(text) && !(honor && waivesGelatinCandy(text))) return false;
  if (isAmbiguousAnimalFat(text)) return false;
  // "No meat" names the absence of pieces. It is not itself an animal food,
  // and it does not clear a fish, a broth, or any other animal word nearby.
  const animalText = text.replace(/\bno meats?\b/g, ' ');
  if (animalPattern.test(animalText) && !(honor && cancelsAnimalTerms(value, text))) return false;
  if (isAnimalBrothDish(text) && !(honor && waivesBrothDish(text))) return false;
  const waiveInferred = honor && waivesInferredDish(text);
  if (!waiveInferred && isMeatChili(text)) return false;
  if (!waiveInferred && isUnlabeledAnimalDish(text)) return false;
  return true;
}

export function isOvoLactoUsdaRecord(record: {
  readonly name: string;
  readonly originalName?: string;
  readonly category?: string;
}): boolean {
  if (record.category && EXCLUDED_USDA_CATEGORIES.has(record.category)) return false;
  return isOvoLactoFood([record.name, record.originalName ?? ''].filter(Boolean).join(' '));
}

function patternCrosses(pattern: RegExp, joined: string, boundary: number): boolean {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const global = new RegExp(pattern.source, flags);
  for (const match of joined.matchAll(global)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (start < boundary && end > boundary) return true;
  }
  return false;
}

/** True when a block appears only after the name and brand are concatenated. */
function labelBoundaryBlocks(name: string, brand: string): boolean {
  const left = normalizeDietText(name);
  const right = normalizeDietText(brand);
  if (!left || !right) return false;
  const joined = `${left} ${right}`;
  const boundary = left.length;
  if (patternCrosses(hardRejectPattern, joined, boundary)) return true;
  if (patternCrosses(animalPattern, joined, boundary)) return true;
  if (patternCrosses(gelatinCandyPattern, joined, boundary)) return true;
  if (isAmbiguousAnimalFat(joined) && !isAmbiguousAnimalFat(left) && !isAmbiguousAnimalFat(right)) return true;
  if (hasGelatinAdditive(joined) && !hasGelatinAdditive(left) && !hasGelatinAdditive(right)) return true;
  if (hasAnimalGellingWord(joined) && !hasAnimalGellingWord(left) && !hasAnimalGellingWord(right)) return true;
  if (isAnimalBrothDish(joined) && !isAnimalBrothDish(left) && !isAnimalBrothDish(right)) return true;
  if (isMeatChili(joined) && !isMeatChili(left) && !isMeatChili(right)) return true;
  if (isUnlabeledAnimalDish(joined) && !isUnlabeledAnimalDish(left) && !isUnlabeledAnimalDish(right)) return true;
  return false;
}

/**
 * A meat brand still rejects a plain name. Joining the fields catches a term
 * split across them ("Italian" plus "Sub"). Each side is also checked on its
 * own so a brand cannot erase a substitute marker such as "Hot dog, vegetarian".
 */
export function isOvoLactoLabeledFood(name: string, brand?: string): boolean {
  const trimmedBrand = brand?.trim() ?? '';
  if (!trimmedBrand) return isOvoLactoFood(name);
  const joined = `${name} ${trimmedBrand}`;
  if (isOvoLactoFood(joined)) return true;
  if (!isOvoLactoFood(name) || !isOvoLactoFood(trimmedBrand)) return false;
  return !labelBoundaryBlocks(name, trimmedBrand);
}
