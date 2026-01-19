import { describe, it, expect } from 'vitest';
import { isValidLeboncoinRealEstateUrl, getRealEstateType } from '../../src/utils/url-validator.js';

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
      expect(isValidLeboncoinRealEstateUrl('https://www.leboncoin.fr/electromenager/123.htm')).toBe(false);
      expect(isValidLeboncoinRealEstateUrl('https://www.leboncoin.fr/emploi/456.htm')).toBe(false);
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
});
