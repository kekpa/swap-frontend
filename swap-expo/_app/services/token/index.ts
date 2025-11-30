/**
 * Token Management Module
 *
 * This module provides centralized token management with in-memory caching
 * for high-performance synchronous access.
 *
 * PUBLIC API:
 * - tokenManager: Singleton instance for all token operations
 * - Storage functions: saveAccessToken, getAccessToken, saveRefreshToken, getRefreshToken, refreshAccessToken
 *
 * Usage:
 * ```typescript
 * import { tokenManager, saveAccessToken } from './services/token';
 *
 * // Get current token (synchronous, uses cache)
 * const token = tokenManager.getCurrentAccessToken();
 *
 * // Clear all tokens (clears cache AND storage)
 * await tokenManager.clearAllTokens();
 * ```
 *
 * @module token
 */

// Export TokenManager as the main public interface
export { tokenManager } from './TokenManager';

// Export types for consumers who need them
export type { default as TokenManager } from './TokenManager';

// Export storage functions for external use
// Note: clearTokens is NOT exported - use tokenManager.clearAllTokens() instead
export {
  saveAccessToken,
  saveRefreshToken,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
} from './storage';
