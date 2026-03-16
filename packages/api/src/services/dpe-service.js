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

export function calculateMatchScore(adData, ademeItem) {
  let score = 100;

  if (
    adData.surface !== null &&
    adData.surface !== undefined &&
    ademeItem.surface_habitable_logement !== null &&
    ademeItem.surface_habitable_logement !== undefined
  ) {
    const diffPercent =
      (Math.abs(adData.surface - ademeItem.surface_habitable_logement) / adData.surface) * 100;
    score -= diffPercent * 2;
  }

  const dateAd = parseFrenchDate(adData.date_diag);
  const dateItem = parseISODateLocal(ademeItem.date_etablissement_dpe);
  if (dateAd && dateItem) {
    const diffDays = Math.round(
      Math.abs(dateAd.getTime() - dateItem.getTime()) / (1000 * 60 * 60 * 24)
    );
    score -= diffDays * 2;
  }

  if (
    adData.conso_prim !== null &&
    adData.conso_prim !== undefined &&
    ademeItem.conso_5_usages_par_m2_ep !== null &&
    ademeItem.conso_5_usages_par_m2_ep !== undefined
  ) {
    const diffPercent =
      (Math.abs(adData.conso_prim - ademeItem.conso_5_usages_par_m2_ep) / adData.conso_prim) * 100;
    score -= diffPercent;
  }

  if (
    adData.conso_fin !== null &&
    adData.conso_fin !== undefined &&
    ademeItem.conso_5_usages_par_m2_ef !== null &&
    ademeItem.conso_5_usages_par_m2_ef !== undefined
  ) {
    const diffPercent =
      (Math.abs(adData.conso_fin - ademeItem.conso_5_usages_par_m2_ef) / adData.conso_fin) * 100;
    score -= diffPercent;
  }

  return Math.max(0, Math.round(score));
}

export function processResults(adData, ademeResults) {
  return ademeResults
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
}
