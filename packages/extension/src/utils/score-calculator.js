/** Au-dessus de ce score, la correspondance est présentée sans réserve */
export const CONFIDENT_SCORE = 80;

/**
 * Get score color based on score value
 * @param {number} score - Score from 0 to 100
 * @returns {string} - Color string
 */
export function getScoreColor(score) {
  if (typeof score !== 'number' || isNaN(score)) return 'gray';
  if (score >= CONFIDENT_SCORE) return 'green';
  if (score >= 50) return 'orange';
  return 'red';
}
