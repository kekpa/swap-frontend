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
import { getFullDeviceInfo } from '../../utils/deviceInfo';

// Secure store key for biometric device token (NOT password - security best practice)
const BIOMETRIC_TOKEN_KEY = 'biometricDeviceToken';

export interface LoginResult {
  success: boolean;
  message?: string;
  userType?: 'personal' | 'business';
  user?: SessionData;
  errorCode?: string;
  scheduledDeletionDate?: string;
  canCancel?: boolean;
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
      // Get device info for session tracking
      const deviceInfo = await getFullDeviceInfo();
      logger.debug('[LoginService] Device info:', deviceInfo);

      // Step 1: Call unified login endpoint with device headers
      const response = await apiClient.post(
        '/auth/unified-login',
        { identifier, password },
        {
          headers: {
            'X-Device-Name': deviceInfo.device_name,
            'X-Device-Type': deviceInfo.device_type,
            'X-Device-Fingerprint': deviceInfo.fingerprint,
            'X-OS-Name': deviceInfo.os_name,
            'X-OS-Version': deviceInfo.os_version,
          },
        }
      );

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

      // Step 4.5: Sync PIN status from backend (Hybrid PIN Architecture)
      // If backend says PIN is configured but local doesn't have hash,
      // mark as configured from backend for first unlock
      if (profile) {
        await this.syncPinStatusFromProfile(profile, identifier);
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

      // Check for specific error codes from backend
      const errorCode = error.response?.data?.code;
      if (errorCode === 'ACCOUNT_PENDING_DELETION') {
        return {
          success: false,
          message: error.response.data.message,
          errorCode: 'ACCOUNT_PENDING_DELETION',
          scheduledDeletionDate: error.response.data.scheduledDeletionDate,
          canCancel: error.response.data.canCancel,
        };
      }

      if (errorCode === 'ACCOUNT_DELETED') {
        return {
          success: false,
          message: error.response.data.message,
          errorCode: 'ACCOUNT_DELETED',
          canCancel: false,
        };
      }

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
      // Get device info for session tracking
      const deviceInfo = await getFullDeviceInfo();

      const response = await apiClient.post(
        AUTH_PATHS.PIN_LOGIN,
        { identifier, pin },
        {
          headers: {
            'X-Device-Name': deviceInfo.device_name,
            'X-Device-Type': deviceInfo.device_type,
            'X-Device-Fingerprint': deviceInfo.fingerprint,
            'X-OS-Name': deviceInfo.os_name,
            'X-OS-Version': deviceInfo.os_version,
          },
        }
      );
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

      // Sync PIN status from backend (Hybrid PIN Architecture)
      // If user logged in with PIN, backend has confirmed PIN exists
      // Mark local as configured so we don't show "Secure Your Account" again
      if (profile) {
        await this.syncPinStatusFromProfile(profile, identifier);
      }

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
   * Uses secure device token from backend (NOT password storage)
   *
   * Flow:
   * 1. Retrieve biometric token from SecureStore
   * 2. Send to /auth/biometric/login with device fingerprint
   * 3. Backend verifies token and returns JWT
   */
  async loginWithBiometric(): Promise<LoginResult> {
    logger.debug('[LoginService] Attempting biometric login');

    try {
      const biometricToken = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
      if (!biometricToken) {
        return {
          success: false,
          message: 'Biometric not set up. Please enable biometric in settings.',
        };
      }

      const deviceInfo = await getFullDeviceInfo();
      const response = await apiClient.post(
        AUTH_PATHS.BIOMETRIC_LOGIN,
        { biometricToken },
        {
          headers: {
            'X-Device-Fingerprint': deviceInfo.fingerprint,
            'X-Device-Name': deviceInfo.device_name,
            'X-Device-Type': deviceInfo.device_type,
            'X-OS-Name': deviceInfo.os_name,
          },
        }
      );

      const authData = response.data;
      if (!authData.access_token) {
        return { success: false, message: 'Biometric login failed' };
      }

      // Same token handling as regular login
      tokenManager.setAccessToken(authData.access_token);
      if (authData.refresh_token) {
        tokenManager.setRefreshToken(authData.refresh_token);
      }
      if (authData.profile_id) {
        apiClient.setProfileId(authData.profile_id);
      }

      // Fetch profile and set session
      const profile = await this.fetchUserProfile();
      const sessionData = this.createSessionFromProfile(profile, '');
      sessionManager.setSession(sessionData);

      // Notify state machine
      authStateMachine.transition(AuthEvent.LOGIN_SUCCESS, {
        event: AuthEvent.LOGIN_SUCCESS,
        timestamp: Date.now(),
        authData: {
          userId: sessionData.userId,
          profileId: sessionData.profileId,
          accessToken: authData.access_token,
        },
      });

      loadingOrchestrator.coordinateAuthToAppTransition();

      // Auto-unlock app lock
      try {
        await appLockService.unlock();
        logger.debug('[LoginService] App lock auto-unlocked after biometric login');
      } catch (e) {
        // Non-fatal
      }

      logger.debug('[LoginService] Biometric login successful');
      return { success: true, user: sessionData };
    } catch (error: any) {
      logger.error('[LoginService] Biometric login error:', error);

      // If token expired/revoked, clear local token
      if (error.response?.status === 401) {
        await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
        return {
          success: false,
          message: 'Biometric session expired. Please log in with password and re-enable biometric.',
        };
      }

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Biometric login failed',
      };
    }
  }

