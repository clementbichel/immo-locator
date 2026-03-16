import { parseFrenchDate } from '../utils/parsers.js';

export function validateSearchData(data) {
  const missing = [];
  if (!data.zipcode && !data.city) missing.push('Localisation');
  if (!data.date_diag) missing.push('Date');
  if (!data.dpe) missing.push('DPE');
  if (!data.ges) missing.push('GES');
  if (data.surface === null || data.surface === undefined) missing.push('Surface');
  return { isValid: missing.length === 0, missing };
}

function parseISODateLocal(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return isNaN(date.getTime()) ? null : date;
}

export const MATCH_CONFIG = {
  surface: { weight: 4, maxDeviation: 0.15 },
  date: { weight: 3, maxDays: 14 },
  conso_fin: { weight: 2, maxDeviation: 0.15 },
  conso_prim: { weight: 1, maxDeviation: 0.3 },
};

export const MIN_SCORE_THRESHOLD = 50;
export const MAX_RESULTS = 5;

export function percentFieldMatch(actual, expected, maxDeviation) {
  if (expected === 0) return actual === 0 ? 1 : 0;
  const diff = Math.abs(actual - expected) / Math.abs(expected);
  return Math.max(0, 1 - (diff / maxDeviation) ** 2);
}

export function dateFieldMatch(diffDays, maxDays) {
  return Math.max(0, 1 - (diffDays / maxDays) ** 2);
}

export function calculateMatchScore(adData, ademeItem) {
  let totalWeight = 0;
  let weightedSum = 0;

  // Surface
  if (
    adData.surface !== null &&
    adData.surface !== undefined &&
    ademeItem.surface_habitable_logement !== null &&
    ademeItem.surface_habitable_logement !== undefined
  ) {
    const { weight, maxDeviation } = MATCH_CONFIG.surface;
    totalWeight += weight;
    weightedSum +=
      weight *
      percentFieldMatch(ademeItem.surface_habitable_logement, adData.surface, maxDeviation);
  }

  // Date
  const dateAd = parseFrenchDate(adData.date_diag);
  const dateItem = parseISODateLocal(ademeItem.date_etablissement_dpe);
  if (dateAd && dateItem) {
    const diffDays = Math.round(
      Math.abs(dateAd.getTime() - dateItem.getTime()) / (1000 * 60 * 60 * 24)
    );
    const { weight, maxDays } = MATCH_CONFIG.date;
    totalWeight += weight;
    weightedSum += weight * dateFieldMatch(diffDays, maxDays);
  }

  // conso_fin
  if (
    adData.conso_fin !== null &&
    adData.conso_fin !== undefined &&
    ademeItem.conso_5_usages_par_m2_ef !== null &&
    ademeItem.conso_5_usages_par_m2_ef !== undefined
  ) {
    const { weight, maxDeviation } = MATCH_CONFIG.conso_fin;
    totalWeight += weight;
    weightedSum +=
      weight *
      percentFieldMatch(ademeItem.conso_5_usages_par_m2_ef, adData.conso_fin, maxDeviation);
  }

  // conso_prim
  if (
    adData.conso_prim !== null &&
    adData.conso_prim !== undefined &&
    ademeItem.conso_5_usages_par_m2_ep !== null &&
    ademeItem.conso_5_usages_par_m2_ep !== undefined
  ) {
    const { weight, maxDeviation } = MATCH_CONFIG.conso_prim;
    totalWeight += weight;
    weightedSum +=
      weight *
      percentFieldMatch(ademeItem.conso_5_usages_par_m2_ep, adData.conso_prim, maxDeviation);
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 100);
}

export function processResults(adData, ademeResults) {
  const scored = ademeResults
    .map((item) => ({
      address: item.adresse_ban || item.nom_commune_ban || 'Adresse inconnue',
      city: item.nom_commune_ban || '',
      dpe: item.etiquette_dpe || '',
      ges: item.etiquette_ges || '',
      surface: item.surface_habitable_logement,
      diagnosis_date: item.date_etablissement_dpe || '',
      primary_energy: item.conso_5_usages_par_m2_ep,
      final_energy: item.conso_5_usages_par_m2_ef,
      score: calculateMatchScore(adData, item),
    }))
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return scored;

  const filtered = scored.filter((r) => r.score >= MIN_SCORE_THRESHOLD);
  const kept = filtered.length > 0 ? filtered : [scored[0]];
  return kept.slice(0, MAX_RESULTS);
}
