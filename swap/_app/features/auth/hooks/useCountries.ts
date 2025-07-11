// Created: Added useCountries hook to fetch countries from database - 2025-06-03
import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../_api/apiClient';
import { API_PATHS } from '../../../_api/apiPaths';
import logger from '../../../utils/logger';

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
      const countriesData: Country[] = response.data;
      
      // Transform API response to option format with "Select country" as first option
      const countryOptions: CountryOption[] = [
        { label: 'Select country', value: '' },
        ...countriesData.map(country => ({
          label: country.name,
          value: country.name,
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