import { parseSurface, parseFrenchDate, formatDateISO, parseEnergyValue } from '../utils/parsers.js';

const ADEME_API_BASE_URL = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines';

/**
 * Validate data required for ADEME search
 * @param {Object} data - Ad data to validate
 * @returns {Object} - Validation result with isValid and missing fields
 */
export function validateAdemeSearchData(data) {
  const missing = [];

  const hasLocation = (data.zipcode && data.zipcode !== 'Non trouvé') ||
                      (data.city && data.city !== 'Non trouvé');
  const hasDate = data.date_diag && data.date_diag !== 'Non trouvé';
  const hasDpe = data.dpe && data.dpe !== 'Non trouvé';
  const hasGes = data.ges && data.ges !== 'Non trouvé';
  const hasSurface = data.surface && data.surface !== 'Non trouvé';

  if (!hasLocation) missing.push('Localisation');
  if (!hasDate) missing.push('Date');
  if (!hasDpe) missing.push('DPE');
  if (!hasGes) missing.push('GES');
  if (!hasSurface) missing.push('Surface');

  return {
    isValid: missing.length === 0,
    missing
  };
}

/**
 * Build ADEME API query parameters
 * @param {Object} data - Ad data
 * @returns {URLSearchParams} - Query parameters
 */
export function buildAdemeParams(data) {
  const params = new URLSearchParams();

  // 1. Location (Zipcode OR City)
  if (data.zipcode && data.zipcode !== 'Non trouvé') {
    params.append('code_postal_ban_eq', data.zipcode);
  } else if (data.city && data.city !== 'Non trouvé') {
    params.append('nom_commune_ban_eq', data.city);
  }

  // 2. DPE Letter (Strict)
  if (data.dpe && data.dpe !== 'Non trouvé') {
    params.append('etiquette_dpe_eq', data.dpe);
  }

  // 3. GES Letter (Strict)
  if (data.ges && data.ges !== 'Non trouvé') {
    params.append('etiquette_ges_eq', data.ges);
  }

  // 4. Surface (+/- 10%)
  const surfaceVal = parseSurface(data.surface);
  if (surfaceVal !== null) {
    const minSurface = Math.floor(surfaceVal * 0.9);
    const maxSurface = Math.ceil(surfaceVal * 1.1);
    params.append('surface_habitable_logement_gte', minSurface);
    params.append('surface_habitable_logement_lte', maxSurface);
  }

  // 5. Date (+/- 7 days)
  const diagDate = parseFrenchDate(data.date_diag);
  if (diagDate) {
    const minDate = new Date(diagDate);
    minDate.setDate(diagDate.getDate() - 7);
    const maxDate = new Date(diagDate);
    maxDate.setDate(diagDate.getDate() + 7);

    params.append('date_etablissement_dpe_gte', formatDateISO(minDate));
    params.append('date_etablissement_dpe_lte', formatDateISO(maxDate));
  }

  // 6. Primary Energy (+/- 10%) - Optional
  if (data.conso_prim && data.conso_prim !== 'Non trouvé') {
    const primVal = parseEnergyValue(data.conso_prim);
    if (primVal !== null) {
      const minPrim = Math.floor(primVal * 0.9);
      const maxPrim = Math.ceil(primVal * 1.1);
      params.append('conso_5_usages_par_m2_ep_gte', minPrim);
      params.append('conso_5_usages_par_m2_ep_lte', maxPrim);
    }
  }

  // Add standard parameters
  params.append('size', '5');
  params.append('select', 'adresse_ban,etiquette_dpe,etiquette_ges,date_etablissement_dpe,surface_habitable_logement,nom_commune_ban,conso_5_usages_par_m2_ep');

  return params;
}

/**
 * Build the full ADEME API URL
 * @param {Object} data - Ad data
 * @returns {string} - Full API URL
 */
export function buildAdemeUrl(data) {
  const params = buildAdemeParams(data);
  return `${ADEME_API_BASE_URL}?${params.toString()}`;
}

/**
 * Search ADEME database
 * @param {Object} data - Ad data
 * @param {Function} fetchFn - Fetch function (for testing)
 * @returns {Promise<Object>} - API response
 */
export async function searchAdeme(data, fetchFn = fetch) {
  const validation = validateAdemeSearchData(data);
  if (!validation.isValid) {
    throw new Error(`Missing required fields: ${validation.missing.join(', ')}`);
  }

  const url = buildAdemeUrl(data);
  const response = await fetchFn(url);

  if (!response.ok) {
    throw new Error(`ADEME API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get Google Maps link for an address
 * @param {string} address - Address to search
 * @returns {string} - Google Maps URL
 */
export function getGoogleMapsLink(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
