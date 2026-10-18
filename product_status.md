# Production Recipes — Product Status

Last updated: 2026-10-18 (America/Chicago)

## Source of truth

- **Production formulas:** the recipe ingredients and batch size in the Google
  Sheets database.
- **Production ABV:** calculated from that saved formula and displayed as
  “Production ABV (from recipe).”
- **Approved ABV:** formula/label information is retained separately as a
  reference; it does not replace the production calculation.

## Live now

- The Google Apps Script backend was redeployed on 2026-10-18 by the project
  owner from the current v1.22.3 source. This includes the ABV-model and data
  reliability work.
- All eight recipes in `2025 canned cocktail recipes (1).xlsx` are in the live
  database. Blu Vodka Seltzer’s ingredient names/types were corrected, and the
  Brandy Sour Old Fashioned production formula now matches the workbook ratio.
- The Brandy Sour Old Fashioned production formula calculates to **17.43% ABV**;
  its stored approved formula/label reference remains **12.5% ABV**.

## Still local / not on GitHub or Netlify

- GitHub `main` remains at `5d95343` (2026-08-23).
- Local commits awaiting publication:
  - `bad433f` — batch worksheet, ABV reliability, date handling, and backend
    parity work.
  - `1314ff7` — clearer “Production ABV” and “Approved ABV” labels.
- Consequently, Netlify is still serving the older GitHub version. The live
  Google Sheets data changes are already active because they use the separately
  deployed Apps Script backend.

## Release rule

Every change to `apps-script/Code.gs` must carry a dated `vX.Y.Z` entry in its
file header and a matching entry in `CHANGELOG.md`. Deploying the backend should
be recorded here with its date and version. Front-end releases require a GitHub
push and then a successful Netlify deploy.

## Next release

Publish the front-end files to GitHub and confirm Netlify deploys successfully.
Do not publish `apps-script/Code.gs` to the public repository unless the owner
explicitly authorizes exposing that backend source there.
