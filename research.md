# Immo-Locator — Deep Codebase Research Report

## 1. Project Overview

**Immo-Locator** is a browser extension + backend API system that enriches Leboncoin (France's main classifieds site) real estate listings with official energy performance data from the French ADEME database.

**Core value proposition:** When browsing a property listing on Leboncoin, the extension extracts key data (surface, DPE, GES, location, energy consumption) directly from the page, then cross-references it against the official ADEME energy diagnostics database to find the real address of the property — which Leboncoin intentionally hides.

**Version:** Extension v1.0.4, API v1.0.0

**Repository:** npm workspaces monorepo — `packages/extension/` + `packages/api/`

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    User's Browser                        │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │        Chrome/Firefox Extension (MV3)           │     │
│  │          packages/extension/                    │     │
│  │                                                  │     │
│  │  popup.html ─→ popup.js (esbuild bundle)        │     │
│  │       │                                          │     │
│  │       ├─ Inject extractRealEstateData() into tab │     │
│  │       │   ├─ Parse __NEXT_DATA__ (primary)       │     │
│  │       │   ├─ DOM scraping (fallback)             │     │
│  │       │   └─ Visual style analysis (tertiary)    │     │
│  │       │                                          │     │
│  │       ├─ POST /api/location/search ──────────────┤──┐  │
│  │       └─ POST /api/reports ──────────────────────┤──┤  │
│  └─────────────────────────────────────────────────┘  │  │
└───────────────────────────────────────────────────────┼──┘
                                                        │
                    HTTPS (api.immolocator.fr)           │
                                                        ▼
┌──────────────────────────────────────────────────────────┐
│              VPS (Debian + Nginx + PM2)                   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │          Node.js Express API (v5)               │     │
│  │          packages/api/                          │     │
│  │                                                  │     │
│  │  Middleware: Helmet, CORS, Rate Limit, Pino     │     │
│  │                                                  │     │
│  │  /api/location/search                           │     │
│  │    ├─ Zod validation                            │     │
│  │    ├─ LRU cache check (500 entries, 1h TTL)     │     │
│  │    ├─ Circuit breaker (3 fails → 30s cooldown)  │     │
│  │    ├─ ADEME API fetch (10s timeout)             │     │
│  │    ├─ Match scoring algorithm                   │     │
│  │    └─ Record to SQLite (analytics)              │     │
│  │                                                  │     │
│  │  /api/reports                                   │     │
│  │    ├─ Clean & validate extracted data            │     │
│  │    ├─ URL whitelist (leboncoin.fr only)          │     │
│  │    └─ Record to SQLite                          │     │
│  │                                                  │     │
│  │  SQLite: data/searches.db                       │     │
│  │    ├─ searches table (analytics)                │     │
│  │    └─ reports table (crowdsourced data)          │     │
│  └─────────────────────────────────────────────────┘     │
│                          │                               │
│                          ▼                               │
│                  ADEME Data Fair API                      │
│         (dpe03existant dataset — public)                  │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Extension — packages/extension/

### 3.1 Manifest & Permissions

- **Manifest V3**, version 1.0.4
- **Permissions:** `activeTab` + `scripting` (minimal — no broad host access)
- **Host permissions:** only `https://api.immolocator.fr/*`
- **CSP:** `script-src 'self'; object-src 'self'; connect-src https://api.immolocator.fr`
- **Firefox support:** `gecko` block with `strict_min_version: "140.0"`, addon ID `immo-locator@immolocator.fr`
- Cross-browser compat via `globalThis.browser ??= globalThis.chrome` at the top of popup.js

### 3.2 Data Extraction — Three-Tier Strategy

The core of the extension is the `extractRealEstateData()` function injected into the active Leboncoin tab. It uses a layered fallback approach:

**Strategy 1 — `__NEXT_DATA__` parsing (primary):**

- Leboncoin is a Next.js app that embeds a `<script id="__NEXT_DATA__">` tag with the full ad data as JSON
- Navigates `props.pageProps.ad` to extract: `location.city`, `location.zipcode`, and `attributes[]` array for surface, terrain, DPE, GES, diagnostic date, primary/final energy consumption
- Uses a `findAttr(key, labelPart)` helper that matches by both API key and French label text
- Also checks `window.next.router.components` for client-side navigated pages where `__NEXT_DATA__` holds stale SSR data

**Strategy 2 — DOM scraping (fallback):**

- Regex on `document.body.innerText` for surface, terrain, diagnostic date, energy values
- Multiple selector fallbacks for location: `[data-test-id="location-map-title"]`, `a[href$="#map"][aria-label]`, `[data-qa-id="adview_location_container"]`
- Auto-expands collapsed descriptions by clicking "Voir plus" button (tries QA ID selector first, then text-content search)
- For DPE/GES: checks `aria-label` attributes on badge elements, then regex on body text

**Strategy 3 — Visual computed style analysis (tertiary):**

- For DPE/GES colored badges (A-G scale) with no text labels
- Finds the label element ("Classe énergie" or "GES"), traverses up to find the container with A-G letter elements
- Measures `height`, `width`, `fontSize`, `fontWeight` via `getComputedStyle()` for each letter
- Identifies the "active" letter as the outlier that's >10% larger than the mode
- Handles edge cases: shared containers for DPE+GES (uses `compareDocumentPosition` to only consider elements following the label), slices to first 7 letters max

### 3.3 API Communication

**Search (`POST /api/location/search`):**

- `buildSearchPayload()` transforms raw extracted strings to typed values (numeric surface, null for "Non trouvé")
- 10-second timeout via `AbortSignal.timeout(10_000)`
- Response validation: checks `.results[]` exists and each item has `.address` (string) + `.score` (number)
- Errors propagated with `.code` and `.missing` properties for structured error display

**Reports (`POST /api/reports`):**

- Filters out "Non trouvé" values and `debugLog` before sending
- Sends raw URL + cleaned extracted data
- Fire-and-forget from user perspective (success/failure shown briefly)

### 3.4 UI

- **Fixed width:** 380px popup
- **Two cards:** "Bien immobilier" (city, zipcode, surface, terrain) + "Performance energetique" (DPE/GES badges, date, consumption)
- **Shimmer loading animation** on data values while extraction runs
- **Data completeness badge:** "Complet" (>=80%), "Partiel" (50-80%), "Incomplet" (<50%)
- **DPE/GES color badges:** A=#22c55e through G=#dc2626 (7-step gradient)
- **Search results:** scored list with Google Maps links, score color-coded (>=80 green, >=50 orange, <50 red)
- **Error page:** full-screen state for incompatible pages, with accepted categories and CTA to Leboncoin search
- **Report button:** "Signaler une erreur" — sends crowdsourced error data to backend
- **Animations:** staggered `fadeIn` for cards, `popIn` for error badge, smooth transitions

### 3.5 Build System

- **esbuild** bundles `src/` → `popup.js` (IIFE format, single file)
- Build script: `scripts/build.js`
- Source maps not included in production bundle

### 3.6 Testing

- **Vitest** with multi-project workspace: unit (node), integration (jsdom), e2e (jsdom)
- **Unit tests:** error-messages, parsers, score-calculator, url-validator, validation
- **Integration tests:** DOM extraction, DOM helpers, location-client
- **E2E tests:** popup browser test
- **Chrome API mock** in `tests/mocks/chrome-api.js`
- **Test fixtures:** sample ADEME response and Leboncoin `__NEXT_DATA__` JSON
- **Coverage:** v8 provider with HTML reports

### 3.7 CI/CD

- **GitHub Actions:**
  - `ci.yml`: lint (ESLint + Prettier) → test (all suites + coverage) → build → upload coverage to Codecov
  - `release.yml`: triggered on `v*` tags → test → build → create zip → GitHub Release
- **Husky pre-commit:** lint-staged on JS files

### 3.8 Code Quality

- **ESLint:** recommended rules + strict overrides (no-unused-vars with `_` exception, eqeqeq enforced)
- **Prettier:** semicolons, single quotes, 2-space indent, 100-char width, ES5 trailing commas
- **No `innerHTML`** — all DOM manipulation via safe helpers (`createElement`, `createLink`, `clearElement`, `setTextContent`)

---

## 4. Backend API — packages/api/

### 4.1 Stack

- **Express 5.2.1** (latest major) with Node.js
- **better-sqlite3** for synchronous, embedded SQLite
- **Zod 4.3.6** for runtime input validation (strict mode throughout)
- **Pino** for structured JSON logging + **pino-http** for request logging
- **Helmet** for security headers
- **express-rate-limit** for rate limiting
- **lru-cache** for in-memory ADEME response caching
- **rotating-file-stream** for log rotation (5-day retention)

### 4.2 Server Setup (`src/index.js`)

**Startup validation (`validateEnv()`):**

- `ADEME_API_URL` must be present and a valid URL
- `CORS_CHROME_ORIGIN` must be present and not `*`
- `PORT` must be 1-65535 if specified
- Fail-fast: throws before app creation if any check fails

**Middleware stack (order matters):**

1. `trust proxy: 1` (for Nginx X-Forwarded-For)
2. Helmet (security headers)
3. CORS (custom origin callback: allows configured Chrome origin + any `moz-extension://` origin)
4. Global rate limit: 30 req/min per IP
5. Search-specific rate limit: 20 req/min
6. Pino HTTP logging (structured, with real IP extraction)
7. `express.json({ limit: '10kb' })` — payload size limit
8. Routes
9. 404 handler → `{ error: 'NOT_FOUND' }`
10. Global error handler (4-param) → `{ error: 'INTERNAL_ERROR' }`

**Health endpoint:** `GET /health` → `{ status: 'ok' }` (monitored by UptimeRobot)

### 4.3 Routes

#### `POST /api/location/search` (`src/routes/location.js`)

1. Validate request body with `searchSchema.safeParse()` (strict Zod schema)
2. Call `fetchAdeme(data)` — checks LRU cache, circuit breaker, then fetches from ADEME API
3. `processResults()` — maps ADEME response to scored/sorted results
4. `recordSearch()` — log to SQLite (analytics)
5. Return `{ results, count }`
6. On ADEME error: return 502 `UPSTREAM_ERROR`

**Search schema:**

- `zipcode`: optional, 5-digit regex
- `city`: optional, 1-100 chars
- `dpe`: required, enum A-G
- `ges`: required, enum A-G
- `surface`: required, positive number, max 10000
- `date_diag`: optional, DD/MM/YYYY with logical date validation (real date, 2000 to now+1)
- `conso_prim`, `conso_fin`: optional, positive, max 1000
- `.strict()` rejects unknown fields
- `.refine()` requires at least zipcode or city

#### `POST /api/reports` (`src/routes/reports.js`)

1. Check `url` and `extracted` are present
2. Validate cleaned data against `extractedSchema.safeParse()` (strict, all fields nullable)
3. Validate URL is `http(s)://…leboncoin.fr/…`
4. `recordReport()` — write to SQLite
5. Return `{ success: true }`

### 4.4 ADEME Client (`src/clients/ademe-client.js`)

**Dataset:** `dpe03existant` (existing building energy diagnostics)

**Parameter mapping (`buildAdemeParams`):**
| Extension field | ADEME param | Matching |
|----------------|-------------|----------|
| `zipcode` | `code_postal_ban_eq` | exact |
| `city` | `nom_commune_ban_eq` | exact (fallback if no zipcode) |
| `dpe` | `etiquette_dpe_eq` | exact |
| `ges` | `etiquette_ges_eq` | exact |
| `surface` | `surface_habitable_logement_gte/lte` | ±10% range |
| `date_diag` | `date_etablissement_dpe_gte/lte` | ±7 days range |
| `conso_prim` | `conso_5_usages_par_m2_ep_gte/lte` | ±10% range |

- `size=5` — max 5 results
- `select=` — only fetches needed columns (bandwidth optimization)

**LRU Cache:**

- 500 max entries, 1-hour TTL
- Key: full ADEME query URL with params
- Checked before every network request

**Circuit Breaker:**

- 3 consecutive failures → OPEN state
- 30-second cooldown
- OPEN: fail fast with 503 (no network call)
- HALF-OPEN: allows one test request after cooldown
- Resets to CLOSED on any success

### 4.5 Match Scoring (`src/services/dpe-service.js`)

The `calculateMatchScore()` function starts at 100 and deducts points:

- **Surface deviation:** −2 points per percent difference
- **Date deviation:** −2 points per day difference
- **Energy consumption deviation:** −1 point per percent difference
- Score floored at 0, rounded to integer
- Results sorted descending by score

### 4.6 Database (`src/db.js`)

**SQLite file:** `data/searches.db` (configurable via `DB_PATH` env var with path traversal protection)

**Tables:**

| Table      | Purpose                 | Fields                                                                                              |
| ---------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| `searches` | Analytics               | id, ts, zipcode, city, dpe, ges, surface, date_diag, conso_prim, results_count, duration_ms, status |
| `reports`  | Crowdsourced error data | id, ts, url, surface, terrain, dpe, ges, date_diag, conso_prim, conso_fin, city, zipcode            |

**Data retention:** 90 days — auto-purged on startup for both tables.

**Security:** Path traversal check on `DB_PATH` (must be under `data/`). All queries use prepared statements.

### 4.7 Logging (`src/logger.js`)

- **Pino** structured JSON logging
- **Level:** configurable via `LOG_LEVEL` env var (default: `info`)
- **Destinations:** stdout + rotating file (`logs/app.log`, daily rotation, 5-file max)
- **Dev mode:** `node --watch | pino-pretty` for human-readable logs
- **Key log events:** search completions, ADEME cache hits, circuit breaker state changes, validation failures, DB errors

### 4.8 Deployment

- **VPS:** Debian Linux, reachable at `api.immolocator.fr`
- **Nginx:** reverse proxy with SSL termination (Let's Encrypt + Certbot)
- **PM2:** process manager (`ecosystem.config.cjs`): fork mode, 1 instance, 256MB memory limit, auto-restart
- **Deploy script:** `deploy/deploy.sh` — rsync over SSH, npm install --production, PM2 restart, health check
- **Setup script:** `deploy/setup-vps.sh` — full VPS provisioning (Node 20, PM2, Nginx, Certbot)
- **fail2ban:** Nginx 404 jail (20 404s in 60s → 1h IP ban)

---

## 5. Security Posture

A full security audit was completed (13/13 items, 2026-03-05). Key measures:

| Area               | Implementation                                                              |
| ------------------ | --------------------------------------------------------------------------- |
| Payload size       | `express.json({ limit: '10kb' })`                                           |
| Input validation   | Zod strict schemas on all endpoints                                         |
| SQL injection      | Prepared statements + path traversal check on DB_PATH                       |
| XSS / DOM          | `textContent` + `createElement` only (no `innerHTML`), CSP in manifest      |
| CORS               | Explicit origin whitelist, no wildcard, fail-fast at startup                |
| Rate limiting      | Global 30/min + search-specific 20/min per IP                               |
| Headers            | Helmet defaults (CSP, HSTS, X-Frame-Options, etc.)                          |
| ADEME resilience   | Circuit breaker (3 fails, 30s cooldown) + 10s timeout                       |
| URL whitelist      | Reports only accept `*.leboncoin.fr` URLs                                   |
| Data retention     | 90-day auto-purge, no personal data stored                                  |
| Secrets            | `.env` gitignored, `.env.example` provided                                  |
| Network protection | fail2ban on Nginx 404s                                                      |
| API auth           | No API key (accepted risk: key visible in extension, rate limit sufficient) |

---

## 6. Data Flow — End to End

```
1. User opens Leboncoin listing → clicks extension icon
2. popup.js queries active tab, validates it's leboncoin.fr
3. Injects extractRealEstateData() into the page
4. Extraction:
   a. Parse __NEXT_DATA__ JSON for city, zipcode, surface, DPE, GES, dates, consumption
   b. If data missing: click "Voir plus", retry DOM scraping
   c. If DPE/GES still missing: check aria-labels, regex, visual style analysis
   d. If location missing: try Next.js router cache, DOM selectors, regex
5. Data displayed in popup UI (property card + energy card)
6. Data completeness badge calculated
7. If minimum data available (location + DPE + GES + surface):
   → "Rechercher les adresses" button shown
8. User clicks search button
9. Extension builds payload (strings → typed values, "Non trouve" → null)
10. POST to api.immolocator.fr/api/location/search
11. Backend validates with Zod, queries ADEME API:
    - LRU cache check → circuit breaker check → fetch with 10s timeout
    - Params: exact match on DPE/GES/location, ±10% on surface, ±7 days on date
    - Max 5 results from ADEME
12. Results scored: 100 - (surface deviation * 2) - (date deviation * 2) - (energy deviation)
13. Sorted by score, returned to extension
14. Extension displays scored results with Google Maps links
15. User can report extraction errors → POST /api/reports → stored in SQLite
```

---

## 7. Notable Design Decisions & Specificities

### 7.1 No Background Service Worker

The extension has no persistent background script. All logic runs in the popup lifecycle. This means:

- Data is re-extracted every time the popup opens (acceptable since extraction is fast)
- No API response caching on the client side
- No offline capability

### 7.2 The "Visual Scale" Algorithm

The most creative piece of engineering: detecting which DPE/GES letter is "active" on a colored A-G scale by measuring CSS computed styles. It finds the outlier element (larger height/width/fontSize/fontWeight) compared to the mode. This handles cases where Leboncoin renders energy badges as pure visual elements without text labels or aria attributes.

### 7.3 Firefox Compatibility

- `moz-extension://` origins are accepted by CORS (any UUID, since Firefox addon IDs change per installation)
- Link clicks manually open new tabs and close the popup (Firefox doesn't auto-close popups on external navigation)
- `globalThis.browser ??= globalThis.chrome` ensures API compatibility

### 7.4 No API Authentication

Intentional decision: since the API key would be visible in the extension's source code, it provides no real security. Rate limiting is considered sufficient protection.

### 7.5 Express 5

The API uses Express 5 (v5.2.1), which is the latest major version. This provides built-in async error handling and other improvements over Express 4.

---

## 8. File Structure Summary

```
immo-locator/                          # Monorepo root
├── package.json                       # npm workspaces config
├── vitest.workspace.js                # Vitest workspace (packages/*)
├── packages/
│   ├── extension/                     # Chrome/Firefox extension
│   │   ├── manifest.json              # MV3 manifest (v1.0.4)
│   │   ├── popup.html                 # Popup UI (inline CSS)
│   │   ├── popup.js                   # Built bundle (esbuild IIFE)
│   │   ├── package.json               # Dev deps (vitest, esbuild, jsdom)
│   │   ├── src/
│   │   │   ├── popup.js               # Main logic
│   │   │   ├── index.js               # Module re-exports
│   │   │   ├── api/
│   │   │   │   └── location-client.js # API client (validation, search, reports)
│   │   │   ├── extractors/
│   │   │   │   └── next-data-extractor.js
│   │   │   └── utils/
│   │   │       ├── dom-helpers.js     # Safe DOM manipulation
│   │   │       ├── error-messages.js  # French error codes/messages
│   │   │       ├── parsers.js         # Data parsing
│   │   │       ├── score-calculator.js
│   │   │       ├── url-validator.js
│   │   │       └── validation-constants.js
│   │   ├── tests/
│   │   │   ├── unit/ (5 files)
│   │   │   ├── integration/ (3 files)
│   │   │   ├── e2e/ (1 file)
│   │   │   ├── mocks/chrome-api.js
│   │   │   └── fixtures/
│   │   ├── scripts/build.js           # esbuild config
│   │   ├── icons/ (16, 32, 48, 128px + SVG)
│   │   ├── docs/privacy.html
│   │   ├── .github/workflows/ (ci.yml, release.yml)
│   │   ├── vitest.config.js, vitest.workspace.js
│   │   ├── CHANGELOG.md
│   │   └── LICENSE (AGPL-3.0)
│   │
│   └── api/                           # Backend API
│       ├── package.json               # Express 5, better-sqlite3, Zod, Pino
│       ├── src/
│       │   ├── index.js               # App setup, middleware, validation
│       │   ├── db.js                  # SQLite schema, CRUD, retention
│       │   ├── logger.js              # Pino + rotating file stream
│       │   ├── clients/
│       │   │   └── ademe-client.js    # ADEME API client (cache, circuit breaker)
│       │   ├── routes/
│       │   │   ├── location.js        # POST /api/location/search
│       │   │   └── reports.js         # POST /api/reports
│       │   ├── schemas/
│       │   │   └── search.js          # Zod search schema
│       │   ├── services/
│       │   │   └── dpe-service.js     # Scoring & result processing
│       │   └── utils/
│       │       └── parsers.js         # French date parsing
│       ├── tests/ (7 test files)
│       ├── deploy/
│       │   ├── deploy.sh              # rsync + SSH deploy
│       │   └── setup-vps.sh           # VPS provisioning
│       ├── ecosystem.config.cjs       # PM2 config
│       ├── .env.example
│       ├── vitest.config.js
│       └── LICENSE (AGPL-3.0)
│
├── data/searches.db                   # SQLite database (gitignored)
└── logs/app.log                       # Application logs (gitignored)
```

---

## 9. Test Coverage

**Extension:** ~205 tests across unit, integration, and e2e suites
**API:** 59 tests covering all routes, schemas, services, clients, and error handling

Test infrastructure:

- **Framework:** Vitest for both projects (workspace config at root)
- **HTTP testing:** Supertest (API)
- **Browser mocking:** jsdom + custom Chrome API mock (extension)
- **Fixtures:** sample ADEME API responses and Leboncoin **NEXT_DATA** JSON
