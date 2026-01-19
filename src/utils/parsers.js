/**
 * Parse a surface string to extract numeric value
 * @param {string} surfaceStr - Surface string (e.g., "120 m²", "120,5 m²")
 * @returns {number | null} - Parsed surface value or null
 */
export function parseSurface(surfaceStr) {
  if (!surfaceStr || typeof surfaceStr !== 'string') {
    return null;
  }
  // Remove "m²" and spaces, replace comma with dot
  const cleaned = surfaceStr.replace(/[^\d,.-]/g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

/**
 * Parse a French date string (DD/MM/YYYY) to Date object
 * @param {string} dateStr - Date string in DD/MM/YYYY format
 * @returns {Date | null} - Parsed Date object or null
 */
export function parseFrenchDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  // Use local time constructor to avoid UTC shifts
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

  // Validate the date is valid
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Format a Date object to YYYY-MM-DD string
 * @param {Date} date - Date object to format
 * @returns {string | null} - Formatted date string or null
 */
export function formatDateISO(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Extract surface from text using regex
 * @param {string} text - Text to search
 * @returns {string | null} - Found surface string or null
 */
export function extractSurfaceFromText(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const surfaceMatch = text.match(/Surface habitable\s*[:\n]?\s*(\d+(?:[.,]\d+)?\s*m²)/i);
  return surfaceMatch ? surfaceMatch[1] : null;
}

/**
 * Extract terrain surface from text using regex
 * @param {string} text - Text to search
 * @returns {string | null} - Found terrain surface string or null
 */
export function extractTerrainFromText(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const terrainMatch = text.match(/Surface totale du terrain\s*[:\n]?\s*(\d+(?:[.,]\d+)?\s*m²)/i);
  return terrainMatch ? terrainMatch[1] : null;
}

/**
 * Extract diagnostic date from text using regex
 * @param {string} text - Text to search
 * @returns {string | null} - Found date string or null
 */
export function extractDiagnosticDateFromText(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const dateMatch = text.match(
    /Date de réalisation du diagnostic(?: énergétique)?\s*:\s*(\d{2}\/\d{2}\/\d{4})/i
  );
  return dateMatch ? dateMatch[1] : null;
}

/**
 * Extract primary energy consumption from text
 * @param {string} text - Text to search
 * @returns {string | null} - Found consumption string or null
 */
export function extractPrimaryEnergyFromText(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const primMatch = text.match(/Consommation énergie primaire\s*:\s*([\d\s]+kWh\/m²\/an)/i);
  return primMatch ? primMatch[1] : null;
}

/**
 * Extract final energy consumption from text
 * @param {string} text - Text to search
 * @returns {string | null} - Found consumption string or null
 */
export function extractFinalEnergyFromText(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const finMatch = text.match(/Consommation énergie finale\s*:\s*([^.\n]+)/i);
  return finMatch ? finMatch[1].trim() : null;
}

/**
 * Extract DPE letter from text
 * @param {string} text - Text to search
 * @returns {string | null} - Found DPE letter (A-G) or null
 */
export function extractDpeFromText(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const dpeMatch = text.match(/Classe énergie\s*([A-G])(?!\s*[A-G])/i);
  return dpeMatch ? dpeMatch[1].toUpperCase() : null;
}

/**
 * Extract GES letter from text
 * @param {string} text - Text to search
 * @returns {string | null} - Found GES letter (A-G) or null
 */
export function extractGesFromText(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const gesMatch = text.match(/GES\s*[:]?\s*([A-G])\b/i);
  if (!gesMatch) {
    return null;
  }

  // Check that the next character isn't another letter (to avoid false positives)
  const index = gesMatch.index + gesMatch[0].length;
  const nextChars = text.substring(index, index + 5);
  if (/^\s*[A-G]\b/.test(nextChars)) {
    return null;
  }

  return gesMatch[1].toUpperCase();
}

/**
 * Extract zipcode from text
 * @param {string} text - Text to search
 * @returns {string | null} - Found zipcode or null
 */
export function extractZipcodeFromText(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const zipMatch = text.match(/\b\d{5}\b/);
  return zipMatch ? zipMatch[0] : null;
}

/**
 * Parse primary energy value from string
 * @param {string} energyStr - Energy string (e.g., "250 kWh/m²/an")
 * @returns {number | null} - Parsed energy value or null
 */
export function parseEnergyValue(energyStr) {
  if (!energyStr || typeof energyStr !== 'string') {
    return null;
  }

  const cleaned = energyStr.replace(/[^\d,.-]/g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

/**
 * Clean and trim text
 * @param {string} text - Text to clean
 * @returns {string | null} - Cleaned text or null
 */
export function cleanText(text) {
  return text ? text.trim() : null;
}

// Import validation functions for strict mode
import {
  isValidSurface,
  isValidTerrain,
  isValidEnergyConsumption,
  isValidDiagnosticDate,
  isValidEnergyLetter,
  isValidZipcode,
} from './validation-constants.js';

/**
 * Parse surface with strict validation
 * @param {string} surfaceStr - Surface string (e.g., "120 m²")
 * @param {Object} options - Options object
 * @param {boolean} options.strict - If true, validate against bounds
 * @returns {number | null} - Parsed and validated surface or null
 */
export function parseSurfaceStrict(surfaceStr, { strict = false } = {}) {
  const value = parseSurface(surfaceStr);
  if (value === null) return null;
  if (strict && !isValidSurface(value)) return null;
  return value;
}

/**
 * Parse terrain with strict validation
 * @param {string} terrainStr - Terrain string
 * @param {Object} options - Options object
 * @param {boolean} options.strict - If true, validate against bounds
 * @returns {number | null} - Parsed and validated terrain or null
 */
export function parseTerrainStrict(terrainStr, { strict = false } = {}) {
  const value = parseSurface(terrainStr); // Same format as surface
  if (value === null) return null;
  if (strict && !isValidTerrain(value)) return null;
  return value;
}

/**
 * Parse energy value with strict validation
 * @param {string} energyStr - Energy string
 * @param {Object} options - Options object
 * @param {boolean} options.strict - If true, validate against bounds
 * @returns {number | null} - Parsed and validated energy or null
 */
export function parseEnergyValueStrict(energyStr, { strict = false } = {}) {
  const value = parseEnergyValue(energyStr);
  if (value === null) return null;
  if (strict && !isValidEnergyConsumption(value)) return null;
  return value;
}

/**
 * Parse French date with strict validation
 * @param {string} dateStr - Date string (DD/MM/YYYY)
 * @param {Object} options - Options object
 * @param {boolean} options.strict - If true, validate against reasonable date range
 * @returns {Date | null} - Parsed and validated date or null
 */
export function parseFrenchDateStrict(dateStr, { strict = false } = {}) {
  const date = parseFrenchDate(dateStr);
  if (date === null) return null;
  if (strict && !isValidDiagnosticDate(date)) return null;
  return date;
}

/**
 * Validate and normalize DPE/GES letter
 * @param {string} letter - Energy letter
 * @param {Object} options - Options object
 * @param {boolean} options.strict - If true, validate is A-G
 * @returns {string | null} - Uppercase letter or null if invalid
 */
export function parseEnergyLetter(letter, { strict = false } = {}) {
  if (!letter || typeof letter !== 'string') return null;
  const upper = letter.toUpperCase().trim();
  if (strict && !isValidEnergyLetter(upper)) return null;
  return upper;
}

/**
 * Validate zipcode
 * @param {string} zipcode - Zipcode string
 * @param {Object} options - Options object
 * @param {boolean} options.strict - If true, validate is 5-digit French zipcode
 * @returns {string | null} - Zipcode or null if invalid
 */
export function parseZipcode(zipcode, { strict = false } = {}) {
  if (!zipcode || typeof zipcode !== 'string') return null;
  const trimmed = zipcode.trim();
  if (strict && !isValidZipcode(trimmed)) return null;
  return trimmed;
}
