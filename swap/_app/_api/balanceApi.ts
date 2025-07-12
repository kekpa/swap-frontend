/**
 * Balance API Service
 * 
 * Direct API calls for balance-related operations.
 * Decoupled from service managers to avoid circular dependencies with TanStack Query.
 */

import apiClient from './apiClient';
import { WalletBalance } from '../types/wallet.types';
import { logger } from '../utils/logger';
import { API_PATHS } from './apiPaths';

// API Response interfaces matching actual backend response
export interface WalletApiResponse {
  wallet_id: string;
  account_id: string;
  entity_id: string;
  currency_id: string;
  currency_code: string;
  currency_symbol: string;
  currency_name: string;
  balance: number;
  reserved_balance: number;
  available_balance: number;
  balance_last_updated: string | null;
  is_active: boolean;
  is_primary: boolean;
}

export interface BalanceApiResponse {
  data: WalletApiResponse[] | string;
  meta: {
    timestamp: number;
    requestId: string;
  };
}

/**
 * Helper function to parse complex nested JSON structure from backend
 */
const parseComplexBackendResponse = (data: any): WalletApiResponse[] => {
  logger.debug('[BalanceApiService] 🔍 Parsing complex backend response:', typeof data === 'string' ? data.substring(0, 200) + '...' : JSON.stringify(data).substring(0, 200) + '...');
  
  let result = data;
  
  // Handle multiple levels of JSON string parsing
  let parseAttempts = 0;
  while (typeof result === 'string' && parseAttempts < 5) {
    try {
      logger.debug(`[BalanceApiService] 🔄 Parsing JSON string (attempt ${parseAttempts + 1})`);
      result = JSON.parse(result);
      parseAttempts++;
    } catch (parseError) {
      logger.error(`[BalanceApiService] ❌ Failed to parse JSON string (attempt ${parseAttempts + 1}):`, parseError instanceof Error ? parseError : new Error(String(parseError)));
      break;
    }
  }
  
  // Handle different response structures
  if (Array.isArray(result)) {
    logger.debug('[BalanceApiService] ✅ Found direct array response');
    return result;
  }
  
  if (result && typeof result === 'object') {
    // Check for nested data structures
    const keys = Object.keys(result);
    logger.debug(`[BalanceApiService] 🔍 Object keys: ${keys.join(', ')}`);
    
    // Look for array-like structure (numbered keys)
    const numberedKeys = keys.filter(key => /^\d+$/.test(key)).sort((a, b) => parseInt(a) - parseInt(b));
    if (numberedKeys.length > 0) {
      logger.debug(`[BalanceApiService] ✅ Found numbered keys structure with ${numberedKeys.length.toString()} items`);
      return numberedKeys.map(key => {
        const item = result[key];
        return typeof item === 'string' ? JSON.parse(item) : item;
      });
    }
    
    // Check for data property
    if (result.data) {
      logger.debug('[BalanceApiService] ✅ Found data property, recursing');
      return parseComplexBackendResponse(result.data);
    }
  }
  
  logger.warn(`[BalanceApiService] ⚠️ Unexpected response structure, returning empty array`);
  return [];
};

/**
 * Transform API response to WalletBalance format
 */
const transformToWalletBalance = (apiWallet: WalletApiResponse): WalletBalance => {
  return {
    wallet_id: apiWallet.wallet_id,
    account_id: apiWallet.account_id, // CRITICAL FIX: Include account_id
    entity_id: apiWallet.entity_id,   // CRITICAL FIX: Include entity_id
    currency_id: apiWallet.currency_id, // CRITICAL FIX: Include currency_id
    currency_code: apiWallet.currency_code,
    currency_symbol: apiWallet.currency_symbol,
    currency_name: apiWallet.currency_name,
    balance: apiWallet.balance,
    available_balance: apiWallet.available_balance,
    reserved_balance: apiWallet.reserved_balance,
    balance_last_updated: apiWallet.balance_last_updated,
    is_active: apiWallet.is_active, // CRITICAL FIX: Use correct property name
    isPrimary: apiWallet.is_primary, // UI-specific field
    last_updated: apiWallet.balance_last_updated || new Date().toISOString(),
  };
};

/**
 * Balance API Service Class
 */
