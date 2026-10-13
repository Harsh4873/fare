import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { allFoods, DISH_TEMPLATES } from '../src/breakdown/data';
import { isOvoLactoFood, isOvoLactoLabeledFood, isOvoLactoUsdaRecord } from '../src/diet';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const allowed = [
  'Egg',
  'Honey',
  'Paneer',
  'Goat cheese',
  'Duck egg',
  'Oyster mushroom',
  'Crackers, oyster',
  'Cape Cod',
  'Duck sauce',
  'Hamburger bun',
  'Veggie burger',
  'Chicken, meatless',
  'Chili, vegetarian',
  'Tomato chili sauce',
  'Chili pepper',
  'Roasted Chili-Corn Salsa',
  'Tomatillo-Green Chili Salsa',
  'Pad thai, meatless',
  'Vegetable sushi',
  'Dumpling, no meat',
  'Vegetable broth',
  'Tomato gravy',
  'Butter',
  'Sorbet',
  'Collards',
  'Limburger cheese',
  'Scalloped potatoes',
  'Beefsteak tomato',
  'Bloody Mary',
  'Welsh rarebit',
  'Buffalo sauce',
  'Soy burger, meat alternative',
  'Noodles, chow mein',
  'Rice, fried, meatless',
  'Enchilada, no meat',
  'Tamale, no meat',
  'Fajita, vegetable',
  'Empanada, no meat',
  'Taco, cheese only',
  'Chilaquiles',
  'Turnover or hot pocket, meatless',
  'Turnover or hot pocket, pizza pocket',
];

const rejected = [
  'Chicken breast',
  'Gelatin dessert',
  'Marshmallow',
  'Caesar dressing',
  'Worcestershire sauce',
  'Fish sauce',
  'Hamburger',
  'Duck',
  'Oysters',
  'Goat',
  'Chili',
  'Chili, white',
  'Pad thai',
  'Sushi',
  'California roll',
  'Wonton',
  'Bao bun',
  'Ramen bowl',
  'Lo mein',
  'Chow mein',
  'Gumbo',
  'Paella',
  'Soup, broth',
  'Biscuit with gravy',
  'Chicken egg foo yung',
  'Bacon',
  'Salmon',
  'Anchovy',
  'Little Caesars Cheese Pizza',
  'non vegetarian chicken',
  'Soup, sopa or caldo de pollo',
  'Soup, pozole',
  'Rice, fried',
  'Fried rice',
  'Soup, hot and sour',
  'Egg foo yung',
  'Moo Goo Gai Pan',
  'Dirty rice',
  'Frito pie',
  'Mexican pizza',
  'Taco, NFS',
  'Burrito, NFS',
  'Burrito bowl, NFS',
  'Enchilada, NFS',
  'Tamale, NFS',
  'Fajita, NFS',
  'Empanada, NFS',
  'Ravioli, NS as to filling',
  'Pasta with sauce, NFS',
  'Turnover or hot pocket, NFS',
  'Turnover or lean pocket',
  'Turnover or breakfast pocket, egg',
];

describe('ovo-lacto gate', () => {
  it.each(allowed)('allows %s', (name) => {
    expect(isOvoLactoFood(name), name).toBe(true);
  });

  it.each(rejected)('rejects %s', (name) => {
    expect(isOvoLactoFood(name), name).toBe(false);
  });

  it('rejects a meat brand on an otherwise plain name', () => {
    expect(isOvoLactoLabeledFood('Rice', 'Chicken of the Sea')).toBe(false);
    expect(isOvoLactoLabeledFood('Paneer', 'Haldiram')).toBe(true);
  });

  it('does not let a vegetarian word bless an ingredient list', () => {
    expect(isOvoLactoFood('chicken, vegetarian cheese', { honorAllowMarkers: false })).toBe(false);
    expect(isOvoLactoFood('Chicken, meatless')).toBe(true);
  });

  it('uses USDA categories only as a known meat or seafood block', () => {
    expect(isOvoLactoUsdaRecord({ name: 'Plain', category: 'Fish' })).toBe(false);
    expect(isOvoLactoUsdaRecord({ name: 'Butter', category: 'Butter and animal fats' })).toBe(true);
    expect(isOvoLactoUsdaRecord({ name: 'Sorbet', category: 'Gelatins, ices, sorbets' })).toBe(true);
  });

  it('rejects survey composites whose recipe is meat even when the short name is plain', () => {
    expect(isOvoLactoUsdaRecord({ name: 'Taco', originalName: 'Taco, NFS' })).toBe(false);
    expect(isOvoLactoUsdaRecord({ name: 'Egg foo yung', originalName: 'Egg foo yung, NFS' })).toBe(false);
    expect(isOvoLactoUsdaRecord({ name: 'Enchilada', originalName: 'Enchilada, no meat' })).toBe(true);
  });

  it('offers only ovo-lacto menus, pantry foods, and templates', () => {
    for (const food of allFoods()) {
      expect(isOvoLactoFood([food.name, ...(food.aliases ?? [])].join(' ')), food.name).toBe(true);
    }
    for (const template of DISH_TEMPLATES) {
      expect(
        isOvoLactoFood([template.name, template.description, ...(template.aliases ?? [])].join(' ')),
        template.name,
      ).toBe(true);
    }
  });

  it('keeps the cloud diet gate identical to the app gate', () => {
    const app = readFileSync(join(root, 'src/diet.ts'), 'utf8');
    const cloud = readFileSync(join(root, 'functions/src/diet.ts'), 'utf8');
    expect(cloud).toBe(app);
  });
});
