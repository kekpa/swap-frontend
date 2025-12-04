/**
 * LoginService - Centralized Login Functionality
 *
 * Consolidates all login-related functionality:
 * - Unified login (personal/business auto-detection)
 * - PIN login
 * - Biometric login
 * - Credential storage for biometric
 *
 * Single source of truth for login logic - no more 3 duplicate functions.
 *
 * @author Swap Team
 * @version 1.0.0
 */

import * as SecureStore from 'expo-secure-store';
import { tokenManager } from '../token';
import apiClient from '../../_api/apiClient';
import { AUTH_PATHS } from '../../_api/apiPaths';
import logger from '../../utils/logger';
import { sessionManager, SessionData } from './SessionManager';
import { authStateMachine, AuthEvent } from '../../utils/AuthStateMachine';
import { loadingOrchestrator } from '../../utils/LoadingOrchestrator';
import appLockService from '../AppLockService';

// Secure store keys for biometric credentials
const BIOMETRIC_IDENTIFIER_KEY = 'biometricIdentifier';
const BIOMETRIC_PASSWORD_KEY = 'biometricPassword';

export interface LoginResult {
  success: boolean;
  message?: string;
  userType?: 'personal' | 'business';
  user?: SessionData;
}

export interface LoginCredentials {
  identifier: string;
  password: string;
}

class LoginService {
  private static instance: LoginService;

  private constructor() {
    logger.debug('[LoginService] Initialized');
  }

  static getInstance(): LoginService {
    if (!LoginService.instance) {
      LoginService.instance = new LoginService();
    }
    return LoginService.instance;
  }

  /**
   * Unified login - auto-detects personal vs business users
   * This is the ONLY login function - replaces login(), loginBusiness(), unifiedLogin()
   */
  async login(identifier: string, password: string): Promise<LoginResult> {
    logger.debug('[LoginService] Starting unified login for:', identifier);

    try {
      // Step 1: Call unified login endpoint
      const response = await apiClient.post('/auth/unified-login', { identifier, password });

      if (response.status !== 200 && response.status !== 201) {
        return {
          success: false,
          message: 'Login failed - unexpected response status'
        };
      }

      const authData = response.data;

      if (!authData.access_token) {
        return {
          success: false,
          message: 'Login failed - no access token received'
        };
      }

      const userType = authData.user_type || 'personal';
      logger.debug('[LoginService] User type detected:', userType);

      // Step 2: Save tokens
      tokenManager.setAccessToken(authData.access_token);
      if (authData.refresh_token) {
        tokenManager.setRefreshToken(authData.refresh_token);
      }

      // Step 3: Set profile ID in API client
      if (authData.profile_id) {
        apiClient.setProfileId(authData.profile_id);
      }

      // Step 4: Fetch and set user profile
      const profile = await this.fetchUserProfile();
      if (!profile) {
        logger.warn('[LoginService] Login succeeded but profile fetch failed');
      }

      const sessionData: SessionData = profile ? {
        userId: profile.user_id || profile.id,
        profileId: profile.profile_id || profile.id,
        entityId: profile.entity_id,
        email: profile.type === 'business' ? profile.business_email : profile.email,
        firstName: profile.type === 'business' ? profile.business_name : profile.first_name,
        lastName: profile.type === 'business' ? undefined : profile.last_name,
        username: profile.username,
        avatarUrl: profile.avatar_url || profile.logo_url,
        profileType: profile.type,
        businessName: profile.business_name,
        sessionId: `session_${Date.now()}`,
        createdAt: new Date().toISOString(),
        lastValidated: new Date().toISOString(),
      } : {
        userId: authData.user_id || '',
        profileId: authData.profile_id || '',
        email: identifier,
        sessionId: `session_${Date.now()}`,
        createdAt: new Date().toISOString(),
        lastValidated: new Date().toISOString(),
      };

      // Step 5: Update session manager
      sessionManager.setSession(sessionData);

      // Step 6: Notify state machine
      authStateMachine.transition(AuthEvent.LOGIN_SUCCESS, {
        event: AuthEvent.LOGIN_SUCCESS,
        timestamp: Date.now(),
        authData: {
          userId: sessionData.userId,
          profileId: sessionData.profileId,
          accessToken: authData.access_token
        }
      });

      // Step 7: Coordinate loading transition
      loadingOrchestrator.coordinateAuthToAppTransition();

      // Step 8: Auto-unlock app lock - password auth is highest level
      // This prevents showing LockScreen after fresh password login
      try {
        await appLockService.unlock();
        logger.debug('[LoginService] App lock auto-unlocked after password login');
      } catch (e) {
        // Non-fatal - app lock may not be configured
      }

      logger.debug('[LoginService] Login completed successfully');

      return {
        success: true,
        userType: userType as 'personal' | 'business',
        user: sessionData
      };

    } catch (error: any) {
      logger.error('[LoginService] Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Login failed'
      };
    }
  }

