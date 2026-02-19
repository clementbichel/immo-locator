import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  validateSearchData,
  buildSearchPayload,
  getGoogleMapsLink,
} from '../../src/api/location-client.js';

describe('location-client (backend proxy)', () => {
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

  describe('sendReport', () => {
    beforeEach(() => vi.resetModules());
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('should POST to /api/reports with url and extracted data', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
      vi.stubGlobal('fetch', mockFetch);

      const { sendReport } = await import('../../src/api/location-client.js');
      await sendReport('https://leboncoin.fr/ad/123', { dpe: 'D', surface: '45' });

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.immolocator.fr/api/reports');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.url).toBe('https://leboncoin.fr/ad/123');
      expect(body.extracted).toEqual({ dpe: 'D', surface: '45' });
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should throw on non-200 response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false });
      vi.stubGlobal('fetch', mockFetch);

      const { sendReport } = await import('../../src/api/location-client.js');
      await expect(sendReport('https://leboncoin.fr/ad/123', {})).rejects.toThrow();
    });
  });
});
