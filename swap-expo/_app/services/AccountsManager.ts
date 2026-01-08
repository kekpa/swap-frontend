/**
 * AccountsManager Service
 *
 * Instagram-style multi-account management.
 * Allows users to have multiple personal accounts (different phone numbers)
 * and switch between them without logging out.
 *
 * Architecture:
 * - Stores array of accounts in SecureStore
 * - Each account has its own tokens and profile context
 * - Switching accounts doesn't require backend API call (just swaps tokens)
 * - Backward compatible with single-account structure
 */

import * as SecureStore from 'expo-secure-store';
import logger from '../utils/logger';

const ACCOUNTS_STORAGE_KEY = 'swap_accounts';
const LEGACY_ACCESS_TOKEN_KEY = 'accessToken';
const LEGACY_REFRESH_TOKEN_KEY = 'refreshToken';

export interface Account {
  userId: string;
  email?: string;
  phone?: string;
  username?: string; // For personal profiles (Instagram-style display)
  businessName?: string; // For business profiles
  profileId: string;
  profileType: 'personal' | 'business';
  entityId: string;
  displayName: string;
  firstName?: string; // Actual first name from profile (not parsed from displayName)
  lastName?: string; // Actual last name from profile
  avatarUrl?: string;
  accessToken: string;
  refreshToken: string;
  addedAt: number; // Timestamp
}

export interface AccountsData {
  currentUserId: string;
  accounts: Account[];
}

class AccountsManagerService {
  /**
   * Get all accounts data
   */
  async getAccountsData(): Promise<AccountsData | null> {
    try {
      const data = await SecureStore.getItemAsync(ACCOUNTS_STORAGE_KEY);
      if (!data) {
        logger.debug('[AccountsManager] No accounts data found');
        return null;
      }

      const parsed: AccountsData = JSON.parse(data);
      logger.debug('[AccountsManager] Loaded accounts data', 'auth', {
        currentUserId: parsed.currentUserId,
        accountCount: parsed.accounts.length,
      });

      return parsed;
    } catch (error) {
      logger.error('[AccountsManager] Error loading accounts data:', error);
      return null;
    }
  }

  /**
   * Get all accounts
   */
  async getAllAccounts(): Promise<Account[]> {
    const data = await this.getAccountsData();
    return data?.accounts || [];
  }

  /**
   * Get current account
   */
  async getCurrentAccount(): Promise<Account | null> {
    const data = await this.getAccountsData();
    if (!data) return null;

    const current = data.accounts.find((acc) => acc.userId === data.currentUserId);
    return current || null;
  }

  /**
   * Add new account
   */
  async addAccount(account: Account): Promise<void> {
    try {
      let data = await this.getAccountsData();

      if (!data) {
        // First account - create new structure
        data = {
          currentUserId: account.userId,
          accounts: [account],
        };
      } else {
        // Check if account already exists
        const existingIndex = data.accounts.findIndex((acc) => acc.userId === account.userId);

        if (existingIndex >= 0) {
          // Update existing account
          data.accounts[existingIndex] = account;
          logger.info('[AccountsManager] Updated existing account:', account.userId);
        } else {
          // Phase 2.4: Enforce max accounts limit (5 accounts per device)
          if (data.accounts.length >= 5) {
            logger.error('[AccountsManager] Max accounts limit reached:', data.accounts.length);
            throw new Error('Maximum 5 accounts allowed per device. Please remove an existing account first.');
          }

          // Add new account
          data.accounts.push(account);
          logger.info('[AccountsManager] Added new account:', account.userId);
        }

        // Set as current account
        data.currentUserId = account.userId;
      }

      await SecureStore.setItemAsync(ACCOUNTS_STORAGE_KEY, JSON.stringify(data));
      logger.info('[AccountsManager] Saved accounts data');
    } catch (error) {
      logger.error('[AccountsManager] Error adding account:', error);
      throw error;
    }
  }

