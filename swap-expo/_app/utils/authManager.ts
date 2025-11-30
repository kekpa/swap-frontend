// Updated: Fixed session bleed security issue with comprehensive session isolation - 2025-05-26

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenManager, getAccessToken, saveAccessToken, saveRefreshToken } from '../services/token';
import logger from './logger';
// Simple EventEmitter implementation for React Native
class SimpleEventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, listener: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener?: Function): void {
    if (!this.listeners[event]) return;
    
    if (listener) {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
      if (this.listeners[event].length === 0) {
        delete this.listeners[event];
      }
    } else {
      delete this.listeners[event];
    }
  }

  emit(event: string, ...args: any[]): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
}

// Create a global event emitter for auth events
export const authEvents = new SimpleEventEmitter();

// Auth event types
export const AUTH_EVENT_TYPES = {
  LOGIN_COMPLETED: 'login_completed',
  LOGOUT_STARTED: 'logout_started',
  LOGOUT_COMPLETED: 'logout_completed',
  SESSION_CLEARED: 'session_cleared',
} as const;

export interface SessionData {
  userId: string;
  profileId: string;
  entityId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
  // Add session validation fields
  sessionId: string; // Unique session identifier
  createdAt: string; // When session was created
  lastValidated: string; // Last time session was validated
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

const SESSION_KEY = 'currentSession';
const CREDENTIALS_EMAIL_KEY = 'savedEmail';
const CREDENTIALS_PASSWORD_KEY = 'savedPassword';
const SESSION_VALIDATION_INTERVAL = 5 * 60 * 1000; // 5 minutes

class AuthManager {
  private static instance: AuthManager;
  private currentSession: SessionData | null = null;
  private sessionPromise: Promise<SessionData | null> | null = null;
  private lastSessionValidation: number = 0;

  private constructor() {}

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Validate session data integrity
   */
  private validateSessionData(sessionData: any): sessionData is SessionData {
    if (!sessionData || typeof sessionData !== 'object') {
      return false;
    }

    const required = ['userId', 'profileId', 'email', 'sessionId', 'createdAt'];
    for (const field of required) {
      if (!sessionData[field] || typeof sessionData[field] !== 'string') {
        logger.warn(`[AuthManager] Session validation failed: missing or invalid ${field}`, 'auth_manager');
        return false;
      }
    }

    // Check if session is not too old (max 30 days)
    const createdAt = new Date(sessionData.createdAt);
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (Date.now() - createdAt.getTime() > maxAge) {
      logger.warn('[AuthManager] Session validation failed: session too old', 'auth_manager');
      return false;
    }

    return true;
  }

  /**
   * Save session data securely with enhanced validation
   */
  async saveSession(sessionData: Omit<SessionData, 'sessionId' | 'createdAt' | 'lastValidated'>): Promise<void> {
    try {
      // Clear only session data (not tokens) to prevent session bleed
      await this.clearSessionDataOnly();

      const now = new Date().toISOString();
      const enhancedSessionData: SessionData = {
        ...sessionData,
        sessionId: this.generateSessionId(),
        createdAt: now,
        lastValidated: now,
      };

      this.currentSession = enhancedSessionData;
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(enhancedSessionData));
      
      logger.debug('[AuthManager] Session saved successfully', 'auth_manager', {
        userId: enhancedSessionData.userId,
        email: enhancedSessionData.email,
        sessionId: enhancedSessionData.sessionId,
      });
    } catch (error) {
      logger.error('[AuthManager] Failed to save session', error, 'auth_manager');
      // Clear any partial state on error
      this.currentSession = null;
      this.sessionPromise = null;
      throw error;
    }
  }

  /**
   * Load session data with enhanced validation and security checks
   */
  async loadSession(): Promise<SessionData | null> {
    // Return cached session if available and recently validated
    if (this.currentSession && this.isSessionRecentlyValidated()) {
      return this.currentSession;
    }

    // Return existing promise if load is in progress
    if (this.sessionPromise) {
      return this.sessionPromise;
    }

    // Start new load operation
    this.sessionPromise = this.performSessionLoad();
    const result = await this.sessionPromise;
    this.sessionPromise = null;
    return result;
  }

