import { describe, it, expect } from 'vitest';
import {
  VALID_ENERGY_LETTERS,
  SURFACE_BOUNDS,
  TERRAIN_BOUNDS,
  ENERGY_CONSUMPTION_BOUNDS,
  DATE_BOUNDS,
  ZIPCODE_PATTERN,
  isValidEnergyLetter,
  isValidSurface,
  isValidTerrain,
  isValidEnergyConsumption,
  isValidDiagnosticDate,
  isValidZipcode,
} from '../../src/utils/validation-constants.js';

describe('validation-constants', () => {
  describe('VALID_ENERGY_LETTERS', () => {
    it('should contain all letters A through G', () => {
      expect(VALID_ENERGY_LETTERS).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    });
  });

  describe('BOUNDS constants', () => {
    it('should have reasonable surface bounds', () => {
      expect(SURFACE_BOUNDS.MIN).toBe(1);
      expect(SURFACE_BOUNDS.MAX).toBe(10000);
    });

    it('should have reasonable terrain bounds', () => {
      expect(TERRAIN_BOUNDS.MIN).toBe(1);
      expect(TERRAIN_BOUNDS.MAX).toBe(100000);
    });

    it('should have reasonable energy consumption bounds', () => {
      expect(ENERGY_CONSUMPTION_BOUNDS.MIN).toBe(0);
      expect(ENERGY_CONSUMPTION_BOUNDS.MAX).toBe(1000);
    });

    it('should have reasonable date bounds', () => {
      expect(DATE_BOUNDS.MIN_YEAR).toBe(2006);
      expect(DATE_BOUNDS.MAX_YEARS_IN_FUTURE).toBe(1);
    });
  });

  describe('ZIPCODE_PATTERN', () => {
    it('should match valid French zipcodes', () => {
      expect(ZIPCODE_PATTERN.test('75001')).toBe(true);
      expect(ZIPCODE_PATTERN.test('69003')).toBe(true);
      expect(ZIPCODE_PATTERN.test('01000')).toBe(true);
    });

    it('should not match invalid zipcodes', () => {
      expect(ZIPCODE_PATTERN.test('7500')).toBe(false);
      expect(ZIPCODE_PATTERN.test('750001')).toBe(false);
      expect(ZIPCODE_PATTERN.test('ABCDE')).toBe(false);
    });
  });

  describe('isValidEnergyLetter', () => {
    it('should return true for valid letters A-G', () => {
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((letter) => {
        expect(isValidEnergyLetter(letter)).toBe(true);
      });
    });

    it('should return true for lowercase letters', () => {
      expect(isValidEnergyLetter('a')).toBe(true);
      expect(isValidEnergyLetter('g')).toBe(true);
    });

    it('should return false for invalid letters', () => {
      expect(isValidEnergyLetter('H')).toBe(false);
      expect(isValidEnergyLetter('Z')).toBe(false);
      expect(isValidEnergyLetter('1')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isValidEnergyLetter(null)).toBe(false);
      expect(isValidEnergyLetter(undefined)).toBe(false);
      expect(isValidEnergyLetter(1)).toBe(false);
    });
  });

  describe('isValidSurface', () => {
    it('should return true for valid surfaces', () => {
      expect(isValidSurface(50)).toBe(true);
      expect(isValidSurface(1)).toBe(true);
      expect(isValidSurface(10000)).toBe(true);
    });

    it('should return false for out-of-bounds values', () => {
      expect(isValidSurface(0)).toBe(false);
      expect(isValidSurface(-1)).toBe(false);
      expect(isValidSurface(10001)).toBe(false);
    });

    it('should return false for non-number values', () => {
      expect(isValidSurface('100')).toBe(false);
      expect(isValidSurface(null)).toBe(false);
      expect(isValidSurface(NaN)).toBe(false);
    });
  });

  describe('isValidTerrain', () => {
    it('should return true for valid terrain sizes', () => {
      expect(isValidTerrain(500)).toBe(true);
      expect(isValidTerrain(1)).toBe(true);
      expect(isValidTerrain(100000)).toBe(true);
    });

    it('should return false for out-of-bounds values', () => {
      expect(isValidTerrain(0)).toBe(false);
      expect(isValidTerrain(100001)).toBe(false);
    });
  });

  describe('isValidEnergyConsumption', () => {
    it('should return true for valid consumption values', () => {
      expect(isValidEnergyConsumption(0)).toBe(true);
      expect(isValidEnergyConsumption(150)).toBe(true);
      expect(isValidEnergyConsumption(1000)).toBe(true);
    });

    it('should return false for out-of-bounds values', () => {
      expect(isValidEnergyConsumption(-1)).toBe(false);
      expect(isValidEnergyConsumption(1001)).toBe(false);
    });

    it('should return false for non-number values', () => {
      expect(isValidEnergyConsumption('150')).toBe(false);
      expect(isValidEnergyConsumption(NaN)).toBe(false);
    });
  });

  describe('isValidDiagnosticDate', () => {
    it('should return true for valid dates after 2006', () => {
      expect(isValidDiagnosticDate(new Date(2020, 5, 15))).toBe(true);
      expect(isValidDiagnosticDate(new Date(2006, 0, 1))).toBe(true);
    });

    it('should return true for current date', () => {
      expect(isValidDiagnosticDate(new Date())).toBe(true);
    });

    it('should return false for dates before 2006', () => {
      expect(isValidDiagnosticDate(new Date(2005, 11, 31))).toBe(false);
      expect(isValidDiagnosticDate(new Date(2000, 0, 1))).toBe(false);
    });

    it('should return false for dates too far in the future', () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 2);
      expect(isValidDiagnosticDate(farFuture)).toBe(false);
    });

    it('should return false for invalid date objects', () => {
      expect(isValidDiagnosticDate(new Date('invalid'))).toBe(false);
      expect(isValidDiagnosticDate(null)).toBe(false);
      expect(isValidDiagnosticDate('2020-01-01')).toBe(false);
    });
  });

  describe('isValidZipcode', () => {
    it('should return true for valid French zipcodes', () => {
      expect(isValidZipcode('75001')).toBe(true);
      expect(isValidZipcode('69003')).toBe(true);
      expect(isValidZipcode('01000')).toBe(true);
      expect(isValidZipcode('97400')).toBe(true); // DOM-TOM
    });

    it('should return false for invalid zipcodes', () => {
      expect(isValidZipcode('7500')).toBe(false);
      expect(isValidZipcode('750001')).toBe(false);
      expect(isValidZipcode('ABCDE')).toBe(false);
      expect(isValidZipcode('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isValidZipcode(75001)).toBe(false);
      expect(isValidZipcode(null)).toBe(false);
    });
  });
});
