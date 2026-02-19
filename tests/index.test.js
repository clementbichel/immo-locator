import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv } from '../src/index.js';

describe('validateEnv', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws if ADEME_API_URL is missing', () => {
    delete process.env.ADEME_API_URL;
    expect(() => validateEnv()).toThrow('Missing required environment variables');
  });

  it('does not throw when required env vars are set', () => {
    process.env.ADEME_API_URL = 'https://example.com';
    process.env.CORS_CHROME_ORIGIN = 'chrome-extension://abc123';
    expect(() => validateEnv()).not.toThrow();
  });

  it('throws if no CORS origins are configured', () => {
    process.env.ADEME_API_URL = 'https://example.com';
    delete process.env.CORS_CHROME_ORIGIN;
    delete process.env.CORS_FIREFOX_ORIGIN;
    expect(() => validateEnv()).toThrow('Missing CORS origins');
  });
});