  private isSessionRecentlyValidated(): boolean {
    return Date.now() - this.lastSessionValidation < SESSION_VALIDATION_INTERVAL;
  }

  private async performSessionLoad(): Promise<SessionData | null> {
    try {
      const sessionJson = await AsyncStorage.getItem(SESSION_KEY);
      if (!sessionJson) {
        logger.debug('[AuthManager] No session found in storage', 'auth_manager');
        return null;
      }

      let sessionData: any;
      try {
        sessionData = JSON.parse(sessionJson);
      } catch (parseError) {
        logger.warn('[AuthManager] Invalid session JSON found, clearing', 'auth_manager');
        await this.clearSession();
        return null;
      }

      // Validate session data structure and integrity
      if (!this.validateSessionData(sessionData)) {
          logger.warn('[AuthManager] Invalid session data found, clearing', 'auth_manager');
          await this.clearSession();
        return null;
      }

      // Verify token still exists and is valid
      const token = await getAccessToken();
      if (!token) {
        logger.warn('[AuthManager] Session found but no valid token, clearing session', 'auth_manager');
        await this.clearSession();
        return null;
      }

      // Update last validated timestamp
      sessionData.lastValidated = new Date().toISOString();
      this.currentSession = sessionData;
      this.lastSessionValidation = Date.now();

      // Save updated session with new validation timestamp
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

      logger.debug('[AuthManager] Session loaded and validated successfully', 'auth_manager', {
        userId: sessionData.userId,
        email: sessionData.email,
        sessionId: sessionData.sessionId,
      });
      
      return sessionData;
    } catch (error) {
      logger.error('[AuthManager] Failed to load session', error, 'auth_manager');
      // Clear any corrupted state
      await this.clearSession();
      return null;
    }
  }

  /**
   * Clear only session data (not tokens) to prevent session bleed during login
   */
  private async clearSessionDataOnly(): Promise<void> {
    try {
      const previousSessionId = this.currentSession?.sessionId;
      
      // Clear in-memory state first
      this.currentSession = null;
      this.sessionPromise = null;
      this.lastSessionValidation = 0;

      // Clear only session storage (not tokens)
      await AsyncStorage.removeItem(SESSION_KEY);

      // Clear any other potential session-related data (but not tokens)
      const allKeys = await AsyncStorage.getAllKeys();
      const sessionRelatedKeys = allKeys.filter(key => 
        key.includes('session') || 
        key.includes('user') || 
        key.includes('profile') ||
        (key.includes('swap_') && !key.includes('token')) // Clear app-specific keys but preserve tokens
      );

      if (sessionRelatedKeys.length > 0) {
        await AsyncStorage.multiRemove(sessionRelatedKeys);
        logger.debug(`[AuthManager] Cleared ${sessionRelatedKeys.length} session-related keys (preserving tokens)`, 'auth_manager');
      }

      logger.debug('[AuthManager] Session data cleared successfully (tokens preserved)', 'auth_manager', {
        previousSessionId: previousSessionId || 'none',
      });
    } catch (error) {
      logger.error('[AuthManager] Failed to clear session data', error, 'auth_manager');
      // Force clear in-memory state even if storage operations fail
      this.currentSession = null;
      this.sessionPromise = null;
      this.lastSessionValidation = 0;
      throw error;
    }
  }

