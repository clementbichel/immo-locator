import { describe, it, expect } from 'vitest';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
} from '../../src/utils/error-messages.js';

describe('error-messages', () => {
  describe('ERROR_CODES', () => {
    it('should have all expected error codes', () => {
      expect(ERROR_CODES.NETWORK_TIMEOUT).toBe('NETWORK_TIMEOUT');
      expect(ERROR_CODES.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ERROR_CODES.API_ERROR).toBe('API_ERROR');
      expect(ERROR_CODES.INVALID_PAGE).toBe('INVALID_PAGE');
      expect(ERROR_CODES.DATA_NOT_FOUND).toBe('DATA_NOT_FOUND');
      expect(ERROR_CODES.MISSING_FIELDS).toBe('MISSING_FIELDS');
      expect(ERROR_CODES.TAB_ACCESS_ERROR).toBe('TAB_ACCESS_ERROR');
      expect(ERROR_CODES.SCRIPT_INJECTION_ERROR).toBe('SCRIPT_INJECTION_ERROR');
      expect(ERROR_CODES.INVALID_ZIPCODE).toBe('INVALID_ZIPCODE');
      expect(ERROR_CODES.INVALID_DPE).toBe('INVALID_DPE');
      expect(ERROR_CODES.INVALID_GES).toBe('INVALID_GES');
      expect(ERROR_CODES.INVALID_SURFACE).toBe('INVALID_SURFACE');
      expect(ERROR_CODES.INVALID_DATE).toBe('INVALID_DATE');
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have a message for each error code', () => {
      Object.values(ERROR_CODES).forEach((code) => {
        expect(ERROR_MESSAGES[code]).toBeDefined();
        expect(typeof ERROR_MESSAGES[code]).toBe('string');
        expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0);
      });
    });

    it('should have French messages', () => {
      // Verify messages are in French by checking for common French words
      expect(ERROR_MESSAGES[ERROR_CODES.NETWORK_TIMEOUT]).toContain('connexion');
      expect(ERROR_MESSAGES[ERROR_CODES.INVALID_PAGE]).toContain('ventes immobilières');
      expect(ERROR_MESSAGES[ERROR_CODES.MISSING_FIELDS]).toContain('manquantes');
    });
  });

  describe('getErrorMessage', () => {
    it('should return the correct message for a valid code', () => {
      const message = getErrorMessage(ERROR_CODES.NETWORK_TIMEOUT);
      expect(message).toBe(ERROR_MESSAGES[ERROR_CODES.NETWORK_TIMEOUT]);
    });

    it('should return fallback for unknown code', () => {
      const message = getErrorMessage('UNKNOWN_CODE');
      expect(message).toBe('Une erreur inattendue est survenue.');
    });

    it('should return custom fallback when provided', () => {
      const customFallback = 'Custom error message';
      const message = getErrorMessage('UNKNOWN_CODE', customFallback);
      expect(message).toBe(customFallback);
    });
  });

  describe('createError', () => {
    it('should create an error with correct message', () => {
      const error = createError(ERROR_CODES.API_ERROR);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(ERROR_MESSAGES[ERROR_CODES.API_ERROR]);
      expect(error.code).toBe(ERROR_CODES.API_ERROR);
    });

    it('should include details when provided', () => {
      const details = 'Status 500';
      const error = createError(ERROR_CODES.API_ERROR, details);
      expect(error.details).toBe(details);
    });

    it('should not include details property when not provided', () => {
      const error = createError(ERROR_CODES.API_ERROR);
      expect(error.details).toBeUndefined();
    });

    it('should work with unknown code (uses fallback)', () => {
      const error = createError('UNKNOWN');
      expect(error.message).toBe('Une erreur inattendue est survenue.');
      expect(error.code).toBe('UNKNOWN');
    });
  });
});
