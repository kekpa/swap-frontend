/**
 * WalletManager - Fetches transactions for wallet views
 *
 * Purpose: Get transactions for specific accounts (wallet dashboard, transaction list)
 * This is DIFFERENT from UnifiedTimelineService which handles interaction timelines.
 *
 * - Wallet view: "Show me all transactions in my HTG account"
 * - Timeline view: "Show me all messages and transactions with Frantz" (UnifiedTimelineService)
 *
 * @author Swap Engineering Team
 * @date 2025-12-23 (Refactored from TransactionManager)
 */

import apiClient from '../_api/apiClient';
import { API_PATHS } from '../_api/apiPaths';
import { Transaction } from '../types/transaction.types';
import logger from '../utils/logger';
import { networkService } from './NetworkService';
import { transactionRepository } from '../localdb/TransactionRepository';
import { profileContextManager, ProfileSwitchStartData, ProfileSwitchCompleteData } from './ProfileContextManager';

class WalletManager {
  // Profile switch safety - pause fetching during switch
  private isPausedForProfileSwitch = false;
  private unsubscribeSwitchStart: (() => void) | null = null;
  private unsubscribeSwitchComplete: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    logger.info('[WalletManager] Initializing');
    this.subscribeToProfileSwitch();
    logger.info('[WalletManager] Initialization complete');
  }

  /**
   * Subscribe to profile switch events to prevent stale data operations
   */
  private subscribeToProfileSwitch(): void {
    this.unsubscribeSwitchStart = profileContextManager.onSwitchStart((data: ProfileSwitchStartData) => {
      logger.info('[WalletManager] Profile switch starting - pausing fetches');
      this.isPausedForProfileSwitch = true;
    });

    this.unsubscribeSwitchComplete = profileContextManager.onSwitchComplete((data: ProfileSwitchCompleteData) => {
      logger.info(`[WalletManager] Profile switch complete - resuming (${data.profileType})`);
      this.isPausedForProfileSwitch = false;
    });

    profileContextManager.onSwitchFailed(() => {
      logger.warn('[WalletManager] Profile switch failed - resuming');
      this.isPausedForProfileSwitch = false;
    });
  }

  /**
   * Get recent transactions from local repository
   */
  async getRecentTransactions(limit: number = 5): Promise<Transaction[]> {
    try {
      const context = profileContextManager.getCurrentContext();
      if (!context.profileId) {
        logger.warn('[WalletManager] No profile ID available');
        return [];
      }

      logger.debug(`[WalletManager] Getting ${limit} recent transactions`);
      const transactions = await transactionRepository.getRecentTransactions(context.profileId, limit);
      return transactions as Transaction[];
    } catch (error) {
      logger.error('[WalletManager] Failed to get recent transactions:', error);
      return [];
    }
  }

  /**
   * Get transactions for a specific account (wallet view)
   *
   * @param accountId - The account ID to get transactions for
   * @param limit - Number of transactions to return (default: 20)
   * @param offset - Number of transactions to skip (default: 0)
   * @param signal - Optional AbortSignal for cancellation on profile switch
   */
  async getTransactionsForAccount(
    accountId: string,
    limit: number = 20,
    offset: number = 0,
    signal?: AbortSignal
  ): Promise<{
    data: Transaction[];
    pagination: { total: number; limit: number; offset: number; hasMore: boolean };
    isCached?: boolean;
  }> {
    try {
      logger.debug(`[WalletManager] Getting transactions for account: ${accountId} (limit: ${limit}, offset: ${offset})`);

      // Check if paused for profile switch
      if (this.isPausedForProfileSwitch) {
        logger.debug('[WalletManager] Paused for profile switch - skipping fetch');
        return {
          data: [],
          pagination: { total: 0, limit, offset, hasMore: false }
        };
      }

      // Check if offline - return cached data (LOCAL-FIRST)
      const isOffline = networkService.getNetworkState().isOfflineMode;
      if (isOffline) {
        logger.debug('[WalletManager] OFFLINE: Returning cached transactions');

        const context = profileContextManager.getCurrentContext();
        if (!context.profileId) {
          logger.warn('[WalletManager] No profile ID available offline');
          return {
            data: [],
            pagination: { total: 0, limit, offset, hasMore: false },
            isCached: true
          };
        }

        const cachedTransactions = await transactionRepository.getTransactionsByAccount(
          context.profileId,
          accountId,
          limit
        );

        logger.debug(`[WalletManager] OFFLINE: Returning ${cachedTransactions.length} cached transactions`);
        return {
          data: cachedTransactions,
          pagination: {
            total: cachedTransactions.length,
            limit,
            offset,
            hasMore: false
          },
          isCached: true
        };
      }

      // Online - call backend API
      const response = await apiClient.get(`${API_PATHS.TRANSACTION.LIST}/account/${accountId}`, {
        params: { limit, offset },
        signal
      });

      if (response.status === 200) {
        let result = response.data;

        // Handle complex nested JSON structure from backend
        let parseAttempts = 0;
        while (typeof result === 'string' && parseAttempts < 3) {
          try {
            logger.debug(`[WalletManager] Parsing JSON string response (attempt ${parseAttempts + 1})`);
            result = JSON.parse(result);
            parseAttempts++;
          } catch (parseError) {
            logger.error(`[WalletManager] Failed to parse JSON string response (attempt ${parseAttempts + 1}):`, parseError);
            return {
              data: [],
              pagination: { total: 0, limit, offset, hasMore: false }
            };
          }
        }

        // Navigate through nested data structure
        if (result && result.data) {
          result = result.data;
        }

        // Handle indexed object structure (e.g., {"0": "{...}", "1": "{...}"})
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          const transactions: Transaction[] = [];

          for (const key in result) {
            if (result.hasOwnProperty(key) && !isNaN(parseInt(key))) {
              let transactionData = result[key];

              if (typeof transactionData === 'string') {
                try {
                  transactionData = JSON.parse(transactionData);
                } catch (parseError) {
                  logger.warn(`[WalletManager] Failed to parse transaction ${key}:`, parseError);
                  continue;
                }
              }

              if (transactionData && typeof transactionData === 'object') {
                transactions.push(transactionData);
              }
            }
          }

          logger.info(`[WalletManager] Retrieved ${transactions.length} transactions for account ${accountId}`);
          return {
            data: transactions,
            pagination: {
              total: transactions.length,
              limit,
              offset,
              hasMore: transactions.length === limit
            }
          };
        }

        // Handle direct array response
        if (Array.isArray(result)) {
          logger.info(`[WalletManager] Retrieved ${result.length} transactions for account ${accountId}`);
          return {
            data: result,
            pagination: {
              total: result.length,
              limit,
              offset,
              hasMore: result.length === limit
            }
          };
        }

        logger.warn('[WalletManager] Unexpected response structure:', typeof result);
        return {
          data: [],
          pagination: { total: 0, limit, offset, hasMore: false }
        };

      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }

    } catch (error) {
      logger.error(`[WalletManager] Failed to get transactions for account ${accountId}:`, error);
      return {
        data: [],
        pagination: { total: 0, limit, offset, hasMore: false }
      };
    }
  }

  cleanup(): void {
    if (this.unsubscribeSwitchStart) {
      this.unsubscribeSwitchStart();
      this.unsubscribeSwitchStart = null;
    }
    if (this.unsubscribeSwitchComplete) {
      this.unsubscribeSwitchComplete();
      this.unsubscribeSwitchComplete = null;
    }
    logger.debug('[WalletManager] Cleanup completed');
  }

  reset(): void {
    this.isPausedForProfileSwitch = false;
    logger.debug('[WalletManager] Reset completed');
  }
}

export const walletManager = new WalletManager();

// Keep backward compatibility during migration
export const transactionManager = walletManager;
