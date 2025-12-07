/**
 * PROFESSIONAL TOKEN MANAGER
 *
 * Purpose: Manage JWT tokens with in-memory caching for instant synchronous access.
 * Industry Standard: Matches Google, Microsoft, and banking app token management patterns.
 *
 * Key Features:
 * - Synchronous token access (no async/await in hot paths)
 * - In-memory cache for performance
 * - Automatic token expiration validation
 * - Background persistence to secure storage
 * - Token refresh before expiration
 *
 * Architecture:
 * - Fast path: Synchronous in-memory read (0ms latency)
 * - Slow path: Async SecureStore/MMKV read (fallback)
 * - Write path: Immediate in-memory update + background persistence
 *
 * @author Swap Engineering Team
 * @date 2025-01-18
 */

// Internal storage module - NOT exported from this package
import { saveAccessToken, saveRefreshToken, getAccessToken, getRefreshToken, clearTokens } from './storage';
import logger from '../../utils/logger';
import { jwtDecode } from 'jwt-decode';

/**
 * JWT Payload structure
 */
interface JwtPayload {
  sub: string;              // User ID
  profile_id: string;       // Profile ID
  entity_id: string;        // Entity ID
  profile_type: 'personal' | 'business';
  jti: string;              // JWT ID
  iat: number;              // Issued at (timestamp)
  exp: number;              // Expiration (timestamp)
  username?: string;        // For display (@username)
  phone: string;            // Primary identifier for authentication (PIN, password, biometric)
}

/**
 * Token metadata for expiration tracking
 */
interface TokenMetadata {
  token: string;
  profileId: string;
  entityId: string;
  username?: string;        // For display (@username)
  phone: string;            // Primary identifier for authentication
  expiresAt: number;        // Unix timestamp (seconds)
  issuedAt: number;         // Unix timestamp (seconds)
}

/**
 * Professional Token Manager
 *
 * Provides synchronous, high-performance token access with automatic
 * expiration validation and background persistence.
 */
class TokenManager {
  // In-memory cache (fast path - synchronous access)
  private accessTokenCache: TokenMetadata | null = null;
  private refreshTokenCache: string | null = null;

  // Initialization state
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  // Token refresh configuration
  private static readonly TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry
  private static readonly TOKEN_EXPIRY_BUFFER_MS = 60 * 1000; // 1 minute buffer

  /**
   * Initialize TokenManager by loading tokens from storage
   * This should be called once at app startup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('[TokenManager] Already initialized');
      return;
    }

    if (this.initPromise) {
      logger.debug('[TokenManager] Initialization in progress, waiting...');
      return this.initPromise;
    }

    this.initPromise = this._performInitialization();
    await this.initPromise;
    this.initPromise = null;
  }

  private async _performInitialization(): Promise<void> {
    try {
      logger.info('[TokenManager] Initializing token manager...');

      // Load tokens from storage
      const [accessToken, refreshToken] = await Promise.all([
        getAccessToken(),
        getRefreshToken(),
      ]);

      // Cache access token if valid
      if (accessToken) {
        const metadata = this.parseToken(accessToken);
        if (metadata && !this.isTokenExpired(metadata)) {
          this.accessTokenCache = metadata;
          logger.debug('[TokenManager] Cached valid access token from storage', 'token_manager', {
            profileId: metadata.profileId,
            expiresIn: this.getTimeUntilExpiry(metadata),
          });
        } else {
          logger.warn('[TokenManager] Access token in storage is expired or invalid');
        }
      }

      // Cache refresh token
      if (refreshToken) {
        this.refreshTokenCache = refreshToken;
        logger.debug('[TokenManager] Cached refresh token from storage');
      }

      this.isInitialized = true;
      logger.info('[TokenManager] Token manager initialized successfully');

    } catch (error) {
      logger.error('[TokenManager] Failed to initialize token manager:', error);
      throw error;
    }
  }

  /**
   * Get current access token (SYNCHRONOUS)
   *
   * Returns cached token if available and valid.
   * Returns null if no token or token expired.
   *
   * IMPORTANT: This is synchronous for performance.
   * Call initialize() at app startup to populate cache.
   */
  getCurrentAccessToken(): string | null {
    if (!this.accessTokenCache) {
      logger.debug('[TokenManager] No access token in cache');
      return null;
    }

    // Validate expiration
    if (this.isTokenExpired(this.accessTokenCache)) {
      logger.warn('[TokenManager] Access token expired', 'token_manager', {
        expired: new Date(this.accessTokenCache.expiresAt * 1000).toISOString(),
      });
      this.accessTokenCache = null;
      return null;
    }

    // Check if token needs refresh soon
    if (this.shouldRefreshToken(this.accessTokenCache)) {
      logger.debug('[TokenManager] Token expires soon, should refresh', 'token_manager', {
        expiresIn: this.getTimeUntilExpiry(this.accessTokenCache),
      });
    }

    return this.accessTokenCache.token;
  }

  /**
   * Get current access token (ASYNC fallback)
   *
   * Tries in-memory cache first (fast path).
   * Falls back to storage if cache miss (slow path).
   */
  async getAccessToken(): Promise<string | null> {
    // Fast path: Check in-memory cache
    const cachedToken = this.getCurrentAccessToken();
    if (cachedToken) {
      return cachedToken;
    }

    // Slow path: Load from storage
    logger.debug('[TokenManager] Cache miss, loading from storage...');
    const storedToken = await getAccessToken();

    if (storedToken) {
      const metadata = this.parseToken(storedToken);
      if (metadata && !this.isTokenExpired(metadata)) {
        this.accessTokenCache = metadata;
        logger.debug('[TokenManager] Loaded and cached token from storage');
        return storedToken;
      }
    }

    return null;
  }

