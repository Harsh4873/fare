import { readFileSync, writeFileSync } from 'node:fs';
import { isOvoLactoUsdaRecord } from '../src/diet.ts';
import type { UsdaFoodRecord } from '../src/food-catalog/types.ts';

const dest = process.argv[2] ?? 'src/food-catalog/usda-foods.json';
const records = JSON.parse(readFileSync(dest, 'utf8')) as UsdaFoodRecord[];
const kept = records.filter((record) => isOvoLactoUsdaRecord(record));
writeFileSync(dest, JSON.stringify(kept));

const suspect = /chili|chilli|sushi|gravy|broth|sandwich|bacon|gelatin|caesar|chicken|fish|beef|pork|shrimp|turkey|lamb|tuna|steak|meat|oyster|duck|crab|ham|sausage|wonton|pad thai|ramen|gumbo|paella|lo mein|chow mein|scallop|lard|goose|quail/i;
console.log(`kept ${kept.length} of ${records.length}`);
console.log('SUSPECT KEPT');
for (const record of kept) {
  const name = `${record.name} | ${record.originalName ?? ''} | ${record.category}`;
  if (suspect.test(name)) console.log(name);
}
