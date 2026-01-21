// src/models/item.js
// Helper functions for item-related logic (health, profit margin, etc.)

/**
 * Calculate health status based on availability percentage
 * @param {number} totalUnits - current total units available
 * @param {number} balesCount
 * @param {number} unitsPerBale
 * @returns {{status: string, color: string, percentage: string}}
 */
export function calculateHealth(totalUnits, balesCount, unitsPerBale) {
  const capacity = balesCount * unitsPerBale;
  if (capacity <= 0) {
    return { status: 'unknown', color: 'gray', percentage: '0.0' };
  }

  const perc = totalUnits / capacity;
  const percentageStr = (perc * 100).toFixed(1);

  if (perc >= 0.8) {
    return { status: 'strong', color: 'blue', percentage: percentageStr };
  } else {
    return { status: 'weak', color: 'orange', percentage: percentageStr };
  }
}

/**
 * Calculate profit margin percentage
 * @param {number} sellingPrice
 * @param {number} landingPrice
 * @returns {string} e.g. "42.5"
 */
export function calculateProfitMargin(sellingPrice, landingPrice) {
  if (landingPrice <= 0) return '0.0';
  const margin = ((sellingPrice - landingPrice) / landingPrice) * 100;
  return margin.toFixed(1);
}

/**
 * Get unit price fallback logic (used when recording sale without explicit price)
 * @param {string} type 'unit' or 'bale'
 * @param {object} item
 * @returns {number}
 */
export function getEffectiveUnitPrice(type, item) {
  if (type === 'bale') {
    return item.bale_price / (item.units_per_bale || 1);
  }
  return item.unit_price || 0;
}

export default {
  calculateHealth,
  calculateProfitMargin,
  getEffectiveUnitPrice
};