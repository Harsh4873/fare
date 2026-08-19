# Fare

Fare is a private, local-first calorie and macro tracker, published at `harsh.bet/fare/`. This repository is the standalone source for the app and its GitHub Pages deployment.

## Product model

- **Usuals first:** personal suggestions rank query match, meal/time context, frequency, recency, and weekday automatically from the diary. There is no pin or library to curate.
- **Immutable history:** every diary entry stores its own nutrition and serving snapshot. Editing a saved food or an upstream catalog record never rewrites an earlier day.
- **Flexible logging:** repeat a food, copy yesterday’s breakfast or snacks into today, pick a restaurant menu item, quick-add calories/macros, scan or type a barcode, or explicitly search Open Food Facts.
- **Useful review:** day totals, remaining targets, macro bars, meal contribution, weekly averages, logged-day completeness, and frequently reused foods.
- **Private sync:** the local IndexedDB/localStorage mirror works signed out. Optional Google sign-in gives every verified account its own UID-scoped Firebase workspace and keeps Fare isolated from the other harsh.bet apps.
- **Portable data:** JSON backup/import plus CSV diary export.

Targets are always user-entered. Fare does not prescribe calorie deficits, macro plans, or medical nutrition guidance.

## Restaurant menus

Add food includes a Restaurants lane for curated menus (Salata, CAVA, Chipotle, Subway — values transcribed from each chain's published nutrition guide — plus a generic Indian menu of common dishes with typical-portion estimates that names no specific restaurant) and USDA-derived pantry staples. Search also matches those items as you type. Restaurant values are point-in-time transcriptions — each item records `lastVerified`. Logging stores an immutable snapshot, so later catalog updates never rewrite an earlier day.

The catalog lives in `src/breakdown/data/`.

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