  /**
   * Clear session data completely with enhanced security
   */
  async clearSession(): Promise<void> {
    try {
      const previousSessionId = this.currentSession?.sessionId;
      
      // Clear in-memory state first
      this.currentSession = null;
      this.sessionPromise = null;
      this.lastSessionValidation = 0;

      // Clear persistent storage
      await AsyncStorage.removeItem(SESSION_KEY);
      await tokenManager.clearAllTokens();

      // Clear any other potential session-related data
      const allKeys = await AsyncStorage.getAllKeys();
      const sessionRelatedKeys = allKeys.filter(key => 
        key.includes('session') || 
        key.includes('user') || 
        key.includes('profile') ||
        key.includes('swap_') // Clear any app-specific keys
      );

      if (sessionRelatedKeys.length > 0) {
        await AsyncStorage.multiRemove(sessionRelatedKeys);
        logger.debug(`[AuthManager] Cleared ${sessionRelatedKeys.length} session-related keys`, 'auth_manager');
      }

      logger.debug('[AuthManager] Session cleared successfully', 'auth_manager', {
        previousSessionId: previousSessionId || 'none',
      });
    } catch (error) {
      logger.error('[AuthManager] Failed to clear session', error, 'auth_manager');
      // Force clear in-memory state even if storage operations fail
      this.currentSession = null;
      this.sessionPromise = null;
      this.lastSessionValidation = 0;
      throw error;
    }
  }

  /**
   * Save login credentials securely (if remember me is enabled)
   */
  async saveCredentials(credentials: LoginCredentials): Promise<void> {
    if (!credentials.rememberMe) {
      await this.clearCredentials();
      return;
    }

    try {
      await SecureStore.setItemAsync(CREDENTIALS_EMAIL_KEY, credentials.email);
      await SecureStore.setItemAsync(CREDENTIALS_PASSWORD_KEY, credentials.password);
      logger.debug('[AuthManager] Credentials saved securely', 'auth_manager');
    } catch (error) {
      logger.error('[AuthManager] Failed to save credentials', error, 'auth_manager');
      throw error;
    }
  }

  /**
   * Load saved credentials
   */
  async loadCredentials(): Promise<LoginCredentials | null> {
    try {
      const email = await SecureStore.getItemAsync(CREDENTIALS_EMAIL_KEY);
      const password = await SecureStore.getItemAsync(CREDENTIALS_PASSWORD_KEY);
      
      if (email && password) {
        logger.debug('[AuthManager] Credentials loaded successfully', 'auth_manager');
        return { email, password, rememberMe: true };
      }
      return null;
    } catch (error) {
      logger.error('[AuthManager] Failed to load credentials', error, 'auth_manager');
      return null;
    }
  }