export class BalanceApiService {
  /**
   * Get wallet balances for a specific entity
   */
  public static async getWalletBalances(entityId: string): Promise<WalletBalance[]> {
    logger.debug(`[BalanceApiService] 🚀 Fetching wallet balances for entity: ${entityId}`);
    
    try {
      const response = await apiClient.get(API_PATHS.WALLET.BY_ENTITY(entityId));
      logger.debug(`[BalanceApiService] 📥 Raw API response:`, typeof response.data === 'string' ? response.data.substring(0, 200) + '...' : JSON.stringify(response.data).substring(0, 200) + '...');
      
      // Parse the complex nested JSON response
      const parsedWallets = parseComplexBackendResponse(response.data);
      
      if (!Array.isArray(parsedWallets)) {
        logger.warn(`[BalanceApiService] ⚠️ Expected array but got: ${typeof parsedWallets}`);
        return [];
      }
      
      // Transform to frontend format
      const transformedWallets = parsedWallets.map(transformToWalletBalance);
      
      logger.info(`[BalanceApiService] ✅ Successfully fetched ${transformedWallets.length.toString()} balances for entity: ${entityId}`);
      
      // Debug log the primary wallet
      const primaryWallet = transformedWallets.find(w => w.isPrimary);
      if (primaryWallet) {
        logger.debug(`[BalanceApiService] 🎯 Primary wallet: ${primaryWallet.currency_code} (${primaryWallet.wallet_id})`);
      } else {
        logger.warn(`[BalanceApiService] ⚠️ No primary wallet found in ${transformedWallets.length.toString()} wallets`);
      }
      
      return transformedWallets;
      
    } catch (error) {
      logger.error('[BalanceApiService] ❌ Failed to fetch wallet balances:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

/**
 * Standalone function for getting wallet balances (used by hooks)
 */
export const getWalletBalances = async (entityId: string): Promise<WalletBalance[]> => {
  return BalanceApiService.getWalletBalances(entityId);
};

/**
 * CRITICAL FIX: Add the missing fetchBalances function that useBalances is trying to call
 */
export const fetchBalances = async (entityId: string): Promise<WalletBalance[]> => {
  return BalanceApiService.getWalletBalances(entityId);
};

/**
 * Set wallet as primary
 */
export const setPrimaryWallet = async (walletId: string): Promise<WalletBalance> => {
  logger.debug(`[BalanceApiService] 🔄 Setting wallet ${walletId} as primary`);
  
  try {
    const response = await apiClient.patch(`/wallets/${walletId}/primary`);
    logger.debug(`[BalanceApiService] ✅ Primary wallet set successfully`);
    
    // Handle the response data - it's a single wallet object, not an array
    let walletData = response.data;
    
    // If response has a 'data' property, extract it
    if (walletData && typeof walletData === 'object' && walletData.data) {
      walletData = walletData.data;
    }
    
    // If the data is a JSON string, parse it
    if (typeof walletData === 'string') {
      try {
        walletData = JSON.parse(walletData);
      } catch (parseError) {
        logger.error('[BalanceApiService] ❌ Failed to parse wallet data JSON:', parseError);
        throw new Error('Invalid JSON response from setPrimaryWallet');
      }
    }
    
    // Validate that we have a wallet object with required fields
    if (!walletData || typeof walletData !== 'object' || !walletData.wallet_id) {
      logger.error('[BalanceApiService] ❌ Invalid wallet data structure:', walletData);
      throw new Error('Invalid wallet data structure from setPrimaryWallet');
    }
    
    // Transform to WalletBalance format
    const transformedWallet = transformToWalletBalance(walletData);
    logger.debug(`[BalanceApiService] ✅ Successfully transformed primary wallet: ${transformedWallet.currency_code}`);
    
    return transformedWallet;
    
  } catch (error) {
    logger.error('[BalanceApiService] ❌ Failed to set primary wallet:', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

/**
 * Default export object with all functions (for backward compatibility)
 */
const balanceApi = {
  getWalletBalances,
  fetchBalances, // CRITICAL: This was missing!
  setPrimaryWallet, // CRITICAL: Add the missing setPrimaryWallet function
  BalanceApiService,
};

export default balanceApi;