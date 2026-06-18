const LEBONCOIN_HOSTNAMES = ['www.leboncoin.fr', 'leboncoin.fr'];
const SELOGER_HOSTNAMES = ['www.seloger.com', 'seloger.com'];

function parseLeboncoinUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (!LEBONCOIN_HOSTNAMES.includes(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseSelogerUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (!SELOGER_HOSTNAMES.includes(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Leboncoin supports two URL shapes:
//   - legacy: /ventes_immobilieres/<id>.htm, /locations/<id>.htm
//   - current: /ad/ventes_immobilieres/<id>, /ad/locations/<id>
const LEBONCOIN_SALE_RE = /^\/(?:ad\/)?ventes_immobilieres\//;
const LEBONCOIN_RENTAL_RE = /^\/(?:ad\/)?locations\//;

/**
 * Check if a URL is a valid Leboncoin real estate page
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid Leboncoin real estate URL
 */
export function isValidLeboncoinRealEstateUrl(url) {
  const parsed = parseLeboncoinUrl(url);
  if (!parsed) return false;
  return LEBONCOIN_SALE_RE.test(parsed.pathname) || LEBONCOIN_RENTAL_RE.test(parsed.pathname);
}

// SeLoger ad pages come in two shapes:
//   - legacy: /annonces/achat/..., /annonces/locations/...
//   - current: /<id>/detail.htm
const SELOGER_DETAIL_RE = /^\/\d+\/detail\.htm$/;

/**
 * Check if a URL is a valid SeLoger real estate page
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid SeLoger real estate URL
 */
export function isValidSelogerRealEstateUrl(url) {
  const parsed = parseSelogerUrl(url);
  if (!parsed) return false;
  return (
    parsed.pathname.startsWith('/annonces/achat/') ||
    parsed.pathname.startsWith('/annonces/locations/') ||
    SELOGER_DETAIL_RE.test(parsed.pathname)
  );
}

/**
 * Identify which supported real estate site a URL belongs to.
 * Used to dispatch the right page-context extractor in popup.js.
 * @param {string} url - The URL to inspect
 * @returns {'leboncoin' | 'seloger' | null}
 */
export function getSite(url) {
  if (isValidLeboncoinRealEstateUrl(url)) return 'leboncoin';
  if (isValidSelogerRealEstateUrl(url)) return 'seloger';
  return null;
}
