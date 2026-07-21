# Immo-Locator

Chrome Extension that enriches Leboncoin/SeLoger listings with ADEME DPE/GES data.

The extension is **serverless**: the popup queries the public ADEME API
(`data.ademe.fr`) directly and scores candidates client-side. There is no backend —
the Express server that fronted ADEME until v1.1.0 was decommissioned in July 2026
and its code deleted. Do not reintroduce one.

## Commands

```bash
# Test
npm test                 # Run all tests (vitest)
npm run test:ext         # Extension tests only
npm -w packages/extension run test:unit         # Unit only
npm -w packages/extension run test:integration  # Integration only

# Lint & format
npm run lint             # ESLint across packages/
npm run lint:fix
npm run format           # Prettier
npm run format:check

# Build
npm run build:ext        # Build extension (packages/extension/scripts/build.js)
```

## Architecture

```
packages/
  extension/          Chrome Extension (Manifest V3) — calls ADEME directly
    src/
      index.js         Content script entry
      popup.js         Popup UI logic (runs the ADEME search + scoring)
      api/             location-client.js (searchLocation → ADEME), ademe-client.js (query builder)
      services/        dpe-service.js (client-side scoring — mirror of the API's)
      extractors/      next-data-extractor.js (parses __NEXT_DATA__), seloger-extractor.js
      utils/           DOM helpers, parsers, score calculator, validation
    popup.html         Extension popup
    manifest.json      host_permissions/CSP → https://data.ademe.fr
```

`services/dpe-service.js` (scoring) and `api/ademe-client.js` (query builder) started
as ports of the old server's logic; they are now the only implementation. The popup is
bundled by esbuild so it `import`s them normally — unlike the injected extractors,
which must stay inlined in `popup.js` because `chrome.scripting.executeScript({ func })`
cannot resolve imports.

## Code style

- ESM (`"type": "module"`) — use `import`/`export`, not `require`
- Husky + lint-staged: ESLint + Prettier run on pre-commit
- `packages/extension/popup.js` is the esbuild bundle, committed as-is and excluded
  from Prettier via the root `.prettierignore`. Never edit it by hand.

## Gotchas

- `conso_energy` and `emission_ges` DOM values are NOT in `__NEXT_DATA__` — only extractable from DOM
- ADEME `conso_5_usages_par_m2_ep` ≠ Leboncoin `conso_prim` (~20% gap) — scoring uses wide tolerance

## Git Workflow

- Always push directly to main unless explicitly asked to create a branch or PR.
- Before pushing any commit, check for API keys, secrets, and confidential information in the diff.
- Workflow checklist:
  1. Test locally
  2. Deploy
  3. Verify
  4. Commit
  5. Check for secrets in the diff
  6. Push (only after user confirmation)
- Always wait for user confirmation before deploying or committing.

## General Rules

- When a directory or project is empty, say so immediately and ask the user what to do next. Do not explore adjacent directories.
- When the user says to follow a specific workflow or agent process (e.g., BMAD), switch to that mode immediately without autonomous exploration or planning.

## Tech Stack

- Primary languages: JavaScript, HTML, Markdown.
- For web scraping tasks, prefer browser console JS approaches over Python/headless browser solutions unless asked otherwise.
