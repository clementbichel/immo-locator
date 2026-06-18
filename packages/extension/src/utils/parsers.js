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
