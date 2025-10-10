// Copyright 2025 licenser.author
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

import { useState } from "react";
import apiClient from "../_api/apiClient";
import { Alert } from "react-native";
import {
  saveAccessToken,
  clearTokens,
  getAccessToken,
  saveRefreshToken,
} from "../utils/tokenStorage";
import logger from "../utils/logger";
import { handleAuthError, getUserErrorMessage } from '../utils/errorHandler';
import { UserData as SharedUserData } from "../types/auth.types"; // Import shared type
import { AUTH_PATHS, USER_PATHS } from "../_api/apiPaths"; // Import AUTH_PATHS and USER_PATHS

interface LoginCredentials {
  identifier: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  access_token?: string;
  userId: string;
  walletAddress?: string;
  profileId?: string;
  error?: string;
  message?: string;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isDevelopment =
    process.env.NODE_ENV === "development" ||
    process.env.EXPO_PUBLIC_ENV === "development";

  const createAuthUser = async (userData: SharedUserData): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      setError(null);

      if (isDevelopment) {
        logger.debug(`Attempting to create user with email: ${userData.email}`, "auth");
      }

      // For safer debugging
      console.log(`🔑 SIGNUP ATTEMPT - URL: ${apiClient.defaults.baseURL}/auth/signup`);

      const payload: any = {
        email: userData.email,
        password: userData.password,
      };
      if (userData.firstName !== undefined) {
        payload.firstName = userData.firstName;
      }
      if (userData.lastName !== undefined) {
        payload.lastName = userData.lastName;
      }
      // Add username if it exists in SharedUserData and is provided
      if (userData.username !== undefined) {
        payload.username = userData.username;
      }

      const response = await apiClient.post("/auth/signup", payload, {
        timeout: 30000, // 30 seconds timeout
      });

      const data = response.data;
      if (data.access_token) {
        await saveAccessToken(data.access_token);
      }

