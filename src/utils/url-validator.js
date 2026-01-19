/**
 * Check if a URL is a valid Leboncoin real estate page
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid Leboncoin real estate URL
 */
export function isValidLeboncoinRealEstateUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return url.includes('/ventes_immobilieres/') || url.includes('/locations/');
}

/**
 * Get the type of real estate listing from URL
 * @param {string} url - The URL to check
 * @returns {'sale' | 'rental' | null} - The type of listing
 */
export function getRealEstateType(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }
  if (url.includes('/ventes_immobilieres/')) {
    return 'sale';
  }
  if (url.includes('/locations/')) {
    return 'rental';
  }
  return null;
}
