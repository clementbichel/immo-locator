import { describe, it, expect } from 'vitest';
import { parseFrenchDate, formatDateISO } from '../../src/utils/parsers.js';

describe('parseFrenchDate', () => {
  it('parses DD/MM/YYYY format', () => {
    const date = parseFrenchDate('15/03/2024');
    expect(date).toBeInstanceOf(Date);
    expect(date.getDate()).toBe(15);
    expect(date.getMonth()).toBe(2);
    expect(date.getFullYear()).toBe(2024);
  });

  it('returns null for invalid input', () => {
    expect(parseFrenchDate(null)).toBeNull();
    expect(parseFrenchDate('')).toBeNull();
    expect(parseFrenchDate('2024-03-15')).toBeNull();
  });
});

describe('formatDateISO', () => {
  it('formats date as YYYY-MM-DD', () => {
    const date = new Date(2024, 2, 15);
    expect(formatDateISO(date)).toBe('2024-03-15');
  });

  it('returns null for invalid date', () => {
    expect(formatDateISO(null)).toBeNull();
    expect(formatDateISO(new Date('invalid'))).toBeNull();
  });
});