  /**
   * Clear saved credentials
   */
  async clearCredentials(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(CREDENTIALS_EMAIL_KEY);
      await SecureStore.deleteItemAsync(CREDENTIALS_PASSWORD_KEY);
      logger.debug('[AuthManager] Credentials cleared successfully', 'auth_manager');
    } catch (error) {
      logger.error('[AuthManager] Failed to clear credentials', error, 'auth_manager');
    }
  }

  /**
   * Verify current session is valid with enhanced checks
   */
  async verifySession(): Promise<boolean> {
    try {
      const token = await getAccessToken();
      const session = await this.loadSession();
      
      if (!token || !session) {
        logger.debug('[AuthManager] Session verification failed: missing token or session', 'auth_manager');
        return false;
      }

      // Enhanced validation
      if (!this.validateSessionData(session)) {
        logger.warn('[AuthManager] Session verification failed: invalid session structure', 'auth_manager');
        await this.clearSession();
        return false;
      }

      // Check if session belongs to the same user as the token
      try {
        // Basic token structure validation (without full JWT verification)
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          logger.warn('[AuthManager] Session verification failed: invalid token format', 'auth_manager');
          await this.clearSession();
          return false;
        }

        // Decode token payload (without verification for basic checks)
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.sub !== session.userId || payload.profile_id !== session.profileId) {
          logger.warn('[AuthManager] Session verification failed: token/session mismatch', 'auth_manager');
          await this.clearSession();
          return false;
        }
      } catch (tokenError) {
        logger.warn('[AuthManager] Session verification failed: token parsing error', 'auth_manager');
        await this.clearSession();
        return false;
      }

      // Update validation timestamp
      this.lastSessionValidation = Date.now();
      
      return true;
    } catch (error) {
      logger.error('[AuthManager] Session verification error', error, 'auth_manager');
      await this.clearSession();
      return false;
    }
  }

  /**
   * Get current session (cached) with validation
   */
  getCurrentSession(): SessionData | null {
    // Only return session if it's recently validated
    if (this.currentSession && this.isSessionRecentlyValidated()) {
    return this.currentSession;
    }
    return null;
  }

  /**
   * Force refresh session from storage
   */
  async refreshSession(): Promise<SessionData | null> {
    this.currentSession = null;
    this.sessionPromise = null;
    this.lastSessionValidation = 0;
    return this.loadSession();
  }

  /**
   * Update session data (e.g., after profile update)
   */
  async updateSession(updates: Partial<Omit<SessionData, 'sessionId' | 'createdAt'>>): Promise<void> {
    if (!this.currentSession) {
      logger.warn('[AuthManager] Cannot update session: no current session', 'auth_manager');
      return;
    }

    const updatedSession = { 
      ...this.currentSession, 
      ...updates,
      lastValidated: new Date().toISOString(),
    };
    
    this.currentSession = updatedSession;
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
    
    logger.debug('[AuthManager] Session updated successfully', 'auth_manager', {
      sessionId: updatedSession.sessionId,
      updatedFields: Object.keys(updates),
    });
  }

  /**
   * Complete logout process with enhanced security
   */
  async logout(): Promise<void> {
    try {
      const sessionId = this.currentSession?.sessionId;
      
      logger.debug('[AuthManager] Starting logout process', 'auth_manager', {
        sessionId: sessionId || 'none',
      });

      // Clear session and credentials
      await this.clearSession();
      await this.clearCredentials();

      // Additional security: clear any cached data that might contain user info
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const userDataKeys = allKeys.filter(key => 
          key.includes('user') || 
          key.includes('profile') || 
          key.includes('interaction') ||
          key.includes('message') ||
          key.includes('transaction') ||
          key.includes('cache')
        );

        if (userDataKeys.length > 0) {
          await AsyncStorage.multiRemove(userDataKeys);
          logger.debug(`[AuthManager] Cleared ${userDataKeys.length} user data keys during logout`, 'auth_manager');
        }
      } catch (cleanupError) {
        logger.warn('[AuthManager] Error during additional cleanup, continuing logout', 'auth_manager', { error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError) });
      }

      logger.debug('[AuthManager] Logout completed successfully', 'auth_manager', {
        clearedSessionId: sessionId || 'none',
      });

      // Emit logout completed event
      authEvents.emit(AUTH_EVENT_TYPES.LOGOUT_COMPLETED, sessionId);
    } catch (error) {
      logger.error('[AuthManager] Logout failed', error, 'auth_manager');
      // Force clear critical state even if some operations fail
      this.currentSession = null;
      this.sessionPromise = null;
      this.lastSessionValidation = 0;
      throw error;
    }
  }

  /**
   * Force clear all user data (emergency cleanup)
   */
  async emergencyCleanup(): Promise<void> {
    try {
      logger.warn('[AuthManager] Performing emergency cleanup', 'auth_manager');
      
      // Clear all in-memory state
      this.currentSession = null;
      this.sessionPromise = null;
      this.lastSessionValidation = 0;

      // Clear all AsyncStorage
      await AsyncStorage.clear();

      // Clear all SecureStore items we know about
      try {
        await SecureStore.deleteItemAsync(CREDENTIALS_EMAIL_KEY);
        await SecureStore.deleteItemAsync(CREDENTIALS_PASSWORD_KEY);
        await SecureStore.deleteItemAsync('swap_access_token');
        await SecureStore.deleteItemAsync('swap_refresh_token');
      } catch (secureStoreError) {
        // Continue even if SecureStore operations fail
                 logger.warn('[AuthManager] Some SecureStore cleanup failed during emergency cleanup', 'auth_manager', { error: secureStoreError instanceof Error ? secureStoreError.message : String(secureStoreError) });
      }

      logger.debug('[AuthManager] Emergency cleanup completed', 'auth_manager');
    } catch (error) {
      logger.error('[AuthManager] Emergency cleanup failed', error, 'auth_manager');
      throw error;
    }
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance(); 