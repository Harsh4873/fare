/**
 * Ovo-lacto gate for every food Fare can offer.
 * Eggs, dairy, and honey stay. Meat, poultry, fish, shellfish, and gelatin do not.
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
  'aspic',
  'isinglass',
  'marshmallow',
  'jello',
  'jell o',
  'worcestershire',
  'anchovy',
  'anchovies',
  'fish sauce',
  'oyster sauce',
  'caesar',
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
  'crackling',
  'chitterling',
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
  'carne',
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
] as const;

const SAFE_PHRASES = [
  'cape cod',
  'crackers oyster',
  'oyster cracker',
  'oyster mushroom',
  'goat milk',
  'goat cheese',
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

function termPattern(terms: readonly string[]): RegExp {
  const body = [...terms]
    .sort((left, right) => right.length - left.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'))
    .join('|');
  return new RegExp(`\\b(?:${body})s?\\b`, 'i');
}

const hardRejectPattern = termPattern(HARD_REJECT);
const animalPattern = termPattern(ANIMAL_TERMS);
const safePhrasePattern = termPattern(SAFE_PHRASES);

function allowsAnimalWords(text: string): boolean {
  const cleaned = text
    .replace(/\bnon vegetarians?\b/g, ' ')
    .replace(/\bnot suitable for vegetarians?\b/g, ' ')
    .replace(/\bnot vegetarians?\b/g, ' ');
  return /\b(?:meatless|meat free|no meat|vegans?|vegetarians?|plant based)\b/.test(cleaned);
}

const CHILI_WORD = '(?:chilies|chillies|chilis|chillis|chili|chilli)';

function isMeatChili(text: string): boolean {
  if (!new RegExp(`\\b${CHILI_WORD}\\b`).test(text)) return false;
  if (/\bsalsas?\b/.test(text)) return false;
  if (new RegExp(`\\b${CHILI_WORD}\\s+(?:peppers?|sauces?|oils?|paste|flakes?|powder|crisps?|garlic|corn)\\b`).test(text)) {
    return false;
  }
  if (new RegExp(`\\b(?:sweet|hot|thai|schezwan|szechuan)\\s+${CHILI_WORD}\\b`).test(text)) return false;
  return true;
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
 * True when the text does not name meat, poultry, fish, shellfish, or gelatin.
 * Allow-markers such as "meatless" apply to dish names. Ingredient lists should
 * pass `honorAllowMarkers: false` so one vegetarian word cannot bless the rest.
 */
export function isOvoLactoFood(
  value: string,
  options?: { readonly honorAllowMarkers?: boolean },
): boolean {
  const text = normalizeDietText(value);
  if (!text) return true;
  if (hardRejectPattern.test(text)) return false;
  if (options?.honorAllowMarkers !== false && allowsAnimalWords(text)) return true;
  const stripped = text.replace(safePhrasePattern, ' ');
  if (animalPattern.test(stripped)) return false;
  if (isMeatChili(stripped)) return false;
  if (isUnlabeledAnimalDish(stripped)) return false;
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

/** Name plus brand, so a vegetarian dish from a meat brand still stays out. */
export function isOvoLactoLabeledFood(name: string, brand?: string): boolean {
  return isOvoLactoFood([name, brand ?? ''].filter((part) => part.trim().length > 0).join(' '));
}
