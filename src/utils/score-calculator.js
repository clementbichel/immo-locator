import { parseSurface, parseFrenchDate, parseEnergyValue } from './parsers.js';

/**
 * Calculate match score between ad data and ADEME result
 * @param {Object} adData - Data from the ad
 * @param {Object} ademeItem - Result from ADEME API
 * @returns {number} - Score from 0 to 100
 */
export function calculateMatchScore(adData, ademeItem) {
  let score = 100;

  // 1. Surface Deviation
  const surfAd = parseSurface(adData.surface);
  const surfItem = ademeItem.surface_habitable_logement;

  if (surfAd && surfItem) {
    const diffPercent = (Math.abs(surfAd - surfItem) / surfAd) * 100;
    score -= diffPercent * 2; // Penalty weight: 2 points per % deviation
  }

  // 2. Date Deviation (Days)
  const dateAd = parseFrenchDate(adData.date_diag);
  const dateItem = ademeItem.date_etablissement_dpe
    ? new Date(ademeItem.date_etablissement_dpe)
    : null;

  if (dateAd && dateItem && !isNaN(dateItem.getTime())) {
    const diffTime = Math.abs(dateAd.getTime() - dateItem.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    score -= diffDays * 2; // 2 points per day
  }

  // 3. Primary Energy Deviation
  if (
    adData.conso_prim &&
    adData.conso_prim !== 'Non trouvé' &&
    ademeItem.conso_5_usages_par_m2_ep
  ) {
    const primAd = parseEnergyValue(adData.conso_prim);
    const primItem = ademeItem.conso_5_usages_par_m2_ep;

    if (primAd && primItem) {
      const diffPercent = (Math.abs(primAd - primItem) / primAd) * 100;
      score -= diffPercent; // 1 point per % deviation
    }
  }

  return Math.max(0, Math.round(score));
}

/**
 * Find an outlier in a set of metrics
 * Used to identify the "active" letter in DPE/GES visual scales
 * @param {Array<Object>} items - Array of items with metrics
 * @param {string} key - The metric key to compare
 * @returns {Object | null} - The outlier item or null
 */
export function findOutlier(items, key) {
  if (!Array.isArray(items) || items.length < 3) {
    return null;
  }

  // Calculate mode (most common value)
  const counts = {};
  items.forEach((item) => {
    const val = Math.round(item[key] * 10) / 10; // Round to avoid float precision issues
    counts[val] = (counts[val] || 0) + 1;
  });

  // Find the value that appears most often (the "normal" size)
  const commonVal = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));

  // Find an item that is significantly larger than commonVal
  return (
    items.find((item) => {
      const val = Math.round(item[key] * 10) / 10;
      return val > parseFloat(commonVal) * 1.1; // 10% larger
    }) || null
  );
}

/**
 * Sort ADEME results by score (descending)
 * @param {Array<Object>} results - Array of results with scores
 * @returns {Array<Object>} - Sorted array
 */
export function sortResultsByScore(results) {
  if (!Array.isArray(results)) {
    return [];
  }
  return [...results].sort((a, b) => b.score - a.score);
}

/**
 * Get score color based on score value
 * @param {number} score - Score from 0 to 100
 * @returns {string} - Color string
 */
export function getScoreColor(score) {
  if (typeof score !== 'number' || isNaN(score)) {
    return 'gray';
  }
  if (score >= 80) return 'green';
  if (score >= 50) return 'orange';
  return 'red';
}
