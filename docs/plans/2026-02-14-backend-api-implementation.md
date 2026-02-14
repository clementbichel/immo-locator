# Backend API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a Node.js/Express backend that proxies ADEME API calls with scoring, and update the Chrome/Firefox extension to call this backend instead.

**Architecture:** 3-layer backend (route → service → client) in a separate repo `immo-locator-api`. The extension sends extracted ad data as JSON, the backend validates, queries ADEME, scores results, and returns them sorted.

**Tech Stack:** Node.js, Express, dotenv, helmet, cors, express-rate-limit, vitest

---

## Part 1: Backend — `immo-locator-api` (new repo)

### Task 1: Initialize project

**Files:**

- Create: `immo-locator-api/package.json`
- Create: `immo-locator-api/.env`
- Create: `immo-locator-api/.env.example`
- Create: `immo-locator-api/.gitignore`

**Step 1: Create repo and init**

```bash
mkdir -p ~/immo-locator-api
cd ~/immo-locator-api
git init
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install express dotenv helmet cors express-rate-limit
npm install -D vitest
```

**Step 3: Create .env and .env.example**

`.env`:

```
PORT=3000
ADEME_API_URL=https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines
CORS_CHROME_ORIGIN=chrome-extension://your-chrome-extension-id
CORS_FIREFOX_ORIGIN=moz-extension://your-firefox-extension-id
```

`.env.example` (same without values):

```
PORT=3000
ADEME_API_URL=https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines
CORS_CHROME_ORIGIN=chrome-extension://
CORS_FIREFOX_ORIGIN=moz-extension://
```

**Step 4: Create .gitignore**

```
node_modules/
.env
```

**Step 5: Configure package.json**

Add to package.json:

```json
{
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: initialize immo-locator-api project"
```

---

### Task 2: Create parsers utility

**Files:**

- Create: `immo-locator-api/src/utils/parsers.js`
- Create: `immo-locator-api/tests/utils/parsers.test.js`

**Step 1: Write the failing tests**

`tests/utils/parsers.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { parseFrenchDate, formatDateISO } from '../../src/utils/parsers.js';

describe('parseFrenchDate', () => {
  it('parses DD/MM/YYYY format', () => {
    const date = parseFrenchDate('15/03/2024');
    expect(date).toBeInstanceOf(Date);
    expect(date.getDate()).toBe(15);
    expect(date.getMonth()).toBe(2); // 0-indexed
    expect(date.getFullYear()).toBe(2024);
  });

  it('returns null for invalid input', () => {
    expect(parseFrenchDate(null)).toBeNull();
    expect(parseFrenchDate('')).toBeNull();
    expect(parseFrenchDate('2024-03-15')).toBeNull();
  });
});

describe('formatDateISO', () => {
  it('formats date as YYYY-MM-DD', () => {
    const date = new Date(2024, 2, 15); // March 15, 2024
    expect(formatDateISO(date)).toBe('2024-03-15');
  });

  it('returns null for invalid date', () => {
    expect(formatDateISO(null)).toBeNull();
    expect(formatDateISO(new Date('invalid'))).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd ~/immo-locator-api
npx vitest run tests/utils/parsers.test.js
```

Expected: FAIL — module not found

**Step 3: Write implementation**

`src/utils/parsers.js`:

```js
/**
 * Parse a French date string (DD/MM/YYYY) to Date object
 */
export function parseFrenchDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDateISO(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/utils/parsers.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/parsers.js tests/utils/parsers.test.js
git commit -m "feat: add date parsers"
```

---

### Task 3: Create ADEME client

**Files:**

- Create: `immo-locator-api/src/clients/ademe-client.js`
- Create: `immo-locator-api/tests/clients/ademe-client.test.js`

**Step 1: Write the failing tests**

