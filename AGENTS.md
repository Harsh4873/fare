# Fare Maintenance

This repository is for Harsh Dave's private calorie and nutrition tracker only.

## Product Boundary

- Fare lives on `main` and publishes under `/fare/`.
- Do not add or modify PickLedger, betting, prediction, scraper, grading, model-cache, player-prop, Gym, Daymark, Slate, or Portfolio source in this repository.
- Keep Fare local-first. Food history, custom foods, saved meals, targets, and preferences stay on the device unless the user signs in for private sync or explicitly exports them.
- Open Food Facts reads are for product discovery only. Preserve the nutrition snapshot stored with each logged entry, show source/quality cues, and never silently rewrite history when upstream data changes.
- `firestore.rules` intentionally carries the complete shared ruleset for Daymark, Slate, Fare, and Sift and must remain identical across those app repositories.
- The Pages workflow builds and publishes Fare directly from `main`.

## Verification

- Never open the deployed site, a browser preview, rendered output, or live URL to verify Fare. The user confirms production behavior.
- Agents may inspect source, image metadata, build output paths as text, tests, GitHub Actions, and APIs.
- Before publishing, run `npm test`, `npm run test:rules`, `npm run typecheck`, and `npm run build`.

## GitHub Publish

- Commit Fare work on `main`; every push runs the Pages deployment workflow.
- Commits and pushes must come from the currently logged-in GitHub user.
- Never add AI co-author trailers, `Co-authored-by:` lines, or AI/Cursor/Codex taglines.
- Do not overwrite or revert unrelated user changes.
