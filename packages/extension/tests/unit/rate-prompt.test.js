import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { shouldAskForRating, getStoreReviewUrl } from '../../src/utils/rate-prompt.js';

// ponytail: stub 3 lignes plutôt que de tirer jsdom sur le projet "unit" (env node)
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, v),
  clear: () => store.clear(),
};

describe('shouldAskForRating', () => {
  beforeEach(() => globalThis.localStorage.clear());

  it('declenche a la 6e recherche puis plus jamais si refuse', () => {
    for (let i = 0; i < 5; i++) {
      expect(shouldAskForRating()).toBe(false);
    }
    expect(shouldAskForRating()).toBe(true);
    globalThis.localStorage.setItem('il_rate_done', '1');
    expect(shouldAskForRating()).toBe(false);
  });
});

describe('getStoreReviewUrl', () => {
  afterEach(() => delete globalThis.browser);

  it('renvoie AMO sous Firefox, le Chrome Web Store sinon', () => {
    globalThis.browser = { runtime: { getURL: () => 'moz-extension://abc/' } };
    expect(getStoreReviewUrl()).toContain('addons.mozilla.org');

    globalThis.browser = { runtime: { getURL: () => 'chrome-extension://abc/' } };
    expect(getStoreReviewUrl()).toContain('chromewebstore.google.com');
  });
});
