import { describe, it, expect } from 'vitest';
import { buildAdemeParams, buildAdemeUrl } from '../../src/clients/ademe-client.js';

describe('buildAdemeParams', () => {
  const baseData = {
    zipcode: '75011',
    city: 'Paris',
    dpe: 'D',
    ges: 'E',
    surface: 45,
    date_diag: '15/03/2024',
    conso_prim: 230,
  };

  it('builds params with zipcode, dpe, ges, surface range, date range', () => {
    const params = buildAdemeParams(baseData);
    expect(params.get('code_postal_ban_eq')).toBe('75011');
    expect(params.get('etiquette_dpe_eq')).toBe('D');
    expect(params.get('etiquette_ges_eq')).toBe('E');
    expect(params.get('surface_habitable_logement_gte')).toBe('40');
    expect(params.get('surface_habitable_logement_lte')).toBe('50');
    expect(params.get('date_etablissement_dpe_gte')).toBe('2024-03-08');
    expect(params.get('date_etablissement_dpe_lte')).toBe('2024-03-22');
    expect(params.get('size')).toBe('5');
  });

  it('uses city when zipcode is missing', () => {
    const data = { ...baseData, zipcode: null };
    const params = buildAdemeParams(data);
    expect(params.get('code_postal_ban_eq')).toBeNull();
    expect(params.get('nom_commune_ban_eq')).toBe('Paris');
  });

  it('includes primary energy range when provided', () => {
    const params = buildAdemeParams(baseData);
    expect(params.get('conso_5_usages_par_m2_ep_gte')).toBe('207');
    expect(params.get('conso_5_usages_par_m2_ep_lte')).toBe('253');
  });

  it('skips primary energy when null', () => {
    const data = { ...baseData, conso_prim: null };
    const params = buildAdemeParams(data);
    expect(params.get('conso_5_usages_par_m2_ep_gte')).toBeNull();
  });
});

describe('buildAdemeUrl', () => {
  it('returns full URL with params', () => {
    const url = buildAdemeUrl({ zipcode: '75011', dpe: 'D', ges: 'E', surface: 45, date_diag: '15/03/2024' });
    expect(url).toContain('data.ademe.fr');
    expect(url).toContain('code_postal_ban_eq=75011');
  });
});
