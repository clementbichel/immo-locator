import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';

vi.mock('../../src/clients/ademe-client.js', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, fetchAdeme: vi.fn() };
});

import { createApp } from '../../src/index.js';

describe('Global error handler', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    // App standalone pour tester le handler 500 sans que le 404 intercède
    const app = express();
    app.get('/test-error', (_req, _res, next) => next(new Error('test boom')));
    app.use((err, _req, res, _next) => {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erreur interne du serveur.' });
    });
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('returns JSON 500 for unhandled route errors', async () => {
    const res = await fetch(`${baseUrl}/test-error`);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('Erreur interne du serveur.');
  });
});

describe('404 handler', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('returns JSON 404 for unknown GET route', async () => {
    const res = await fetch(`${baseUrl}/wp-admin`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('NOT_FOUND');
  });

  it('returns JSON 404 for unknown POST route', async () => {
    const res = await fetch(`${baseUrl}/api/unknown`, { method: 'POST' });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('NOT_FOUND');
  });

  it('returns JSON 404 for common scanner paths', async () => {
    const paths = ['/.env', '/phpinfo.php', '/admin', '/config.json'];
    for (const path of paths) {
      const res = await fetch(`${baseUrl}${path}`);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('NOT_FOUND');
    }
  });

  it('does not expose HTML or framework info in 404 response', async () => {
    const res = await fetch(`${baseUrl}/anything`);
    const contentType = res.headers.get('content-type');
    expect(contentType).toMatch(/application\/json/);
    const text = await res.text();
    expect(text).not.toMatch(/Cannot GET/);
    expect(text).not.toMatch(/Express/);
  });
});
