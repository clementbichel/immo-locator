# Error Reporting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Signaler une erreur" button to the popup that sends extracted data + URL to a new `POST /api/reports` endpoint on the backend, which appends each report as a JSON line in `data/reports.jsonl`.

**Architecture:** Two independent parts — extension (Tasks 1–3) and backend in `immo-locator-api` (Tasks 4–5). The extension calls the new endpoint the same way it calls `/api/location/search`. The backend writes to an append-only JSONL file, creating it if absent.

**Tech Stack:** Vanilla JS (extension), Node.js + Express (backend), `fs.promises.appendFile` for JSONL persistence.

---

### Task 1: Add `sendReport()` to location-client + test

**Files:**

- Modify: `src/api/location-client.js`
- Test: `tests/integration/location-client.test.js`

**Step 1: Write the failing test**

Add at the end of `tests/integration/location-client.test.js`, inside the existing `describe` block:

```js
import { describe, it, expect, vi, afterEach } from 'vitest';
// (vi is already available from vitest — add it to the existing import)
```

Then add a new `describe` block after the existing ones:

```js
describe('sendReport', () => {
  afterEach(() => vi.restoreAllMocks());

  it('should POST to /api/reports with url and extracted data', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', mockFetch);

    const { sendReport } = await import('../../src/api/location-client.js');
    await sendReport('https://leboncoin.fr/ad/123', { dpe: 'D', surface: '45' });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.immolocator.fr/api/reports');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body.url).toBe('https://leboncoin.fr/ad/123');
    expect(body.extracted).toEqual({ dpe: 'D', surface: '45' });
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should throw on non-200 response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', mockFetch);

    const { sendReport } = await import('../../src/api/location-client.js');
    await expect(sendReport('https://leboncoin.fr/ad/123', {})).rejects.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- tests/integration/location-client.test.js
```

Expected: FAIL — `sendReport is not exported`

**Step 3: Implement `sendReport` in `src/api/location-client.js`**

Add at the end of the file:

