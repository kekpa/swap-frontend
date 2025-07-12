// Updated: Integrated expo-secure-store for credential management and disabled mock mode - 2024-07-31
// Updated: Added guest mode and persistent authentication for tiered auth system - 2025-07-02
// Updated: Added tiered authentication with persistent sessions and biometric gates - 2025-07-02
// Updated: WhatsApp-style progressive authentication with quick session restoration - 2025-07-02
// Updated: Fixed session restoration security issue - always validate with backend, never trust cached data alone - 2025-07-07
// Copyright 2025 frantzopf
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User, AuthContextType, UserData, PhoneVerification, AuthLevel } from '../../../types/auth.types';
import { useAuth } from '../../../hooks/useAuth';
import { getAccessToken, clearTokens, saveAccessToken, saveRefreshToken } from '../../../utils/tokenStorage';
import apiClient, { authEvents } from '../../../_api/apiClient';
import { AUTH_EVENTS } from '../../../types/api.types';
import { AUTH_PATHS } from '../../../_api/apiPaths';
import logger from '../../../utils/logger';
import { authManager, authEvents as authManagerEvents, AUTH_EVENT_TYPES } from '../../../utils/authManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllCachedData } from '../../../localdb';
import { storeLastUserForPin, getLastUserForPin as getStoredPinUser, clearLastUserForPin, hasPinUserStored as checkPinUserStored } from '../../../utils/pinUserStorage';
import * as LocalAuthentication from 'expo-local-authentication';
import { jwtDecode } from 'jwt-decode';
import { eventEmitter } from '../../../utils/eventEmitter';

const SECURE_STORE_EMAIL_KEY = 'userEmail';
const SECURE_STORE_PASSWORD_KEY = 'userPassword';
const SECURE_STORE_BIOMETRIC_IDENTIFIER_KEY = 'biometricIdentifier';
const SECURE_STORE_BIOMETRIC_PASSWORD_KEY = 'biometricPassword';
const PERSISTENT_AUTH_KEY = 'persistentAuthEnabled';
const GUEST_MODE_KEY = 'guestModeEnabled';
const LAST_WALLET_UNLOCK_KEY = 'lastWalletUnlock';

// --- DEVELOPMENT BYPASS ---
// DISABLED to prevent auth loops
const DEV_MODE_AUTO_LOGIN = false; // Disabled to prevent looping
const DEV_USER_TOKEN = ""; // Removed token
const DEV_USER_REFRESH_TOKEN = ""; // Removed token
const DEV_USER_ID = "20da8f2e-4a76-4e16-9a30-01ad737eb4de"; // UUID from auth.users
const DEV_USER_PROFILE_ID = "20da8f2e-4a76-4e16-9a30-01ad737eb4de"; // Your profile ID (might be same as user ID)
const DEV_USER_EMAIL = "fof+htjght@brides.ht";
// --- END DEVELOPMENT BYPASS ---




// Use AuthLevel and AuthContextType from types file

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage Keys
const STORAGE_KEYS = {
  SESSION_TOKEN: 'secure_session_token',
  REFRESH_TOKEN: 'secure_refresh_token',
  USER_DATA: 'secure_user_data',
  REMEMBER_ME: 'remember_me_preference',
  BIOMETRIC_ENABLED: 'biometric_auth_enabled',
  LAST_WALLET_UNLOCK: 'last_wallet_unlock',
} as const;

