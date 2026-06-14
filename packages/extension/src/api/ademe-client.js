import { parseFrenchDate, formatDateISO } from '../utils/parsers.js';
import { MATCH_CONFIG } from '../services/dpe-service.js';

// API publique ADEME (open data) — interrogée directement depuis le popup.
// Le popup étant une page d'extension, l'appel cross-origin est autorisé via
// host_permissions ; l'API renvoie de toute façon access-control-allow-origin: *.
export const ADEME_API_URL = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines';

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
