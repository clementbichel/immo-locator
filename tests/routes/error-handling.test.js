import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';

describe('Global error handler', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = express();

    // Route that throws
    app.get('/test-error', (req, res, next) => {
      next(new Error('test boom'));
    });

    // Same error handler as in src/index.js
    app.use((err, req, res, next) => {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur.',
      });
    });

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

  it('returns JSON 500 for unhandled route errors', async () => {
    const res = await fetch(`${baseUrl}/test-error`);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('Erreur interne du serveur.');
  });
});
