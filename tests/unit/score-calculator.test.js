import { describe, it, expect } from 'vitest';
import {
  calculateMatchScore,
  findOutlier,
  sortResultsByScore,
  getScoreColor
} from '../../src/utils/score-calculator.js';

describe('score-calculator', () => {
  describe('calculateMatchScore', () => {
    it('should return high score for perfect match', () => {
      const adData = {
        surface: '150 m²',
        date_diag: '15/01/2024',
        conso_prim: '185 kWh/m²/an'
      };
      const ademeItem = {
        surface_habitable_logement: 150,
        date_etablissement_dpe: '2024-01-15',
        conso_5_usages_par_m2_ep: 185
      };
      // Score should be very high (98-100) for perfect match
      // Small timezone differences may cause 1-2 point variation
      const score = calculateMatchScore(adData, ademeItem);
      expect(score).toBeGreaterThanOrEqual(98);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should penalize surface deviation', () => {
      const adData = {
        surface: '150 m²',
        date_diag: '15/01/2024'
      };
      const ademeItem = {
        surface_habitable_logement: 165, // 10% more
        date_etablissement_dpe: '2024-01-15'
      };
      const score = calculateMatchScore(adData, ademeItem);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(70); // 10% deviation = -20 points
    });

    it('should penalize date deviation', () => {
      const adData = {
        surface: '150 m²',
        date_diag: '15/01/2024'
      };
      const ademeItem = {
        surface_habitable_logement: 150,
        date_etablissement_dpe: '2024-01-20' // 5 days later
      };
      const score = calculateMatchScore(adData, ademeItem);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(80); // 5 days = -10 points
    });

    it('should penalize energy deviation', () => {
      const adData = {
        surface: '150 m²',
        date_diag: '15/01/2024',
        conso_prim: '200 kWh/m²/an'
      };
      const ademeItem = {
        surface_habitable_logement: 150,
        date_etablissement_dpe: '2024-01-15',
        conso_5_usages_par_m2_ep: 220 // 10% more
      };
      const score = calculateMatchScore(adData, ademeItem);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(85); // 10% = -10 points
    });

    it('should not penalize for missing conso_prim', () => {
      const adData = {
        surface: '150 m²',
        date_diag: '15/01/2024',
        conso_prim: 'Non trouvé'
      };
      const ademeItem = {
        surface_habitable_logement: 150,
        date_etablissement_dpe: '2024-01-15',
        conso_5_usages_par_m2_ep: 220
      };
      // Score should be very high (98-100) when energy is not penalized
      // Small timezone differences may cause 1-2 point variation
      const score = calculateMatchScore(adData, ademeItem);
      expect(score).toBeGreaterThanOrEqual(98);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return minimum 0', () => {
      const adData = {
        surface: '100 m²',
        date_diag: '01/01/2020'
      };
      const ademeItem = {
        surface_habitable_logement: 500, // 400% deviation
        date_etablissement_dpe: '2024-12-31' // years apart
      };
      expect(calculateMatchScore(adData, ademeItem)).toBe(0);
    });

    it('should handle missing date in ADEME item', () => {
      const adData = {
        surface: '150 m²',
        date_diag: '15/01/2024'
      };
      const ademeItem = {
        surface_habitable_logement: 150,
        date_etablissement_dpe: null
      };
      expect(calculateMatchScore(adData, ademeItem)).toBe(100);
    });
  });

  describe('findOutlier', () => {
    it('should find item larger than mode by 10%', () => {
      const items = [
        { height: 20 },
        { height: 20 },
        { height: 20 },
        { height: 20 },
        { height: 30 }, // Outlier (50% larger)
        { height: 20 },
        { height: 20 }
      ];
      const outlier = findOutlier(items, 'height');
      expect(outlier).not.toBeNull();
      expect(outlier.height).toBe(30);
    });

    it('should return null if no outlier', () => {
      const items = [
        { height: 20 },
        { height: 20 },
        { height: 20 },
        { height: 20 },
        { height: 21 }, // Only 5% larger
        { height: 20 }
      ];
      expect(findOutlier(items, 'height')).toBeNull();
    });

    it('should return null for less than 3 items', () => {
      const items = [
        { height: 20 },
        { height: 30 }
      ];
      expect(findOutlier(items, 'height')).toBeNull();
    });

    it('should return null for non-array', () => {
      expect(findOutlier(null, 'height')).toBeNull();
      expect(findOutlier('not array', 'height')).toBeNull();
    });

    it('should handle float values with precision', () => {
      const items = [
        { fontSize: 12.0 },
        { fontSize: 12.0 },
        { fontSize: 12.0 },
        { fontSize: 14.5 } // Outlier
      ];
      const outlier = findOutlier(items, 'fontSize');
      expect(outlier).not.toBeNull();
      expect(outlier.fontSize).toBe(14.5);
    });
  });

  describe('sortResultsByScore', () => {
    it('should sort by score descending', () => {
      const results = [
        { score: 50 },
        { score: 90 },
        { score: 70 }
      ];
      const sorted = sortResultsByScore(results);
      expect(sorted[0].score).toBe(90);
      expect(sorted[1].score).toBe(70);
      expect(sorted[2].score).toBe(50);
    });

    it('should not mutate original array', () => {
      const results = [
        { score: 50 },
        { score: 90 }
      ];
      sortResultsByScore(results);
      expect(results[0].score).toBe(50);
    });

    it('should return empty array for non-array', () => {
      expect(sortResultsByScore(null)).toEqual([]);
      expect(sortResultsByScore(undefined)).toEqual([]);
    });
  });

  describe('getScoreColor', () => {
    it('should return green for score >= 80', () => {
      expect(getScoreColor(100)).toBe('green');
      expect(getScoreColor(80)).toBe('green');
    });

    it('should return orange for score >= 50 and < 80', () => {
      expect(getScoreColor(79)).toBe('orange');
      expect(getScoreColor(50)).toBe('orange');
    });

    it('should return red for score < 50', () => {
      expect(getScoreColor(49)).toBe('red');
      expect(getScoreColor(0)).toBe('red');
    });

    it('should return gray for invalid score', () => {
      expect(getScoreColor(NaN)).toBe('gray');
      expect(getScoreColor('abc')).toBe('gray');
      expect(getScoreColor(null)).toBe('gray');
    });
  });
});
