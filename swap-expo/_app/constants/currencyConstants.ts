// Created: Currency constants for preset amounts and formatting - 2025-12-16
// This file provides currency-specific configurations for the app

/**
 * Currency-specific preset amounts for quick selection
 * Adapted for each currency's typical transaction values
 *
 * Example: HTG uses larger values (100-2500) because 5 gourdes (~$0.04) is impractical
 */
export const CURRENCY_PRESETS: Record<string, number[]> = {
  // Major currencies - standard small denominations
  USD: [5, 10, 20, 50, 100],
  EUR: [5, 10, 20, 50, 100],
  GBP: [5, 10, 20, 50, 100],
  CAD: [5, 10, 20, 50, 100],

  // Caribbean/Haiti specific - larger values that make sense locally
  HTG: [100, 250, 500, 1000, 2500],  // ~$0.75 to ~$19 USD equivalent

  // Dominican Republic
  DOP: [100, 250, 500, 1000, 2500],  // Similar to HTG

  // Default fallback for unknown currencies
  DEFAULT: [5, 10, 20, 50, 100],
};

/**
 * Get preset amounts for a specific currency code
 * Falls back to DEFAULT if currency not found
 */
export const getPresetAmounts = (currencyCode: string): number[] => {
  return CURRENCY_PRESETS[currencyCode] || CURRENCY_PRESETS.DEFAULT;
};

/**
 * Format preset amounts compactly for display
 * Examples: 2500 → "G2.5K", 100 → "G100"
 *
 * @param amount - The numeric amount
 * @param symbol - Currency symbol (e.g., "G", "$")
 * @returns Formatted string for display
 */
export const formatPresetAmount = (amount: number, symbol: string): string => {
  if (amount >= 1000) {
    const kValue = amount / 1000;
    // Use .0 for whole numbers (1K), .1 for decimals (2.5K)
    return `${symbol}${kValue % 1 === 0 ? kValue.toFixed(0) : kValue.toFixed(1)}K`;
  }
  return `${symbol}${amount}`;
};

/**
 * Currency decimal places configuration
 * Most currencies use 2 decimal places, some use 0
 */
export const CURRENCY_DECIMALS: Record<string, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
  HTG: 2,
  DOP: 2,
  JPY: 0,  // Japanese Yen has no decimals
  DEFAULT: 2,
};

/**
 * Get decimal places for a currency
 */
export const getCurrencyDecimals = (currencyCode: string): number => {
  return CURRENCY_DECIMALS[currencyCode] ?? CURRENCY_DECIMALS.DEFAULT;
};
