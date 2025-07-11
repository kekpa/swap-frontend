/**
 * Balance API Service
 * 
 * Direct API calls for balance-related operations.
 * Decoupled from service managers to avoid circular dependencies with TanStack Query.
 */

import apiClient from '../../_api/apiClient';
import { WalletBalance } from '../../types/wallet.types';
import { logger } from '../../utils/logger';

// API Response interfaces
export interface BalanceApiResponse {
  success: boolean;
  data: {
    wallets: WalletBalance[];
    total_balance_usd?: number;
    last_updated: string;
  };
  timestamp: string;
}

export interface WalletApiResponse {
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

      const response = await apiClient.get<BalanceApiResponse>(`/wallets/balances`, {
        params: { entity_id: entityId },
        timeout: 10000, // 10 second timeout
      });

      if (!response.data.success) {
        throw new Error('API returned unsuccessful response');
      }

      const wallets = response.data.data.wallets || [];
      
      logger.debug('[BalanceApiService] ✅ Successfully fetched balances:', `count: ${wallets.length}, entityId: ${entityId}, timestamp: ${response.data.timestamp}`);

      return wallets;

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

      const response = await apiClient.get<WalletApiResponse>(`/wallets/${walletId}/balance`);

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

      const response = await apiClient.post<WalletApiResponse>(`/wallets/${walletId}/refresh-balance`);

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

      const response = await apiClient.get<{
        success: boolean;
        data: { rates: Record<string, number> };
        timestamp: string;
      }>(`/currency/exchange-rates`, {
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