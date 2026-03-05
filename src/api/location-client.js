const API_BASE_URL = 'https://api.immolocator.fr';

/**
 * Validate data required for search
 */
export function validateSearchData(data) {
  const missing = [];
  const warnings = [];
  const hasLocation =
    (data.zipcode && data.zipcode !== 'Non trouvé') || (data.city && data.city !== 'Non trouvé');
  if (!hasLocation) missing.push('Localisation');
  if (!data.dpe || data.dpe === 'Non trouvé') missing.push('DPE');
  if (!data.ges || data.ges === 'Non trouvé') missing.push('GES');
  if (!data.surface || data.surface === 'Non trouvé') missing.push('Surface');
  if (!data.date_diag || data.date_diag === 'Non trouvé') warnings.push('Date de diagnostic');
  return { isValid: missing.length === 0, missing, warnings };
}

/**
 * Parse a numeric value from a string (removes units like m², kWh/m²/an)
 */
function parseNumeric(value) {
  if (!value || value === 'Non trouvé') return null;
  if (typeof value === 'number') return value;
  const cleaned = String(value)
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Build the request body for the backend API
 */
export function buildSearchPayload(data) {
  return {
    zipcode: data.zipcode !== 'Non trouvé' ? data.zipcode : null,
    city: data.city !== 'Non trouvé' ? data.city : null,
    dpe: data.dpe !== 'Non trouvé' ? data.dpe : null,
    ges: data.ges !== 'Non trouvé' ? data.ges : null,
    surface: parseNumeric(data.surface),
    date_diag: data.date_diag !== 'Non trouvé' ? data.date_diag : null,
    conso_prim: parseNumeric(data.conso_prim),
    conso_fin: parseNumeric(data.conso_fin) || null,
  };
}

/**
 * Validate the search response from the backend
 */
function validateSearchResponse(data) {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.results)) return false;
  return data.results.every(
    (item) => typeof item.address === 'string' && typeof item.score === 'number'
  );
}

/**
 * Search the backend API
 */
export async function searchLocation(data) {
  const payload = buildSearchPayload(data);
  const response = await fetch(`${API_BASE_URL}/api/location/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const err = new Error(errorBody.message || 'Erreur lors de la recherche.');
    err.code = errorBody.error;
    err.missing = errorBody.missing;
    throw err;
  }

  const result = await response.json();
  if (!validateSearchResponse(result)) {
    throw new Error('Réponse inattendue du serveur.');
  }
  return result;
}

/**
 * Get Google Maps link for an address
 */
export function getGoogleMapsLink(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/**
 * Send an error report to the backend
 * @param {string} tabUrl - URL of the current Leboncoin tab
 * @param {object} extracted - Raw extracted data object
 */
export async function sendReport(tabUrl, extracted) {
  const cleaned = Object.fromEntries(
    Object.entries(extracted).filter(([, v]) => v !== null && v !== undefined && v !== 'Non trouvé')
  );
  const payload = {
    url: tabUrl,
    extracted: cleaned,
  };
  const response = await fetch(`${API_BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error("Erreur lors de l'envoi du rapport.");
  }
}
