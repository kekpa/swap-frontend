/**
 * AuthContext - Thin React Context Wrapper for Authentication
 *
 * REFACTORED: This is now a thin wrapper that delegates to specialized services:
 * - SessionManager: Session validation, restoration, cleanup
 * - LoginService: All login methods (unified, PIN, biometric)
 * - AccountSwitcher: Multi-account management
 * - WalletSecurity: Wallet-level security
 *
 * Before: 1,761 lines doing 15+ things (God Object)
 * After: ~400 lines - thin React wrapper
 *
 * @author Swap Team
 * @version 2.0.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User, AuthContextType, UserData, PhoneVerification, AuthLevel } from '../../../types/auth.types';
import { useAuth } from '../../../hooks-actions/useAuth';
import { tokenManager, getAccessToken } from '../../../services/token';
import apiClient from '../../../_api/apiClient';
import logger from '../../../utils/logger';
import { MMKV } from 'react-native-mmkv';
import { clearAllCachedData } from '../../../localdb';
import {
  storeLastUserForPin,
  getLastUserForPin as getStoredPinUser,
  clearLastUserForPin,
  hasPinUserStored as checkPinUserStored,
  // New Instagram-style multi-profile functions
  storeProfilePinData,
  setLastActiveProfile,
  getProfilePinData,
} from '../../../utils/pinUserStorage';
import { authStateMachine, AuthEvent } from '../../../utils/AuthStateMachine';
import { loadingOrchestrator } from '../../../utils/LoadingOrchestrator';
import { Account } from '../../../services/AccountsManager';

// Import new modular services
import { sessionManager, SessionData } from '../../../services/auth/SessionManager';
import { loginService, LoginResult } from '../../../services/auth/LoginService';
import { accountSwitcher } from '../../../services/auth/AccountSwitcher';
import { walletSecurity } from '../../../services/auth/WalletSecurity';
import { roscaRepository } from '../../../localdb/RoscaRepository';

// MMKV for preferences
const authStorage = new MMKV({
  id: 'swap-auth-preferences',
  encryptionKey: 'swap-auth-prefs-encryption-key-2025'
});

const PERSISTENT_AUTH_KEY = 'persistentAuthEnabled';
const SECURE_STORE_EMAIL_KEY = 'userEmail';
const SECURE_STORE_PASSWORD_KEY = 'userPassword';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Core authentication state
  const [authLevel, setAuthLevel] = useState<AuthLevel>(AuthLevel.GUEST);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialization state - blocks UI until session check completes
  // This prevents the "Sign In flash" when user is already logged in
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Multi-account state
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);

  // Profile switch state (prevents stale queries during switch)
  const [isProfileSwitching, setIsProfileSwitching] = useState<boolean>(false);

  // Session state
  const [hasPersistedSession, setHasPersistedSession] = useState<boolean>(false);

  // Wallet security state
  const [isWalletUnlocked, setIsWalletUnlocked] = useState<boolean>(false);
  const [lastWalletUnlock, setLastWalletUnlock] = useState<number | null>(null);

  // Legacy states for backward compatibility
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
  const [needsLogin, setNeedsLogin] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [justLoggedOut, setJustLoggedOut] = useState<boolean>(false);
  const [persistentAuthEnabled, setPersistentAuthEnabled] = useState<boolean>(() => {
    return authStorage.getBoolean(PERSISTENT_AUTH_KEY) ?? true;
  });
  const [phoneVerification, setPhoneVerification] = useState<PhoneVerification | null>(null);

  const hasRunInitialCheckSession = useRef(false);
  const authHook = useAuth();

  // ============================================
  // SESSION MANAGEMENT (delegates to SessionManager)
  // ============================================

  const checkSession = useCallback(async (): Promise<boolean> => {
    if (!authStateMachine.canPerformAuthOperation()) {
      logger.debug('[AuthContext] Navigation prevents auth operations');
      return false;
    }

    try {
      setIsLoading(true);

      authStateMachine.transition(AuthEvent.SESSION_REFRESH_START, {
        event: AuthEvent.SESSION_REFRESH_START,
        timestamp: Date.now(),
      });

      const result = await sessionManager.validateAndRestoreSession();

      if (result.isValid && result.user) {
        updateUserFromSession(result.user);
        setIsAuthenticated(true);
        setAuthLevel(AuthLevel.AUTHENTICATED);
        setIsGuestMode(false);
        setHasPersistedSession(true);

        authStateMachine.transition(AuthEvent.SESSION_REFRESH_SUCCESS, {
          event: AuthEvent.SESSION_REFRESH_SUCCESS,
          timestamp: Date.now(),
          authData: {
            userId: result.user.userId, // SessionData has userId
            profileId: result.user.profileId,
          }
        });

        loadingOrchestrator.coordinateAuthToAppTransition();
        return true;
      }

      setIsAuthenticated(false);
      setIsGuestMode(false);
      setUser(null);

      // "No access token" is not an error - it's the normal initial state for logged-out users
      // Only log as error if it's an actual failure (expired token, network issue, etc.)
      authStateMachine.transition(AuthEvent.SESSION_REFRESH_FAILURE, {
        event: AuthEvent.SESSION_REFRESH_FAILURE,
        timestamp: Date.now(),
        ...(result.error !== 'No access token' && {
          error: new Error(result.error || 'Session invalid')
        })
      });

      return false;
    } catch (error: any) {
      logger.error('[AuthContext] Session check failed:', error);
      return false;
    } finally {
      setIsLoading(false);
      // Mark initialization complete - UI can now render based on actual auth state
      setIsInitialized(true);
    }
  }, []);

  // ============================================
  // LOGIN METHODS (delegates to LoginService)
  // ============================================

  const unifiedLogin = useCallback(async (
    identifier: string,
    password: string,
    skipStore = false
  ): Promise<{ success: boolean; message?: string; user_type?: string; errorCode?: string }> => {
    const result = await loginService.login(identifier, password);

    if (result.success && result.user) {
      updateUserFromSession(result.user);
      setIsAuthenticated(true);
      setAuthLevel(AuthLevel.AUTHENTICATED);
      setIsGuestMode(false);
      setHasPersistedSession(true);

      // Enable biometric login if not skipped (uses secure device token, not password storage)
      if (!skipStore && persistentAuthEnabled && rememberMe) {
        await loginService.enableBiometricLogin();
      }

      // Store PIN data for Instagram-style multi-profile support
      const profileId = result.user.profileId || result.user.userId;
      if (profileId) {
        try {
          await storeProfilePinData(profileId, {
            identifier,
            username: result.user.username,
            businessName: result.user.businessName,
            displayName: result.user.businessName
              || `${result.user.firstName || ''} ${result.user.lastName || ''}`.trim()
              || identifier,
            profileType: result.user.profileType === 'business' ? 'business' : 'personal',
            avatarUrl: result.user.avatarUrl,
          });
          await setLastActiveProfile(profileId);
          logger.debug('[AuthContext] PIN data stored for profile (unifiedLogin)');
        } catch (pinError) {
          logger.warn('[AuthContext] Failed to store PIN data (non-critical)', pinError instanceof Error ? pinError.message : String(pinError));
        }
      }
    }

    return {
      success: result.success,
      message: result.message,
      user_type: result.userType,
      errorCode: result.errorCode,
    };
  }, [persistentAuthEnabled, rememberMe]);

  const loginWithPin = useCallback(async (
    identifier: string,
    pin: string,
    targetProfileId?: string
  ): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      const result = await loginService.loginWithPin(identifier, pin, targetProfileId);

      if (result.success && result.user) {
        updateUserFromSession(result.user);
        setIsAuthenticated(true);
        setAuthLevel(AuthLevel.AUTHENTICATED);
        setIsGuestMode(false);
        setHasPersistedSession(true);

        // Store PIN data for Instagram-style multi-profile support
        const profileId = result.user.profileId || result.user.userId;
        if (profileId) {
          try {
            await storeProfilePinData(profileId, {
              identifier,
              username: result.user.username,
              businessName: result.user.businessName,
              displayName: result.user.businessName
                || `${result.user.firstName || ''} ${result.user.lastName || ''}`.trim()
                || identifier,
              profileType: result.user.profileType === 'business' ? 'business' : 'personal',
              avatarUrl: result.user.avatarUrl,
            });
            await setLastActiveProfile(profileId);
            logger.debug('[AuthContext] PIN data stored for profile (loginWithPin)');
          } catch (pinError) {
            logger.warn('[AuthContext] Failed to store PIN data (non-critical)', pinError instanceof Error ? pinError.message : String(pinError));
          }
        }

        // Legacy: Keep for backward compatibility
        await storeLastUserForPin(identifier);
      }

      return { success: result.success, message: result.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithBiometric = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    const result = await loginService.loginWithBiometric();

    if (result.success && result.user) {
      updateUserFromSession(result.user);
      setIsAuthenticated(true);
      setAuthLevel(AuthLevel.AUTHENTICATED);
      setIsGuestMode(false);
      setHasPersistedSession(true);
    }

    return { success: result.success, message: result.message };
  }, []);

  const setupBiometricLogin = useCallback(async (_identifier: string, _password: string): Promise<void> => {
    // New secure biometric flow: uses device token from backend, not password storage
    // Parameters kept for backward compatibility but are not used
    await loginService.enableBiometricLogin();
  }, []);

  const getBiometricCredentials = useCallback(async () => {
    return loginService.getBiometricCredentials();
  }, []);

  // ============================================
  // LOGOUT (uses SessionManager)
  // ============================================

  const logout = useCallback(async (): Promise<void> => {
    logger.debug("Starting instant logout", "auth");

    // STEP 1: Reset auth state IMMEDIATELY (Instagram/WhatsApp-style instant logout)
    // Navigator shows sign-in screen instantly - no loading screen
    setUser(null);
    setIsAuthenticated(false);
    setAuthLevel(AuthLevel.GUEST);
    setIsWalletUnlocked(false);
    setLastWalletUnlock(null);
    setHasPersistedSession(false);
    setJustLoggedOut(true);
    setNeedsLogin(false);
    setIsGuestMode(true);

    authStateMachine.transition(AuthEvent.LOGOUT, {
      event: AuthEvent.LOGOUT,
      timestamp: Date.now()
    });

    logger.debug("Auth state reset - user on sign-in screen", "auth");

    // STEP 2: Background cleanup (invisible to user - they're already on sign-in)
    try {
      await authHook.logout(); // Backend logout
    } catch (error: any) {
      logger.warn('[AuthContext] Backend logout failed (non-critical):', error.message);
    }

    try {
      await sessionManager.clearSession();
      await loginService.clearBiometricCredentials();
      await clearAllCachedData();
      await walletSecurity.lock();
      logger.debug("Background cleanup complete", "auth");
    } catch (error) {
      logger.error("Logout cleanup error", error, "auth");
    }
  }, [authHook]);

  const forceLogout = useCallback(async (): Promise<void> => {
    logger.warn('[AuthContext] Force logout triggered');
    await logout();
  }, [logout]);

  // ============================================
  // ACCOUNT SWITCHING (delegates to AccountSwitcher)
  // ============================================

  const loadAvailableAccounts = useCallback(async () => {
    const accounts = await accountSwitcher.getAvailableAccounts();
    setAvailableAccounts(accounts);
  }, []);

  const switchAccount = useCallback(async (userId: string): Promise<boolean> => {
    const result = await accountSwitcher.switchAccount(userId, user?.id);

    if (result.success && result.account) {
      // Update state from switched account
      // Use stored firstName/lastName if available, fallback to displayName parsing for backward compatibility
      setUser({
        id: result.account.userId,
        email: result.account.email,
        profileId: result.account.profileId,
        entityId: result.account.entityId,
        displayName: result.account.displayName,
        firstName: result.account.firstName || result.account.displayName.split(' ')[0],
        lastName: result.account.lastName || result.account.displayName.split(' ').slice(1).join(' '),
      });
      setIsAuthenticated(true);
      setAuthLevel(AuthLevel.AUTHENTICATED);

      await loadAvailableAccounts();
      return true;
    }

    return false;
  }, [user, loadAvailableAccounts]);

  const saveCurrentAccountToManager = useCallback(async () => {
    if (!user || !isAuthenticated) return;

    const accessToken = await getAccessToken();
    const refreshToken = await tokenManager.getRefreshToken();

    if (!accessToken) return;

    const sessionData: SessionData = {
      userId: user.id || '',
      profileId: user.profileId || '',
      entityId: user.entityId,
      email: user.email || '',
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      profileType: user.businessName ? 'business' : 'personal',
      businessName: user.businessName,
      sessionId: `session_${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastValidated: new Date().toISOString(),
    };

    await accountSwitcher.saveCurrentAccount(sessionData, accessToken, refreshToken || accessToken);
    await loadAvailableAccounts();
  }, [user, isAuthenticated, loadAvailableAccounts]);

  const removeAccount = useCallback(async (userId: string): Promise<boolean> => {
    const result = await accountSwitcher.removeAccount(userId, user?.id);
    if (result) {
      await loadAvailableAccounts();
    }
    return result;
  }, [user, loadAvailableAccounts]);

  // ============================================
  // WALLET SECURITY (delegates to WalletSecurity)
  // ============================================

  const requestWalletAccess = useCallback(async (): Promise<boolean> => {
    const result = await walletSecurity.requestAccess(authLevel);

    if (result.success) {
      setIsWalletUnlocked(true);
      setLastWalletUnlock(Date.now());
      setAuthLevel(result.authLevel);
      return true;
    }

    return false;
  }, [authLevel]);

  const lockWallet = useCallback(async () => {
    await walletSecurity.lock();
    setIsWalletUnlocked(false);
    setLastWalletUnlock(null);
    setAuthLevel(isAuthenticated ? AuthLevel.AUTHENTICATED : AuthLevel.GUEST);
  }, [isAuthenticated]);

  // ============================================
  // HELPER METHODS
  // ============================================

  const updateUserFromSession = (session: SessionData) => {
    setUser({
      id: session.userId,
      profileId: session.profileId,
      entityId: session.entityId,
      displayName: session.profileType === 'business'
        ? session.businessName
        : `${session.firstName || ''} ${session.lastName || ''}`.trim(),
      firstName: session.firstName,
      lastName: session.lastName,
      username: session.username,
      avatarUrl: session.avatarUrl,
      email: session.email,
      profileType: session.profileType,
      businessName: session.businessName,
    } as User);
  };

  const enableGuestMode = useCallback(async () => {
    apiClient.defaults.headers.common['Authorization'] = 'none';
    apiClient.setProfileId(null);
    setIsGuestMode(true);
    setAuthLevel(AuthLevel.GUEST);
    setIsAuthenticated(false);
    setUser(null);
    setIsLoading(false);
    setNeedsLogin(false);
  }, []);

  const upgradeToAuthenticated = useCallback(async (): Promise<boolean> => {
    if (isAuthenticated && user) return true;

    const restored = await checkSession();
    if (restored) return true;

    setIsGuestMode(false);
    setNeedsLogin(true);
    setIsLoading(false);
    return false;
  }, [isAuthenticated, user, checkSession]);

  const requireAuthentication = useCallback(async (): Promise<boolean> => {
    return upgradeToAuthenticated();
  }, [upgradeToAuthenticated]);

  const completeProfileSwitch = useCallback(async (newProfileId: string): Promise<boolean> => {
    try {
      const profile = await authHook.getCurrentUserProfile({ skipCache: true });
      if (!profile) return false;

      const profileId = profile.id || profile.profile_id || profile.user_id;
      if (profileId !== newProfileId) return false;

      setUser({
        id: profile.user_id || profile.id,
        profileId,
        entityId: profile.entity_id,
        displayName: profile.type === 'business'
          ? profile.business_name
          : `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        firstName: profile.type === 'business' ? profile.business_name : profile.first_name,
        lastName: profile.type === 'business' ? null : profile.last_name,
        username: profile.username,
        avatarUrl: profile.avatar_url || profile.logo_url,
        email: profile.type === 'business' ? profile.business_email : profile.email,
        profileType: profile.type,
        businessName: profile.business_name,
      } as User);

      // Clear Rosca cache on profile switch to ensure fresh data for new entity
      roscaRepository.clearPoolsCacheTimestamp().catch((err) => {
        logger.debug('[AuthContext] Failed to clear Rosca pools cache:', err);
      });

      return true;
    } catch (error) {
      logger.error('[AuthContext] Profile switch failed:', error);
      return false;
    }
  }, [authHook]);

  // Legacy credential functions
  const loadCredentials = useCallback(async () => {
    if (!persistentAuthEnabled) return null;
    try {
      const email = await SecureStore.getItemAsync(SECURE_STORE_EMAIL_KEY);
      const password = await SecureStore.getItemAsync(SECURE_STORE_PASSWORD_KEY);
      if (email && password) {
        setRememberMe(true);
        return { email, password };
      }
      setRememberMe(false);
      return null;
    } catch {
      setRememberMe(false);
      return null;
    }
  }, [persistentAuthEnabled]);

  const handleSignUp = useCallback(async (userData: UserData) => {
    return authHook.createAuthUser(userData);
  }, [authHook]);

  const checkEmailConfirmation = useCallback(async (email: string): Promise<boolean> => {
    setShowConfirmationModal(true);
    return false;
  }, []);

  const setPhoneVerified = useCallback((data: PhoneVerification) => {
    setPhoneVerification(data);
  }, []);

  const getLastUserForPin = useCallback(async () => getStoredPinUser(), []);
  const clearPinUser = useCallback(async () => clearLastUserForPin(), []);
  const hasPinUserStored = useCallback(async () => checkPinUserStored(), []);

  const emergencyCleanupForDev = useCallback(async () => {
    if (__DEV__) {
      await sessionManager.emergencyCleanup();
      await clearAllCachedData();
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    if (!hasRunInitialCheckSession.current) {
      hasRunInitialCheckSession.current = true;
      checkSession();
      loadAvailableAccounts();
    }
  }, [checkSession, loadAvailableAccounts]);

  // Restore wallet state on mount
  useEffect(() => {
    if (authLevel >= AuthLevel.AUTHENTICATED) {
      walletSecurity.restoreState().then(restored => {
        if (restored) {
          const state = walletSecurity.getState();
          setIsWalletUnlocked(state.isUnlocked);
          setLastWalletUnlock(state.lastUnlock);
          setAuthLevel(state.authLevel);
        }
      });
    }
  }, [authLevel]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: AuthContextType = {
    // Core state
    authLevel,
    isAuthenticated,
    isGuestMode,
    isLoading,
    user,
    isInitialized,
    hasPersistedSession,

    // Computed convenience properties (derived from user - single source of truth)
    currentProfileId: user?.profileId ?? null,

    // Wallet security
    isWalletUnlocked,
    lastWalletUnlock,

    // Login methods
    loginWithPin,
    unifiedLogin,
    logout,
    loginWithBiometric,
    setupBiometricLogin,

    // Multi-account
    availableAccounts,
    switchAccount,
    saveCurrentAccountToManager,
    loadAvailableAccounts,
    removeAccount,

    // Profile switch state
    isProfileSwitching,
    setIsProfileSwitching,

    // Progressive auth
    upgradeToAuthenticated,
    requestWalletAccess,
    lockWallet,

    // Session
    checkSession,
    completeProfileSwitch,
    getAccessToken,

    // Dev helpers
    emergencyCleanupForDev,

    // Legacy support
    showConfirmationModal,
    setShowConfirmationModal,
    handleSignUp,
    checkEmailConfirmation,
    setIsAuthenticated,
    setUser: (newUser: User | null) => {
      logger.debug("setUser called", "auth", {
        entityId: newUser?.entityId,
        profileId: newUser?.profileId,
        firstName: newUser?.firstName,
        lastName: newUser?.lastName,
        businessName: newUser?.businessName
      });
      setUser(newUser);
    },
    needsLogin,
    setNeedsLogin,
    forceLogout,
    rememberMe,
    setRememberMe,
    loadCredentials,
    justLoggedOut,
    setJustLoggedOut,
    setPhoneVerified,
    phoneVerification,
    getLastUserForPin,
    clearPinUser,
    hasPinUserStored,
    getBiometricCredentials,
    enableGuestMode,
    requireAuthentication,
    persistentAuthEnabled,
    setPersistentAuthEnabled: (enabled: boolean) => {
      setPersistentAuthEnabled(enabled);
      authStorage.set(PERSISTENT_AUTH_KEY, enabled);
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
