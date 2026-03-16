import { LRUCache } from 'lru-cache';
import { parseFrenchDate, formatDateISO } from '../utils/parsers.js';
import { logger } from '../logger.js';
import { MATCH_CONFIG } from '../services/dpe-service.js';

const cache = new LRUCache({
  max: 500,
  ttl: 60 * 60 * 1000, // 1 heure
});

const ADEME_API_URL =
  process.env.ADEME_API_URL ||
  'https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines';

// Circuit breaker state
const breaker = {
  failures: 0,
  openedAt: 0,
  threshold: 3, // open after 3 consecutive failures
  cooldownMs: 30_000, // retry after 30s
};

export function buildAdemeParams(data) {
  const params = new URLSearchParams();

  if (data.zipcode) {
    params.append('code_postal_ban_eq', data.zipcode);
  } else if (data.city) {
    params.append('nom_commune_ban_eq', data.city);
  }

  if (data.dpe) params.append('etiquette_dpe_eq', data.dpe);
  if (data.ges) params.append('etiquette_ges_eq', data.ges);

  if (data.surface !== null && data.surface !== undefined) {
    const dev = MATCH_CONFIG.surface.maxDeviation;
    params.append('surface_habitable_logement_gte', String(Math.floor(data.surface * (1 - dev))));
    params.append('surface_habitable_logement_lte', String(Math.ceil(data.surface * (1 + dev))));
  }

  const diagDate = parseFrenchDate(data.date_diag);
  if (diagDate) {
    const days = MATCH_CONFIG.date.maxDays;
    const minDate = new Date(diagDate);
    minDate.setDate(diagDate.getDate() - days);
    const maxDate = new Date(diagDate);
    maxDate.setDate(diagDate.getDate() + days);
    params.append('date_etablissement_dpe_gte', formatDateISO(minDate));
    params.append('date_etablissement_dpe_lte', formatDateISO(maxDate));
  }

  if (data.conso_prim !== null && data.conso_prim !== undefined) {
    const dev = MATCH_CONFIG.conso_prim.maxDeviation;
    params.append('conso_5_usages_par_m2_ep_gte', String(Math.round(data.conso_prim * (1 - dev))));
    params.append('conso_5_usages_par_m2_ep_lte', String(Math.round(data.conso_prim * (1 + dev))));
  }

  if (data.conso_fin !== null && data.conso_fin !== undefined) {
    const dev = MATCH_CONFIG.conso_fin.maxDeviation;
    params.append('conso_5_usages_par_m2_ef_gte', String(Math.round(data.conso_fin * (1 - dev))));
    params.append('conso_5_usages_par_m2_ef_lte', String(Math.round(data.conso_fin * (1 + dev))));
  }

  params.append(
    'select',
    'adresse_ban,etiquette_dpe,etiquette_ges,date_etablissement_dpe,surface_habitable_logement,nom_commune_ban,conso_5_usages_par_m2_ep,conso_5_usages_par_m2_ef'
  );

  return params;
}

export function buildAdemeUrl(data) {
  const params = buildAdemeParams(data);
  return `${ADEME_API_URL}?${params.toString()}`;
}

export async function fetchAdeme(data) {
  const url = buildAdemeUrl(data);

  const cached = cache.get(url);
  if (cached) {
    logger.info({ url }, 'ADEME cache hit');
    return cached;
  }

  // Circuit breaker: fail fast if ADEME is down
  if (breaker.failures >= breaker.threshold) {
    if (Date.now() - breaker.openedAt < breaker.cooldownMs) {
      logger.warn({ failures: breaker.failures }, 'ADEME circuit breaker OPEN — skipping request');
      const err = new Error('ADEME API unavailable (circuit breaker open)');
      err.status = 503;
      throw err;
    }
    logger.info('ADEME circuit breaker HALF-OPEN — allowing test request');
  }

  const start = Date.now();
  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    breaker.failures++;
    breaker.openedAt = Date.now();
    logger.error(
      { failures: breaker.failures, error: e.message },
      'ADEME fetch error — circuit breaker incremented'
    );
    throw e;
  }
  const duration = Date.now() - start;
  if (!response.ok) {
    breaker.failures++;
    breaker.openedAt = Date.now();
    logger.error(
      { status: response.status, duration, failures: breaker.failures },
      'ADEME API request failed — circuit breaker incremented'
    );
    const err = new Error(`ADEME API error: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  // Success: reset circuit breaker
  if (breaker.failures > 0) {
    logger.info(
      { previousFailures: breaker.failures },
      'ADEME circuit breaker CLOSED — reset after success'
    );
  }
  breaker.failures = 0;

  logger.info({ status: response.status, duration }, 'ADEME API request completed');
  const result = await response.json();
  cache.set(url, result);
  return result;
}

/** @internal — exposed for testing only */
export function _resetBreaker() {
  breaker.failures = 0;
  breaker.openedAt = 0;
}
