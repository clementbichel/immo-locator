import { describe, it, expect } from 'vitest';
import { getScoreColor } from '../../src/utils/score-calculator.js';

describe('score-calculator', () => {
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
