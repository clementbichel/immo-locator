import { parseFrenchDate, formatDateISO } from '../utils/parsers.js';

const ADEME_API_URL = process.env.ADEME_API_URL || 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines';

export function buildAdemeParams(data) {
  const params = new URLSearchParams();

  if (data.zipcode) {
    params.append('code_postal_ban_eq', data.zipcode);
  } else if (data.city) {
    params.append('nom_commune_ban_eq', data.city);
  }

  if (data.dpe) params.append('etiquette_dpe_eq', data.dpe);
  if (data.ges) params.append('etiquette_ges_eq', data.ges);

  if (data.surface != null) {
    params.append('surface_habitable_logement_gte', String(Math.floor(data.surface * 0.9)));
    params.append('surface_habitable_logement_lte', String(Math.ceil(data.surface * 1.1)));
  }

  const diagDate = parseFrenchDate(data.date_diag);
  if (diagDate) {
    const minDate = new Date(diagDate);
    minDate.setDate(diagDate.getDate() - 7);
    const maxDate = new Date(diagDate);
    maxDate.setDate(diagDate.getDate() + 7);
    params.append('date_etablissement_dpe_gte', formatDateISO(minDate));
    params.append('date_etablissement_dpe_lte', formatDateISO(maxDate));
  }

  if (data.conso_prim != null) {
    params.append('conso_5_usages_par_m2_ep_gte', String(Math.round(data.conso_prim * 0.9)));
    params.append('conso_5_usages_par_m2_ep_lte', String(Math.round(data.conso_prim * 1.1)));
  }

  params.append('size', '5');
  params.append('select', 'adresse_ban,etiquette_dpe,etiquette_ges,date_etablissement_dpe,surface_habitable_logement,nom_commune_ban,conso_5_usages_par_m2_ep');

  return params;
}

export function buildAdemeUrl(data) {
  const params = buildAdemeParams(data);
  return `${ADEME_API_URL}?${params.toString()}`;
}

export async function fetchAdeme(data) {
  const url = buildAdemeUrl(data);
  const response = await fetch(url);
  if (!response.ok) {
    const err = new Error(`ADEME API error: ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}
