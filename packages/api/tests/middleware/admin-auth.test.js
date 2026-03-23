import { describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/clients/ademe-client.js', () => ({
  fetchAdeme: vi.fn(),
}));

import { vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/index.js';

const VALID_KEY = 'a'.repeat(32);

describe('Admin auth middleware', () => {
  let app;
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('when ADMIN_API_KEY is set', () => {
    beforeEach(() => {
      process.env.ADMIN_API_KEY = VALID_KEY;
      app = createApp();
    });

    it('returns 401 without X-Admin-Key header', async () => {
      const res = await request(app).get('/api/admin/stats');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('returns 403 with wrong key', async () => {
      const res = await request(app).get('/api/admin/stats').set('X-Admin-Key', 'wrong-key');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('returns 403 with key of different length', async () => {
      const res = await request(app).get('/api/admin/stats').set('X-Admin-Key', 'short');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('returns 200 with correct key', async () => {
      const res = await request(app).get('/api/admin/stats').set('X-Admin-Key', VALID_KEY);
      expect(res.status).toBe(200);
    });
  });

  describe('when ADMIN_API_KEY is not set', () => {
    beforeEach(() => {
      delete process.env.ADMIN_API_KEY;
      app = createApp();
    });

    it('returns 503', async () => {
      const res = await request(app).get('/api/admin/stats').set('X-Admin-Key', VALID_KEY);
      expect(res.status).toBe(503);
      expect(res.body.error).toBe('ADMIN_DISABLED');
    });
  });
});

describe('validateEnv with ADMIN_API_KEY', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.ADEME_API_URL = 'https://example.com';
    process.env.CORS_CHROME_ORIGIN = 'chrome-extension://abc123';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws if ADMIN_API_KEY is less than 32 chars', async () => {
    process.env.ADMIN_API_KEY = 'too-short';
    const { validateEnv } = await import('../../src/index.js');
    expect(() => validateEnv()).toThrow('ADMIN_API_KEY must be at least 32 characters');
  });

  it('does not throw if ADMIN_API_KEY is 32+ chars', async () => {
    process.env.ADMIN_API_KEY = VALID_KEY;
    const { validateEnv } = await import('../../src/index.js');
    expect(() => validateEnv()).not.toThrow();
  });

  it('does not throw if ADMIN_API_KEY is absent', async () => {
    delete process.env.ADMIN_API_KEY;
    const { validateEnv } = await import('../../src/index.js');
    expect(() => validateEnv()).not.toThrow();
  });
});
