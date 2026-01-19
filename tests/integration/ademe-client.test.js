import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateAdemeSearchData,
  buildAdemeParams,
  buildAdemeUrl,
  searchAdeme,
  getGoogleMapsLink
} from '../../src/api/ademe-client.js';
import ademeResponse from '../fixtures/ademe-response.json';

describe('ademe-client', () => {
  describe('validateAdemeSearchData', () => {
    it('should return valid for complete data', () => {
      const data = {
        zipcode: '75001',
        city: 'Paris',
        date_diag: '15/03/2024',
        dpe: 'D',
        ges: 'E',
        surface: '120 m²'
      };
      const result = validateAdemeSearchData(data);
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
        surface: '120 m²'
      };
      const result = validateAdemeSearchData(data);
      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('Localisation');
      expect(result.missing).toContain('DPE');
    });

    it('should accept city when zipcode is missing', () => {
      const data = {
        zipcode: 'Non trouvé',
        city: 'Paris',
        date_diag: '15/03/2024',
        dpe: 'D',
        ges: 'E',
        surface: '120 m²'
      };
      const result = validateAdemeSearchData(data);
      expect(result.isValid).toBe(true);
    });

    it('should list all missing fields', () => {
      const data = {
        zipcode: 'Non trouvé',
        city: 'Non trouvé',
        date_diag: 'Non trouvé',
        dpe: 'Non trouvé',
        ges: 'Non trouvé',
        surface: 'Non trouvé'
      };
      const result = validateAdemeSearchData(data);
      expect(result.isValid).toBe(false);
      expect(result.missing).toHaveLength(5);
      expect(result.missing).toContain('Localisation');
      expect(result.missing).toContain('Date');
      expect(result.missing).toContain('DPE');
      expect(result.missing).toContain('GES');
      expect(result.missing).toContain('Surface');
    });
  });

  describe('buildAdemeParams', () => {
    it('should build params with zipcode', () => {
      const data = {
        zipcode: '75001',
        dpe: 'D',
        ges: 'E',
        surface: '120 m²',
        date_diag: '15/03/2024'
      };
      const params = buildAdemeParams(data);
      expect(params.get('code_postal_ban_eq')).toBe('75001');
      expect(params.get('etiquette_dpe_eq')).toBe('D');
      expect(params.get('etiquette_ges_eq')).toBe('E');
    });

    it('should use city when zipcode is "Non trouvé"', () => {
      const data = {
        zipcode: 'Non trouvé',
        city: 'Paris',
        dpe: 'D',
        ges: 'E',
        surface: '120 m²',
        date_diag: '15/03/2024'
      };
      const params = buildAdemeParams(data);
      expect(params.get('nom_commune_ban_eq')).toBe('Paris');
      expect(params.get('code_postal_ban_eq')).toBeNull();
    });

    it('should set surface range +/- 10%', () => {
      const data = {
        zipcode: '75001',
        dpe: 'D',
        ges: 'E',
        surface: '100 m²',
        date_diag: '15/03/2024'
      };
      const params = buildAdemeParams(data);
      expect(params.get('surface_habitable_logement_gte')).toBe('90');
      // Math.ceil(100 * 1.1) = Math.ceil(110.00000001) = 111 due to float
      expect(parseInt(params.get('surface_habitable_logement_lte'))).toBeGreaterThanOrEqual(110);
      expect(parseInt(params.get('surface_habitable_logement_lte'))).toBeLessThanOrEqual(111);
    });

    it('should set date range +/- 7 days', () => {
      const data = {
        zipcode: '75001',
        dpe: 'D',
        ges: 'E',
        surface: '100 m²',
        date_diag: '15/03/2024'
      };
      const params = buildAdemeParams(data);
      expect(params.get('date_etablissement_dpe_gte')).toBe('2024-03-08');
      expect(params.get('date_etablissement_dpe_lte')).toBe('2024-03-22');
    });

    it('should include primary energy when provided', () => {
      const data = {
        zipcode: '75001',
        dpe: 'D',
        ges: 'E',
        surface: '100 m²',
        date_diag: '15/03/2024',
        conso_prim: '200 kWh/m²/an'
      };
      const params = buildAdemeParams(data);
      expect(params.get('conso_5_usages_par_m2_ep_gte')).toBe('180');
      // Math.ceil(200 * 1.1) = Math.ceil(220.00000001) = 221 due to float
      expect(parseInt(params.get('conso_5_usages_par_m2_ep_lte'))).toBeGreaterThanOrEqual(220);
      expect(parseInt(params.get('conso_5_usages_par_m2_ep_lte'))).toBeLessThanOrEqual(221);
    });

    it('should not include primary energy when "Non trouvé"', () => {
      const data = {
        zipcode: '75001',
        dpe: 'D',
        ges: 'E',
        surface: '100 m²',
        date_diag: '15/03/2024',
        conso_prim: 'Non trouvé'
      };
      const params = buildAdemeParams(data);
      expect(params.get('conso_5_usages_par_m2_ep_gte')).toBeNull();
    });

    it('should include standard params', () => {
      const data = {
        zipcode: '75001',
        dpe: 'D',
        ges: 'E',
        surface: '100 m²',
        date_diag: '15/03/2024'
      };
      const params = buildAdemeParams(data);
      expect(params.get('size')).toBe('5');
      expect(params.get('select')).toContain('adresse_ban');
    });
  });

  describe('buildAdemeUrl', () => {
    it('should build complete URL', () => {
      const data = {
        zipcode: '75001',
        dpe: 'D',
        ges: 'E',
        surface: '100 m²',
        date_diag: '15/03/2024'
      };
      const url = buildAdemeUrl(data);
      expect(url).toContain('https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines');
      expect(url).toContain('code_postal_ban_eq=75001');
    });
  });

  describe('searchAdeme', () => {
    it('should call fetch with correct URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(ademeResponse)
      });

      const data = {
        zipcode: '75001',
        dpe: 'D',
        ges: 'E',
        surface: '100 m²',
        date_diag: '15/03/2024'
      };

      const result = await searchAdeme(data, mockFetch);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toContain('code_postal_ban_eq=75001');
      expect(result.results).toHaveLength(3);
    });

    it('should throw error for invalid data', async () => {
      const mockFetch = vi.fn();
      const data = {
        zipcode: 'Non trouvé',
        city: 'Non trouvé',
        dpe: 'D',
        ges: 'E',
        surface: '100 m²',
        date_diag: '15/03/2024'
      };

      await expect(searchAdeme(data, mockFetch)).rejects.toThrow('Missing required fields');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error on API failure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      });

      const data = {
        zipcode: '75001',
        dpe: 'D',
        ges: 'E',
        surface: '100 m²',
        date_diag: '15/03/2024'
      };

      await expect(searchAdeme(data, mockFetch)).rejects.toThrow('ADEME API error: 500');
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
});
