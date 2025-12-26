/**
 * API Response Parser Utility
 *
 * Professional, centralized parsing of backend API responses.
 * Handles all response formats consistently across the codebase.
 *
 * Backend Response Formats Supported:
 * 1. Direct array: [...]
 * 2. Wrapped in result: { result: [...], meta: {...} }
 * 3. Wrapped in data: { data: [...] }
 * 4. Wrapped in wallets: { wallets: [...] }
 * 5. Nested JSON strings (multiple levels)
 * 6. Numbered keys: { "0": {...}, "1": {...} }
 *
 * @created 2025-01-26
 */

import logger from './logger';

/**
 * Parse complex nested JSON structure from backend API responses.
 * Handles multiple response formats that our backend may return.
 *
 * @param data - Raw API response data
 * @param context - Optional context string for logging (e.g., 'wallet', 'transaction')
 * @returns Parsed array of items
 */
export function parseApiResponse<T = any>(data: any, context: string = 'api'): T[] {
  const logPrefix = `[apiResponseParser:${context}]`;

  logger.debug(`${logPrefix} 🔍 Parsing response:`,
    typeof data === 'string'
      ? data.substring(0, 200) + '...'
      : JSON.stringify(data)?.substring(0, 200) + '...'
  );

  let result = data;

  // STEP 1: Handle multiple levels of JSON string parsing
  // Some backends double-encode JSON responses
  let parseAttempts = 0;
  while (typeof result === 'string' && parseAttempts < 5) {
    try {
      logger.debug(`${logPrefix} 🔄 Parsing JSON string (attempt ${parseAttempts + 1})`);
      result = JSON.parse(result);
      parseAttempts++;
    } catch (parseError) {
      logger.error(`${logPrefix} ❌ Failed to parse JSON string (attempt ${parseAttempts + 1}):`,
        parseError instanceof Error ? parseError : new Error(String(parseError))
      );
      break;
    }
  }

  // STEP 2: Handle direct array response
  if (Array.isArray(result)) {
    logger.debug(`${logPrefix} ✅ Found direct array response with ${result.length} items`);
    return result;
  }

  // STEP 3: Handle object wrapper formats
  if (result && typeof result === 'object') {
    const keys = Object.keys(result);
    logger.debug(`${logPrefix} 🔍 Object keys: ${keys.join(', ')}`);

    // Check for numbered keys structure (legacy format): { "0": {...}, "1": {...} }
    const numberedKeys = keys.filter(key => /^\d+$/.test(key)).sort((a, b) => parseInt(a) - parseInt(b));
    if (numberedKeys.length > 0) {
      logger.debug(`${logPrefix} ✅ Found numbered keys structure with ${numberedKeys.length} items`);
      return numberedKeys.map(key => {
        const item = result[key];
        return typeof item === 'string' ? JSON.parse(item) : item;
      });
    }

    // Check for 'result' property (standard backend format: { result: [...], meta: {...} })
    if (result.result) {
      logger.debug(`${logPrefix} ✅ Found 'result' property, recursing`);
      return parseApiResponse(result.result, context);
    }

    // Check for 'data' property (alternative format: { data: [...] })
    if (result.data) {
      logger.debug(`${logPrefix} ✅ Found 'data' property, recursing`);
      return parseApiResponse(result.data, context);
    }

    // Check for 'wallets' property (wallet-specific format: { wallets: [...] })
    if (result.wallets) {
      logger.debug(`${logPrefix} ✅ Found 'wallets' property, recursing`);
      return parseApiResponse(result.wallets, context);
    }

    // Check for 'items' property (generic list format: { items: [...] })
    if (result.items) {
      logger.debug(`${logPrefix} ✅ Found 'items' property, recursing`);
      return parseApiResponse(result.items, context);
    }
  }

  // STEP 4: Fallback - unexpected structure
  logger.warn(`${logPrefix} ⚠️ Unexpected response structure, returning empty array`);
  return [];
}

/**
 * Type-safe wallet response parser
 * Use this specifically for wallet/balance API responses
 */
export function parseWalletResponse(data: any): any[] {
  return parseApiResponse(data, 'wallet');
}

/**
 * Type-safe transaction response parser
 * Use this specifically for transaction API responses
 */
export function parseTransactionResponse(data: any): any[] {
  return parseApiResponse(data, 'transaction');
}
