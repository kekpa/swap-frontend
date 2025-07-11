import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

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

// Save access token
export const saveAccessToken = async (token: string): Promise<void> => {
  try {
    const secureStoreAvailable = await isSecureStoreAvailable();

    if (secureStoreAvailable) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    } else {
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
  } catch (error) {
    console.error("Error saving access token:", error);
    throw error;
  }
};

// Get access token
export const getAccessToken = async (): Promise<string | null> => {
  try {
    const secureStoreAvailable = await isSecureStoreAvailable();

    if (secureStoreAvailable) {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } else {
      return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    }
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
};

// Save refresh token
export const saveRefreshToken = async (token: string): Promise<void> => {
  try {
    const secureStoreAvailable = await isSecureStoreAvailable();

    if (secureStoreAvailable) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } else {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  } catch (error) {
    console.error("Error saving refresh token:", error);
    throw error;
  }
};

// Get refresh token
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    const secureStoreAvailable = await isSecureStoreAvailable();

    if (secureStoreAvailable) {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } else {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    }
  } catch (error) {
    console.error("Error getting refresh token:", error);
    return null;
  }
};

// Clear all tokens (for logout)
export const clearTokens = async (): Promise<void> => {
  try {
    const secureStoreAvailable = await isSecureStoreAvailable();

    if (secureStoreAvailable) {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } else {
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch (error) {
    console.error("Error clearing tokens:", error);
    throw error;
  }
};

export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const isDevelopment = process.env.NODE_ENV === "development" || process.env.EXPO_PUBLIC_ENV === "development";
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      console.debug('[refreshAccessToken] No refresh token found');
      return null;
    }

    // TEMPORARY HARDCODED URL FOR DEBUGGING - Replace with your actual expected full URL
    const explicitRefreshUrl = `${RAW_API_BASE_URL}/api/v1/auth/refresh`; 
    console.debug(`[refreshAccessToken] Attempting to refresh token. Explicit URL: ${explicitRefreshUrl}`);
    console.debug(`[refreshAccessToken] Sending refresh_token: ${refreshToken.substring(0,10)}...`);

    try {
      const response = await fetch(explicitRefreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      console.debug(`[refreshAccessToken] Response status: ${response.status}`);
      const responseText = await response.text(); // Get raw text for logging
      console.debug(`[refreshAccessToken] Raw response text: ${responseText}`);

      if (!response.ok) {
        console.warn(`[refreshAccessToken] Token refresh failed. Status: ${response.status}, URL: ${explicitRefreshUrl}, Response: ${responseText}`);
        if (isDevelopment) {
          console.debug('[refreshAccessToken] Development mode, continuing despite refresh failure');
        }
        return null;
      }

      const data = JSON.parse(responseText); // Parse after logging raw text
      
      // Handle nested response structure: { data: { access_token: ... }, meta: { ... } }
      const tokenData = data.data || data; // Support both nested and flat structures
      
      if (tokenData.access_token) {
        console.debug('[refreshAccessToken] Token refreshed successfully.');
        await saveAccessToken(tokenData.access_token);
        if (tokenData.refresh_token) {
          await saveRefreshToken(tokenData.refresh_token);
        }
        return tokenData.access_token;
      } else {
        console.warn('[refreshAccessToken] Refresh successful but no access_token in response data:', data);
        return null;
      }
    } catch (fetchError) {
      console.error('[refreshAccessToken] Fetch refresh attempt FAILED:', fetchError);
      if (isDevelopment) {
        console.debug('[refreshAccessToken] Development mode, continuing despite refresh error');
      }
      return null; // Return null on fetch error as well
    }
  } catch (error) {
    console.error('[refreshAccessToken] Outer error refreshing token:', error);
    return null;
  }
};
