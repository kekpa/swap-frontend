// Enhanced balance management with local-first architecture - 2025-01-10
// Fixed API paths and wallet functionality for TanStack Query migration

import apiClient from '../_api/apiClient';
import { API_PATHS } from '../_api/apiPaths';
import { WalletBalance, WalletDisplay } from '../types/wallet.types';
import logger from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkService } from './NetworkService';
import { eventEmitter } from '../utils/eventEmitter';
import { currencyWalletsRepository } from '../localdb/CurrencyWalletsRepository';

interface WalletApiResponse {
  id: string;
  account_id: string;
  currency_id: string;
  balance: number;
  reserved_balance?: number;
  available_balance?: number;
  is_primary?: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  currency?: {
    id: string;
    code: string;
    symbol: string;
    name: string;
  };
}

class BalanceManager {
  private static instance: BalanceManager;
  private lastFetchTime = 0;
  private readonly FETCH_COOLDOWN = 30000; // 30 seconds
  private cachedWallets: WalletDisplay[] = [];

  public static getInstance(): BalanceManager {
    if (!BalanceManager.instance) {
      BalanceManager.instance = new BalanceManager();
    }
    return BalanceManager.instance;
  }

  private constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    try {
      // Listen for network state changes
      networkService.onNetworkStateChange((state) => {
        if (!state.isOfflineMode) {
          logger.debug('[BalanceManager] Network reconnected - refreshing wallets');
        }
      });

      logger.debug('[BalanceManager] Event listeners initialized');
    } catch (error) {
      logger.error('[BalanceManager] Failed to initialize event listeners', error);
    }
  }

  /**
   * Get wallets for display in UI (simplified format)
   */
  async getWalletsForDisplay(entityId: string): Promise<WalletDisplay[]> {
    try {
      // First try to load from cache
      const cachedWallets = await this.loadWalletsFromCache();
      if (cachedWallets.length > 0) {
        this.cachedWallets = cachedWallets;
        logger.debug(`[BalanceManager] Loaded ${cachedWallets.length} wallets from cache`);
      }

      // Check if we should fetch from API
      const shouldFetch = await this.shouldFetchFromApi();
      if (shouldFetch) {
        const freshWallets = await this.fetchWalletsFromApi(entityId);
        if (freshWallets.length > 0) {
          this.cachedWallets = freshWallets;
          await this.saveWalletsToCache(freshWallets);
        }
      }

      return this.cachedWallets;
    } catch (error) {
      logger.error('[BalanceManager] Error getting wallets for display:', error);
      return this.cachedWallets;
    }
  }

  /**
   * Fetch wallets from API
   */
  private async fetchWalletsFromApi(entityId: string): Promise<WalletDisplay[]> {
    try {
      logger.debug(`[BalanceManager] Fetching wallets from API for entity: ${entityId}`);
      
      // Try entity endpoint first
      let response;
      try {
        response = await apiClient.get(API_PATHS.WALLET.BY_ENTITY(entityId));
      } catch (error: any) {
        if (error.response?.status === 404) {
          // If entity endpoint doesn't exist, try account endpoint
          logger.debug('[BalanceManager] Entity endpoint not found, trying account endpoint');
          const accounts = await apiClient.get(API_PATHS.ACCOUNT.BY_ENTITY(entityId));
          if (accounts.data && accounts.data.length > 0) {
            const accountId = accounts.data[0].id;
            response = await apiClient.get(API_PATHS.WALLET.BY_ACCOUNT(accountId));
          } else {
            throw new Error('No accounts found for entity');
          }
        } else {
          throw error;
        }
      }

      // Handle the double-stringified response structure from backend
      let walletsData: any[] = [];
      
      if (response?.data?.data && typeof response.data.data === 'object') {
        // Backend returns: { data: { "0": "{...}", "1": "{...}" } }
        const dataObj = response.data.data;
        walletsData = Object.values(dataObj).map((item: any) => {
          if (typeof item === 'string') {
            try {
              return JSON.parse(item);
            } catch (e) {
              logger.warn('[BalanceManager] Failed to parse wallet data:', item);
              return null;
            }
          }
          return item;
        }).filter(Boolean);
      } else if (response?.data && Array.isArray(response.data)) {
        // Standard array response
        walletsData = response.data;
      } else {
        logger.warn('[BalanceManager] Invalid wallet data from API');
        logger.debug('[BalanceManager] Response structure:', JSON.stringify({
          hasData: !!response?.data,
          dataType: typeof response?.data,
          hasNestedData: !!(response?.data?.data),
          nestedDataType: typeof response?.data?.data
        }, null, 2));
        return [];
      }

      const wallets: WalletDisplay[] = walletsData.map((wallet: any): WalletDisplay => {
        logger.debug('[BalanceManager] 🔍 Processing wallet:', JSON.stringify(wallet, null, 2));
        
        const walletDisplay: WalletDisplay = {
          id: wallet.wallet_id || wallet.id, // Handle both formats
          balance: wallet.balance || 0,
          currency_code: wallet.currency_code || wallet.currency?.code || 'USD',
          currency_symbol: wallet.currency_symbol || wallet.currency?.symbol || '$',
          currency_id: wallet.currency_id || wallet.currency?.id || '', // CRITICAL: Extract currency_id
          account_id: wallet.account_id || '',
          isPrimary: wallet.is_primary || false,
          status: wallet.is_active || wallet.status === 'active' ? 'active' : 'inactive',
          last_updated: wallet.balance_last_updated || wallet.updated_at || new Date().toISOString()
        };
        
        logger.debug('[BalanceManager] 🔍 Transformed wallet:', JSON.stringify(walletDisplay, null, 2));
        return walletDisplay;
      });

      this.lastFetchTime = Date.now();
      logger.debug(`[BalanceManager] Successfully fetched ${wallets.length} wallets from API`);
      
      // Emit update event
      eventEmitter.emit('wallets_updated', { wallets, entityId });
      
      return wallets;

    } catch (error) {
      logger.error('[BalanceManager] Error fetching wallets from API:', error);
      return [];
    }
  }

  /**
   * Set a wallet as primary - Professional implementation with proper database update
   */
  async setPrimaryWallet(walletId: string): Promise<boolean> {
    try {
      logger.debug(`[BalanceManager] Setting wallet ${walletId} as primary`);

      // Check network connectivity
      const networkState = networkService.getNetworkState();
      if (networkState.isOfflineMode) {
        logger.warn('[BalanceManager] Cannot set primary wallet while offline');
        return false;
      }

      // Store previous state for rollback
      const previousState = this.cachedWallets.map(w => ({ ...w }));

      // Optimistic update
      this.updatePrimaryWalletLocally(walletId);

      try {
        // Use the correct API endpoint that updates the database (PATCH method)
        const response = await apiClient.patch(`/wallets/${walletId}/primary`);
        
        if (response.status === 200 || response.status === 204) {
          logger.info(`[BalanceManager] ✅ Successfully set wallet ${walletId} as primary in database`);
          
          // Save to cache
          await this.saveWalletsToCache(this.cachedWallets);
          
          // Emit update event for UI consistency
          eventEmitter.emit('primary_wallet_updated', { walletId });
          
          return true;
        } else {
          // Revert optimistic update
          this.revertPrimaryWalletUpdate(previousState);
          logger.error(`[BalanceManager] ❌ Backend returned ${response.status} for primary wallet update`);
          return false;
        }
      } catch (apiError: any) {
        logger.error('[BalanceManager] ❌ API call failed, reverting optimistic update:', apiError);
        this.revertPrimaryWalletUpdate(previousState);
        
        // Log specific error details for debugging
        if (apiError.response) {
          logger.error(`[BalanceManager] API Error Response: ${apiError.response.status} - ${apiError.response.data?.message || 'Unknown error'}`);
        }
        
        return false;
      }

    } catch (error) {
      logger.error(`[BalanceManager] Error setting primary wallet ${walletId}:`, error);
      return false;
    }
  }

  /**
   * Update primary wallet locally (optimistic update)
   */
  private updatePrimaryWalletLocally(walletId: string): void {
    this.cachedWallets = this.cachedWallets.map(wallet => ({
      ...wallet,
      isPrimary: wallet.id === walletId
    }));
  }

  /**
   * Revert primary wallet update (if API call fails)
   */
  private revertPrimaryWalletUpdate(previousState?: WalletDisplay[]): void {
    if (previousState) {
      this.cachedWallets = previousState;
      logger.debug('[BalanceManager] ✅ Reverted primary wallet update to previous state');
    } else {
      logger.debug('[BalanceManager] ⚠️ No previous state available for revert');
    }
  }

  /**
   * Update primary wallet in backend and local database
   * This ensures the backend database is updated when user switches primary wallet
   */
  async updatePrimaryWallet(walletId: string, entityId: string): Promise<void> {
    try {
      logger.info(`[BalanceManager] Updating primary wallet to: ${walletId}`);
      
      // Update backend via API (PATCH method)
      const response = await apiClient.patch(`/wallets/${walletId}/primary`, {
        entity_id: entityId
      });
      
      if (response.status === 200) {
        logger.info(`[BalanceManager] Successfully updated primary wallet in backend`);
        
        // TODO: Update local database when repository methods are implemented
        // await this.updateLocalPrimaryWallet(walletId, entityId);
        
        // Refresh wallets to get updated data
        await this.fetchWalletsFromApi(entityId);
        
      } else {
        logger.error(`[BalanceManager] Failed to update primary wallet in backend: ${response.status}`);
        throw new Error(`Failed to update primary wallet: ${response.status}`);
      }
      
    } catch (error) {
      logger.error(`[BalanceManager] Error updating primary wallet:`, error);
      throw error;
    }
  }
  
  /**
   * Update primary wallet in local database
   * TODO: Implement repository methods for primary wallet updates
   */
  private async updateLocalPrimaryWallet(walletId: string, entityId: string): Promise<void> {
    // TODO: Implement when repository methods are available
    logger.info(`[BalanceManager] Local primary wallet update not implemented yet`);
  }

  /**
   * Load wallets from local cache
   */
  private async loadWalletsFromCache(): Promise<WalletDisplay[]> {
    try {
      // Try AsyncStorage first
      const cached = await AsyncStorage.getItem('wallet_display_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && (Date.now() - parsed.timestamp) < 5 * 60 * 1000) { // 5 min TTL
          return parsed.wallets || [];
        }
      }

             // Fallback to SQLite repository
       const sqliteWallets = await currencyWalletsRepository.getAllCurrencyWallets();
       if (sqliteWallets && sqliteWallets.length > 0) {
         const displayWallets: WalletDisplay[] = sqliteWallets.map(wallet => ({
           id: wallet.id,
           balance: wallet.balance || 0,
           currency_code: wallet.currency_code || 'USD',
           currency_symbol: wallet.currency_symbol || '$',
           currency_id: wallet.currency_id || '', // Add currency_id for filtering
           account_id: wallet.account_id || '',
           isPrimary: wallet.is_primary || false,
           status: wallet.is_active ? 'active' : 'inactive',
           last_updated: wallet.updated_at || new Date().toISOString()
         }));

        logger.debug(`[BalanceManager] Loaded ${displayWallets.length} wallets from SQLite`);
        return displayWallets;
      }

      return [];
    } catch (error) {
      logger.error('[BalanceManager] Error loading wallets from cache:', error);
      return [];
    }
  }

  /**
   * Save wallets to local cache
   */
  private async saveWalletsToCache(wallets: WalletDisplay[]): Promise<void> {
    try {
      // Save to AsyncStorage
      const cacheData = {
        wallets,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem('wallet_display_cache', JSON.stringify(cacheData));

             // Save to SQLite repository
       const currencyWallets = wallets.map(wallet => ({
         id: wallet.id,
        account_id: wallet.account_id,
         currency_id: wallet.currency_id || '', // Use currency_id from wallet
         balance: wallet.balance,
         reserved_balance: 0, // Default value
         available_balance: wallet.balance, // Same as balance for now
         is_active: wallet.status === 'active',
         is_primary: wallet.isPrimary,
        currency_code: wallet.currency_code,
        currency_symbol: wallet.currency_symbol,
         currency_name: wallet.currency_code, // Fallback
         created_at: new Date().toISOString(),
         updated_at: wallet.last_updated
       }));

      await currencyWalletsRepository.saveCurrencyWallets(currencyWallets);
      logger.debug(`[BalanceManager] Saved ${wallets.length} wallets to cache`);
    } catch (error) {
      logger.error('[BalanceManager] Error saving wallets to cache:', error);
    }
  }

  /**
   * Check if we should fetch from API
   */
  private async shouldFetchFromApi(): Promise<boolean> {
    try {
      // Check network connectivity
      const networkState = networkService.getNetworkState();
      if (networkState.isOfflineMode) {
        return false;
      }
      
      // Check cooldown
      const now = Date.now();
      if (now - this.lastFetchTime < this.FETCH_COOLDOWN) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[BalanceManager] Error checking if should fetch from API:', error);
      return false;
    }
  }

  /**
   * Get total balance across all wallets
   */
  getTotalBalance(): number {
    return this.cachedWallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);
  }

  /**
   * Get primary wallet
   */
  getPrimaryWallet(): WalletDisplay | null {
    return this.cachedWallets.find(wallet => wallet.isPrimary) || null;
  }

  /**
   * Force refresh wallets from API
   */
  async forceRefresh(entityId: string): Promise<WalletDisplay[]> {
    try {
      this.lastFetchTime = 0; // Reset cooldown
      return await this.getWalletsForDisplay(entityId);
    } catch (error) {
      logger.error('[BalanceManager] Error force refreshing wallets:', error);
      return this.cachedWallets;
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem('wallet_display_cache');
      this.cachedWallets = [];
      this.lastFetchTime = 0;
      logger.debug('[BalanceManager] Cache cleared');
    } catch (error) {
      logger.error('[BalanceManager] Error clearing cache:', error);
    }
  }

  /**
   * Get cached wallets (for immediate UI display)
   */
  getCachedWallets(): WalletDisplay[] {
    return [...this.cachedWallets];
  }
}

export const balanceManager = BalanceManager.getInstance();
export default balanceManager; 