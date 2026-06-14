import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  validateSearchData,
  buildSearchPayload,
  getGoogleMapsLink,
} from '../../src/api/location-client.js';

describe('location-client (direct ADEME)', () => {
  describe('validateSearchData', () => {
    it('should return valid for complete data', () => {
      const data = {
        zipcode: '75001',
        city: 'Paris',
        date_diag: '15/03/2024',
        dpe: 'D',
        ges: 'E',
        surface: '120 m²',
      };
      const result = validateSearchData(data);
      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should return invalid with missing fields', () => {
      const data = {
        zipcode: 'Non trouvé',
        city: 'Non trouvé',
        date_diag: '15/03/2024',
        dpe: 'Non trouvé',
        ges: 'E',
        surface: '120 m²',
      };
      const result = validateSearchData(data);
      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('Localisation');
      expect(result.missing).toContain('DPE');
    });

    it('should accept city when zipcode is Non trouvé', () => {
      const data = {
        zipcode: 'Non trouvé',
        city: 'Paris',
        date_diag: '15/03/2024',
        dpe: 'D',
        ges: 'E',
        surface: '120 m²',
      };
      const result = validateSearchData(data);
      expect(result.isValid).toBe(true);
    });

    it('should list all missing fields', () => {
      const data = {
        zipcode: 'Non trouvé',
        city: 'Non trouvé',
        date_diag: 'Non trouvé',
        dpe: 'Non trouvé',
        ges: 'Non trouvé',
        surface: 'Non trouvé',
      };
      const result = validateSearchData(data);
      expect(result.isValid).toBe(false);
      expect(result.missing).toHaveLength(4);
    });
  });

  describe('buildSearchPayload', () => {
    it('should convert string values to numbers', () => {
      const data = {
        zipcode: '75001',
        city: 'Paris',
        dpe: 'D',
        ges: 'E',
        surface: '120 m²',
        date_diag: '15/03/2024',
        conso_prim: '200 kWh/m²/an',
        conso_fin: '180 kWh/m²/an',
      };
      const payload = buildSearchPayload(data);
      expect(payload.surface).toBe(120);
      expect(payload.conso_prim).toBe(200);
      expect(payload.conso_fin).toBe(180);
      expect(payload.zipcode).toBe('75001');
      expect(payload.dpe).toBe('D');
    });

    it('should convert "Non trouvé" to null', () => {
      const data = {
        zipcode: 'Non trouvé',
        city: 'Non trouvé',
        dpe: 'Non trouvé',
        ges: 'Non trouvé',
        surface: 'Non trouvé',
        date_diag: 'Non trouvé',
        conso_prim: 'Non trouvé',
        conso_fin: 'Non trouvé',
      };
      const payload = buildSearchPayload(data);
      expect(payload.zipcode).toBeNull();
      expect(payload.city).toBeNull();
      expect(payload.surface).toBeNull();
      expect(payload.conso_prim).toBeNull();
    });

    it('should handle already numeric values', () => {
      const data = {
        zipcode: '75001',
        city: 'Paris',
        dpe: 'D',
        ges: 'E',
        surface: 120,
        date_diag: '15/03/2024',
        conso_prim: 200,
        conso_fin: 180,
      };
      const payload = buildSearchPayload(data);
      expect(payload.surface).toBe(120);
      expect(payload.conso_prim).toBe(200);
    });
  });

  describe('getGoogleMapsLink', () => {
    it('should encode address in URL', () => {
      const link = getGoogleMapsLink('15 Rue de la République, 69003 Lyon');
      expect(link).toContain('https://www.google.com/maps/search/');
      expect(link).toContain(encodeURIComponent('15 Rue de la République, 69003 Lyon'));
    });

    it('should handle special characters', () => {
      const link = getGoogleMapsLink('Café & Restaurant');
      expect(link).toContain(encodeURIComponent('Café & Restaurant'));
    });
  });

  describe('searchLocation', () => {
    beforeEach(() => vi.resetModules());
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    const validData = {
      zipcode: '75001',
      city: 'Paris',
      dpe: 'D',
      ges: 'E',
      surface: '45 m²',
      date_diag: '15/03/2024',
    };

    // A near-perfect ADEME candidate for validData (surface + date match).
    const ademeMatch = {
      adresse_ban: '12 rue de la Paix 75001 Paris',
      nom_commune_ban: 'Paris',
      etiquette_dpe: 'D',
      etiquette_ges: 'E',
      surface_habitable_logement: 45,
      date_etablissement_dpe: '2024-03-15',
      conso_5_usages_par_m2_ep: 230,
      conso_5_usages_par_m2_ef: 180,
    };

    it('queries the ADEME API directly and returns scored results', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ total: 1, results: [ademeMatch] }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const { searchLocation } = await import('../../src/api/location-client.js');
      const result = await searchLocation(validData);

      expect(result.count).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].address).toBe('12 rue de la Paix 75001 Paris');
      expect(result.results[0].score).toBeGreaterThanOrEqual(95);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('data.ademe.fr');
      expect(url).toContain('code_postal_ban_eq=75001');
    });

    it('issues a GET request with a timeout signal (no backend POST)', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
      vi.stubGlobal('fetch', mockFetch);

      const { searchLocation } = await import('../../src/api/location-client.js');
      await searchLocation(validData);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).not.toContain('immolocator.fr');
      expect(options.signal).toBeDefined();
      // GET is the default: no explicit method/body
      expect(options.method).toBeUndefined();
      expect(options.body).toBeUndefined();
    });

    it('returns an empty list when ADEME has no match', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
      );

      const { searchLocation } = await import('../../src/api/location-client.js');
      const result = await searchLocation(validData);
      expect(result).toEqual({ results: [], count: 0 });
    });

    it('throws an API error on a non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

      const { searchLocation } = await import('../../src/api/location-client.js');
      await expect(searchLocation(validData)).rejects.toMatchObject({ code: 'API_ERROR' });
    });

    it('throws a network error when fetch rejects', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

      const { searchLocation } = await import('../../src/api/location-client.js');
      await expect(searchLocation(validData)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    });
  });
});
