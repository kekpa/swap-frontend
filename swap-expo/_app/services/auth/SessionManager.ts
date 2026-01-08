/**
 * SessionManager - Centralized Session Management Service
 *
 * Consolidates all session-related functionality from AuthContext and authManager:
 * - Session validation and restoration
 * - Token management (validate, refresh)
 * - Session persistence
 * - Session cleanup
 *
 * This replaces the redundant authManager.ts and extracts session logic from AuthContext.
 *
 * @author Swap Team
 * @version 1.0.0
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { tokenManager, getAccessToken } from '../token';
import apiClient from '../../_api/apiClient';
import { AUTH_PATHS } from '../../_api/apiPaths';
import logger from '../../utils/logger';

// Session storage keys
const STORAGE_KEYS = {
  SESSION_DATA: 'currentSession',
  LAST_WALLET_UNLOCK: 'last_wallet_unlock',
} as const;

// Session validation interval (5 minutes)
const SESSION_VALIDATION_INTERVAL = 5 * 60 * 1000;

export interface SessionData {
  userId: string;
  profileId: string;
  entityId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
  profileType?: 'personal' | 'business';
  businessName?: string;
  sessionId: string;
  createdAt: string;
  lastValidated: string;
}

export interface UserProfile {
  id: string;
  user_id?: string;
  profile_id?: string;
  entity_id?: string;
  email?: string;
  business_email?: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  username?: string;
  avatar_url?: string;
  logo_url?: string;
  type?: 'personal' | 'business';
}

export interface SessionValidationResult {
  isValid: boolean;
  user?: SessionData;
  error?: string;
}

class SessionManager {
  private static instance: SessionManager;
  private currentSession: SessionData | null = null;
  private lastValidation: number = 0;
  private isValidating: boolean = false;

  private constructor() {
    logger.debug('[SessionManager] Initialized');
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Validate current session and restore user data
   * Returns user data if session is valid, null otherwise
   */
  async validateAndRestoreSession(): Promise<SessionValidationResult> {
    if (this.isValidating) {
      logger.debug('[SessionManager] Validation already in progress');
      return { isValid: false, error: 'Validation in progress' };
    }

    this.isValidating = true;

    try {
      // Step 1: Check for access token
      const token = await getAccessToken();
      if (!token) {
        logger.debug('[SessionManager] No access token found');
        return { isValid: false, error: 'No access token' };
      }

      // Step 2: Validate token format and expiry
      const tokenValidation = this.validateTokenLocally(token);
      if (!tokenValidation.isValid) {
        // Try to refresh token
        const refreshedToken = await this.refreshAccessToken();
        if (!refreshedToken) {
          await this.clearSession();
          return { isValid: false, error: 'Token expired and refresh failed' };
        }
      }

      // Step 3: Validate session with backend
      const currentToken = await getAccessToken();
      if (!currentToken) {
        return { isValid: false, error: 'No token after refresh' };
      }

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;

      const profile = await this.fetchUserProfile();
      if (!profile) {
        await this.clearSession();
        return { isValid: false, error: 'Failed to fetch profile' };
      }

      // Step 4: Create session data from profile
      const sessionData = this.mapProfileToSession(profile);
      this.currentSession = sessionData;
      this.lastValidation = Date.now();

      // Set profile ID in API client
      apiClient.setProfileId(sessionData.profileId);

      logger.debug('[SessionManager] Session validated successfully', 'auth', {
        userId: sessionData.userId,
        profileId: sessionData.profileId
      });

      return { isValid: true, user: sessionData };

    } catch (error: any) {
      logger.error('[SessionManager] Session validation failed:', error);

      if (error.response?.status === 401) {
        await this.clearSession();
      }

      return { isValid: false, error: error.message };
    } finally {
      this.isValidating = false;
    }
  }

  /**
   * Validate token locally (format and expiry check)
   */
  private validateTokenLocally(token: string): { isValid: boolean; expiresIn?: number } {
    try {
      const decoded = jwtDecode(token) as { exp?: number };
      if (!decoded.exp) {
        return { isValid: false };
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - currentTime;

      // Consider token invalid if expires in less than 5 minutes
      if (expiresIn < 300) {
        return { isValid: false, expiresIn };
      }

      return { isValid: true, expiresIn };
    } catch (error) {
      logger.warn('[SessionManager] Token decode failed', 'auth', { error: String(error) });
      return { isValid: false };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = await tokenManager.getRefreshToken();
      if (!refreshToken) {
        logger.debug('[SessionManager] No refresh token available');
        return null;
      }

      logger.debug('[SessionManager] Attempting token refresh...');

      const response = await apiClient.post('/auth/refresh', {
        refresh_token: refreshToken
      });

      if (response.data?.access_token) {
        const newAccessToken = response.data.access_token;
        tokenManager.setAccessToken(newAccessToken);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

        logger.debug('[SessionManager] Token refreshed successfully');
        return newAccessToken;
      }

      return null;
    } catch (error) {
      logger.error('[SessionManager] Token refresh failed:', error);
      return null;
    }
  }

  /**
   * Fetch user profile from backend
   */
  private async fetchUserProfile(): Promise<UserProfile | null> {
    try {
      const response = await apiClient.get(AUTH_PATHS.ME);
      if (response.status === 200 && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      logger.error('[SessionManager] Failed to fetch profile:', error);
      return null;
    }
  }

  /**
   * Map backend profile to session data
   */
  private mapProfileToSession(profile: UserProfile): SessionData {
    const profileId = profile.id || profile.profile_id || profile.user_id || '';
    const now = new Date().toISOString();

    return {
      userId: profile.user_id || profile.id || '',
      profileId,
      entityId: profile.entity_id,
      email: profile.type === 'business' ? (profile.business_email || '') : (profile.email || ''),
      firstName: profile.type === 'business' ? profile.business_name : profile.first_name,
      lastName: profile.type === 'business' ? undefined : profile.last_name,
      username: profile.username,
      avatarUrl: profile.avatar_url || profile.logo_url,
      profileType: profile.type,
      businessName: profile.business_name,
      sessionId: this.generateSessionId(),
      createdAt: now,
      lastValidated: now,
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get current session (from memory)
   */
  getCurrentSession(): SessionData | null {
    if (this.currentSession && this.isSessionRecentlyValidated()) {
      return this.currentSession;
    }
    return null;
  }

  /**
   * Check if session was validated recently
   */
  private isSessionRecentlyValidated(): boolean {
    return Date.now() - this.lastValidation < SESSION_VALIDATION_INTERVAL;
  }

  /**
   * Set current session (after login)
   */
  setSession(session: SessionData): void {
    this.currentSession = session;
    this.lastValidation = Date.now();
    logger.debug('[SessionManager] Session set', 'auth', { profileId: session.profileId });
  }

  /**
   * Clear all session data
   */
  async clearSession(): Promise<void> {
    try {
      this.currentSession = null;
      this.lastValidation = 0;

      // Clear tokens
      await tokenManager.clearAllTokens();

      // Clear API client auth header
      delete apiClient.defaults.headers.common['Authorization'];
      apiClient.setProfileId(null);

      // Clear session storage
      await AsyncStorage.removeItem(STORAGE_KEYS.SESSION_DATA);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.LAST_WALLET_UNLOCK).catch(() => {});

      logger.debug('[SessionManager] Session cleared');
    } catch (error) {
      logger.error('[SessionManager] Error clearing session:', error);
      // Force clear memory state even if storage fails
      this.currentSession = null;
      this.lastValidation = 0;
    }
  }

  /**
   * Emergency cleanup - clears everything
   */
  async emergencyCleanup(): Promise<void> {
    try {
      logger.warn('[SessionManager] Performing emergency cleanup');

      this.currentSession = null;
      this.lastValidation = 0;

      // Clear all AsyncStorage
      await AsyncStorage.clear();

      // Clear known SecureStore items
      const secureStoreKeys = [
        'swap_access_token',
        'swap_refresh_token',
        'savedEmail',
        'savedPassword',
        'biometricIdentifier',
        'biometricPassword',
      ];

      await Promise.all(
        secureStoreKeys.map(key =>
          SecureStore.deleteItemAsync(key).catch(() => {})
        )
      );

      logger.debug('[SessionManager] Emergency cleanup completed');
    } catch (error) {
      logger.error('[SessionManager] Emergency cleanup failed:', error);
    }
  }

  /**
   * Check if user is authenticated (has valid session in memory)
   */
  isAuthenticated(): boolean {
    return this.currentSession !== null && this.isSessionRecentlyValidated();
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();
export default SessionManager;