  /**
   * Enable biometric login for this device
   * Called from SecurityPrivacy.tsx after user is already logged in
   *
   * Flow:
   * 1. Call /auth/biometric/enable with device fingerprint
   * 2. Backend generates secure token, returns it
   * 3. Store token in SecureStore
   */
  async enableBiometricLogin(): Promise<{ success: boolean; message?: string }> {
    logger.debug('[LoginService] Enabling biometric login');

    try {
      const deviceInfo = await getFullDeviceInfo();
      const response = await apiClient.post(
        AUTH_PATHS.BIOMETRIC_ENABLE,
        {},
        {
          headers: {
            'X-Device-Name': deviceInfo.device_name,
            'X-Device-Type': deviceInfo.device_type,
            'X-Device-Fingerprint': deviceInfo.fingerprint,
            'X-OS-Name': deviceInfo.os_name,
          },
        }
      );

      if (response.data?.biometricToken) {
        await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, response.data.biometricToken);
        logger.info('[LoginService] Biometric enabled and token stored');
        return { success: true };
      }

      return { success: false, message: 'No token received from server' };
    } catch (error: any) {
      logger.error('[LoginService] Failed to enable biometric:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to enable biometric',
      };
    }
  }

  /**
   * Disable biometric login for this device
   */
  async disableBiometricLogin(): Promise<void> {
    logger.debug('[LoginService] Disabling biometric login');

    try {
      const deviceInfo = await getFullDeviceInfo();
      await apiClient.delete(AUTH_PATHS.BIOMETRIC_DISABLE, {
        headers: { 'X-Device-Fingerprint': deviceInfo.fingerprint },
      });
    } catch (error) {
      logger.warn('[LoginService] Failed to disable biometric on server:', error);
    }

    // Always clear local token
    await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
    logger.debug('[LoginService] Biometric token cleared');
  }

  /**
   * Check if biometric is enabled for this device
   */
  async isBiometricEnabled(): Promise<boolean> {
    const token = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
    return !!token;
  }

  /**
   * Clear biometric token (on logout)
   */
  async clearBiometricCredentials(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
      logger.debug('[LoginService] Biometric token cleared');
    } catch (error) {
      logger.warn('[LoginService] Failed to clear biometric token:', error);
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

  /**
   * Sync PIN status from backend profile response.
   *
   * Part of Hybrid PIN Architecture:
   * - Backend returns passcode_configured/pin_configured in profile
   * - If backend has PIN but local doesn't, mark as configured from backend
   * - First unlock will verify via backend, then save locally
   *
   * @param profile - Profile response from /auth/me
   * @param identifier - User's phone/email for backend verification
   */
  private async syncPinStatusFromProfile(profile: any, identifier: string): Promise<void> {
    try {
      // Store identifier for backend PIN verification
      await appLockService.setUserIdentifier(identifier);

      if (profile.type === 'personal') {
        // Personal profile: Check passcode_configured
        if (profile.passcode_configured) {
          const isLocallyConfigured = await appLockService.isConfigured();
          if (!isLocallyConfigured) {
            logger.info('[LoginService] Backend has PIN configured, syncing to local');
            await appLockService.markAsConfiguredFromBackend(
              profile.passcode_set_at,
              identifier
            );
          } else {
            logger.debug('[LoginService] PIN already configured locally');
          }
        } else {
          logger.debug('[LoginService] No PIN configured on backend');
        }
      } else if (profile.type === 'business') {
        // Business profile: Check pin_configured
        if (profile.pin_configured) {
          const isLocallyConfigured = await appLockService.isBusinessPinConfigured(profile.id);
          if (!isLocallyConfigured) {
            logger.info(`[LoginService] Backend has business PIN configured for ${profile.id}, syncing to local`);
            await appLockService.markBusinessPinConfiguredFromBackend(
              profile.id,
              profile.pin_set_at
            );
          } else {
            logger.debug('[LoginService] Business PIN already configured locally');
          }
        } else {
          logger.debug('[LoginService] No business PIN configured on backend');
        }
      }
    } catch (error: any) {
      // Non-fatal - just log and continue
      logger.warn('[LoginService] Failed to sync PIN status from backend:', error.message);
    }
  }
}

// Export singleton instance
export const loginService = LoginService.getInstance();
export default LoginService;
