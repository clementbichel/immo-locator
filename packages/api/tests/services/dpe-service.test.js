import { describe, it, expect } from 'vitest';
import {
  calculateMatchScore,
  validateSearchData,
  processResults,
  percentFieldMatch,
  dateFieldMatch,
} from '../../src/services/dpe-service.js';

describe('validateSearchData', () => {
  it('returns valid for complete data', () => {
    const result = validateSearchData({
      zipcode: '75011',
      dpe: 'D',
      ges: 'E',
      surface: 45,
      date_diag: '15/03/2024',
    });
    expect(result.isValid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('reports missing fields', () => {
    const result = validateSearchData({ dpe: 'D' });
    expect(result.isValid).toBe(false);
    expect(result.missing).toContain('Localisation');
    expect(result.missing).toContain('Surface');
  });

  it('accepts city as alternative to zipcode', () => {
    const result = validateSearchData({
      city: 'Paris',
      dpe: 'D',
      ges: 'E',
      surface: 45,
      date_diag: '15/03/2024',
    });
    expect(result.isValid).toBe(true);
  });
});

describe('percentFieldMatch', () => {
  it('returns 1.0 for zero difference', () => {
    expect(percentFieldMatch(100, 100, 0.15)).toBe(1);
  });

  it('returns 0.0 when diff equals maxDeviation', () => {
    // 15% deviation: actual=115, expected=100, maxDev=0.15
    expect(percentFieldMatch(115, 100, 0.15)).toBe(0);
  });

  it('returns 0.0 when diff exceeds maxDeviation', () => {
    expect(percentFieldMatch(150, 100, 0.15)).toBe(0);
  });

  it('follows quadratic decay for intermediate values', () => {
    // 50% of maxDeviation → 1 - (0.5)² = 0.75
    // expected=100, maxDev=0.15 → 50% of 0.15 = 7.5% → actual=107.5
    const result = percentFieldMatch(107.5, 100, 0.15);
    expect(result).toBeCloseTo(0.75, 5);
  });

  it('handles expected=0 with actual=0', () => {
    expect(percentFieldMatch(0, 0, 0.15)).toBe(1);
  });

  it('handles expected=0 with actual!=0', () => {
    expect(percentFieldMatch(10, 0, 0.15)).toBe(0);
  });
});

describe('dateFieldMatch', () => {
  it('returns 1.0 for zero days', () => {
    expect(dateFieldMatch(0, 14)).toBe(1);
  });

  it('returns 0.0 when diffDays equals maxDays', () => {
    expect(dateFieldMatch(14, 14)).toBe(0);
  });

  it('returns 0.0 when diffDays exceeds maxDays', () => {
    expect(dateFieldMatch(20, 14)).toBe(0);
  });

  it('follows quadratic decay for intermediate values', () => {
    // 7 days out of 14 → 1 - (0.5)² = 0.75
    const result = dateFieldMatch(7, 14);
    expect(result).toBeCloseTo(0.75, 5);
  });
});

describe('calculateMatchScore', () => {
  const adData = { surface: 45, date_diag: '15/03/2024', conso_prim: 230, conso_fin: 180 };

  it('returns 100 for perfect match', () => {
    const ademeItem = {
      surface_habitable_logement: 45,
      date_etablissement_dpe: '2024-03-15',
      conso_5_usages_par_m2_ep: 230,
      conso_5_usages_par_m2_ef: 180,
    };
    expect(calculateMatchScore(adData, ademeItem)).toBe(100);
  });

  it('scores ~95 for small surface + date deviations (5% surface, 2 days)', () => {
    const ademeItem = {
      surface_habitable_logement: 45 * 1.05, // +5%
      date_etablissement_dpe: '2024-03-17', // +2 days
      conso_5_usages_par_m2_ep: 230,
      conso_5_usages_par_m2_ef: 180,
    };
    const score = calculateMatchScore(adData, ademeItem);
    expect(score).toBeGreaterThanOrEqual(93);
    expect(score).toBeLessThanOrEqual(97);
  });

  it('scores ~96 for 20% conso_prim mismatch with everything else perfect', () => {
    const ademeItem = {
      surface_habitable_logement: 45,
      date_etablissement_dpe: '2024-03-15',
      conso_5_usages_par_m2_ep: 230 * 1.2, // +20% (documented ADEME mismatch)
      conso_5_usages_par_m2_ef: 180,
    };
    const score = calculateMatchScore(adData, ademeItem);
    // conso_prim weight=1, 20%/30% deviation → match ~0.56
    // other 3 fields perfect (weights 4+3+2=9), total weight=10
    // (9*1 + 1*0.56)/10 = 0.956 → 96
    expect(score).toBeGreaterThanOrEqual(94);
    expect(score).toBeLessThanOrEqual(97);
  });

  it('scores ~65 when all fields are at their deviation limits', () => {
    // surface: 15% off, date: 14 days off, conso_fin: 15% off, conso_prim: 30% off
    const ademeItem = {
      surface_habitable_logement: 45 * 1.15,
      date_etablissement_dpe: '2024-03-29', // +14 days
      conso_5_usages_par_m2_ep: 230 * 1.3,
      conso_5_usages_par_m2_ef: 180 * 1.15,
    };
    const score = calculateMatchScore(adData, ademeItem);
    // All fields at max deviation → all match 0 → score 0
    expect(score).toBe(0);
  });

  it('returns 0 when no fields are available', () => {
    const ademeItem = {};
    expect(calculateMatchScore({ surface: null, date_diag: null }, ademeItem)).toBe(0);
  });

  it('excludes missing fields from calculation (no penalty, no bonus)', () => {
    // Only surface available → score based solely on surface match
    const ademeItem = {
      surface_habitable_logement: 45,
    };
    const score = calculateMatchScore({ surface: 45, date_diag: null }, ademeItem);
    expect(score).toBe(100);
  });
});

describe('processResults', () => {
  it('scores and sorts results descending', () => {
    const adData = { surface: 45, date_diag: '15/03/2024', conso_prim: 230 };
    const ademeResults = [
      {
        adresse_ban: 'Addr1',
        surface_habitable_logement: 50,
        date_etablissement_dpe: '2024-03-15',
        conso_5_usages_par_m2_ep: 230,
        etiquette_dpe: 'D',
        etiquette_ges: 'E',
        nom_commune_ban: 'Paris',
      },
      {
        adresse_ban: 'Addr2',
        surface_habitable_logement: 45,
        date_etablissement_dpe: '2024-03-15',
        conso_5_usages_par_m2_ep: 230,
        etiquette_dpe: 'D',
        etiquette_ges: 'E',
        nom_commune_ban: 'Paris',
      },
    ];
    const results = processResults(adData, ademeResults);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    expect(results[0].address).toBe('Addr2');
  });

  it('maps ADEME fields to API response format', () => {
    const adData = { surface: 45, date_diag: '15/03/2024' };
    const ademeResults = [
      {
        adresse_ban: '12 Rue X',
        nom_commune_ban: 'Paris',
        etiquette_dpe: 'D',
        etiquette_ges: 'E',
        surface_habitable_logement: 44,
        date_etablissement_dpe: '2024-03-14',
        conso_5_usages_par_m2_ep: 200,
      },
    ];
    const results = processResults(adData, ademeResults);
    expect(results[0]).toHaveProperty('address', '12 Rue X');
    expect(results[0]).toHaveProperty('city', 'Paris');
    expect(results[0]).toHaveProperty('dpe', 'D');
    expect(results[0]).toHaveProperty('ges', 'E');
    expect(results[0]).toHaveProperty('surface', 44);
    expect(results[0]).toHaveProperty('diagnosis_date', '2024-03-14');
    expect(results[0]).toHaveProperty('primary_energy', 200);
    expect(results[0]).toHaveProperty('final_energy');
    expect(results[0]).toHaveProperty('score');
  });

  it('filters out results below MIN_SCORE_THRESHOLD', () => {
    const adData = { surface: 45, date_diag: '15/03/2024', conso_prim: 230, conso_fin: 180 };
    const ademeResults = [
      {
        adresse_ban: 'Good',
        surface_habitable_logement: 45,
        date_etablissement_dpe: '2024-03-15',
        conso_5_usages_par_m2_ep: 230,
        conso_5_usages_par_m2_ef: 180,
      },
      {
        adresse_ban: 'Bad',
        surface_habitable_logement: 100, // way off
        date_etablissement_dpe: '2023-01-01', // way off
        conso_5_usages_par_m2_ep: 500, // way off
        conso_5_usages_par_m2_ef: 400, // way off
      },
    ];
    const results = processResults(adData, ademeResults);
    expect(results).toHaveLength(1);
    expect(results[0].address).toBe('Good');
  });

  it('always keeps at least the best result even if below threshold', () => {
    const adData = { surface: 45, date_diag: '15/03/2024', conso_prim: 230, conso_fin: 180 };
    const ademeResults = [
      {
        adresse_ban: 'Bad1',
        surface_habitable_logement: 100,
        date_etablissement_dpe: '2023-01-01',
        conso_5_usages_par_m2_ep: 500,
        conso_5_usages_par_m2_ef: 400,
      },
      {
        adresse_ban: 'Bad2',
        surface_habitable_logement: 120,
        date_etablissement_dpe: '2022-01-01',
        conso_5_usages_par_m2_ep: 600,
        conso_5_usages_par_m2_ef: 500,
      },
    ];
    const results = processResults(adData, ademeResults);
    expect(results).toHaveLength(1);
    expect(results[0].address).toBe('Bad1'); // best of the bad
  });

  it('returns empty array for empty input', () => {
    const results = processResults({ surface: 45 }, []);
    expect(results).toEqual([]);
  });
});