`tests/clients/ademe-client.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildAdemeParams, buildAdemeUrl } from '../../src/clients/ademe-client.js';

describe('buildAdemeParams', () => {
  const baseData = {
    zipcode: '75011',
    city: 'Paris',
    dpe: 'D',
    ges: 'E',
    surface: 45,
    date_diag: '15/03/2024',
    conso_prim: 230,
  };

  it('builds params with zipcode, dpe, ges, surface range, date range', () => {
    const params = buildAdemeParams(baseData);
    expect(params.get('code_postal_ban_eq')).toBe('75011');
    expect(params.get('etiquette_dpe_eq')).toBe('D');
    expect(params.get('etiquette_ges_eq')).toBe('E');
    // Surface ±10%: 45 → 40..50
    expect(params.get('surface_habitable_logement_gte')).toBe('40');
    expect(params.get('surface_habitable_logement_lte')).toBe('50');
    // Date ±7 days
    expect(params.get('date_etablissement_dpe_gte')).toBe('2024-03-08');
    expect(params.get('date_etablissement_dpe_lte')).toBe('2024-03-22');
    expect(params.get('size')).toBe('5');
  });

  it('uses city when zipcode is missing', () => {
    const data = { ...baseData, zipcode: null };
    const params = buildAdemeParams(data);
    expect(params.get('code_postal_ban_eq')).toBeNull();
    expect(params.get('nom_commune_ban_eq')).toBe('Paris');
  });

  it('includes primary energy range when provided', () => {
    const params = buildAdemeParams(baseData);
    // 230 ±10%: 207..253
    expect(params.get('conso_5_usages_par_m2_ep_gte')).toBe('207');
    expect(params.get('conso_5_usages_par_m2_ep_lte')).toBe('253');
  });

  it('skips primary energy when null', () => {
    const data = { ...baseData, conso_prim: null };
    const params = buildAdemeParams(data);
    expect(params.get('conso_5_usages_par_m2_ep_gte')).toBeNull();
  });
});

describe('buildAdemeUrl', () => {
  it('returns full URL with params', () => {
    const url = buildAdemeUrl({
      zipcode: '75011',
      dpe: 'D',
      ges: 'E',
      surface: 45,
      date_diag: '15/03/2024',
    });
    expect(url).toContain('https://data.ademe.fr/');
    expect(url).toContain('code_postal_ban_eq=75011');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/clients/ademe-client.test.js
```

Expected: FAIL

**Step 3: Write implementation**

`src/clients/ademe-client.js`:

```js
import { parseFrenchDate, formatDateISO } from '../utils/parsers.js';

const ADEME_API_URL =
  process.env.ADEME_API_URL ||
  'https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines';

export function buildAdemeParams(data) {
  const params = new URLSearchParams();

  if (data.zipcode) {
    params.append('code_postal_ban_eq', data.zipcode);
  } else if (data.city) {
    params.append('nom_commune_ban_eq', data.city);
  }

  if (data.dpe) params.append('etiquette_dpe_eq', data.dpe);
  if (data.ges) params.append('etiquette_ges_eq', data.ges);

  if (data.surface != null) {
    params.append('surface_habitable_logement_gte', String(Math.floor(data.surface * 0.9)));
    params.append('surface_habitable_logement_lte', String(Math.ceil(data.surface * 1.1)));
  }

  const diagDate = parseFrenchDate(data.date_diag);
  if (diagDate) {
    const minDate = new Date(diagDate);
    minDate.setDate(diagDate.getDate() - 7);
    const maxDate = new Date(diagDate);
    maxDate.setDate(diagDate.getDate() + 7);
    params.append('date_etablissement_dpe_gte', formatDateISO(minDate));
    params.append('date_etablissement_dpe_lte', formatDateISO(maxDate));
  }

  if (data.conso_prim != null) {
    params.append('conso_5_usages_par_m2_ep_gte', String(Math.floor(data.conso_prim * 0.9)));
    params.append('conso_5_usages_par_m2_ep_lte', String(Math.ceil(data.conso_prim * 1.1)));
  }

  params.append('size', '5');
  params.append(
    'select',
    'adresse_ban,etiquette_dpe,etiquette_ges,date_etablissement_dpe,surface_habitable_logement,nom_commune_ban,conso_5_usages_par_m2_ep'
  );

  return params;
}

export function buildAdemeUrl(data) {
  const params = buildAdemeParams(data);
  return `${ADEME_API_URL}?${params.toString()}`;
}

export async function fetchAdeme(data) {
  const url = buildAdemeUrl(data);
  const response = await fetch(url);
  if (!response.ok) {
    const err = new Error(`ADEME API error: ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/clients/ademe-client.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/clients/ademe-client.js tests/clients/ademe-client.test.js
