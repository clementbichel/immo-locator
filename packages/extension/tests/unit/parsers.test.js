import { describe, it, expect } from 'vitest';
import { parseFrenchDate, formatDateISO } from '../../src/utils/parsers.js';

describe('parsers', () => {
  describe('parseFrenchDate', () => {
    it('should parse valid French date', () => {
      const date = parseFrenchDate('15/03/2024');
      expect(date).toBeInstanceOf(Date);
      expect(date.getDate()).toBe(15);
      expect(date.getMonth()).toBe(2); // March (0-indexed)
      expect(date.getFullYear()).toBe(2024);
    });

    it('should parse date at start of month', () => {
      const date = parseFrenchDate('01/01/2024');
      expect(date.getDate()).toBe(1);
      expect(date.getMonth()).toBe(0);
    });

    it('should return null for invalid format', () => {
      expect(parseFrenchDate('2024-03-15')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseFrenchDate('')).toBeNull();
    });

    it('should return null for null', () => {
      expect(parseFrenchDate(null)).toBeNull();
    });

    it('should return null for partial date', () => {
      expect(parseFrenchDate('15/03')).toBeNull();
    });
  });

  describe('formatDateISO', () => {
    it('should format date to ISO string', () => {
      const date = new Date(2024, 2, 15); // March 15, 2024
      expect(formatDateISO(date)).toBe('2024-03-15');
    });

    it('should pad single digit month and day', () => {
      const date = new Date(2024, 0, 5); // January 5, 2024
      expect(formatDateISO(date)).toBe('2024-01-05');
    });

    it('should return null for invalid date', () => {
      expect(formatDateISO(new Date('invalid'))).toBeNull();
    });

    it('should return null for non-Date', () => {
      expect(formatDateISO('2024-03-15')).toBeNull();
    });

    it('should return null for null', () => {
      expect(formatDateISO(null)).toBeNull();
    });
  });
});
