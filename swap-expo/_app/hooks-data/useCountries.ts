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
  
  // ENHANCED DEBUG LOGGING
  logger.debug(`[useCountries] 🔍 DEBUGGING RESPONSE STRUCTURE`);
  logger.debug(`[useCountries] response.data type: ${typeof response.data}, Is array: ${Array.isArray(response.data)}`);

  if (Array.isArray(response.data)) {
    logger.debug(`[useCountries] response.data.length: ${response.data.length}`);
    logger.debug(`[useCountries] response.data[0] type: ${typeof response.data[0]}, Is array: ${Array.isArray(response.data[0])}`);
    if (Array.isArray(response.data[0])) {
      logger.debug(`[useCountries] response.data[0].length: ${response.data[0].length}`);
    }
  }

  // Handle different possible response structures
  let countriesData: Country[] = [];

  // ROBUST DATA EXTRACTION LOGIC
  if (response.data && typeof response.data === 'object') {
    if (Array.isArray(response.data) && Array.isArray(response.data[0])) {
      // Backend returns [[countries_array], meta_object]
      logger.debug(`[useCountries] ✅ Extracting from response.data[0] (nested array structure)`);
      countriesData = response.data[0];
    } else if (Array.isArray(response.data)) {
      // Direct array response
      logger.debug(`[useCountries] ✅ Using response.data directly (flat array structure)`);
      countriesData = response.data;
    } else if (response.data.data && Array.isArray(response.data.data)) {
      // Response wrapped in data property: { data: [...] }
      logger.debug(`[useCountries] ✅ Extracting from response.data.data (wrapped structure)`);
      countriesData = response.data.data;
    } else {
      // Object with numeric keys - convert to array
      logger.debug(`[useCountries] ✅ Converting object to array (numeric keys structure)`);
      const valuesArray = Object.values(response.data);
      logger.debug(`[useCountries] valuesArray.length: ${valuesArray.length}`);

      // Check if first value is the countries array (handles {"0": [countries], "1": {meta}})
      if (Array.isArray(valuesArray[0])) {
        logger.debug(`[useCountries] 📍 First value is array with length ${valuesArray[0].length}, extracting it`);
        countriesData = valuesArray[0];
      } else {
        logger.debug(`[useCountries] 📍 Using valuesArray directly`);
        countriesData = valuesArray as Country[];
      }
    }
  }

  logger.debug(`[useCountries] 📊 EXTRACTED DATA INFO:`);
  logger.debug(`[useCountries] countriesData type: ${typeof countriesData}, Is array: ${Array.isArray(countriesData)}`);
  logger.debug(`[useCountries] countriesData.length: ${countriesData.length}`);
  
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
    countries: response.data ?? [{ label: 'Select country', value: '' }],
    loading: response.loading,
    error: response.error,
    refetch: response.refetch,
  };
};

export default useCountries;