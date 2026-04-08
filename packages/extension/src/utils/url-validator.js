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

/**
 * Get the type of real estate listing from URL
 * @param {string} url - The URL to check
 * @returns {'sale' | 'rental' | null} - The type of listing
 */
export function getRealEstateType(url) {
  const parsed = parseLeboncoinUrl(url);
  if (!parsed) return null;
  if (LEBONCOIN_SALE_RE.test(parsed.pathname)) return 'sale';
  if (LEBONCOIN_RENTAL_RE.test(parsed.pathname)) return 'rental';
  return null;
}

/**
 * Check if a URL is a valid SeLoger real estate page
 * SeLoger ad pages live under /annonces/achat/... and /annonces/locations/...
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid SeLoger real estate URL
 */
export function isValidSelogerRealEstateUrl(url) {
  const parsed = parseSelogerUrl(url);
  if (!parsed) return false;
  return (
    parsed.pathname.startsWith('/annonces/achat/') ||
    parsed.pathname.startsWith('/annonces/locations/')
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
