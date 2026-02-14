import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

// Mock fetchAdeme before importing the app
vi.mock('../../src/clients/ademe-client.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    fetchAdeme: vi.fn(),
  };
});

import { createApp } from '../../src/index.js';
import { fetchAdeme } from '../../src/clients/ademe-client.js';

describe('POST /api/location/search', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
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
    const res = await fetch(`${baseUrl}/api/location/search`, {
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
      results: [{
        adresse_ban: '12 Rue X',
        nom_commune_ban: 'Paris',
        etiquette_dpe: 'D',
        etiquette_ges: 'E',
        surface_habitable_logement: 44,
        date_etablissement_dpe: '2024-03-15',
        conso_5_usages_par_m2_ep: 225,
      }],
    });

    const res = await fetch(`${baseUrl}/api/location/search`, {
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

    const res = await fetch(`${baseUrl}/api/location/search`, {
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

    const res = await fetch(`${baseUrl}/api/location/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(502);
  });

  it('health endpoint returns ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
