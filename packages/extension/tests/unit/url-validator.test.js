import { describe, it, expect } from 'vitest';
import {
  isValidLeboncoinRealEstateUrl,
  getRealEstateType,
  isValidSelogerRealEstateUrl,
  getSite,
} from '../../src/utils/url-validator.js';

describe('url-validator', () => {
  describe('isValidLeboncoinRealEstateUrl', () => {
    it('should return true for valid sales URL', () => {
      const url = 'https://www.leboncoin.fr/ventes_immobilieres/1234567890.htm';
      expect(isValidLeboncoinRealEstateUrl(url)).toBe(true);
    });

    it('should return true for valid rental URL', () => {
      const url = 'https://www.leboncoin.fr/locations/9876543210.htm';
      expect(isValidLeboncoinRealEstateUrl(url)).toBe(true);
    });

    it('should return false for non-real-estate URL', () => {
      const url = 'https://www.leboncoin.fr/voitures/1234567890.htm';
      expect(isValidLeboncoinRealEstateUrl(url)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidLeboncoinRealEstateUrl('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidLeboncoinRealEstateUrl(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidLeboncoinRealEstateUrl(undefined)).toBe(false);
    });

    it('should return false for non-string', () => {
      expect(isValidLeboncoinRealEstateUrl(12345)).toBe(false);
    });

    it('should return false for other Leboncoin categories', () => {
      expect(isValidLeboncoinRealEstateUrl('https://www.leboncoin.fr/electromenager/123.htm')).toBe(
        false
      );
      expect(isValidLeboncoinRealEstateUrl('https://www.leboncoin.fr/emploi/456.htm')).toBe(false);
    });

    it('should return false for non-leboncoin domain', () => {
      expect(isValidLeboncoinRealEstateUrl('https://evil.com/ventes_immobilieres/123.htm')).toBe(
        false
      );
    });

    it('should return false for spoofed domain containing leboncoin.fr', () => {
      expect(
        isValidLeboncoinRealEstateUrl('https://evil-leboncoin.fr/ventes_immobilieres/123.htm')
      ).toBe(false);
    });

    it('should accept leboncoin.fr without www', () => {
      expect(
        isValidLeboncoinRealEstateUrl('https://leboncoin.fr/ventes_immobilieres/123.htm')
      ).toBe(true);
    });

    it('should return true for new /ad/ventes_immobilieres/ format (without .htm)', () => {
      expect(
        isValidLeboncoinRealEstateUrl('https://www.leboncoin.fr/ad/ventes_immobilieres/3143073465')
      ).toBe(true);
    });

    it('should return true for new /ad/locations/ format (without .htm)', () => {
      expect(
        isValidLeboncoinRealEstateUrl('https://www.leboncoin.fr/ad/locations/1234567890')
      ).toBe(true);
    });

    it('should return false for /ad/ with unrelated category', () => {
      expect(isValidLeboncoinRealEstateUrl('https://www.leboncoin.fr/ad/voitures/123')).toBe(false);
    });
  });

  describe('getRealEstateType', () => {
    it('should return "sale" for sales URL', () => {
      const url = 'https://www.leboncoin.fr/ventes_immobilieres/1234567890.htm';
      expect(getRealEstateType(url)).toBe('sale');
    });

    it('should return "rental" for rental URL', () => {
      const url = 'https://www.leboncoin.fr/locations/9876543210.htm';
      expect(getRealEstateType(url)).toBe('rental');
    });

    it('should return "sale" for new /ad/ventes_immobilieres/ format', () => {
      const url = 'https://www.leboncoin.fr/ad/ventes_immobilieres/3143073465';
      expect(getRealEstateType(url)).toBe('sale');
    });

    it('should return "rental" for new /ad/locations/ format', () => {
      const url = 'https://www.leboncoin.fr/ad/locations/1234567890';
      expect(getRealEstateType(url)).toBe('rental');
    });

    it('should return null for non-real-estate URL', () => {
      const url = 'https://www.leboncoin.fr/voitures/1234567890.htm';
      expect(getRealEstateType(url)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(getRealEstateType('')).toBeNull();
    });

    it('should return null for null', () => {
      expect(getRealEstateType(null)).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(getRealEstateType(undefined)).toBeNull();
    });
  });

  describe('isValidSelogerRealEstateUrl', () => {
    it('should return true for a valid achat URL', () => {
      const url =
        'https://www.seloger.com/annonces/achat/maison/bordeaux-33/saint-jean-belcier/265525767.htm';
      expect(isValidSelogerRealEstateUrl(url)).toBe(true);
    });

    it('should return true for a valid locations URL', () => {
      const url = 'https://www.seloger.com/annonces/locations/maison/bordeaux-33/264540629.htm';
      expect(isValidSelogerRealEstateUrl(url)).toBe(true);
    });

    it('should return false for non-real-estate seloger paths', () => {
      expect(isValidSelogerRealEstateUrl('https://www.seloger.com/recherche/achat/maison')).toBe(
        false
      );
      expect(isValidSelogerRealEstateUrl('https://www.seloger.com/')).toBe(false);
    });

    it('should return false for non-seloger domain', () => {
      expect(isValidSelogerRealEstateUrl('https://evil.com/annonces/achat/123.htm')).toBe(false);
    });

    it('should return false for spoofed domain containing seloger.com', () => {
      expect(
        isValidSelogerRealEstateUrl('https://evil-seloger.com/annonces/achat/maison/123.htm')
      ).toBe(false);
    });

    it('should return false for empty / null / non-string', () => {
      expect(isValidSelogerRealEstateUrl('')).toBe(false);
      expect(isValidSelogerRealEstateUrl(null)).toBe(false);
      expect(isValidSelogerRealEstateUrl(undefined)).toBe(false);
      expect(isValidSelogerRealEstateUrl(12345)).toBe(false);
    });

    it('should accept seloger.com without www', () => {
      expect(isValidSelogerRealEstateUrl('https://seloger.com/annonces/achat/maison/123.htm')).toBe(
        true
      );
    });
  });

  describe('getSite', () => {
    it('should return "leboncoin" for a leboncoin real estate URL', () => {
      expect(getSite('https://www.leboncoin.fr/ventes_immobilieres/1234567890.htm')).toBe(
        'leboncoin'
      );
      expect(getSite('https://www.leboncoin.fr/locations/9876543210.htm')).toBe('leboncoin');
    });

    it('should return "seloger" for a seloger real estate URL', () => {
      expect(
        getSite('https://www.seloger.com/annonces/achat/maison/bordeaux-33/265525767.htm')
      ).toBe('seloger');
      expect(
        getSite('https://www.seloger.com/annonces/locations/maison/bordeaux-33/264540629.htm')
      ).toBe('seloger');
    });

    it('should return null for unsupported sites', () => {
      expect(getSite('https://www.google.com/')).toBeNull();
      expect(getSite('https://evil-leboncoin.fr/ventes_immobilieres/123.htm')).toBeNull();
    });

    it('should return null for non-real-estate pages on supported sites', () => {
      expect(getSite('https://www.leboncoin.fr/voitures/123.htm')).toBeNull();
      expect(getSite('https://www.seloger.com/')).toBeNull();
    });

    it('should return null for invalid input', () => {
      expect(getSite('')).toBeNull();
      expect(getSite(null)).toBeNull();
      expect(getSite(undefined)).toBeNull();
    });
  });
});
