// Updated: Fixed countries mapping to use country codes instead of names for database compatibility - 2025-06-07
import { useState, useEffect, useCallback } from 'react';
import apiClient from '../_api/apiClient';
import { API_PATHS } from '../_api/apiPaths';
import logger from '../utils/logger';

export interface Country {
  code: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CountryOption {
  label: string;
  value: string;
}

export interface UseCountriesReturn {
  countries: CountryOption[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useCountries = (): UseCountriesReturn => {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCountries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      logger.debug('[useCountries] Fetching countries from API');
      
      const response = await apiClient.get(API_PATHS.REFERENCE_DATA.COUNTRIES);
      
      // Log the full response to debug the structure
      logger.debug(`[useCountries] Full API response: ${JSON.stringify(response, null, 2)}`);
      logger.debug(`[useCountries] Response data: ${JSON.stringify(response.data, null, 2)}`);
      
      // Handle different possible response structures
      let countriesData: Country[] = [];
      
      if (Array.isArray(response.data)) {
        // Direct array response
        countriesData = response.data;
      } else if (response.data && typeof response.data === 'object') {
        // Check if data is nested
        if (Array.isArray(response.data.data)) {
          countriesData = response.data.data;
        } else if (response.data.data && typeof response.data.data === 'object') {
          // Handle case where data is an object with numbered keys
          const dataObj = response.data.data;
          countriesData = Object.values(dataObj);
        } else {
          // Handle case where response.data is an object with numbered keys
          countriesData = Object.values(response.data);
        }
      }
      
      logger.debug(`[useCountries] Parsed countries data: ${JSON.stringify(countriesData)}`);
      logger.debug(`[useCountries] Countries data type: ${typeof countriesData}, Is array: ${Array.isArray(countriesData)}`);
      
      if (!Array.isArray(countriesData)) {
        throw new Error('Countries data is not an array');
      }
      
      // Transform API response to option format with "Select country" as first option
      const countryOptions: CountryOption[] = [
        { label: 'Select country', value: '' },
        ...countriesData.map(country => ({
          label: country.name,
          value: country.code,
        }))
      ];
      
      setCountries(countryOptions);
      logger.debug(`[useCountries] Successfully loaded ${countriesData.length} countries`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch countries';
      setError(errorMessage);
      logger.error('[useCountries] Error fetching countries:', err);
      
      // Fallback to empty array with just the select option
      setCountries([{ label: 'Select country', value: '' }]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchCountries();
  }, [fetchCountries]);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  return {
    countries,
    loading,
    error,
    refetch,
  };
}; 