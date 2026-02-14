import { describe, it, expect } from 'vitest';
import { calculateMatchScore, validateSearchData, processResults } from '../../src/services/dpe-service.js';

describe('validateSearchData', () => {
  it('returns valid for complete data', () => {
    const result = validateSearchData({
      zipcode: '75011', dpe: 'D', ges: 'E', surface: 45, date_diag: '15/03/2024',
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
      city: 'Paris', dpe: 'D', ges: 'E', surface: 45, date_diag: '15/03/2024',
    });
    expect(result.isValid).toBe(true);
  });
});

describe('calculateMatchScore', () => {
  const adData = { surface: 45, date_diag: '15/03/2024', conso_prim: 230 };

  it('returns 100 for perfect match', () => {
    const ademeItem = {
      surface_habitable_logement: 45,
      date_etablissement_dpe: '2024-03-15',
      conso_5_usages_par_m2_ep: 230,
    };
    expect(calculateMatchScore(adData, ademeItem)).toBe(100);
  });

  it('penalizes surface deviation', () => {
    const ademeItem = {
      surface_habitable_logement: 50,
      date_etablissement_dpe: '2024-03-15',
      conso_5_usages_par_m2_ep: 230,
    };
    const score = calculateMatchScore(adData, ademeItem);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(0);
  });

  it('penalizes date deviation', () => {
    const ademeItem = {
      surface_habitable_logement: 45,
      date_etablissement_dpe: '2024-03-20',
      conso_5_usages_par_m2_ep: 230,
    };
    const score = calculateMatchScore(adData, ademeItem);
    expect(score).toBe(90);
  });
});

describe('processResults', () => {
  it('scores and sorts results descending', () => {
    const adData = { surface: 45, date_diag: '15/03/2024', conso_prim: 230 };
    const ademeResults = [
      { adresse_ban: 'Addr1', surface_habitable_logement: 50, date_etablissement_dpe: '2024-03-15', conso_5_usages_par_m2_ep: 230, etiquette_dpe: 'D', etiquette_ges: 'E', nom_commune_ban: 'Paris' },
      { adresse_ban: 'Addr2', surface_habitable_logement: 45, date_etablissement_dpe: '2024-03-15', conso_5_usages_par_m2_ep: 230, etiquette_dpe: 'D', etiquette_ges: 'E', nom_commune_ban: 'Paris' },
    ];
    const results = processResults(adData, ademeResults);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    expect(results[0].address).toBe('Addr2');
  });

  it('maps ADEME fields to API response format', () => {
    const adData = { surface: 45, date_diag: '15/03/2024' };
    const ademeResults = [
      { adresse_ban: '12 Rue X', nom_commune_ban: 'Paris', etiquette_dpe: 'D', etiquette_ges: 'E', surface_habitable_logement: 44, date_etablissement_dpe: '2024-03-14', conso_5_usages_par_m2_ep: 200 },
    ];
    const results = processResults(adData, ademeResults);
    expect(results[0]).toHaveProperty('address', '12 Rue X');
    expect(results[0]).toHaveProperty('city', 'Paris');
    expect(results[0]).toHaveProperty('dpe', 'D');
    expect(results[0]).toHaveProperty('ges', 'E');
    expect(results[0]).toHaveProperty('surface', 44);
    expect(results[0]).toHaveProperty('diagnosis_date', '2024-03-14');
    expect(results[0]).toHaveProperty('primary_energy', 200);
    expect(results[0]).toHaveProperty('score');
  });
});