      return {
        success: true,
        access_token: data.access_token,
        userId: data.userId,
        walletAddress: data.walletAddress,
        profileId: data.profileId,
      };
    } catch (err: any) {
      const authError = handleAuthError(err, 'signup');
      setError(getUserErrorMessage(authError));
      throw authError;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async ({
    identifier,
    password,
  }: LoginCredentials): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!identifier || !password) {
        const errorMessage = "Identifier and password are required";
        setError(errorMessage);
        
        if (isDevelopment) {
          console.error("Login error: Identifier or password missing", { 
            identifierProvided: !!identifier, 
            passwordProvided: !!password 
          });
        }
        
        throw new Error(errorMessage);
      }

      if (isDevelopment) {
        logger.debug(`Attempting login with identifier: ${identifier}`, "auth");
        console.log("SENDING LOGIN REQUEST WITH:", { 
          identifier, 
          passwordProvided: !!password 
        });
      }

      // Try personal login first
      console.log(`🔑 LOGIN ATTEMPT (Personal) - URL: ${apiClient.defaults.baseURL}${AUTH_PATHS.LOGIN}`);
      
      let response;
      try {
        // First try personal login
        response = await apiClient.post(AUTH_PATHS.LOGIN, {
          identifier,
          password,
        }, { 
          timeout: 30000, // 30 seconds timeout
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (isDevelopment) {
          console.log("✅ Personal login successful!");
        }
      } catch (personalLoginError: any) {
        // Don't log personal login errors immediately - wait to see if business login works
        const errorDetails = {
          status: personalLoginError.response?.status,
          message: personalLoginError.response?.data?.message,
          errors: personalLoginError.response?.data?.errors
        };
        
        // Check for "no personal profile" or "try business login" messages
        const errorMessage = personalLoginError.response?.data?.message || '';
        const errors = personalLoginError.response?.data?.errors || [];
        const allMessages = [errorMessage, ...errors.map((e: any) => e.message || '')].join(' ').toLowerCase();
        
        const shouldTryBusinessLogin = 
          allMessages.includes('no personal profile found') || 
          allMessages.includes('try business login') ||
          allMessages.includes('personal profile found for this account');
        
        if (shouldTryBusinessLogin) {
          if (isDevelopment) {
            console.log("🏢 Personal login failed - trying business login automatically...");
          }
          
          try {
            // Try business login (suppress console errors during auto-detection)
            response = await apiClient.post(AUTH_PATHS.BUSINESS_LOGIN, {
              identifier,
              password,
            }, { 
              timeout: 30000,
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            if (isDevelopment) {
              console.log("✅ Business login successful! Auto-detection worked.");
            }
          } catch (businessLoginError: any) {
            // Both login attempts failed - now we can show the errors
            if (isDevelopment) {
              console.error("❌ Personal login failed:", errorDetails);
              console.error("❌ Business login also failed:", {
                status: businessLoginError.response?.status,
                message: businessLoginError.response?.data?.message
              });
              console.error("❌ Both personal and business login failed");
            }
            throw personalLoginError; // Throw the original error
          }
        } else {
          // Personal login failed for other reasons (wrong password, etc.)
          if (isDevelopment) {
            console.error("❌ Personal login failed:", errorDetails);
            console.log("❌ Not trying business login (error doesn't suggest business account)");
          }
          throw personalLoginError;
        }
      }

      // ---- START DETAILED LOGGING ----
      logger.debug(`[useAuth] Raw response from apiClient.post: ${JSON.stringify(response)}`, 'auth');
      if (response && response.data) {
        logger.debug(`[useAuth] response.data from apiClient.post: ${JSON.stringify(response.data)}`, 'auth');
        logger.debug(`[useAuth] typeof response.data: ${typeof response.data}`, 'auth');
        if (response.data.access_token) {
          logger.debug(`[useAuth] typeof response.data.access_token: ${typeof response.data.access_token}`, 'auth');
        }
      } else {
        logger.warn('[useAuth] apiClient.post did not return response or response.data', 'auth');
      }
      // ---- END DETAILED LOGGING ----

      let actualData;
      // Handle response - clean format from interceptor
      if (response.data && typeof response.data === 'string') {
        // If data is a string, parse it
        logger.debug('[useAuth] response.data is a string, attempting JSON.parse.', 'auth');
        try {
          actualData = JSON.parse(response.data);
        } catch (parseError) {
          logger.error('Failed to parse backend login response data string:', { error: parseError, dataString: response.data }, 'auth');
          throw new Error('Invalid response format from server (JSON parse failed).');
        }
      } else if (response.data && typeof response.data === 'object' && typeof response.data.access_token !== 'undefined') {
        // Direct object with access_token
        logger.debug('[useAuth] Using response.data directly as parsed object.', 'auth');
        actualData = response.data;
      } else {
        logger.error('[useAuth] Unexpected backend login response structure:', { responseData: response.data }, 'auth');
        throw new Error('Unexpected response structure from server.');
      }
      
      // Now use actualData for token, userId, profileId
      if (actualData.access_token) {
        await saveAccessToken(actualData.access_token);
        // Also save refresh token if present
        if (actualData.refresh_token) {
          await saveRefreshToken(actualData.refresh_token);
        }
      } else {
        // If no access_token after parsing, it's still a failed login from our perspective
        logger.warn('Login successful according to backend, but no access_token in parsed data', 'auth', actualData);
        throw new Error(actualData.message || 'Login succeeded but no token received.');
      }

      return {
        success: true, // If we reached here and got a token, consider it a success on frontend side
        access_token: actualData.access_token,
        userId: actualData.userId || actualData.user_id, // Adapt to potential variations from backend
        profileId: actualData.profile_id, // Backend sends profile_id
        // walletAddress: actualData.walletAddress, // Uncomment if needed
      };
    } catch (err: any) {
      // More detailed error handling for debugging
      const responseData = err.response?.data;
      const statusCode = err.response?.status;
      const errorMessage = responseData?.message || err.message || "Login failed";
      
      setError(errorMessage);
      
      if (isDevelopment) {
        console.error("🔴 LOGIN ERROR DETAILS:", {
          status: statusCode,
          data: responseData,
          message: err.message,
          config: {
            url: err.config?.url,
            baseURL: err.config?.baseURL,
            method: err.config?.method,
          }
        });
        
        logger.error("Login error:", {
          error: errorMessage,
          response: responseData,
          status: statusCode
        });
        
        // If it's a 500 error, could be a backend issue
        if (statusCode === 500) {
          console.error("Backend server error during login. Check server logs for details.");
        }
      }
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to call logout endpoint, but don't fail entire logout if it fails
      try {
        const token = await getAccessToken();
        if (token) {
          // The interceptor in apiClient will handle token refresh if needed
          await apiClient.post(AUTH_PATHS.LOGOUT);
          logger.debug('Backend logout call succeeded', 'auth');
        }
      } catch (apiError: any) {
        // Log the API error but continue with local cleanup
        logger.warn('Backend logout call failed, continuing with local cleanup', 'auth', {
          error: apiError.message,
          status: apiError.response?.status
        });
        
        // Only show error to user if it's not a token/auth related issue
        if (apiError.response?.status !== 401 && apiError.response?.status !== 403) {
          const errorMessage = apiError.response?.data?.message || apiError.message || "Backend logout failed";
          setError(errorMessage);
          if (isDevelopment) {
            logger.error("Non-auth logout error:", { error: errorMessage });
          }
        }
      }

      // Always perform local cleanup regardless of API call success
      await clearTokens();
      await apiClient.clearCache();
      
      logger.debug('Local logout cleanup completed successfully', 'auth');
      
    } catch (err: any) {
      // This should only catch errors from clearTokens() or clearCache()
      const errorMessage = err.message || "Local logout cleanup failed";
      setError(errorMessage);
      logger.error("Critical logout error during cleanup:", { error: errorMessage });
      
      // Still try to clear tokens even if other cleanup fails
      try {
        await clearTokens();
      } catch (tokenError) {
        logger.error("Failed to clear tokens during error recovery:", { error: tokenError });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getProfile = async (profileId?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get(
        profileId ? `/users/profile/${profileId}` : "/auth/me"
      );
      return response.data;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to fetch profile";
      setError(errorMessage);
      if (isDevelopment) {
        logger.error("Profile fetch error:", { error: errorMessage });
      }
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a method to get the current user profile ID
  const getCurrentUserProfile = async () => {
    let profileUrl = AUTH_PATHS.ME;
    try {
      const token = await getAccessToken();
      if (!token) {
        logger.debug('No access token found, cannot get profile', 'auth');
        return null;
      }

      try {
        logger.debug(`[useAuth] Fetching clean profile from URL: ${profileUrl}`, 'auth'); 
        const response = await apiClient.get(profileUrl); 
        
        logger.debug(`[useAuth] Raw response: ${JSON.stringify(response.data)}`, 'auth');

        let profileData;
        if (response.data && typeof response.data === 'object') {
          profileData = response.data;
        } else {
          logger.error(`[useAuth] Unexpected response structure: ${JSON.stringify(response.data)}`, 'auth');
          return null;
        }

        // ✅ NEW: Clean discriminated union approach
        if (profileData && profileData.type && profileData.id) {
          if (profileData.type === 'business') {
            logger.debug(`[useAuth] ✅ Business profile: ${profileData.business_name}`, 'auth');
          } else if (profileData.type === 'personal') {
            logger.debug(`[useAuth] ✅ Personal profile: ${profileData.username}`, 'auth');
          }
          return profileData; 
        } 
        // ERROR: Invalid structure
        else {
          logger.error(`[useAuth] ❌ Invalid profile structure. Expected 'type' and 'id' fields: ${JSON.stringify(profileData)}`, 'auth');
          return null;
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.error || error.message;
        logger.error(`Profile fetch error: ${JSON.stringify({ error: errorMessage, requestedUrl: profileUrl })}`, 'auth');
        throw error;
      }
    } catch (error: any) {
      logger.error(`[auth] Failed to get current user profile: ${error.message}`, 'auth');
      throw error;
    }
  };

  return {
    isLoading,
    error,
    login,
    logout,
    createAuthUser,
    getProfile,
    getCurrentUserProfile,
  };
}
