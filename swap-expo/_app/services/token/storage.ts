/**
 * Internal Token Storage Module
 *
 * WARNING: This is an INTERNAL module. Do NOT import directly from external code.
 * Use the public tokenManager API from './index' instead.
 *
 * This module handles low-level token persistence to SecureStore/MMKV.
 * All cache management is handled by TokenManager.
 *
 * @internal
 */

import * as SecureStore from "expo-secure-store";
import { MMKV } from 'react-native-mmkv';
import Constants from "expo-constants";
import { handleStorageError } from '../../utils/errorHandler';
import logger from '../../utils/logger';

// High-performance MMKV storage for tokens when SecureStore is unavailable
const tokenStorage = new MMKV({
  id: 'swap-tokens',
  encryptionKey: 'swap-tokens-encryption-key-2025'
});

// Keys for storing tokens
const ACCESS_TOKEN_KEY = "swap_access_token";
const REFRESH_TOKEN_KEY = "swap_refresh_token";

// Get the API base URL from Constants or use a fallback
// Ensure it does NOT end with a slash, as we'll be adding /api/v1 and then /auth/refresh
const RAW_API_BASE_URL = (Constants.expoConfig?.extra?.EXPO_PUBLIC_NEST_API_URL || "http://localhost:3000").replace(/\/$/, '');

// Check if SecureStore is available (not available in web)
const isSecureStoreAvailable = async () => {
  try {
    return await SecureStore.isAvailableAsync();
  } catch (error) {
    return false;
  }
};

/**
 * Save access token to persistent storage
 * @internal Called only by TokenManager
 */
export const saveAccessToken = async (token: string): Promise<void> => {
  try {
    const secureStoreAvailable = await isSecureStoreAvailable();

    if (secureStoreAvailable) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    } else {
      // Use MMKV for 30x faster performance with encryption
      tokenStorage.set(ACCESS_TOKEN_KEY, token);
    }
  } catch (error) {
    handleStorageError(error, 'save access token');
    throw error;
  }
};

/**
 * Get access token from persistent storage
 * @internal Called only by TokenManager
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    const secureStoreAvailable = await isSecureStoreAvailable();

    if (secureStoreAvailable) {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } else {
      // Use MMKV for 30x faster synchronous access
      return tokenStorage.getString(ACCESS_TOKEN_KEY) ?? null;
    }
  } catch (error) {
    handleStorageError(error, 'get access token');
    return null;
  }
};

/**
 * Save refresh token to persistent storage
 * @internal Called only by TokenManager
 */
export const saveRefreshToken = async (token: string): Promise<void> => {
  try {
    const secureStoreAvailable = await isSecureStoreAvailable();

    if (secureStoreAvailable) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } else {
      // Use MMKV for 30x faster performance with encryption
      tokenStorage.set(REFRESH_TOKEN_KEY, token);
    }
  } catch (error) {
    handleStorageError(error, 'save refresh token');
    throw error;
  }
};

/**
 * Get refresh token from persistent storage
 * @internal Called only by TokenManager
 */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    const secureStoreAvailable = await isSecureStoreAvailable();

    if (secureStoreAvailable) {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } else {
      // Use MMKV for 30x faster synchronous access
      return tokenStorage.getString(REFRESH_TOKEN_KEY) ?? null;
    }
  } catch (error) {
    handleStorageError(error, 'get refresh token');
    return null;
  }
};

/**
 * Clear all tokens from persistent storage
 * @internal Called only by TokenManager.clearAllTokens()
 */
export const clearTokens = async (): Promise<void> => {
  try {
    const secureStoreAvailable = await isSecureStoreAvailable();

    if (secureStoreAvailable) {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } else {
      // Use MMKV for 30x faster synchronous deletion
      tokenStorage.delete(ACCESS_TOKEN_KEY);
      tokenStorage.delete(REFRESH_TOKEN_KEY);
    }
  } catch (error) {
    handleStorageError(error, 'clear tokens');
    throw error;
  }
};

/**
 * Refresh the access token using the refresh token
 * @returns New access token or null if refresh failed
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      // No token available - this is normal on first launch
      return null;
    }

    const explicitRefreshUrl = `${RAW_API_BASE_URL}/api/v1/auth/refresh`;

    try {
      const response = await fetch(explicitRefreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        // Log status only, not response body (may contain sensitive data)
        logger.warn(`Token refresh failed with status: ${response.status}`, "auth");
        return null;
      }

      const data = JSON.parse(responseText);
      const tokenData = data;

      if (tokenData.access_token) {
        await saveAccessToken(tokenData.access_token);
        if (tokenData.refresh_token) {
          await saveRefreshToken(tokenData.refresh_token);
        }
        return tokenData.access_token;
      } else {
        logger.warn("Refresh response missing access_token", "auth");
        return null;
      }
    } catch (fetchError) {
      logger.error("Network error during refresh", fetchError, "auth");
      return null;
    }
  } catch (error) {
    logger.error("Unexpected error during refresh", error, "auth");
    return null;
  }
};
