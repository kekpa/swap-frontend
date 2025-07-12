/**
 * Balance API Service
 * 
 * Direct API calls for balance-related operations.
 * Decoupled from service managers to avoid circular dependencies with TanStack Query.
 */

import apiClient from './apiClient';
import { WalletBalance } from '../types/wallet.types';
import { logger } from '../utils/logger';

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
  success: boolean;
  data: WalletApiResponse[];
  timestamp: string;
}

export interface WalletApiSingleResponse {
  success: boolean;
  data: {
    wallet: WalletBalance;
    transactions_count?: number;
  };
  timestamp: string;
}

/**
 * Balance API Service Class
 * 
 * Provides direct API access for balance operations without dependencies on service managers.
 */
export class BalanceApiService {
  /**
   * Fetch wallet balances for a specific entity
   */
  static async fetchBalances(entityId: string): Promise<WalletBalance[]> {
    try {
      logger.debug('[BalanceApiService] 📡 Fetching balances for entity:', entityId);

      // Use the correct endpoint that works according to the logs
      const response = await apiClient.get(`/wallets/entity/${entityId}`, {
        timeout: 10000, // 10 second timeout
      });

      logger.debug('[BalanceApiService] 🔍 Raw API response:', response.data);

      // Handle the response - check if data is already parsed correctly
      let wallets: WalletApiResponse[] = [];
      
      if (response.data && response.data.data) {
        const responseData = response.data.data;
        
        logger.debug('[BalanceApiService] 🔍 Data type and structure:', JSON.stringify({
          dataType: typeof responseData,
          isArray: Array.isArray(responseData),
          dataKeys: typeof responseData === 'object' && responseData !== null ? Object.keys(responseData) : [],
          sampleData: Array.isArray(responseData) ? responseData[0] : responseData
        }));
        
        // Check if data is already an array (HTTP client parsed it)
        if (Array.isArray(responseData)) {
          wallets = responseData;
          logger.debug('[BalanceApiService] ✅ Data is already an array:', wallets.length.toString());
        } 
        // Check if data is an object with numeric keys (parsed object format)
        else if (typeof responseData === 'object' && responseData !== null) {
          const entries = Object.entries(responseData);
          wallets = entries.map(([key, value]) => {
            if (typeof value === 'string') {
              try {
                return JSON.parse(value);
              } catch {
                logger.warn('[BalanceApiService] Failed to parse wallet string:', value);
                return null;
              }
            }
            return value as WalletApiResponse;
          }).filter(Boolean);
          logger.debug('[BalanceApiService] ✅ Parsed from object format:', wallets.length.toString());
        }
        // Handle stringified JSON format
        else if (typeof responseData === 'string') {
          try {
            const parsed = JSON.parse(responseData);
            if (Array.isArray(parsed)) {
              wallets = parsed;
            } else {
              const entries = Object.entries(parsed);
              wallets = entries.map(([key, value]) => {
                if (typeof value === 'string') {
                  try {
                    return JSON.parse(value);
                  } catch {
                    return null;
                  }
                }
                return value as WalletApiResponse;
              }).filter(Boolean);
            }
            logger.debug('[BalanceApiService] ✅ Parsed from string format:', wallets.length.toString());
          } catch (parseError) {
            logger.error('[BalanceApiService] ❌ Failed to parse stringified data:', parseError);
            throw new Error('Invalid JSON format in response');
          }
        }
      } else {
        logger.warn('[BalanceApiService] ⚠️ No data field in response');
        logger.debug('[BalanceApiService] 🐛 Response structure:', JSON.stringify({
          hasResponseData: !!response.data,
          responseKeys: response.data ? Object.keys(response.data) : [],
          fullResponse: response.data
        }));
      }
      
      // Transform the API response to match WalletBalance interface
      const transformedWallets: WalletBalance[] = wallets.map((wallet: WalletApiResponse) => ({
        wallet_id: wallet.wallet_id,
        account_id: wallet.account_id,
        entity_id: wallet.entity_id,
        currency_id: wallet.currency_id,
        currency_code: wallet.currency_code,
        currency_symbol: wallet.currency_symbol,
        currency_name: wallet.currency_name,
        balance: wallet.balance || 0,
        reserved_balance: wallet.reserved_balance || 0,
        available_balance: wallet.available_balance || wallet.balance || 0,
        balance_last_updated: wallet.balance_last_updated,
        is_active: wallet.is_active,
        isPrimary: wallet.is_primary,
      }));
      
      logger.debug('[BalanceApiService] ✅ Successfully fetched balances:', `count: ${transformedWallets.length}, entityId: ${entityId}`);

      return transformedWallets;

    } catch (error) {
      logger.error('[BalanceApiService] ❌ Failed to fetch balances:', {
        entityId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch balance for a specific wallet
   */
  static async fetchWalletBalance(walletId: string): Promise<WalletBalance> {
    try {
      logger.debug('[BalanceApiService] 📡 Fetching balance for wallet:', walletId);

      const response = await apiClient.get(`/wallets/${walletId}/balance`);

      if (!response.data.success) {
        throw new Error('API returned unsuccessful response');
      }

      const wallet = response.data.data.wallet;
      
      logger.debug('[BalanceApiService] ✅ Successfully fetched wallet balance:', `walletId: ${walletId}, balance: ${wallet.available_balance}, currency: ${wallet.currency_code}`);

      return wallet;

    } catch (error) {
      logger.error('[BalanceApiService] ❌ Failed to fetch wallet balance:', {
        walletId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Refresh balance for a specific wallet
   */
  static async refreshWalletBalance(walletId: string): Promise<WalletBalance> {
    try {
      logger.debug('[BalanceApiService] 🔄 Refreshing balance for wallet:', walletId);

      const response = await apiClient.post(`/wallets/${walletId}/refresh-balance`);

      if (!response.data.success) {
        throw new Error('API returned unsuccessful response');
      }

      const wallet = response.data.data.wallet;
      
      logger.debug('[BalanceApiService] ✅ Successfully refreshed wallet balance:', `walletId: ${walletId}, balance: ${wallet.available_balance}, currency: ${wallet.currency_code}`);

      return wallet;

    } catch (error) {
      logger.error('[BalanceApiService] ❌ Failed to refresh wallet balance:', {
        walletId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get exchange rates for currency conversion
   */
  static async getExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
    try {
      logger.debug('[BalanceApiService] 📡 Fetching exchange rates for base currency:', baseCurrency);

      const response = await apiClient.get(`/currency/exchange-rates`, {
        params: { base: baseCurrency },
      });

      if (!response.data.success) {
        throw new Error('API returned unsuccessful response');
      }

      const rates = response.data.data.rates;
      
      logger.debug('[BalanceApiService] ✅ Successfully fetched exchange rates:', `baseCurrency: ${baseCurrency}, ratesCount: ${Object.keys(rates).length}`);

      return rates;

    } catch (error) {
      logger.error('[BalanceApiService] ❌ Failed to fetch exchange rates:', {
        baseCurrency,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

// Export the service for use in TanStack Query hooks
export const balanceApi = BalanceApiService;
export default BalanceApiService;