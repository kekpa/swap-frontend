import { useState, useEffect, useCallback } from 'react';
import apiClient from '../_api/apiClient';
import { API_PATHS } from '../_api/apiPaths';

export interface UsernameCheckResult {
  available: boolean;
  message: string;
}

export interface UsernameAvailabilityState {
  isChecking: boolean;
  result: UsernameCheckResult | null;
  error: string | null;
}

export const useUsernameAvailability = (username: string, debounceMs: number = 500) => {
  const [state, setState] = useState<UsernameAvailabilityState>({
    isChecking: false,
    result: null,
    error: null,
  });

  const checkUsername = useCallback(async (usernameToCheck: string) => {
    console.log('🔍 useUsernameAvailability - Checking username:', usernameToCheck);

    if (!usernameToCheck || usernameToCheck.length < 3) {
      console.log('🔍 useUsernameAvailability - Username too short, clearing state');
      setState({
        isChecking: false,
        result: null,
        error: null,
      });
      return;
    }

    console.log('🔍 useUsernameAvailability - Setting isChecking to true');
    setState(prev => ({
      ...prev,
      isChecking: true,
      error: null,
    }));

    try {
      console.log('🔍 useUsernameAvailability - Making API call to:', API_PATHS.AUTH.CHECK_USERNAME);
      const response = await apiClient.post(API_PATHS.AUTH.CHECK_USERNAME, {
        username: usernameToCheck,
      });

      console.log('🔍 useUsernameAvailability - API Response:', response.data);

      // Extract the actual data from the nested response structure
      const actualResult = response.data.data || response.data;
      console.log('🔍 useUsernameAvailability - Extracted result:', actualResult);

      setState({
        isChecking: false,
        result: actualResult,
        error: null,
      });
      console.log('🔍 useUsernameAvailability - State updated with result:', actualResult);
    } catch (error: any) {
      console.log('🔍 useUsernameAvailability - API Error:', error);
      setState({
        isChecking: false,
        result: null,
        error: error.response?.data?.message || 'Failed to check username availability',
      });
    }
  }, []);

  useEffect(() => {
    const trimmedUsername = username.trim();
    console.log('🔍 useUsernameAvailability - useEffect triggered with username:', username, 'trimmed:', trimmedUsername);

    if (!trimmedUsername) {
      console.log('🔍 useUsernameAvailability - Empty username, clearing state');
      setState({
        isChecking: false,
        result: null,
        error: null,
      });
      return;
    }

    console.log('🔍 useUsernameAvailability - Setting timeout for', debounceMs, 'ms');
    const timeoutId = setTimeout(() => {
      console.log('🔍 useUsernameAvailability - Timeout triggered, calling checkUsername');
      checkUsername(trimmedUsername);
    }, debounceMs);

    return () => {
      console.log('🔍 useUsernameAvailability - Clearing timeout');
      clearTimeout(timeoutId);
    };
  }, [username, debounceMs, checkUsername]);

  return state;
};