  /**
   * Login with PIN
   */
  async loginWithPin(identifier: string, pin: string): Promise<LoginResult> {
    logger.debug('[LoginService] Attempting PIN login for:', identifier);

    try {
      const response = await apiClient.post(AUTH_PATHS.PIN_LOGIN, { identifier, pin });
      const authData = response.data;

      if (!authData?.access_token) {
        return {
          success: false,
          message: 'PIN login failed - no access token received'
        };
      }

      // Clear any existing tokens first
      await tokenManager.clearAllTokens();

      // Save new tokens
      tokenManager.setAccessToken(authData.access_token);
      if (authData.refresh_token) {
        tokenManager.setRefreshToken(authData.refresh_token);
      }

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${authData.access_token}`;

      if (authData.profile_id) {
        apiClient.setProfileId(authData.profile_id);
      }

      // Fetch profile
      const profile = await this.fetchUserProfile();
      const sessionData = this.createSessionFromProfile(profile, identifier);

      sessionManager.setSession(sessionData);

      // Notify state machine
      authStateMachine.transition(AuthEvent.LOGIN_SUCCESS, {
        event: AuthEvent.LOGIN_SUCCESS,
        timestamp: Date.now(),
        authData: {
          userId: authData.user_id,
          profileId: authData.profile_id,
          accessToken: authData.access_token
        }
      });

      loadingOrchestrator.coordinateAuthToAppTransition();

      // Auto-unlock app lock - PIN login is explicit authentication
      try {
        await appLockService.unlock();
        logger.debug('[LoginService] App lock auto-unlocked after PIN login');
      } catch (e) {
        // Non-fatal
      }

      logger.debug('[LoginService] PIN login successful');
      return { success: true, user: sessionData };

    } catch (error: any) {
      logger.error('[LoginService] PIN login error:', error);

      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Invalid PIN or PIN not set up for this account.'
        };
      }

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'PIN login failed'
      };
    }
  }

  /**
   * Login with biometric (Face ID / Touch ID)
   * Uses stored credentials from previous login
   */
  async loginWithBiometric(): Promise<LoginResult> {
    logger.debug('[LoginService] Attempting biometric login');

    try {
      const credentials = await this.getBiometricCredentials();
      if (!credentials) {
        return {
          success: false,
          message: 'No biometric credentials found. Please set up biometric login first.'
        };
      }

      const result = await this.login(credentials.identifier, credentials.password);

      // If login failed with stored credentials, provide clearer error
      if (!result.success) {
        return {
          success: false,
          message: 'Your saved login is no longer valid. Please sign in with your password.'
        };
      }

      return result;

    } catch (error: any) {
      logger.error('[LoginService] Biometric login error:', error);
      return {
        success: false,
        message: error.message || 'Biometric login failed'
      };
    }
  }

  /**
   * Setup biometric login by storing credentials
   */
  async setupBiometricLogin(identifier: string, password: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(BIOMETRIC_IDENTIFIER_KEY, identifier);
      await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, password);
      logger.debug('[LoginService] Biometric credentials stored');
    } catch (error) {
      logger.error('[LoginService] Failed to store biometric credentials:', error);
      throw new Error('Failed to set up biometric login');
    }
  }

  /**
   * Get stored biometric credentials
   */
  async getBiometricCredentials(): Promise<LoginCredentials | null> {
    try {
      const identifier = await SecureStore.getItemAsync(BIOMETRIC_IDENTIFIER_KEY);
      const password = await SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY);

      if (identifier && password) {
        return { identifier, password };
      }
      return null;
    } catch (error) {
      logger.warn('[LoginService] Failed to get biometric credentials:', error);
      return null;
    }
  }

  /**
   * Clear biometric credentials (on logout)
   */
  async clearBiometricCredentials(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_IDENTIFIER_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY);
      logger.debug('[LoginService] Biometric credentials cleared');
    } catch (error) {
      logger.warn('[LoginService] Failed to clear biometric credentials:', error);
    }
  }

  /**
   * Fetch user profile from backend
   */
  private async fetchUserProfile(): Promise<any | null> {
    try {
      const response = await apiClient.get(AUTH_PATHS.ME);
      if (response.status === 200 && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      logger.warn('[LoginService] Failed to fetch profile:', error);
      return null;
    }
  }

  /**
   * Create session data from profile
   */
  private createSessionFromProfile(profile: any | null, fallbackEmail: string): SessionData {
    if (!profile) {
      return {
        userId: '',
        profileId: '',
        email: fallbackEmail,
        sessionId: `session_${Date.now()}`,
        createdAt: new Date().toISOString(),
        lastValidated: new Date().toISOString(),
      };
    }

    const profileId = profile.id || profile.profile_id || profile.user_id;
    return {
      userId: profile.user_id || profile.id,
      profileId,
      entityId: profile.entity_id,
      email: profile.type === 'business' ? profile.business_email : profile.email,
      firstName: profile.type === 'business' ? profile.business_name : profile.first_name,
      lastName: profile.type === 'business' ? undefined : profile.last_name,
      username: profile.username,
      avatarUrl: profile.avatar_url || profile.logo_url,
      profileType: profile.type,
      businessName: profile.business_name,
      sessionId: `session_${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastValidated: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const loginService = LoginService.getInstance();
export default LoginService;