  /**
   * Switch to different account
   */
  async switchAccount(userId: string): Promise<Account | null> {
    try {
      const data = await this.getAccountsData();
      if (!data) {
        logger.error('[AccountsManager] No accounts data found for switch');
        return null;
      }

      const account = data.accounts.find((acc) => acc.userId === userId);
      if (!account) {
        logger.error('[AccountsManager] Account not found:', userId);
        return null;
      }

      // Update current user
      data.currentUserId = userId;
      await SecureStore.setItemAsync(ACCOUNTS_STORAGE_KEY, JSON.stringify(data));

      logger.info('[AccountsManager] Switched to account', 'auth', {
        userId,
        displayName: account.displayName,
      });

      return account;
    } catch (error) {
      logger.error('[AccountsManager] Error switching account:', error);
      throw error;
    }
  }

  /**
   * Remove account
   */
  async removeAccount(userId: string): Promise<void> {
    try {
      const data = await this.getAccountsData();
      if (!data) return;

      // Remove account from array
      data.accounts = data.accounts.filter((acc) => acc.userId !== userId);

      if (data.accounts.length === 0) {
        // No accounts left - clear storage
        await SecureStore.deleteItemAsync(ACCOUNTS_STORAGE_KEY);
        logger.info('[AccountsManager] Removed last account, cleared storage');
      } else {
        // If we removed current account, switch to first available
        if (data.currentUserId === userId) {
          data.currentUserId = data.accounts[0].userId;
          logger.info('[AccountsManager] Switched to first account after removal');
        }

        await SecureStore.setItemAsync(ACCOUNTS_STORAGE_KEY, JSON.stringify(data));
        logger.info('[AccountsManager] Removed account:', userId);
      }
    } catch (error) {
      logger.error('[AccountsManager] Error removing account:', error);
      throw error;
    }
  }

  /**
   * Clear all accounts (logout all)
   */
  async clearAllAccounts(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCOUNTS_STORAGE_KEY);
      logger.info('[AccountsManager] Cleared all accounts');
    } catch (error) {
      logger.error('[AccountsManager] Error clearing accounts:', error);
      throw error;
    }
  }

  /**
   * Migrate from legacy single-account structure
   * This ensures backward compatibility
   */
  async migrateLegacyAccount(
    userId: string,
    profileId: string,
    entityId: string,
    displayName: string,
    profileType: 'personal' | 'business',
  ): Promise<void> {
    try {
      // Check if already migrated
      const existingData = await this.getAccountsData();
      if (existingData) {
        logger.debug('[AccountsManager] Already migrated, skipping');
        return;
      }

      // Get legacy tokens
      const accessToken = await SecureStore.getItemAsync(LEGACY_ACCESS_TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(LEGACY_REFRESH_TOKEN_KEY);

      if (!accessToken || !refreshToken) {
        logger.debug('[AccountsManager] No legacy tokens found');
        return;
      }

      // Create account from legacy data
      const account: Account = {
        userId,
        profileId,
        entityId,
        displayName,
        profileType,
        accessToken,
        refreshToken,
        addedAt: Date.now(),
      };

      // Add as first account
      await this.addAccount(account);

      // Keep legacy tokens for backward compatibility
      // (Don't delete them yet in case of rollback)

      logger.info('[AccountsManager] Migrated legacy account successfully');
    } catch (error) {
      logger.error('[AccountsManager] Error migrating legacy account:', error);
      throw error;
    }
  }

  /**
   * Update account tokens (after token refresh)
   */
  async updateAccountTokens(
    userId: string,
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    try {
      const data = await this.getAccountsData();
      if (!data) return;

      const accountIndex = data.accounts.findIndex((acc) => acc.userId === userId);
      if (accountIndex < 0) {
        logger.error('[AccountsManager] Account not found for token update:', userId);
        return;
      }

      // Update tokens
      data.accounts[accountIndex].accessToken = accessToken;
      data.accounts[accountIndex].refreshToken = refreshToken;

      await SecureStore.setItemAsync(ACCOUNTS_STORAGE_KEY, JSON.stringify(data));
      logger.debug('[AccountsManager] Updated tokens for account:', userId);
    } catch (error) {
      logger.error('[AccountsManager] Error updating tokens:', error);
      throw error;
    }
  }
}

export default new AccountsManagerService();
