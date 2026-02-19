import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock native modules that fail due to architecture mismatch in test environment
vi.mock('../../src/db.js', () => ({
  recordSearch: vi.fn(),
}));

vi.mock('../../src/clients/ademe-client.js', () => ({
  fetchAdeme: vi.fn(),
}));

import request from 'supertest';
import { createApp } from '../../src/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const TEST_REPORTS_FILE = path.join(process.cwd(), 'data', 'reports.test.jsonl');

describe('POST /api/reports', () => {
  let app;

  beforeEach(async () => {
    process.env.REPORTS_FILE = TEST_REPORTS_FILE;
    app = createApp();
    // Clean up test file before each test
    await fs.rm(TEST_REPORTS_FILE, { force: true });
  });

  afterEach(async () => {
    delete process.env.REPORTS_FILE;
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
    await request(app).post('/api/reports').send({ ...payload, url: 'https://leboncoin.fr/ad/456' });

    const content = await fs.readFile(TEST_REPORTS_FILE, 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[1]).url).toBe('https://leboncoin.fr/ad/456');
  });

  it('returns 500 when file write fails', async () => {
    // Point REPORTS_FILE to an existing directory — appendFile will fail with EISDIR
    process.env.REPORTS_FILE = path.join(process.cwd(), 'data');
    app = createApp();

    const res = await request(app)
      .post('/api/reports')
      .send({ url: 'https://leboncoin.fr/ad/123', extracted: { dpe: 'D' } });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('WRITE_ERROR');

    // Restore for afterEach cleanup
    process.env.REPORTS_FILE = TEST_REPORTS_FILE;
    app = createApp();
  });
});
