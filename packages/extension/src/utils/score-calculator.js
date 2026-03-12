/**
 * Get score color based on score value
 * @param {number} score - Score from 0 to 100
 * @returns {string} - Color string
 */
export function getScoreColor(score) {
  if (typeof score !== 'number' || isNaN(score)) return 'gray';
  if (score >= 80) return 'green';
  if (score >= 50) return 'orange';
  return 'red';
}
