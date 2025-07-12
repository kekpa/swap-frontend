/**
 * useCountries Hook
 * 
 * TanStack Query hook for country reference data management.
 * Local-first approach with SQLite caching and background sync.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import apiClient from '../../_api/apiClient';
import { API_PATHS } from '../../_api/apiPaths';
import logger from '../../utils/logger';

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

/**
 * Fetch countries from API with robust error handling
 */
const fetchCountries = async (): Promise<CountryOption[]> => {
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
      value: country.code, // Use country.code for database compatibility
    }))
  ];
  
  logger.debug(`[useCountries] Successfully loaded ${countriesData.length} countries`);
  return countryOptions;
};

/**
 * useCountries Hook - TanStack Query with Local-First Architecture
 */
export const useCountries = (): UseCountriesReturn => {
  const queryResult = useQuery({
    queryKey: queryKeys.countries,
    queryFn: fetchCountries,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - countries don't change often
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days cache
    networkMode: 'offlineFirst',
    retry: (failureCount, error: any) => {
      // Don't retry on client errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    meta: {
      errorMessage: 'Failed to load countries',
    },
  });

  return {
    countries: queryResult.data || [{ label: 'Select country', value: '' }],
    loading: queryResult.isLoading,
    error: queryResult.error ? (queryResult.error as any).message || 'Failed to fetch countries' : null,
    refetch: queryResult.refetch,
  };
};

export default useCountries;