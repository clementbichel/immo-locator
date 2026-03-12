/**
 * Validation constants for real estate data
 */

// Valid DPE/GES letters
export const VALID_ENERGY_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

// Surface bounds (in m²)
export const SURFACE_BOUNDS = {
  MIN: 1,
  MAX: 10000, // 10,000 m² is reasonable max for residential
};

// Terrain bounds (in m²)
export const TERRAIN_BOUNDS = {
  MIN: 1,
  MAX: 100000, // 100,000 m² (10 hectares)
};

// Primary/Final energy consumption bounds (in kWh/m²/an)
export const ENERGY_CONSUMPTION_BOUNDS = {
  MIN: 0,
  MAX: 1000, // Beyond G class threshold
};

// Date bounds for diagnostic
export const DATE_BOUNDS = {
  MIN_YEAR: 2006, // DPE became mandatory in 2006
  MAX_YEARS_IN_FUTURE: 1, // Allow up to 1 year in future for scheduled diagnostics
};

// French zipcode pattern
export const ZIPCODE_PATTERN = /^\d{5}$/;

/**
 * Validate if a value is a valid DPE/GES letter
 * @param {string} letter - The letter to validate
 * @returns {boolean}
 */
export function isValidEnergyLetter(letter) {
  if (typeof letter !== 'string') return false;
  return VALID_ENERGY_LETTERS.includes(letter.toUpperCase());
}

/**
 * Validate if a surface value is within reasonable bounds
 * @param {number} surface - Surface in m²
 * @returns {boolean}
 */
export function isValidSurface(surface) {
  if (typeof surface !== 'number' || isNaN(surface)) return false;
  return surface >= SURFACE_BOUNDS.MIN && surface <= SURFACE_BOUNDS.MAX;
}

/**
 * Validate if a terrain value is within reasonable bounds
 * @param {number} terrain - Terrain in m²
 * @returns {boolean}
 */
export function isValidTerrain(terrain) {
  if (typeof terrain !== 'number' || isNaN(terrain)) return false;
  return terrain >= TERRAIN_BOUNDS.MIN && terrain <= TERRAIN_BOUNDS.MAX;
}

/**
 * Validate if an energy consumption value is within reasonable bounds
 * @param {number} consumption - Energy consumption in kWh/m²/an
 * @returns {boolean}
 */
export function isValidEnergyConsumption(consumption) {
  if (typeof consumption !== 'number' || isNaN(consumption)) return false;
  return (
    consumption >= ENERGY_CONSUMPTION_BOUNDS.MIN && consumption <= ENERGY_CONSUMPTION_BOUNDS.MAX
  );
}

/**
 * Validate if a date is within reasonable bounds for a DPE diagnostic
 * @param {Date} date - The date to validate
 * @returns {boolean}
 */
export function isValidDiagnosticDate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return false;

  const minDate = new Date(DATE_BOUNDS.MIN_YEAR, 0, 1);
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + DATE_BOUNDS.MAX_YEARS_IN_FUTURE);

  return date >= minDate && date <= maxDate;
}

/**
 * Validate if a string is a valid French zipcode
 * @param {string} zipcode - The zipcode to validate
 * @returns {boolean}
 */
export function isValidZipcode(zipcode) {
  if (typeof zipcode !== 'string') return false;
  return ZIPCODE_PATTERN.test(zipcode);
}
