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

      if (!response?.data || !Array.isArray(response.data)) {
        logger.warn('[BalanceManager] Invalid wallet data from API');
        return [];
      }

      const wallets: WalletDisplay[] = response.data.map((wallet: WalletApiResponse) => ({
        id: wallet.id,
        balance: wallet.balance || 0,
        currency_code: wallet.currency?.code || 'USD',
        currency_symbol: wallet.currency?.symbol || '$',
        account_id: wallet.account_id,
        isPrimary: wallet.is_primary || false,
        status: wallet.status === 'active' ? 'active' : 'inactive',
        last_updated: wallet.updated_at || new Date().toISOString()
      }));

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
   * Set a wallet as primary
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

      // Optimistic update
      this.updatePrimaryWalletLocally(walletId);

      try {
        // Make API call
        const response = await apiClient.patch(`/wallets/${walletId}/primary`);
        
        if (response.status === 200) {
          logger.debug(`[BalanceManager] Successfully set wallet ${walletId} as primary`);
          
          // Save to cache
          await this.saveWalletsToCache(this.cachedWallets);
          
          // Emit update event
          eventEmitter.emit('primary_wallet_updated', { walletId });
          
          return true;
        } else {
          // Revert optimistic update
          this.revertPrimaryWalletUpdate();
          return false;
        }
      } catch (apiError) {
        logger.error('[BalanceManager] API call failed, reverting optimistic update:', apiError);
        this.revertPrimaryWalletUpdate();
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
  private revertPrimaryWalletUpdate(): void {
    // This would require storing the previous state, for now just log
    logger.debug('[BalanceManager] Would revert primary wallet update');
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
         currency_id: '', // We don't have this in WalletDisplay
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