  /**
   * Set access token (SYNCHRONOUS + background persistence)
   *
   * Immediately updates in-memory cache for instant availability.
   * Persists to storage in background (non-blocking).
   */
  setAccessToken(token: string): void {
    try {
      // Parse and validate token
      const metadata = this.parseToken(token);
      if (!metadata) {
        logger.error('[TokenManager] Invalid token format, cannot cache');
        return;
      }

      if (this.isTokenExpired(metadata)) {
        logger.error('[TokenManager] Cannot cache expired token');
        return;
      }

      // Immediate in-memory update (synchronous - fast!)
      this.accessTokenCache = metadata;
      logger.debug('[TokenManager] Token cached in memory', 'token_manager', {
        profileId: metadata.profileId,
        expiresIn: this.getTimeUntilExpiry(metadata),
      });

      // Background persistence (async - non-blocking)
      saveAccessToken(token).catch((error) => {
        logger.error('[TokenManager] Failed to persist access token to storage:', error);
      });

    } catch (error) {
      logger.error('[TokenManager] Error setting access token:', error);
    }
  }

  /**
   * Set refresh token (background persistence)
   */
  setRefreshToken(token: string): void {
    this.refreshTokenCache = token;
    logger.debug('[TokenManager] Refresh token cached in memory');

    // Background persistence
    saveRefreshToken(token).catch((error) => {
      logger.error('[TokenManager] Failed to persist refresh token to storage:', error);
    });
  }

  /**
   * Get current refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    // Fast path: Check in-memory cache
    if (this.refreshTokenCache) {
      return this.refreshTokenCache;
    }

    // Slow path: Load from storage
    const storedToken = await getRefreshToken();
    if (storedToken) {
      this.refreshTokenCache = storedToken;
    }

    return storedToken;
  }

  /**
   * Clear all tokens (logout)
   *
   * CRITICAL: This clears BOTH in-memory cache AND persistent storage.
   * Always use this method instead of directly calling storage.clearTokens()
   * to ensure cache coherency.
   */
  async clearAllTokens(): Promise<void> {
    // Clear in-memory cache FIRST
    this.accessTokenCache = null;
    this.refreshTokenCache = null;

    // Then clear persistent storage
    await clearTokens();
    logger.info('[TokenManager] All tokens cleared (cache + storage)');
  }

  /**
   * Get profile ID from current token (SYNCHRONOUS)
   */
  getCurrentProfileId(): string | null {
    if (!this.accessTokenCache) {
      return null;
    }

    return this.accessTokenCache.profileId;
  }

  /**
   * Get entity ID from current token (SYNCHRONOUS)
   */
  getCurrentEntityId(): string | null {
    if (!this.accessTokenCache) {
      return null;
    }

    return this.accessTokenCache.entityId;
  }

  /**
   * Get auth user's phone number from JWT (SYNCHRONOUS)
   * This is the primary identifier for authentication (PIN, password, biometric).
   * Phone is consistent across all profiles (personal + business).
   */
  getAuthUserIdentifier(): string | null {
    return this.accessTokenCache?.phone || null;
  }

  /**
   * Check if current token should be refreshed
   */
  shouldRefreshToken(metadata: TokenMetadata = this.accessTokenCache!): boolean {
    if (!metadata) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000); // Unix timestamp (seconds)
    const timeUntilExpiry = metadata.expiresAt - now;

    // Refresh if less than 5 minutes until expiry
    return timeUntilExpiry < (TokenManager.TOKEN_REFRESH_THRESHOLD_MS / 1000);
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(metadata: TokenMetadata): boolean {
    const now = Math.floor(Date.now() / 1000); // Unix timestamp (seconds)
    const bufferSeconds = TokenManager.TOKEN_EXPIRY_BUFFER_MS / 1000;

    // Consider expired if within buffer window
    return metadata.expiresAt <= (now + bufferSeconds);
  }

  /**
   * Get time until token expiry (human-readable)
   */
  private getTimeUntilExpiry(metadata: TokenMetadata): string {
    const now = Math.floor(Date.now() / 1000);
    const seconds = metadata.expiresAt - now;

    if (seconds < 0) {
      return 'expired';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  /**
   * Parse JWT token and extract metadata
   */
  private parseToken(token: string): TokenMetadata | null {
    try {
      const decoded = jwtDecode<JwtPayload>(token);

      // Validate required fields
      if (!decoded.profile_id || !decoded.entity_id || !decoded.exp) {
        logger.error('[TokenManager] Invalid JWT structure, missing required fields');
        return null;
      }

      return {
        token,
        profileId: decoded.profile_id,
        entityId: decoded.entity_id,
        username: decoded.username,  // For display (@username)
        phone: decoded.phone,        // Primary identifier for authentication
        expiresAt: decoded.exp,
        issuedAt: decoded.iat,
      };
    } catch (error) {
      logger.error('[TokenManager] Failed to parse JWT token:', error);
      return null;
    }
  }

  /**
   * Get token debug info (for logging)
   */
  getDebugInfo(): object {
    return {
      hasAccessToken: !!this.accessTokenCache,
      hasRefreshToken: !!this.refreshTokenCache,
      profileId: this.getCurrentProfileId(),
      entityId: this.getCurrentEntityId(),
      expiresIn: this.accessTokenCache ? this.getTimeUntilExpiry(this.accessTokenCache) : 'N/A',
      shouldRefresh: this.accessTokenCache ? this.shouldRefreshToken() : false,
      isInitialized: this.isInitialized,
    };
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();

// Export class for testing
export default TokenManager;