// Session timeout for wallet operations (5 minutes)
const WALLET_SESSION_TIMEOUT = 5 * 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Core authentication state
  const [authLevel, setAuthLevel] = useState<AuthLevel>(AuthLevel.GUEST);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Session management
  const [hasPersistedSession, setHasPersistedSession] = useState<boolean>(false);
  
  // Wallet security
  const [isWalletUnlocked, setIsWalletUnlocked] = useState<boolean>(false);
  const [lastWalletUnlock, setLastWalletUnlock] = useState<number | null>(null);
  
  // Legacy states (keeping for backward compatibility)
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
  const [needsLogin, setNeedsLogin] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [justLoggedOut, setJustLoggedOut] = useState<boolean>(false);
  const [persistentAuthEnabled, setPersistentAuthEnabled] = useState<boolean>(true);
  const [phoneVerification, setPhoneVerification] = useState<PhoneVerification | null>(null);

  const hasRunInitialCheckSession = useRef(false);
  const authHook = useAuth();

  // Clear corrupted session data
  const clearCorruptedSession = useCallback(async () => {
    console.log('🧹 [SessionCleanup] Clearing corrupted session data');
    try {
      await clearTokens();
      apiClient.defaults.headers.common['Authorization'] = 'none';
      apiClient.setProfileId(null);
              
      setUser(null);
      setIsAuthenticated(false);
      setAuthLevel(AuthLevel.GUEST);
      setIsGuestMode(true);
      setHasPersistedSession(false);
    } catch (error) {
      console.error('❌ [SessionCleanup] Error clearing session:', error);
    }
  }, []);



  // Token validation and session restoration
  const validateTokenAndRestoreSession = useCallback(async (token: string): Promise<boolean> => {
      try {
      // Ensure API client has the token for validation
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
          const profile = await authHook.getCurrentUserProfile();
          if (profile) {
        // CRITICAL: Get profile ID from multiple sources as fallback
        const profileId = profile.id || profile.profile_id || profile.user_id;
        
        // Validate that we have essential profile data
        if (!profileId) {
          console.error('❌ [TokenValidation] No valid profile ID found');
          throw new Error('Invalid profile data: missing profile ID');
        }
        
        const displayName = profile.type === 'business' ? profile.business_name : profile.first_name;
        const email = profile.type === 'business' ? profile.business_email : profile.email;
        
        // Validate essential user data
        if (!displayName || !email) {
          console.error('❌ [TokenValidation] Incomplete profile data:', {
            displayName: !!displayName,
            email: !!email,
            profileType: profile.type
          });
          throw new Error('Invalid profile data: missing essential fields');
        }
        
        const restoredUser = {
              id: profile.user_id || profile.id, 
          profileId: profileId,    
              entityId: profile.entity_id,
          firstName: profile.type === 'business' ? profile.business_name : profile.first_name,
          lastName: profile.type === 'business' ? null : profile.last_name,
          username: profile.username,
          avatarUrl: profile.avatar_url || profile.logo_url,
          email: email,
                profileType: profile.type,
                businessName: profile.business_name,
            };
            
        setUser(restoredUser);
        setIsAuthenticated(true);
        setIsGuestMode(false);
        setAuthLevel(AuthLevel.AUTHENTICATED);
        setHasPersistedSession(true);
        apiClient.setProfileId(profileId); 
        
        console.log('✅ [TokenValidation] Session restored successfully for:', displayName);
                  return true;
      } else {
        console.error('❌ [TokenValidation] No profile data received from backend');
        throw new Error('No profile data available');
                }
    } catch (error) {
      console.warn('⚠️ [TokenValidation] Failed, clearing session:', error);
      // Clear invalid tokens and reset API client
      await clearTokens();
      apiClient.defaults.headers.common['Authorization'] = 'none';
      apiClient.setProfileId(null);
              }
    
    return false;
  }, [authHook]);

  // Enable guest mode for public features
  const enableGuestMode = useCallback(async () => {
    console.log('👤 [GuestMode] Enabling guest mode for public features');
    
    // Clear any stale authentication state
    apiClient.defaults.headers.common['Authorization'] = 'none';
    apiClient.setProfileId(null);
    
    setIsGuestMode(true);
    setAuthLevel(AuthLevel.GUEST);
            setIsAuthenticated(false);
            setUser(null);
    setIsLoading(false);
    setNeedsLogin(false);
  }, []);

  // Quick session restoration - like WhatsApp
  const restoreSessionQuickly = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🚀 [QuickRestore] Attempting quick session restoration...');
      
      // CRITICAL: Always validate with backend first, don't trust cached data alone
      const token = await getAccessToken();
      if (!token) {
        console.log('🔒 [QuickRestore] No access token found, enabling guest mode');
        await enableGuestMode();
        return false;
      }

      // Validate token with backend immediately (don't use cache without validation)
      console.log('🔑 [QuickRestore] Validating token with backend...');
      const isValidSession = await validateTokenAndRestoreSession(token);
      
      if (isValidSession) {
        console.log('✅ [QuickRestore] Session restored and validated with backend');
        setHasPersistedSession(true);
        return true;
      } else {
        console.warn('⚠️ [QuickRestore] Backend validation failed, clearing all session data');
        await clearCorruptedSession();
        return false;
      }
      
    } catch (error) {
      console.error('❌ [QuickRestore] Error:', error);
      await clearCorruptedSession();
      return false;
    }
  }, [validateTokenAndRestoreSession, enableGuestMode, clearCorruptedSession]);

  // Upgrade to authenticated level
  const upgradeToAuthenticated = useCallback(async (): Promise<boolean> => {
    if (isAuthenticated && user) {
      return true; // Already authenticated
    }
    
    console.log('⬆️ [AuthUpgrade] Upgrading from guest to authenticated');
    
    // Try to restore session first
    const sessionRestored = await restoreSessionQuickly();
    if (sessionRestored) {
                return true;
              }
    
    // Set state to show login requirement
    setIsGuestMode(false);
        setNeedsLogin(true);
        setIsLoading(false);
    
    return false;
  }, [isAuthenticated, user, restoreSessionQuickly]);

  // Request wallet access with biometric/PIN verification
  const requestWalletAccess = useCallback(async (): Promise<boolean> => {
    // First ensure user is authenticated
    if (authLevel < AuthLevel.AUTHENTICATED) {
      const upgraded = await upgradeToAuthenticated();
      if (!upgraded) return false;
    }
    
    // Check if wallet is already unlocked and not expired
    const now = Date.now();
    if (isWalletUnlocked && lastWalletUnlock && (now - lastWalletUnlock < WALLET_SESSION_TIMEOUT)) {
      return true; // Still valid
    }
    
    try {
      console.log('🔐 [WalletAccess] Requesting biometric authentication');
      
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        console.warn('⚠️ [WalletAccess] Biometric not available');
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Access your wallet',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        const unlockTime = Date.now();
        setIsWalletUnlocked(true);
        setLastWalletUnlock(unlockTime);
        setAuthLevel(AuthLevel.WALLET_VERIFIED);
        
        // Cache wallet unlock time
        await SecureStore.setItemAsync(LAST_WALLET_UNLOCK_KEY, unlockTime.toString());
        
        console.log('✅ [WalletAccess] Wallet unlocked successfully');
        return true;
      }
    } catch (error) {
      console.error('❌ [WalletAccess] Authentication error:', error);
      }
    
    return false;
  }, [authLevel, isWalletUnlocked, lastWalletUnlock, upgradeToAuthenticated]);

  // Lock wallet (security measure)
  const lockWallet = useCallback(() => {
    console.log('🔒 [WalletSecurity] Locking wallet');
    setIsWalletUnlocked(false);
    setLastWalletUnlock(null);
    setAuthLevel(isAuthenticated ? AuthLevel.AUTHENTICATED : AuthLevel.GUEST);
    SecureStore.deleteItemAsync(LAST_WALLET_UNLOCK_KEY).catch(() => {});
  }, [isAuthenticated]);

  // Add missing token functions
  const getRefreshToken = useCallback(async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('❌ [AuthContext] Error getting refresh token:', error);
      return null;
    }
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        console.log('DEBUG [refreshAccessToken] No refresh token found');
        return null;
      }

      console.log('🔄 [AuthContext] Attempting token refresh...');
      const response = await apiClient.post('/auth/refresh', {
        refresh_token: refreshToken
      });

      if (response.data?.access_token) {
        const newAccessToken = response.data.access_token;
        await saveAccessToken(newAccessToken);
        
        // Update authorization header
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        
        console.log('✅ [AuthContext] Token refreshed successfully');
        return newAccessToken;
      } else {
        console.error('❌ [AuthContext] No access token in refresh response');
        return null;
      }
    } catch (error) {
      console.error('❌ [AuthContext] Token refresh failed:', error);
      return null;
    }
  }, [getRefreshToken]);

  // Enhanced token validation and refresh logic
  const ensureValidToken = useCallback(async (): Promise<string | null> => {
    try {
      const currentToken = await getAccessToken();
      
      if (!currentToken) {
        console.log('🔒 [AuthContext] No access token found');
        return null;
      }
      
      // Check if token is expired or about to expire
      try {
        const decoded = jwtDecode(currentToken) as any;
        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decoded.exp - currentTime;
        
        // If token expires in less than 5 minutes, refresh it
        if (timeUntilExpiry < 300) {
          console.log('🔒 [AuthContext] Token expires soon, refreshing...');
          const newToken = await refreshAccessToken();
          if (newToken) {
            console.log('✅ [AuthContext] Token refreshed successfully');
            return newToken;
          } else {
            console.error('❌ [AuthContext] Token refresh failed');
            return null;
          }
        }
        
        return currentToken;
      } catch (decodeError) {
        console.error('❌ [AuthContext] Invalid token format:', decodeError);
        return null;
        }
        
    } catch (error) {
      console.error('❌ [AuthContext] Error ensuring valid token:', error);
      return null;
    }
  }, []);



  // Enhanced session restoration with better error handling - renamed to checkSession
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔒 [AuthContext] Starting session restoration...');
      setIsLoading(true);
      
      const token = await getAccessToken();
      const refreshToken = await getRefreshToken();
      
      console.log('🔒 [AuthContext] Session restoration tokens:', {
        hasAccessToken: !!token,
        hasRefreshToken: !!refreshToken
      });
      
      if (!token) {
        console.log('🔒 [AuthContext] No access token found, cannot restore session');
        setIsAuthenticated(false);
        setIsGuestMode(false);
        setUser(null);
        setIsLoading(false);
        return false;
          }
          
      // CRITICAL: Validate token before using it
      try {
        const decoded = jwtDecode(token) as any;
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (decoded.exp && decoded.exp < currentTime) {
          console.log('🔒 [AuthContext] Access token expired, attempting refresh...');
          
          if (refreshToken) {
            const newToken = await refreshAccessToken();
            if (!newToken) {
              console.log('🔒 [AuthContext] Token refresh failed, clearing session');
              await clearTokens();
              setIsAuthenticated(false);
              setIsGuestMode(false);
              setUser(null);
              setIsLoading(false);
              return false;
            }
            console.log('✅ [AuthContext] Token refreshed during session restoration');
        } else {
            console.log('🔒 [AuthContext] No refresh token available, clearing session');
            await clearTokens();
            setIsAuthenticated(false);
            setIsGuestMode(false);
            setUser(null);
          setIsLoading(false);
            return false;
          }
        } else {
          console.log('✅ [AuthContext] Access token is valid');
        }
      } catch (decodeError) {
        console.error('❌ [AuthContext] Invalid token format, clearing session:', decodeError);
        await clearTokens();
        setIsAuthenticated(false);
        setIsGuestMode(false);
        setUser(null);
      setIsLoading(false);
        return false;
      }
      
      // Set authorization header for API calls
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Try to fetch user profile to validate session
      console.log('🔒 [AuthContext] Validating session with profile fetch...');
      
      // Use getCurrentUserProfile() for proper profile mapping (same as login functions)
      const profile = await authHook.getCurrentUserProfile();
      
      if (profile) {
        // CRITICAL: Get profile ID from multiple sources as fallback
        const profileId = profile.id || profile.profile_id || profile.user_id;
        
        // Validate that we have essential profile data
        if (!profileId) {
          console.error('❌ [AuthContext] No valid profile ID found');
          throw new Error('Invalid profile data: missing profile ID');
        }
      
        // Set profile ID for API calls
        apiClient.setProfileId(profileId);
        console.log('✅ [AuthContext] Session restored with profile ID:', profileId);
        
        // Use the same mapping logic as login functions
        const mappedUser = {
          id: profile.user_id || profile.id,
          profileId: profileId,
          entityId: profile.entity_id,
          firstName: profile.type === 'business' ? profile.business_name : profile.first_name,
          lastName: profile.type === 'business' ? null : profile.last_name,
          username: profile.username,
          avatarUrl: profile.avatar_url || profile.logo_url,
          email: profile.type === 'business' ? profile.business_email : profile.email,
          profileType: profile.type,
          businessName: profile.business_name,
        };
        
        setUser(mappedUser);
        setIsAuthenticated(true);
        setAuthLevel(AuthLevel.AUTHENTICATED);
        setIsGuestMode(false);
        
        console.log('✅ [AuthContext] Session restored successfully with profile data:', {
          userId: mappedUser.id,
          profileId: mappedUser.profileId,
          entityId: mappedUser.entityId,
          firstName: mappedUser.firstName,
          lastName: mappedUser.lastName,
          username: mappedUser.username
        });
        return true;
          } else {
        console.log('🔒 [AuthContext] No profile data received, clearing session');
        await clearTokens();
        setIsAuthenticated(false);
        setIsGuestMode(false);
        setUser(null);
        return false;
        }
    } catch (error: any) {
      console.error('❌ [AuthContext] Session restoration failed:', error);
      
      // If it's a 401, the token is invalid - clear everything
      if (error.response?.status === 401) {
        console.log('🔒 [AuthContext] Received 401, clearing invalid session');
        await clearTokens();
        delete apiClient.defaults.headers.common['Authorization'];
      }
      
      setIsAuthenticated(false);
      setIsGuestMode(false);
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
          }
    return false;
  }, []);

  // Initialize authentication on app start
  useEffect(() => {
    if (!hasRunInitialCheckSession.current) {
      hasRunInitialCheckSession.current = true;
      console.log('🚀 [AuthInit] Starting traditional authentication check');
      
      // Traditional session restoration - clean and predictable
      checkSession();
        }
  }, [checkSession]);

  // Restore wallet unlock state on app resume
  useEffect(() => {
    const restoreWalletState = async () => {
      if (authLevel >= AuthLevel.AUTHENTICATED) {
        try {
          const lastUnlockStr = await SecureStore.getItemAsync(LAST_WALLET_UNLOCK_KEY);
          if (lastUnlockStr) {
            const lastUnlock = parseInt(lastUnlockStr);
            const now = Date.now();
            
            if (now - lastUnlock < WALLET_SESSION_TIMEOUT) {
              setIsWalletUnlocked(true);
              setLastWalletUnlock(lastUnlock);
              setAuthLevel(AuthLevel.WALLET_VERIFIED);
        }
      }
        } catch (error) {
          console.warn('⚠️ [WalletRestore] Error restoring wallet state:', error);
        }
      }
    };
    
    restoreWalletState();
  }, [authLevel]);

  // Auto-lock wallet on app background (security)
  useEffect(() => {
    let walletLockTimer: NodeJS.Timeout;
    
    if (isWalletUnlocked && lastWalletUnlock) {
      const timeRemaining = WALLET_SESSION_TIMEOUT - (Date.now() - lastWalletUnlock);
      
      if (timeRemaining > 0) {
        walletLockTimer = setTimeout(lockWallet, timeRemaining);
        } else {
        lockWallet();
      }
    }
    
    return () => {
      if (walletLockTimer) clearTimeout(walletLockTimer);
      };
  }, [isWalletUnlocked, lastWalletUnlock, lockWallet]);

  // Enhanced logout with proper cleanup
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
     
    try {
      // Backend logout
      await authHook.logout();
    } catch (error: any) {
      console.warn('⚠️ [Logout] Backend logout failed:', error.message);
    }
    
    try {
      // Enhanced local cleanup
      await authManager.logout();
      await clearAllCachedData();
      await SecureStore.deleteItemAsync(LAST_WALLET_UNLOCK_KEY);
      
      // Reset all state
      setUser(null);
      setIsAuthenticated(false);
      setAuthLevel(AuthLevel.GUEST);
      setIsWalletUnlocked(false);
      setLastWalletUnlock(null);
      setHasPersistedSession(false);
      apiClient.setProfileId(null);
      setJustLoggedOut(true);
      setNeedsLogin(false);

      // Return to guest mode
      await enableGuestMode();
      
      console.log('✅ [Logout] Completed successfully');
    } catch (error) {
      console.error('❌ [Logout] Error during cleanup:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authHook, enableGuestMode]);

  // Helper functions for credentials
  const saveCredentials = async (email: string, password: string): Promise<void> => {
    try {
      if (persistentAuthEnabled && rememberMe) {
        await SecureStore.setItemAsync(SECURE_STORE_EMAIL_KEY, email);
        await SecureStore.setItemAsync(SECURE_STORE_PASSWORD_KEY, password);
      }
    } catch (error) {
      console.warn('⚠️ [Credentials] Failed to save:', error);
    }
  };
  
  const loadCredentials = async (): Promise<{ email?: string; password?: string } | null> => {
    try {
      if (!persistentAuthEnabled) return null;
      
      const email = await SecureStore.getItemAsync(SECURE_STORE_EMAIL_KEY);
      const password = await SecureStore.getItemAsync(SECURE_STORE_PASSWORD_KEY);
      
      if (email && password) {
        setRememberMe(true);
        return { email, password };
      }
      
      setRememberMe(false);
      return null;
    } catch (error) {
      console.warn('⚠️ [Credentials] Failed to load:', error);
      setRememberMe(false);
      return null;
    }
  };
      
  // PIN and biometric functions (legacy support)
  const getLastUserForPin = async (): Promise<string | null> => {
    return await getStoredPinUser();
  };

  const clearPinUser = async (): Promise<void> => {
    await clearLastUserForPin();
  };

  const hasPinUserStored = async (): Promise<boolean> => {
    return await checkPinUserStored();
  };

  const setupBiometricLogin = async (identifier: string, password: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(SECURE_STORE_BIOMETRIC_IDENTIFIER_KEY, identifier);
      await SecureStore.setItemAsync(SECURE_STORE_BIOMETRIC_PASSWORD_KEY, password);
    } catch (error) {
      throw new Error('Failed to set up biometric login');
    }
  };

  const getBiometricCredentials = async (): Promise<{ identifier: string; password: string } | null> => {
    try {
      const identifier = await SecureStore.getItemAsync(SECURE_STORE_BIOMETRIC_IDENTIFIER_KEY);
      const password = await SecureStore.getItemAsync(SECURE_STORE_BIOMETRIC_PASSWORD_KEY);
      
      if (identifier && password) {
        return { identifier, password };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  const loginWithBiometric = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const credentials = await getBiometricCredentials();
      if (!credentials) {
        return { 
          success: false, 
          message: 'No biometric credentials found. Please set up biometric login first.' 
        };
      }
      
      const loginResult = await login(credentials.identifier, credentials.password, true);
      return loginResult;
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || 'An error occurred during biometric login' 
      };
    }
  };

  // Legacy functions (keeping for backward compatibility)
  const loginBusiness = async (identifier: string, password: string, skipStore = false): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      console.log('🔑 [BusinessLogin] Attempting business login for:', identifier);
      const response = await apiClient.post(AUTH_PATHS.BUSINESS_LOGIN, { identifier, password });
      
      console.log('🔑 [BusinessLogin] Business login response status:', response.status);
      console.log('🔑 [BusinessLogin] Business login response data:', response.data);
      
      // Parse the response data - backend returns nested JSON string
      let authData;
      if (response.data?.data) {
        // If data is a string, parse it as JSON
        if (typeof response.data.data === 'string') {
          authData = JSON.parse(response.data.data);
        } else {
          authData = response.data.data;
        }
      } else {
        // Fallback: check if tokens are directly in response.data
        authData = response.data;
      }
      
      console.log('🔑 [BusinessLogin] Parsed auth data:', authData);
      
      if (authData?.access_token) {
        console.log('✅ [BusinessLogin] Business login successful, processing tokens');
        
        // CRITICAL: Clear any existing invalid tokens first
        await clearTokens();
        
        await saveAccessToken(authData.access_token);
        // Handle refresh token if available
        if (authData.refresh_token) {
          await saveRefreshToken(authData.refresh_token);
          console.log('✅ [BusinessLogin] Refresh token saved successfully');
        } else {
          console.warn('⚠️ [BusinessLogin] No refresh token in response');
        }
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${authData.access_token}`;
        
        if (authData.profile_id) {
          apiClient.setProfileId(authData.profile_id);
          console.log('✅ [BusinessLogin] Profile ID set:', authData.profile_id);
        }
        
        if (rememberMe && !skipStore) {
          await saveCredentials(identifier, password);
        }
        
        setIsAuthenticated(true);
        setAuthLevel(AuthLevel.AUTHENTICATED);
        setIsGuestMode(false);
        setHasPersistedSession(true);
        
        // CRITICAL: Fetch user profile data after successful login
        try {
          const profile = await authHook.getCurrentUserProfile();
          if (profile) {
            // CRITICAL: Get profile ID from multiple sources as fallback
            const profileId = profile.id || profile.profile_id || profile.user_id;
            
            const mappedUser = {
              id: profile.user_id || profile.id,
              profileId: profileId,
              entityId: profile.entity_id,
              firstName: profile.type === 'business' ? profile.business_name : profile.first_name,
              lastName: profile.type === 'business' ? null : profile.last_name,
              username: profile.username,
              avatarUrl: profile.avatar_url || profile.logo_url,
              email: profile.type === 'business' ? profile.business_email : profile.email,
              profileType: profile.type,
              businessName: profile.business_name,
            };
            setUser(mappedUser);
            console.log('✅ [BusinessLogin] User profile loaded:', mappedUser);
          }
        } catch (profileError) {
          console.warn('⚠️ [BusinessLogin] Failed to load user profile:', profileError);
          // Continue with login even if profile fails
        }
        
        console.log('✅ [BusinessLogin] Business login completed successfully');
        setIsLoading(false);
        return { success: true };
      } else {
        console.error('❌ [BusinessLogin] No access token in response:', authData);
        setIsLoading(false);
        return { success: false, message: "Business login failed - no access token received" };
      }
    } catch (error: any) {
      console.error('❌ [BusinessLogin] Business login error:', error);
      console.error('❌ [BusinessLogin] Error response:', error.response?.data);
      
      setIsLoading(false);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        return { 
          success: false, 
          message: error.response?.data?.message || "Invalid credentials. Please check your email/phone and password." 
        };
      } else if (error.response?.status === 400) {
        return { 
          success: false, 
          message: error.response?.data?.message || "Invalid request. Please check your credentials." 
        };
      } else {
        return { 
          success: false, 
          message: error.response?.data?.message || error.message || "Failed to sign in to business account." 
        };
      }
    }
  };

  const loginWithPin = async (identifier: string, pin: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      console.log('🔐 [LoginWithPin] Attempting PIN login for:', identifier);
      const response = await apiClient.post(AUTH_PATHS.PIN_LOGIN, { identifier, pin });
      
      console.log('�� [LoginWithPin] PIN login response status:', response.status);
      console.log('🔐 [LoginWithPin] PIN login response data:', response.data);
      
      // PIN login returns data directly in response.data
      const authData = response.data;
      
      if (authData?.access_token) {
        console.log('✅ [LoginWithPin] PIN login successful, processing tokens');
        
        // CRITICAL: Clear any existing invalid tokens first
        await clearTokens();
        
        await saveAccessToken(authData.access_token);
        // Handle refresh token if available
        if (authData.refresh_token) {
          await saveRefreshToken(authData.refresh_token);
          console.log('✅ [LoginWithPin] Refresh token saved successfully');
        } else {
          console.warn('⚠️ [LoginWithPin] No refresh token in response');
        }
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${authData.access_token}`;
        
        if (authData.profile_id) {
          apiClient.setProfileId(authData.profile_id);
          console.log('✅ [LoginWithPin] Profile ID set:', authData.profile_id);
        }
        
        await storeLastUserForPin(identifier);
        
        setIsAuthenticated(true);
        setAuthLevel(AuthLevel.AUTHENTICATED);
        setIsGuestMode(false);
        setHasPersistedSession(true);
        
        // CRITICAL: Fetch user profile data after successful login
        try {
          const profile = await authHook.getCurrentUserProfile();
          if (profile) {
            // CRITICAL: Get profile ID from multiple sources as fallback
            const profileId = profile.id || profile.profile_id || profile.user_id;
            
            const mappedUser = {
              id: profile.user_id || profile.id,
              profileId: profileId,
              entityId: profile.entity_id,
              firstName: profile.type === 'business' ? profile.business_name : profile.first_name,
              lastName: profile.type === 'business' ? null : profile.last_name,
              username: profile.username,
              avatarUrl: profile.avatar_url || profile.logo_url,
              email: profile.type === 'business' ? profile.business_email : profile.email,
              profileType: profile.type,
              businessName: profile.business_name,
            };
            setUser(mappedUser);
            console.log('✅ [LoginWithPin] User profile loaded:', mappedUser);
          }
        } catch (profileError) {
          console.warn('⚠️ [LoginWithPin] Failed to load user profile:', profileError);
          // Continue with login even if profile fails
        }
        
        console.log('✅ [LoginWithPin] PIN login completed successfully');
        setIsLoading(false);
        return { success: true };
      } else {
        console.error('❌ [LoginWithPin] No access token in response:', authData);
        setIsLoading(false);
        return { success: false, message: "PIN login failed - no access token received" };
      }
    } catch (error: any) {
      console.error('❌ [LoginWithPin] PIN login error:', error);
      console.error('❌ [LoginWithPin] Error response:', error.response?.data);
      
      setIsLoading(false);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
      return { 
        success: false, 
          message: error.response?.data?.message || "Invalid PIN or PIN not set up for this account." 
        };
      } else if (error.response?.status === 400) {
        return { 
          success: false, 
          message: error.response?.data?.message || "Invalid request. Please check your PIN." 
        };
      } else {
        return { 
          success: false, 
          message: error.response?.data?.message || error.message || "Failed to sign in with PIN." 
      };
    }
    }
  };

  const forceLogout = async (): Promise<void> => {
    
    console.warn('🚨 [ForceLogout] Forcing logout due to auth error');
    await logout();
  };

  const handleSignUp = async (userData: UserData): Promise<any> => {
    return authHook.createAuthUser(userData);
  };

  const checkEmailConfirmation = async (email: string): Promise<boolean> => {
    setShowConfirmationModal(true);
    return false;
  };

  const requireAuthentication = useCallback(async (): Promise<boolean> => {
    return await upgradeToAuthenticated();
  }, [upgradeToAuthenticated]);

  const setPhoneVerified = useCallback((data: PhoneVerification) => {
    setPhoneVerification(data);
  }, []);

  // Add missing login function for backward compatibility
  const login = useCallback(async (identifier: string, password: string, skipStore = false): Promise<{ success: boolean; message?: string }> => {
    return await loginBusiness(identifier, password, skipStore);
  }, []);

  // DEVELOPMENT HELPER: Emergency cleanup for testing
  const emergencyCleanupForDev = useCallback(async () => {
    if (__DEV__) {
      console.log('🧨 [DEV] Emergency cleanup - clearing ALL auth data');
      await authManager.emergencyCleanup();
      await clearAllCachedData();
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      console.log('✅ [DEV] Emergency cleanup complete - restart app for fresh login');
    }
  }, []);

  useEffect(() => {
    // Handler for data_updated events
    const handleDataUpdated = (payload: { type: string; data: any }) => {
      switch (payload.type) {
        case 'user':
        case 'kyc':
          // Reload user/auth data from local DB/cache
          checkSession();
          break;
        default:
          break;
      }
    };
    eventEmitter.on('data_updated', handleDataUpdated);
    return () => {
      eventEmitter.off('data_updated', handleDataUpdated);
    };
  }, [checkSession]);


  // Context value
  const value: AuthContextType = {
    // Core Authentication State
    authLevel,
        isAuthenticated,
    isGuestMode,
        isLoading,
    user,
    
    // Session Management
    hasPersistedSession,
    
    // Wallet Security
    isWalletUnlocked,
    lastWalletUnlock,
    
    // Authentication Methods
        login,
        loginBusiness,
        loginWithPin,
        logout,
    
    // Progressive Authentication
    upgradeToAuthenticated,
    requestWalletAccess,
    lockWallet,
    
    // Biometric & Security
    loginWithBiometric,
    setupBiometricLogin,
    
    // Session Management
        checkSession,
    getAccessToken,
    
    // DEVELOPMENT HELPERS
    emergencyCleanupForDev,
    
    // Legacy Support
        showConfirmationModal,
        setShowConfirmationModal,
        handleSignUp,
        checkEmailConfirmation,
        setIsAuthenticated,
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
      AsyncStorage.setItem(PERSISTENT_AUTH_KEY, JSON.stringify(enabled));
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

