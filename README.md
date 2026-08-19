# Fare

Fare is a private, local-first calorie and macro tracker, published at `harsh.bet/fare/`. This repository is the standalone source for the app and its GitHub Pages deployment.

## Product model

- **Usuals first:** personal suggestions rank query match, meal/time context, frequency, recency, weekday, and pins before any public-database result.
- **Immutable history:** every diary entry stores its own nutrition and serving snapshot. Editing a saved food or an upstream catalog record never rewrites an earlier day.
- **Flexible logging:** repeat a food, copy yesterday’s breakfast or snacks into today, quick-add calories/macros, create custom foods, save meal templates, scan or type a barcode, or explicitly search Open Food Facts.
- **Useful review:** day totals, remaining targets, macro bars, meal contribution, weekly averages, logged-day completeness, and frequently reused foods.
- **Private sync:** the local IndexedDB/localStorage mirror works signed out. Optional Google sign-in gives every verified account its own UID-scoped Firebase workspace and keeps Fare isolated from the other harsh.bet apps.
- **Portable data:** JSON backup/import plus CSV diary export.

Targets are always user-entered. Fare does not prescribe calorie deficits, macro plans, or medical nutrition guidance.

## Breakdown

Breakdown answers a different question than the diary: not "what did I eat" but "where do the numbers come from." Build a meal from curated restaurant menus (Salata, CAVA, Chipotle, Subway — values transcribed from each chain's published nutrition guide — plus a generic Indian menu of common dishes with typical-portion estimates that names no specific restaurant), USDA-derived pantry staples, reconstructed dishes (labelled estimates), or free text ("salata wrap, falafel, avocado and 2 spicy chipotle ranch").

- **Contribution analysis:** per-component share of calories, protein, carbs, fat, fiber, and sodium, plus protein/fiber efficiency (grams per 100 kcal) and calorie-density labels.
- **Honest uncertainty:** every component carries its source and a high/medium/low confidence; estimated meals show a calorie range instead of fake precision, and tapping any row reveals the source and when it was last checked.
- **Instant editing:** quantity steppers, removals, and same-category swaps recalculate immediately and show the signed difference ("-220 kcal · -1 g protein").
- **Deterministic optimizer:** goal constraints (calorie cap, protein/fiber floors, max changes, locked ingredients, vegetarian/vegan swaps) searched over real menu options — no AI arithmetic, ever.
- **Compare + variants:** original-vs-current diffs, device-local saved variants, and one-tap logging of the finished meal into the diary as a normal immutable snapshot.

All Breakdown math is pure TypeScript (`src/breakdown/engine.ts`, `optimize.ts`, `parse.ts`) with the catalog in `src/breakdown/data/`. Restaurant values are point-in-time transcriptions — each item records `lastVerified` so stale data is visible, not hidden.

## Food data

Fare searches personal history, USDA survey foods, and curated restaurant/pantry items as you type. Packaged-product search happens only after an explicit request because Open Food Facts limits searches and specifically warns against search-as-you-type. Barcode reads use the current product endpoint. Every imported result keeps its source, serving basis, fetch time, and a data-quality note so it can be reviewed before logging.

- USDA FoodData Central FNDDS 2021–2023 is bundled locally (public domain). The browser never calls the USDA API: <https://fdc.nal.usda.gov/download-datasets/>
- Open Food Facts API: <https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/>
- Open Food Facts database licensing/attribution: <https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/>

The app does not display or redistribute product images. Public nutrition data remains visually separated from the private diary and saved-food collection.

## Sync model

Foods, meal templates, and diary entries are individual Firestore documents under `fare_users/{uid}`. Profile, targets, and settings are independent singleton documents. Records merge by `updatedAt` with a deterministic tie-break, and deletes are durable tombstones so an offline device cannot resurrect them. Safe sign-out waits for pending writes before clearing this app's local copy and named Firestore cache.

Private sync resolves provisioned Google identities through one shared owner vault, so both approved identities see the same state and unprovisioned identities fail closed. `firestore.rules` carries the complete shared ruleset for every private harsh.bet app because a Firebase rules deployment replaces the project-wide ruleset. Keep the file byte-identical across all repositories. The Pages workflow does not deploy Firebase rules.

## Development

```sh
npm ci
npm test
npm run test:rules
npm run typecheck
npm run build
```

The Vite base, manifest scope, service worker scope, canonical URL, and app icons all use `/fare/`. Pushing `main` runs the standalone Pages workflow, which tests, typechecks, builds, validates the PWA artifact, and deploys it.
