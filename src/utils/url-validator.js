const LEBONCOIN_HOSTNAMES = ['www.leboncoin.fr', 'leboncoin.fr'];

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

/**
 * Check if a URL is a valid Leboncoin real estate page
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid Leboncoin real estate URL
 */
export function isValidLeboncoinRealEstateUrl(url) {
  const parsed = parseLeboncoinUrl(url);
  if (!parsed) return false;
  return (
    parsed.pathname.startsWith('/ventes_immobilieres/') || parsed.pathname.startsWith('/locations/')
  );
}

/**
 * Get the type of real estate listing from URL
 * @param {string} url - The URL to check
 * @returns {'sale' | 'rental' | null} - The type of listing
 */
export function getRealEstateType(url) {
  const parsed = parseLeboncoinUrl(url);
  if (!parsed) return null;
  if (parsed.pathname.startsWith('/ventes_immobilieres/')) return 'sale';
  if (parsed.pathname.startsWith('/locations/')) return 'rental';
  return null;
}
