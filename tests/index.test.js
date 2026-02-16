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

  it('does not throw when ADEME_API_URL is set', () => {
    process.env.ADEME_API_URL = 'https://example.com';
    expect(() => validateEnv()).not.toThrow();
  });
});
