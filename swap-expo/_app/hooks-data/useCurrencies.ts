/**
 * useCurrencies Hook
 *
 * TanStack Query hook for currency reference data management.
 * Local-first approach with background sync.
 *
 * Created: 2025-12-15
 */

import { queryKeys } from '../tanstack-query/queryKeys';
import apiClient from '../_api/apiClient';
import { API_PATHS } from '../_api/apiPaths';
import logger from '../utils/logger';
import { useStandardQuery, createQueryResponse } from './useStandardQuery';

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

export interface UseCurrenciesReturn {
  currencies: Currency[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch currencies from API with robust error handling
 */
const fetchCurrencies = async (): Promise<Currency[]> => {
  logger.debug('[useCurrencies] Fetching currencies from API');

  const response = await apiClient.get(API_PATHS.REFERENCE_DATA.CURRENCIES);

  // ENHANCED DEBUG LOGGING
  logger.debug(`[useCurrencies] 🔍 DEBUGGING RESPONSE STRUCTURE`);
  logger.debug(`[useCurrencies] response.data type: ${typeof response.data}, Is array: ${Array.isArray(response.data)}`);

  if (Array.isArray(response.data)) {
    logger.debug(`[useCurrencies] response.data.length: ${response.data.length}`);
    logger.debug(`[useCurrencies] response.data[0] type: ${typeof response.data[0]}, Is array: ${Array.isArray(response.data[0])}`);
    if (Array.isArray(response.data[0])) {
      logger.debug(`[useCurrencies] response.data[0].length: ${response.data[0].length}`);
    }
  }

  // Handle different possible response structures
  let currenciesData: Currency[] = [];

  // ROBUST DATA EXTRACTION LOGIC (same pattern as useCountries)
  if (response.data && typeof response.data === 'object') {
    if (Array.isArray(response.data) && Array.isArray(response.data[0])) {
      // Backend returns [[currencies_array], meta_object]
      logger.debug(`[useCurrencies] ✅ Extracting from response.data[0] (nested array structure)`);
      currenciesData = response.data[0];
    } else if (Array.isArray(response.data)) {
      // Direct array response
      logger.debug(`[useCurrencies] ✅ Using response.data directly (flat array structure)`);
      currenciesData = response.data;
    } else if (response.data.data && Array.isArray(response.data.data)) {
      // Response wrapped in data property: { data: [...] }
      logger.debug(`[useCurrencies] ✅ Extracting from response.data.data (wrapped structure)`);
      currenciesData = response.data.data;
    } else {
      // Object with numeric keys - convert to array
      logger.debug(`[useCurrencies] ✅ Converting object to array (numeric keys structure)`);
      const valuesArray = Object.values(response.data);
      logger.debug(`[useCurrencies] valuesArray.length: ${valuesArray.length}`);

      // Check if first value is the currencies array (handles {"0": [currencies], "1": {meta}})
      if (Array.isArray(valuesArray[0])) {
        logger.debug(`[useCurrencies] 📍 First value is array with length ${(valuesArray[0] as Currency[]).length}, extracting it`);
        currenciesData = valuesArray[0] as Currency[];
      } else {
        logger.debug(`[useCurrencies] 📍 Using valuesArray directly`);
        currenciesData = valuesArray as Currency[];
      }
    }
  }

  logger.debug(`[useCurrencies] 📊 EXTRACTED DATA INFO:`);
  logger.debug(`[useCurrencies] currenciesData type: ${typeof currenciesData}, Is array: ${Array.isArray(currenciesData)}`);
  logger.debug(`[useCurrencies] currenciesData.length: ${currenciesData.length}`);

  if (!Array.isArray(currenciesData)) {
    throw new Error('Currencies data is not an array');
  }

  logger.debug(`[useCurrencies] Successfully loaded ${currenciesData.length} currencies`);
  return currenciesData;
};

/**
 * useCurrencies Hook - TanStack Query with Local-First Architecture
 */
export const useCurrencies = (): UseCurrenciesReturn => {
  const queryResult = useStandardQuery(
    queryKeys.currencies,
    fetchCurrencies,
    'reference', // Long-lived reference data (24h stale time)
    {
      meta: {
        errorMessage: 'Failed to load currencies',
      },
    }
  );

  const response = createQueryResponse<Currency[]>(queryResult, []);

  return {
    currencies: response.data ?? [],
    loading: response.loading,
    error: response.error,
    refetch: response.refetch,
  };
};

export default useCurrencies;