```js
/**
 * Send an error report to the backend
 * @param {string} tabUrl - URL of the current Leboncoin tab
 * @param {object} extracted - Raw extracted data object
 */
export async function sendReport(tabUrl, extracted) {
  const payload = {
    url: tabUrl,
    timestamp: new Date().toISOString(),
    extracted,
  };
  const response = await fetch(`${API_BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Erreur lors de l'envoi du rapport.");
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- tests/integration/location-client.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/api/location-client.js tests/integration/location-client.test.js
git commit -m "feat: add sendReport() to location-client"
```

---

### Task 2: Add the report button to `popup.html`

**Files:**

- Modify: `popup.html`

**Step 1: Add button markup in the header**

In `popup.html`, find the `<header class="header">` block. The current `.header-left` div contains the icon and title. Add a report button to the right:

```html
<!-- Replace the existing <header> block with: -->
<header class="header">
  <div class="header-left">
    <div class="header-icon">🏠</div>
    <h1>Immo Locator</h1>
  </div>
  <button class="btn-report" id="report-btn" style="display: none">Signaler une erreur</button>
</header>
```

**Step 2: Add CSS for the button**

In the `<style>` block, add after the `.header h1` rule:

```css
.btn-report {
  background: none;
  border: none;
  font-size: 11px;
  color: var(--text-tertiary);
  cursor: pointer;
  font-family: inherit;
  padding: 4px 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color 0.15s;
  white-space: nowrap;
}

.btn-report:hover {
  color: var(--text-secondary);
}

.btn-report:disabled {
  cursor: default;
  text-decoration: none;
}
```

**Step 3: Verify visually**

Build and load the extension in Chrome. Open it on a Leboncoin listing. The button should be hidden initially (it will be shown by JS in Task 3).

**Step 4: Commit**

```bash
git add popup.html
git commit -m "feat: add report button to popup header"
```

---

### Task 3: Wire the report button in `popup.js`

**Files:**

- Modify: `src/popup.js`

**Step 1: Import `sendReport`**

In `src/popup.js`, update the import from `location-client.js`:

```js
// Before:
import { validateSearchData, searchLocation, getGoogleMapsLink } from './api/location-client.js';

// After:
import {
  validateSearchData,
  searchLocation,
  getGoogleMapsLink,
  sendReport,
} from './api/location-client.js';
```

**Step 2: Get the report button element**

At the top of the `DOMContentLoaded` handler, alongside the other `getElementById` calls, add:

```js
const reportBtn = document.getElementById('report-btn');
```

**Step 3: Wire the button after successful data extraction**

In `popup.js`, find the block that starts with `// Prepare Location Search (Manual)` (around line 564). Just before that call, add:

```js
// Show and wire the report button
reportBtn.style.display = 'block';
reportBtn.onclick = async () => {
  reportBtn.disabled = true;
  reportBtn.textContent = 'Envoi...';
  try {
    // Exclude internal debug log from the report
    const { debugLog: _debug, ...extractedData } = res;
    await sendReport(tabUrl, extractedData);
    reportBtn.textContent = '✓ Rapport envoyé';
    setTimeout(() => {
      reportBtn.textContent = 'Signaler une erreur';
      reportBtn.disabled = false;
    }, 2000);
  } catch {
    reportBtn.textContent = 'Signaler une erreur';
    reportBtn.disabled = false;
    errorMsg.textContent = "Impossible d'envoyer le rapport.";
    errorMsg.style.display = 'block';
    setTimeout(() => {
      errorMsg.style.display = 'none';
    }, 3000);
  }
};

// Prepare Location Search (Manual)
prepareLocationSearch(res);
```

**Step 4: Build and test manually**

```bash
npm run build
```

Load the extension in Chrome on a Leboncoin listing:

- The button "Signaler une erreur" should appear in the header
- Click it → "Envoi..." then "✓ Rapport envoyé" (if backend is running) or error message (if not)

**Step 5: Commit**

```bash
git add src/popup.js
git commit -m "feat: wire report button in popup"
```

---

### Task 4: Add `POST /api/reports` route in the backend

> **Repo:** `immo-locator-api` — switch to that directory.

**Files:**

- Create: `src/routes/reports.js`
- Test: `tests/routes/reports.test.js`

**Step 1: Write the failing test**

Create `tests/routes/reports.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const TEST_REPORTS_FILE = path.join(process.cwd(), 'data', 'reports.test.jsonl');

// Override the reports file path via env for tests
process.env.REPORTS_FILE = TEST_REPORTS_FILE;

describe('POST /api/reports', () => {
  let app;

  beforeEach(async () => {
    app = createApp();
    // Clean up test file before each test
    await fs.rm(TEST_REPORTS_FILE, { force: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_REPORTS_FILE, { force: true });
  });

  it('returns 200 and appends report to JSONL file', async () => {
    const payload = {
      url: 'https://leboncoin.fr/ad/123',
      timestamp: '2026-02-19T10:00:00.000Z',
      extracted: { dpe: 'D', surface: '45', city: 'Paris' },
    };

    const res = await request(app).post('/api/reports').send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const content = await fs.readFile(TEST_REPORTS_FILE, 'utf8');
    const line = JSON.parse(content.trim());
    expect(line.url).toBe('https://leboncoin.fr/ad/123');
    expect(line.extracted.dpe).toBe('D');
  });

  it('returns 400 when url is missing', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({ extracted: { dpe: 'D' } });
    expect(res.status).toBe(400);
  });

  it('returns 400 when extracted is missing', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({ url: 'https://leboncoin.fr/ad/123' });
    expect(res.status).toBe(400);
  });

  it('appends multiple reports as separate lines', async () => {
    const payload = {
      url: 'https://leboncoin.fr/ad/123',
      timestamp: '2026-02-19T10:00:00.000Z',
      extracted: { dpe: 'D' },
    };

    await request(app).post('/api/reports').send(payload);
    await request(app)
      .post('/api/reports')
      .send({ ...payload, url: 'https://leboncoin.fr/ad/456' });

    const content = await fs.readFile(TEST_REPORTS_FILE, 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[1]).url).toBe('https://leboncoin.fr/ad/456');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/routes/reports.test.js
```

Expected: FAIL — route does not exist yet

**Step 3: Create `src/routes/reports.js`**

```js
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';

const router = express.Router();

const REPORTS_FILE = process.env.REPORTS_FILE ?? path.join(process.cwd(), 'data', 'reports.jsonl');

router.post('/', async (req, res) => {
  const { url, extracted } = req.body;

  if (!url || !extracted) {
    return res
      .status(400)
      .json({ error: 'MISSING_FIELDS', message: 'url et extracted sont requis.' });
  }

  const entry = JSON.stringify({
    url,
    timestamp: req.body.timestamp ?? new Date().toISOString(),
    extracted,
  });

  try {
    await fs.mkdir(path.dirname(REPORTS_FILE), { recursive: true });
    await fs.appendFile(REPORTS_FILE, entry + '\n', 'utf8');
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to write report:', err);
    res.status(500).json({ error: 'WRITE_ERROR', message: "Impossible d'enregistrer le rapport." });
  }
});

export default router;
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- tests/routes/reports.test.js
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/routes/reports.js tests/routes/reports.test.js
git commit -m "feat: add POST /api/reports route with JSONL storage"
```

---

### Task 5: Register the reports router in `src/index.js`

> **Repo:** `immo-locator-api`

**Files:**

- Modify: `src/index.js`

**Step 1: Find the existing route registrations**

In `src/index.js`, find the line that registers the location router, e.g.:

```js
app.use('/api/location', locationRouter);
```

**Step 2: Add the reports router**

```js
import reportsRouter from './routes/reports.js';

// After the existing route registration:
app.use('/api/reports', reportsRouter);
```

**Step 3: Run all backend tests**

```bash
npm test
```

Expected: all existing tests still PASS + 4 new reports tests PASS

**Step 4: Create the `data/` directory and gitignore it**

On the VPS (and locally):

```bash
mkdir -p data
echo 'data/reports*.jsonl' >> .gitignore
```

**Step 5: Commit**

```bash
git add src/index.js .gitignore
git commit -m "feat: register /api/reports route"
```

---

## Verification end-to-end

1. Deploy backend to VPS (`pm2 restart immo-locator-api`)
2. Build extension (`npm run build` in extension repo)
3. Reload extension in `chrome://extensions/`
4. Open a Leboncoin listing
5. Click "Signaler une erreur" → see "✓ Rapport envoyé"
6. On VPS: `cat data/reports.jsonl | jq .` → should show the report

## Consulting reports on the VPS

```bash
# All reports, formatted
cat data/reports.jsonl | jq .

# Real-time monitoring
tail -f data/reports.jsonl | jq .

# Filter by city
cat data/reports.jsonl | jq 'select(.extracted.city == "Paris")'
```
