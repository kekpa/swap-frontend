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
    if (!usernameToCheck || usernameToCheck.length < 3) {
      setState({
        isChecking: false,
        result: null,
        error: null,
      });
      return;
    }

    setState(prev => ({
      ...prev,
      isChecking: true,
      error: null,
    }));

    try {
      const response = await apiClient.post(API_PATHS.AUTH.CHECK_USERNAME, {
        username: usernameToCheck,
      });

      // Extract the actual data from the nested response structure
      const actualResult = response.data.data || response.data;

      setState({
        isChecking: false,
        result: actualResult,
        error: null,
      });
    } catch (error: any) {
      setState({
        isChecking: false,
        result: null,
        error: error.response?.data?.message || 'Failed to check username availability',
      });
    }
  }, []);

  useEffect(() => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setState({
        isChecking: false,
        result: null,
        error: null,
      });
      return;
    }

    const timeoutId = setTimeout(() => {
      checkUsername(trimmedUsername);
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [username, debounceMs, checkUsername]);

  return state;
};