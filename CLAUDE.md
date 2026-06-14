# Immo-Locator

Monorepo: Chrome Extension + Node.js API to enrich Leboncoin listings with ADEME DPE/GES data.

## Commands

```bash
# Dev
npm run dev:api          # Start API with --watch + pino-pretty (port 3000)

# Test
npm test                 # Run all tests (vitest, both packages)
npm run test:api         # API tests only
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
  api/               Express 5 API (Node.js, ESM)
    src/
      index.js         Entry point
      db.js            SQLite (better-sqlite3) — tables: searches, reports
      logger.js        Pino logger
      clients/         ademe-client.js — ADEME data API
      routes/          location.js, reports.js
      schemas/         search.js (Zod validation)
      services/        dpe-service.js (scoring logic)
  extension/          Chrome Extension (Manifest V3)
    src/
      index.js         Content script entry
      popup.js         Popup UI logic
      api/             location-client.js
      extractors/      next-data-extractor.js (parses __NEXT_DATA__)
      utils/           DOM helpers, parsers, score calculator, validation
    popup.html         Extension popup
    manifest.json
```

## Code style

- ESM (`"type": "module"`) — use `import`/`export`, not `require`
- Husky + lint-staged: ESLint + Prettier run on pre-commit
- Zod for API request validation

## Environment

API requires `.env` (see `.env.example`):

- `PORT` — server port (default 3000)
- `ADEME_API_URL` — ADEME dataset endpoint
- `CORS_CHROME_ORIGIN` / `CORS_FIREFOX_ORIGIN` — extension origin URLs

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
