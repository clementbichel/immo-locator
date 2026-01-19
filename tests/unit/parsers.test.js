import { describe, it, expect } from 'vitest';
import {
  parseSurface,
  parseFrenchDate,
  formatDateISO,
  extractSurfaceFromText,
  extractTerrainFromText,
  extractDiagnosticDateFromText,
  extractPrimaryEnergyFromText,
  extractFinalEnergyFromText,
  extractDpeFromText,
  extractGesFromText,
  extractZipcodeFromText,
  parseEnergyValue,
  cleanText,
} from '../../src/utils/parsers.js';

describe('parsers', () => {
  describe('parseSurface', () => {
    it('should parse simple surface string', () => {
      expect(parseSurface('120 m²')).toBe(120);
    });

    it('should parse surface with decimal (comma)', () => {
      expect(parseSurface('120,5 m²')).toBe(120.5);
    });

    it('should parse surface with decimal (dot)', () => {
      expect(parseSurface('120.5 m²')).toBe(120.5);
    });

    it('should parse surface with spaces', () => {
      expect(parseSurface('  120 m²  ')).toBe(120);
    });

    it('should return null for empty string', () => {
      expect(parseSurface('')).toBeNull();
    });

    it('should return null for null', () => {
      expect(parseSurface(null)).toBeNull();
    });

    it('should return null for non-string', () => {
      expect(parseSurface(120)).toBeNull();
    });

    it('should return null for non-numeric string', () => {
      expect(parseSurface('abc m²')).toBeNull();
    });
  });

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

  describe('extractSurfaceFromText', () => {
    it('should extract surface from text', () => {
      const text = 'Cette maison a une Surface habitable : 120 m² et un jardin.';
      expect(extractSurfaceFromText(text)).toBe('120 m²');
    });

    it('should extract surface with decimal', () => {
      const text = 'Surface habitable 85,5 m²';
      expect(extractSurfaceFromText(text)).toBe('85,5 m²');
    });

    it('should return null if not found', () => {
      const text = 'Une belle maison avec jardin';
      expect(extractSurfaceFromText(text)).toBeNull();
    });

    it('should return null for null', () => {
      expect(extractSurfaceFromText(null)).toBeNull();
    });
  });

  describe('extractTerrainFromText', () => {
    it('should extract terrain surface from text', () => {
      const text = 'Surface totale du terrain : 500 m²';
      expect(extractTerrainFromText(text)).toBe('500 m²');
    });

    it('should return null if not found', () => {
      expect(extractTerrainFromText('Une maison sans terrain')).toBeNull();
    });
  });

  describe('extractDiagnosticDateFromText', () => {
    it('should extract diagnostic date', () => {
      const text = 'Date de réalisation du diagnostic : 15/03/2024';
      expect(extractDiagnosticDateFromText(text)).toBe('15/03/2024');
    });

    it('should extract diagnostic date with "énergétique"', () => {
      const text = 'Date de réalisation du diagnostic énergétique : 20/01/2024';
      expect(extractDiagnosticDateFromText(text)).toBe('20/01/2024');
    });

    it('should return null if not found', () => {
      expect(extractDiagnosticDateFromText('No date here')).toBeNull();
    });
  });

  describe('extractPrimaryEnergyFromText', () => {
    it('should extract primary energy', () => {
      const text = 'Consommation énergie primaire : 250 kWh/m²/an';
      expect(extractPrimaryEnergyFromText(text)).toBe('250 kWh/m²/an');
    });

    it('should return null if not found', () => {
      expect(extractPrimaryEnergyFromText('No energy info')).toBeNull();
    });
  });

  describe('extractFinalEnergyFromText', () => {
    it('should extract final energy', () => {
      const text = 'Consommation énergie finale : 180 kWh/m²/an';
      expect(extractFinalEnergyFromText(text)).toBe('180 kWh/m²/an');
    });

    it('should return null if not found', () => {
      expect(extractFinalEnergyFromText('No energy info')).toBeNull();
    });
  });

  describe('extractDpeFromText', () => {
    it('should extract DPE letter', () => {
      expect(extractDpeFromText('Classe énergie D')).toBe('D');
    });

    it('should return uppercase', () => {
      expect(extractDpeFromText('Classe énergie c')).toBe('C');
    });

    it('should not match if followed by another letter', () => {
      expect(extractDpeFromText('Classe énergie A B')).toBeNull();
    });

    it('should return null if not found', () => {
      expect(extractDpeFromText('No DPE here')).toBeNull();
    });
  });

  describe('extractGesFromText', () => {
    it('should extract GES letter', () => {
      expect(extractGesFromText('GES : E')).toBe('E');
    });

    it('should extract GES without colon', () => {
      expect(extractGesFromText('GES B')).toBe('B');
    });

    it('should return uppercase', () => {
      expect(extractGesFromText('GES f')).toBe('F');
    });

    it('should return null if followed by another letter', () => {
      expect(extractGesFromText('GES A B')).toBeNull();
    });

    it('should return null if not found', () => {
      expect(extractGesFromText('No GES here')).toBeNull();
    });
  });

  describe('extractZipcodeFromText', () => {
    it('should extract 5-digit zipcode', () => {
      expect(extractZipcodeFromText('Paris 75001')).toBe('75001');
    });

    it('should extract first zipcode if multiple', () => {
      expect(extractZipcodeFromText('75001 ou 75002')).toBe('75001');
    });

    it('should return null if not found', () => {
      expect(extractZipcodeFromText('Paris')).toBeNull();
    });

    it('should not match partial numbers', () => {
      expect(extractZipcodeFromText('1234')).toBeNull();
    });
  });

  describe('parseEnergyValue', () => {
    it('should parse energy value', () => {
      expect(parseEnergyValue('250 kWh/m²/an')).toBe(250);
    });

    it('should parse with comma decimal', () => {
      expect(parseEnergyValue('185,5 kWh/m²/an')).toBe(185.5);
    });

    it('should return null for non-numeric', () => {
      expect(parseEnergyValue('N/A')).toBeNull();
    });

    it('should return null for null', () => {
      expect(parseEnergyValue(null)).toBeNull();
    });
  });

  describe('cleanText', () => {
    it('should trim whitespace', () => {
      expect(cleanText('  hello  ')).toBe('hello');
    });

    it('should return null for null', () => {
      expect(cleanText(null)).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(cleanText(undefined)).toBeNull();
    });
  });
});
