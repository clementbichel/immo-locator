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

  it('throws if CORS_CHROME_ORIGIN is not configured', () => {
    process.env.ADEME_API_URL = 'https://example.com';
    delete process.env.CORS_CHROME_ORIGIN;
    expect(() => validateEnv()).toThrow('CORS_CHROME_ORIGIN requis');
  });

  it('throws if CORS_CHROME_ORIGIN is a wildcard', () => {
    process.env.ADEME_API_URL = 'https://example.com';
    process.env.CORS_CHROME_ORIGIN = '*';
    expect(() => validateEnv()).toThrow('CORS_CHROME_ORIGIN requis');
  });

  it('does not throw when ADEME_API_URL and at least one CORS origin are set', () => {
    process.env.ADEME_API_URL = 'https://example.com';
    process.env.CORS_CHROME_ORIGIN = 'chrome-extension://abc123';
    expect(() => validateEnv()).not.toThrow();
  });
});
