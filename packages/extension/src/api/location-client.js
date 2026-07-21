import { buildAdemeUrl } from './ademe-client.js';
import { processResults } from '../services/dpe-service.js';
import { ERROR_CODES } from '../utils/error-messages.js';

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
 * Critères retirés lors de la 2e passe : le GES est souvent désynchronisé de
 * l'annonce, et les consos Leboncoin divergent d'environ 20 % de l'ADEME, donc
 * leurs bornes éliminent des candidats légitimes avant même le scoring.
 * Les candidats restants sont toujours scorés sur ces champs.
 */
const BROADEN = { ges: null, conso_prim: null, conso_fin: null };

async function fetchAdeme(payload) {
  let response;
  try {
    response = await fetch(buildAdemeUrl(payload), { signal: AbortSignal.timeout(10_000) });
  } catch (e) {
    const err = new Error('Erreur de connexion à la base ADEME.');
    err.code = e?.name === 'TimeoutError' ? ERROR_CODES.NETWORK_TIMEOUT : ERROR_CODES.NETWORK_ERROR;
    throw err;
  }

  if (!response.ok) {
    const err = new Error(`Erreur ADEME (${response.status}).`);
    err.code = ERROR_CODES.API_ERROR;
    throw err;
  }

  const body = await response.json().catch(() => ({}));
  return Array.isArray(body.results) ? body.results : [];
}

/**
 * Search matching addresses by querying the public ADEME DPE API directly,
 * then scoring the candidates client-side. No backend server involved.
 * @returns {Promise<{results: Array, count: number, broadened: boolean}>}
 */
export async function searchLocation(data) {
  const payload = buildSearchPayload(data);

  let results = processResults(payload, await fetchAdeme(payload));
  let broadened = false;

  // ponytail: une seule 2e passe, jamais plus — plafond à 2 appels réseau
  if (results.length === 0) {
    broadened = true;
    results = processResults(payload, await fetchAdeme({ ...payload, ...BROADEN }));
  }

  const result = { results, count: results.length, broadened };

  if (!validateSearchResponse(result)) {
    throw new Error('Réponse inattendue de la base ADEME.');
  }
  return result;
}

/**
 * Get Google Maps link for an address
 */
export function getGoogleMapsLink(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
