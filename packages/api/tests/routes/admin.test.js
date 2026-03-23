import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/clients/ademe-client.js', () => ({
  fetchAdeme: vi.fn(),
}));

import request from 'supertest';
import { createApp } from '../../src/index.js';
import { recordSearch, recordReport } from '../../src/db.js';

const VALID_KEY = 'a'.repeat(32);

function authed(app) {
  return {
    get: (url) => request(app).get(url).set('X-Admin-Key', VALID_KEY),
  };
}

describe('Admin endpoints', () => {
  let app;

  beforeEach(() => {
    process.env.ADMIN_API_KEY = VALID_KEY;
    app = createApp();
  });

  describe('GET /api/admin/stats', () => {
    it('returns stats structure', async () => {
      const res = await authed(app).get('/api/admin/stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('searches');
      expect(res.body).toHaveProperty('reports');
      expect(res.body.searches).toHaveProperty('total');
      expect(res.body.searches).toHaveProperty('today');
      expect(res.body.searches).toHaveProperty('last7d');
      expect(res.body.searches).toHaveProperty('last30d');
      expect(res.body.searches).toHaveProperty('avgDurationMs');
      expect(res.body.searches).toHaveProperty('byStatus');
      expect(res.body.searches).toHaveProperty('byDpe');
      expect(res.body.searches).toHaveProperty('topCities');
      expect(res.body.reports).toHaveProperty('total');
      expect(res.body.reports).toHaveProperty('today');
      expect(res.body.reports).toHaveProperty('last7d');
      expect(res.body.reports).toHaveProperty('last30d');
    });
  });

  describe('GET /api/admin/searches', () => {
    it('returns paginated structure with defaults', async () => {
      const res = await authed(app).get('/api/admin/searches');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page', 1);
      expect(res.body).toHaveProperty('pages');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('respects page and limit params', async () => {
      const res = await authed(app).get('/api/admin/searches?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
    });

    it('filters by status', async () => {
      recordSearch({
        zipcode: '75011',
        city: 'Paris',
        dpe: 'D',
        ges: 'E',
        surface: 45,
        results_count: 1,
        duration_ms: 100,
        status: 'ok',
      });
      recordSearch({
        zipcode: '75011',
        city: 'Paris',
        dpe: 'D',
        ges: 'E',
        surface: 45,
        results_count: 0,
        duration_ms: 100,
        status: 'no_results',
      });

      const res = await authed(app).get('/api/admin/searches?status=ok');
      expect(res.status).toBe(200);
      for (const row of res.body.data) {
        expect(row.status).toBe('ok');
      }
    });

    it('returns 400 for invalid limit', async () => {
      const res = await authed(app).get('/api/admin/searches?limit=999');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/admin/reports', () => {
    it('returns paginated structure', async () => {
      const res = await authed(app).get('/api/admin/reports');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page', 1);
      expect(res.body).toHaveProperty('pages');
    });

    it('filters by date range', async () => {
      recordReport({
        url: 'https://leboncoin.fr/ad/123',
        dpe: 'D',
        city: 'Paris',
        zipcode: '75011',
      });

      const now = Date.now();
      const res = await authed(app).get(`/api/admin/reports?from=${now - 60000}&to=${now + 60000}`);
      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/admin/export/searches', () => {
    it('returns CSV with correct headers', async () => {
      recordSearch({
        zipcode: '75011',
        city: 'Paris',
        dpe: 'D',
        ges: 'E',
        surface: 45,
        results_count: 1,
        duration_ms: 100,
        status: 'ok',
      });

      const res = await authed(app).get('/api/admin/export/searches');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename=searches-/);
      expect(res.text).toContain(
        'id,ts,zipcode,city,dpe,ges,surface,date_diag,conso_prim,results_count,duration_ms,status'
      );
    });
  });

  describe('GET /api/admin/export/reports', () => {
    it('returns CSV with correct headers', async () => {
      recordReport({
        url: 'https://leboncoin.fr/ad/456',
        dpe: 'B',
        city: 'Lyon',
        zipcode: '69001',
      });

      const res = await authed(app).get('/api/admin/export/reports');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename=reports-/);
      expect(res.text).toContain(
        'id,ts,url,surface,terrain,dpe,ges,date_diag,conso_prim,conso_fin,city,zipcode'
      );
    });
  });
});
