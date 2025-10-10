/**
 * useCountries Hook
 * 
 * TanStack Query hook for country reference data management.
 * Local-first approach with SQLite caching and background sync.
 */

import { queryKeys } from '../tanstack-query/queryKeys';
import apiClient from '../_api/apiClient';
import { API_PATHS } from '../_api/apiPaths';
import logger from '../utils/logger';
import { useStandardQuery, createQueryResponse } from './useStandardQuery';

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
    // Handle case where response.data is an object with numbered keys
    countriesData = Object.values(response.data);
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
  const queryResult = useStandardQuery(
    queryKeys.countries,
    fetchCountries,
    'reference', // Long-lived reference data
    {
      meta: {
        errorMessage: 'Failed to load countries',
      },
    }
  );

  const response = createQueryResponse(queryResult, [{ label: 'Select country', value: '' }]);
  
  return {
    countries: response.data,
    loading: response.loading,
    error: response.error,
    refetch: response.refetch,
  };
};

export default useCountries;