git commit -m "feat: add ADEME API client"
```

---

### Task 4: Create DPE service (scoring + orchestration)

**Files:**

- Create: `immo-locator-api/src/services/dpe-service.js`
- Create: `immo-locator-api/tests/services/dpe-service.test.js`

**Step 1: Write the failing tests**

`tests/services/dpe-service.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  calculateMatchScore,
  validateSearchData,
  processResults,
} from '../../src/services/dpe-service.js';

describe('validateSearchData', () => {
  it('returns valid for complete data', () => {
    const result = validateSearchData({
      zipcode: '75011',
      dpe: 'D',
      ges: 'E',
      surface: 45,
      date_diag: '15/03/2024',
    });
    expect(result.isValid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('reports missing fields', () => {
    const result = validateSearchData({ dpe: 'D' });
    expect(result.isValid).toBe(false);
    expect(result.missing).toContain('Localisation');
    expect(result.missing).toContain('Surface');
  });

  it('accepts city as alternative to zipcode', () => {
    const result = validateSearchData({
      city: 'Paris',
      dpe: 'D',
      ges: 'E',
      surface: 45,
      date_diag: '15/03/2024',
    });
    expect(result.isValid).toBe(true);
  });
});

describe('calculateMatchScore', () => {
  const adData = { surface: 45, date_diag: '15/03/2024', conso_prim: 230 };

  it('returns 100 for perfect match', () => {
    const ademeItem = {
      surface_habitable_logement: 45,
      date_etablissement_dpe: '2024-03-15',
      conso_5_usages_par_m2_ep: 230,
    };
    expect(calculateMatchScore(adData, ademeItem)).toBe(100);
  });

  it('penalizes surface deviation', () => {
    const ademeItem = {
      surface_habitable_logement: 50, // +11%
      date_etablissement_dpe: '2024-03-15',
      conso_5_usages_par_m2_ep: 230,
    };
    const score = calculateMatchScore(adData, ademeItem);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(0);
  });

  it('penalizes date deviation', () => {
    const ademeItem = {
      surface_habitable_logement: 45,
      date_etablissement_dpe: '2024-03-20', // 5 days off
      conso_5_usages_par_m2_ep: 230,
    };
    const score = calculateMatchScore(adData, ademeItem);
    expect(score).toBe(90); // 5 days * 2 points = 10
  });
});

describe('processResults', () => {
  it('scores and sorts results descending', () => {
    const adData = { surface: 45, date_diag: '15/03/2024', conso_prim: 230 };
    const ademeResults = [
      {
        adresse_ban: 'Addr1',
        surface_habitable_logement: 50,
        date_etablissement_dpe: '2024-03-15',
        conso_5_usages_par_m2_ep: 230,
        etiquette_dpe: 'D',
        etiquette_ges: 'E',
        nom_commune_ban: 'Paris',
      },
      {
        adresse_ban: 'Addr2',
        surface_habitable_logement: 45,
        date_etablissement_dpe: '2024-03-15',
        conso_5_usages_par_m2_ep: 230,
        etiquette_dpe: 'D',
        etiquette_ges: 'E',
        nom_commune_ban: 'Paris',
      },
    ];
    const results = processResults(adData, ademeResults);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    expect(results[0].address).toBe('Addr2'); // perfect match first
  });

  it('maps ADEME fields to API response format', () => {
    const adData = { surface: 45, date_diag: '15/03/2024' };
    const ademeResults = [
      {
        adresse_ban: '12 Rue X',
        nom_commune_ban: 'Paris',
        etiquette_dpe: 'D',
        etiquette_ges: 'E',
        surface_habitable_logement: 44,
        date_etablissement_dpe: '2024-03-14',
        conso_5_usages_par_m2_ep: 200,
      },
    ];
    const results = processResults(adData, ademeResults);
    expect(results[0]).toHaveProperty('address', '12 Rue X');
    expect(results[0]).toHaveProperty('city', 'Paris');
    expect(results[0]).toHaveProperty('dpe', 'D');
    expect(results[0]).toHaveProperty('ges', 'E');
    expect(results[0]).toHaveProperty('surface', 44);
    expect(results[0]).toHaveProperty('diagnosis_date', '2024-03-14');
    expect(results[0]).toHaveProperty('primary_energy', 200);
    expect(results[0]).toHaveProperty('score');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/services/dpe-service.test.js
```

Expected: FAIL

**Step 3: Write implementation**

`src/services/dpe-service.js`:

```js
import { parseFrenchDate } from '../utils/parsers.js';

export function validateSearchData(data) {
  const missing = [];
  if (!data.zipcode && !data.city) missing.push('Localisation');
  if (!data.date_diag) missing.push('Date');
  if (!data.dpe) missing.push('DPE');
  if (!data.ges) missing.push('GES');
  if (data.surface == null) missing.push('Surface');
  return { isValid: missing.length === 0, missing };
}

export function calculateMatchScore(adData, ademeItem) {
  let score = 100;

  // Surface deviation
  if (adData.surface != null && ademeItem.surface_habitable_logement != null) {
    const diffPercent =
      (Math.abs(adData.surface - ademeItem.surface_habitable_logement) / adData.surface) * 100;
    score -= diffPercent * 2;
  }

  // Date deviation
  const dateAd = parseFrenchDate(adData.date_diag);
  const dateItem = ademeItem.date_etablissement_dpe
    ? new Date(ademeItem.date_etablissement_dpe)
    : null;
  if (dateAd && dateItem && !isNaN(dateItem.getTime())) {
    const diffDays = Math.ceil(
      Math.abs(dateAd.getTime() - dateItem.getTime()) / (1000 * 60 * 60 * 24)
    );
    score -= diffDays * 2;
  }

  // Primary energy deviation
  if (adData.conso_prim != null && ademeItem.conso_5_usages_par_m2_ep != null) {
    const diffPercent =
      (Math.abs(adData.conso_prim - ademeItem.conso_5_usages_par_m2_ep) / adData.conso_prim) * 100;
    score -= diffPercent;
  }

  return Math.max(0, Math.round(score));
}

export function processResults(adData, ademeResults) {
  return ademeResults
    .map((item) => ({
      address: item.adresse_ban || item.nom_commune_ban || 'Adresse inconnue',
      city: item.nom_commune_ban || '',
      dpe: item.etiquette_dpe || '',
      ges: item.etiquette_ges || '',
      surface: item.surface_habitable_logement,
      diagnosis_date: item.date_etablissement_dpe || '',
      primary_energy: item.conso_5_usages_par_m2_ep,
      score: calculateMatchScore(adData, item),
    }))
    .sort((a, b) => b.score - a.score);
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/services/dpe-service.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/dpe-service.js tests/services/dpe-service.test.js
git commit -m "feat: add DPE service with validation, scoring and result processing"
```

---

### Task 5: Create Express server and location route

**Files:**

- Create: `immo-locator-api/src/index.js`
- Create: `immo-locator-api/src/routes/location.js`
- Create: `immo-locator-api/tests/routes/location.test.js`

**Step 1: Write the failing tests**

`tests/routes/location.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '../../src/index.js';

// Mock the ademe-client module
vi.mock('../../src/clients/ademe-client.js', () => ({
  fetchAdeme: vi.fn(),
}));

import { fetchAdeme } from '../../src/clients/ademe-client.js';

describe('POST /api/location/search', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  const validBody = {
    zipcode: '75011',
    city: 'Paris',
    dpe: 'D',
    ges: 'E',
    surface: 45,
    date_diag: '15/03/2024',
    conso_prim: 230,
  };

  it('returns 400 when required fields are missing', async () => {
    const res = await fetch(getUrl(app, '/api/location/search'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dpe: 'D' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('MISSING_FIELDS');
    expect(body.missing).toContain('Localisation');
  });

  it('returns scored results on success', async () => {
    fetchAdeme.mockResolvedValue({
      results: [
        {
          adresse_ban: '12 Rue X',
          nom_commune_ban: 'Paris',
          etiquette_dpe: 'D',
          etiquette_ges: 'E',
          surface_habitable_logement: 44,
          date_etablissement_dpe: '2024-03-15',
          conso_5_usages_par_m2_ep: 225,
        },
      ],
    });

    const res = await fetch(getUrl(app, '/api/location/search'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.results[0]).toHaveProperty('score');
    expect(body.results[0]).toHaveProperty('address', '12 Rue X');
  });

  it('returns empty results when ADEME returns nothing', async () => {
    fetchAdeme.mockResolvedValue({ results: [] });

    const res = await fetch(getUrl(app, '/api/location/search'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(0);
    expect(body.results).toHaveLength(0);
  });

  it('returns 502 when ADEME API fails', async () => {
    fetchAdeme.mockRejectedValue(new Error('ADEME API error: 500'));

    const res = await fetch(getUrl(app, '/api/location/search'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(502);
  });
});

// Helper: start app on random port and return base URL
function getUrl(app, path) {
  const address = app.address();
  return `http://127.0.0.1:${address.port}${path}`;
}
```

Note: The tests use a `createApp()` factory that returns an http.Server (already listening). This pattern allows tests to run on random ports.

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/routes/location.test.js
```

Expected: FAIL

**Step 3: Write implementation**

`src/routes/location.js`:

```js
import { Router } from 'express';
import { validateSearchData, processResults } from '../services/dpe-service.js';
import { fetchAdeme } from '../clients/ademe-client.js';

const router = Router();

router.post('/search', async (req, res) => {
  const data = req.body;

  const validation = validateSearchData(data);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: `Champs manquants : ${validation.missing.join(', ')}`,
      missing: validation.missing,
    });
  }

  try {
    const ademeResponse = await fetchAdeme(data);
    const results = ademeResponse.results ? processResults(data, ademeResponse.results) : [];

    return res.json({
      results,
      count: results.length,
    });
  } catch (err) {
    console.error('ADEME search error:', err.message);
    return res.status(502).json({
      error: 'UPSTREAM_ERROR',
      message: 'Erreur lors de la communication avec le service de données.',
    });
  }
});

export default router;
```

`src/index.js`:

```js
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import locationRouter from './routes/location.js';

export function createApp() {
  const app = express();

  app.use(helmet());

  const allowedOrigins = [process.env.CORS_CHROME_ORIGIN, process.env.CORS_FIREFOX_ORIGIN].filter(
    Boolean
  );

  app.use(
    cors({
      origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    })
  );

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 30,
    })
  );

  app.use(express.json());

  app.use('/api/location', locationRouter);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  const port = process.env.PORT || 3000;
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  return server;
}

// Start server when run directly (not imported in tests)
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''))) {
  createApp();
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/routes/location.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/index.js src/routes/location.js tests/routes/location.test.js
git commit -m "feat: add Express server with POST /api/location/search route"
```

---

### Task 6: Run all backend tests + manual smoke test

**Step 1: Run full test suite**

```bash
cd ~/immo-locator-api
npx vitest run
```

Expected: All tests PASS

**Step 2: Smoke test**

```bash
npm run dev &
curl -X POST http://localhost:3000/api/location/search \
  -H 'Content-Type: application/json' \
  -d '{"zipcode":"75011","dpe":"D","ges":"E","surface":45,"date_diag":"15/03/2024","conso_prim":230}'
```

Expected: JSON response with `results` and `count` fields

```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok"}`

**Step 3: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during smoke test"
```

---

## Part 2: Extension modifications — `AnnonceImmoLocator` (this repo)

### Task 7: Update extension to call backend API

**Files:**

- Modify: `~/AnnonceImmoLocator/src/popup.js` (lines 1-11 imports, lines 405-471 executeAdemeSearch, lines 378-402 prepareAdemeSearch)
- Modify: `~/AnnonceImmoLocator/src/api/ademe-client.js` (remove scoring-related exports, add backend URL)
- Modify: `~/AnnonceImmoLocator/manifest.json` (CSP connect-src)

**Step 1: Create a new API client for the backend**

Replace the content of `src/api/ademe-client.js` with a thin client that calls the backend:

```js
const API_BASE_URL = 'https://api.your-domain.fr'; // TODO: replace with actual VPS domain

/**
 * Validate data required for search
 */
export function validateSearchData(data) {
  const missing = [];
  const hasLocation = !!data.zipcode || !!data.city;
  if (!hasLocation) missing.push('Localisation');
  if (!data.date_diag || data.date_diag === 'Non trouvé') missing.push('Date');
  if (!data.dpe || data.dpe === 'Non trouvé') missing.push('DPE');
  if (!data.ges || data.ges === 'Non trouvé') missing.push('GES');
  if (!data.surface || data.surface === 'Non trouvé') missing.push('Surface');
  return { isValid: missing.length === 0, missing };
}

/**
 * Build the request body for the backend API.
 * Parses string values to numbers where needed.
 */
export function buildSearchPayload(data) {
  const parseSurface = (s) => {
    if (!s || s === 'Non trouvé') return null;
    if (typeof s === 'number') return s;
    const cleaned = String(s)
      .replace(/[^\d,.-]/g, '')
      .replace(',', '.');
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  };

  const parseEnergy = (s) => {
    if (!s || s === 'Non trouvé') return null;
    if (typeof s === 'number') return s;
    const cleaned = String(s)
      .replace(/[^\d,.-]/g, '')
      .replace(',', '.');
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  };

  return {
    zipcode: data.zipcode !== 'Non trouvé' ? data.zipcode : null,
    city: data.city !== 'Non trouvé' ? data.city : null,
    dpe: data.dpe !== 'Non trouvé' ? data.dpe : null,
    ges: data.ges !== 'Non trouvé' ? data.ges : null,
    surface: parseSurface(data.surface),
    date_diag: data.date_diag !== 'Non trouvé' ? data.date_diag : null,
    conso_prim: parseEnergy(data.conso_prim),
    conso_fin: parseEnergy(data.conso_fin),
  };
}

/**
 * Search the backend API
 */
export async function searchLocation(data) {
  const payload = buildSearchPayload(data);
  const response = await fetch(`${API_BASE_URL}/api/location/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const err = new Error(errorBody.message || 'Erreur lors de la recherche.');
    err.code = errorBody.error;
    err.missing = errorBody.missing;
    throw err;
  }

  return response.json();
}

/**
 * Get Google Maps link for an address
 */
export function getGoogleMapsLink(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
```

**Step 2: Update `src/popup.js`**

Replace imports (line 1-11):

```js
globalThis.browser ??= globalThis.chrome;

import { getScoreColor } from './utils/score-calculator.js';
import { validateSearchData, searchLocation, getGoogleMapsLink } from './api/ademe-client.js';
import { clearElement, createMessage, createAdemeResultsList } from './utils/dom-helpers.js';
import { getErrorMessage, ERROR_CODES } from './utils/error-messages.js';
```

Replace `prepareAdemeSearch` function (lines 378-402):

```js
function prepareAdemeSearch(data) {
  const searchBtn = document.getElementById('search-ademe-btn');
  const ademeResults = document.getElementById('ademe-results');

  clearElement(ademeResults);
  searchBtn.style.display = 'none';

  const validation = validateSearchData(data);
  if (!validation.isValid) {
    const msg = createMessage(
      `Recherche non disponible : ${validation.missing.join(', ')} manquant(s).`,
      '#999'
    );
    msg.style.fontSize = '12px';
    ademeResults.appendChild(msg);
    return;
  }

  searchBtn.style.display = 'block';
  searchBtn.onclick = () => executeAdemeSearch(data);
}
```

Replace `executeAdemeSearch` function (lines 405-471):

```js
async function executeAdemeSearch(data) {
  const ademeLoading = document.getElementById('ademe-loading');
  const ademeResults = document.getElementById('ademe-results');
  const searchBtn = document.getElementById('search-ademe-btn');

  searchBtn.disabled = true;
  searchBtn.textContent = 'Recherche en cours...';
  ademeLoading.style.display = 'block';
  clearElement(ademeResults);

  try {
    const result = await searchLocation(data);

    ademeLoading.style.display = 'none';
    searchBtn.textContent = 'Lancer la recherche';
    searchBtn.disabled = false;

    if (result.results && result.results.length > 0) {
      const resultsList = createAdemeResultsList(
        result.results,
        (item) => getGoogleMapsLink(item.address),
        (item) => getScoreColor(item.score)
      );
      ademeResults.appendChild(resultsList);
    } else {
      ademeResults.appendChild(
        createMessage('Aucun DPE correspondant trouvé avec ces critères stricts.')
      );
    }
  } catch (error) {
    console.error('API Error:', error);
    ademeLoading.style.display = 'none';
    searchBtn.textContent = 'Lancer la recherche';
    searchBtn.disabled = false;
    clearElement(ademeResults);
    const errorMessage =
      error.code && ERROR_CODES[error.code]
        ? getErrorMessage(error.code)
        : error.message || 'Erreur lors de la recherche.';
    ademeResults.appendChild(createMessage(errorMessage, 'red'));
  }
}
```

**Step 3: Update `manifest.json` CSP**

Change `connect-src` from `https://data.ademe.fr` to `https://api.your-domain.fr` (replace with actual VPS domain):

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://api.your-domain.fr"
}
```

**Step 4: Update `createAdemeResultsList` caller**

The backend now returns results in a different format (`address` instead of `adresse_ban`, `score` already computed). The `createAdemeResultsList` in `dom-helpers.js` expects items with an `adresse_ban` field and a `score` field. Update the call to match the new response format, OR update `dom-helpers.js` to use `address` instead of `adresse_ban`.

In `src/utils/dom-helpers.js`, update `createAdemeResultItem` and `createAdemeResultsList` to use `item.address` instead of `item.adresse_ban || item.nom_commune_ban`:

- Line 257: `const address = item.address || 'Adresse inconnue';`
- Line 304: `const address = item.address || 'Adresse inconnue';`

**Step 5: Build the extension**

```bash
cd ~/AnnonceImmoLocator
npm run build
```

Expected: Build successful

**Step 6: Remove unused imports from score-calculator.js**

`src/utils/score-calculator.js` — keep only `getScoreColor` (and `findOutlier` if still used by visual extraction). Remove `calculateMatchScore`, `sortResultsByScore` exports since they're now in the backend.

Note: `findOutlier` is still used by the visual DPE/GES extraction in the injected `extractRealEstateData` function inside `popup.js`. Since that function is bundled by esbuild, `findOutlier` from score-calculator.js is NOT used there (it's inlined). So `findOutlier` can be removed from score-calculator.js too.

Keep only:

```js
export function getScoreColor(score) {
  if (typeof score !== 'number' || isNaN(score)) return 'gray';
  if (score >= 80) return 'green';
  if (score >= 50) return 'orange';
  return 'red';
}
```

**Step 7: Rebuild and commit**

```bash
npm run build
git add src/api/ademe-client.js src/popup.js src/utils/score-calculator.js src/utils/dom-helpers.js manifest.json popup.js
git commit -m "refactor: replace direct ADEME API calls with backend proxy"
```

---

### Task 8: Update extension tests

**Files:**

- Modify: `~/AnnonceImmoLocator/tests/unit/score-calculator.test.js` (remove tests for deleted functions)
- Modify: `~/AnnonceImmoLocator/tests/integration/ademe-client.test.js` (update for new API client)

**Step 1: Update score-calculator tests**

Remove tests for `calculateMatchScore` and `sortResultsByScore`. Keep tests for `getScoreColor` (and `findOutlier` if kept).

**Step 2: Update ademe-client tests**

Rewrite to test the new `validateSearchData`, `buildSearchPayload`, and `searchLocation` functions.

**Step 3: Run all tests**

```bash
cd ~/AnnonceImmoLocator
npm test
```

Expected: All PASS

**Step 4: Commit**

```bash
git add tests/
git commit -m "test: update tests for backend proxy integration"
```

---

## Summary of commits

| #   | Repo                 | Message                                                                |
| --- | -------------------- | ---------------------------------------------------------------------- |
| 1   | `immo-locator-api`   | `chore: initialize immo-locator-api project`                           |
| 2   | `immo-locator-api`   | `feat: add date parsers`                                               |
| 3   | `immo-locator-api`   | `feat: add ADEME API client`                                           |
| 4   | `immo-locator-api`   | `feat: add DPE service with validation, scoring and result processing` |
| 5   | `immo-locator-api`   | `feat: add Express server with POST /api/location/search route`        |
| 6   | `immo-locator-api`   | `fix: address issues found during smoke test` (if needed)              |
| 7   | `AnnonceImmoLocator` | `refactor: replace direct ADEME API calls with backend proxy`          |
| 8   | `AnnonceImmoLocator` | `test: update tests for backend proxy integration`                     |
