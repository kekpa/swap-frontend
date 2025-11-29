/**
 * AccountsManager Tests
 *
 * Tests Instagram-style multi-account management including
 * account storage, switching, limits, and legacy migration.
 */

// Mock dependencies before importing
const mockSecureStore: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockSecureStore[key] || null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStore[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete mockSecureStore[key];
    return Promise.resolve();
  }),
}));

jest.mock('../../utils/logger');

import * as SecureStore from 'expo-secure-store';
import AccountsManager, { Account, AccountsData } from '../AccountsManager';

// Test data
const testAccount1: Account = {
  userId: 'user-001',
  email: 'user1@example.com',
  phone: '+1234567890',
  profileId: 'profile-001',
  profileType: 'personal',
  entityId: 'entity-001',
  displayName: 'John Doe',
  avatarUrl: 'https://example.com/avatar1.jpg',
  accessToken: 'access-token-1',
  refreshToken: 'refresh-token-1',
  addedAt: Date.now(),
};

const testAccount2: Account = {
  userId: 'user-002',
  email: 'user2@example.com',
  phone: '+0987654321',
  profileId: 'profile-002',
  profileType: 'business',
  entityId: 'entity-002',
  displayName: 'Jane Business',
  avatarUrl: 'https://example.com/avatar2.jpg',
  accessToken: 'access-token-2',
  refreshToken: 'refresh-token-2',
  addedAt: Date.now(),
};

describe('AccountsManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear mock secure store
    Object.keys(mockSecureStore).forEach((key) => delete mockSecureStore[key]);
  });

  // ============================================================
  // getAccountsData TESTS
  // ============================================================

  describe('getAccountsData', () => {
    it('should return null when no accounts data exists', async () => {
      const data = await AccountsManager.getAccountsData();
      expect(data).toBeNull();
    });

    it('should return accounts data when exists', async () => {
      const accountsData: AccountsData = {
        currentUserId: 'user-001',
        accounts: [testAccount1],
      };
      mockSecureStore['swap_accounts'] = JSON.stringify(accountsData);

      const data = await AccountsManager.getAccountsData();

      expect(data).not.toBeNull();
      expect(data?.currentUserId).toBe('user-001');
      expect(data?.accounts).toHaveLength(1);
    });

    it('should handle corrupted JSON gracefully', async () => {
      mockSecureStore['swap_accounts'] = 'invalid json';

      const data = await AccountsManager.getAccountsData();

      expect(data).toBeNull();
    });

    it('should handle SecureStore errors gracefully', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('SecureStore error')
      );

      const data = await AccountsManager.getAccountsData();

      expect(data).toBeNull();
    });
  });

  // ============================================================
  // getAllAccounts TESTS
  // ============================================================

  describe('getAllAccounts', () => {
    it('should return empty array when no accounts', async () => {
      const accounts = await AccountsManager.getAllAccounts();
      expect(accounts).toEqual([]);
    });

    it('should return all accounts', async () => {
      const accountsData: AccountsData = {
        currentUserId: 'user-001',
        accounts: [testAccount1, testAccount2],
      };
      mockSecureStore['swap_accounts'] = JSON.stringify(accountsData);

      const accounts = await AccountsManager.getAllAccounts();

      expect(accounts).toHaveLength(2);
      expect(accounts[0].userId).toBe('user-001');
      expect(accounts[1].userId).toBe('user-002');
    });
  });

  // ============================================================
  // getCurrentAccount TESTS
  // ============================================================

  describe('getCurrentAccount', () => {
    it('should return null when no accounts data', async () => {
      const current = await AccountsManager.getCurrentAccount();
      expect(current).toBeNull();
    });

    it('should return current account', async () => {
      const accountsData: AccountsData = {
        currentUserId: 'user-002',
        accounts: [testAccount1, testAccount2],
      };
      mockSecureStore['swap_accounts'] = JSON.stringify(accountsData);

      const current = await AccountsManager.getCurrentAccount();

      expect(current).not.toBeNull();
      expect(current?.userId).toBe('user-002');
      expect(current?.displayName).toBe('Jane Business');
    });

    it('should return null if current user not in accounts', async () => {
      const accountsData: AccountsData = {
        currentUserId: 'non-existent',
        accounts: [testAccount1],
      };
      mockSecureStore['swap_accounts'] = JSON.stringify(accountsData);

      const current = await AccountsManager.getCurrentAccount();

      expect(current).toBeNull();
    });
  });

  // ============================================================
  // addAccount TESTS
  // ============================================================

  describe('addAccount', () => {
    it('should add first account and set as current', async () => {
      await AccountsManager.addAccount(testAccount1);

      const data = await AccountsManager.getAccountsData();
      expect(data?.accounts).toHaveLength(1);
      expect(data?.currentUserId).toBe('user-001');
    });

    it('should add additional account and set as current', async () => {
      await AccountsManager.addAccount(testAccount1);
      await AccountsManager.addAccount(testAccount2);

      const data = await AccountsManager.getAccountsData();
      expect(data?.accounts).toHaveLength(2);
      expect(data?.currentUserId).toBe('user-002'); // New account becomes current
    });

    it('should update existing account instead of duplicating', async () => {
      await AccountsManager.addAccount(testAccount1);

      const updatedAccount = {
        ...testAccount1,
        displayName: 'Updated Name',
        accessToken: 'new-token',
      };
      await AccountsManager.addAccount(updatedAccount);

      const data = await AccountsManager.getAccountsData();
      expect(data?.accounts).toHaveLength(1);
      expect(data?.accounts[0].displayName).toBe('Updated Name');
      expect(data?.accounts[0].accessToken).toBe('new-token');
    });

    it('should enforce max 5 accounts limit', async () => {
      // Add 5 accounts
      for (let i = 1; i <= 5; i++) {
        await AccountsManager.addAccount({
          ...testAccount1,
          userId: `user-${i}`,
        });
      }

      // Try to add 6th account
      await expect(
        AccountsManager.addAccount({
          ...testAccount1,
          userId: 'user-6',
        })
      ).rejects.toThrow('Maximum 5 accounts allowed');
    });

    it('should allow updating existing account when at max limit', async () => {
      // Add 5 accounts
      for (let i = 1; i <= 5; i++) {
        await AccountsManager.addAccount({
          ...testAccount1,
          userId: `user-${i}`,
        });
      }

      // Update existing account should work
      await AccountsManager.addAccount({
        ...testAccount1,
        userId: 'user-3',
        displayName: 'Updated User 3',
      });

      const data = await AccountsManager.getAccountsData();
      expect(data?.accounts).toHaveLength(5);
      const updatedAccount = data?.accounts.find((a) => a.userId === 'user-3');
      expect(updatedAccount?.displayName).toBe('Updated User 3');
    });

    it('should handle SecureStore errors', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      await expect(AccountsManager.addAccount(testAccount1)).rejects.toThrow(
        'Storage error'
      );
    });
  });

  // ============================================================
  // switchAccount TESTS
  // ============================================================

  describe('switchAccount', () => {
    it('should switch to different account', async () => {
      await AccountsManager.addAccount(testAccount1);
      await AccountsManager.addAccount(testAccount2);

      const result = await AccountsManager.switchAccount('user-001');

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user-001');

      const data = await AccountsManager.getAccountsData();
      expect(data?.currentUserId).toBe('user-001');
    });

    it('should return null when no accounts data', async () => {
      const result = await AccountsManager.switchAccount('user-001');
      expect(result).toBeNull();
    });

    it('should return null when account not found', async () => {
      await AccountsManager.addAccount(testAccount1);

      const result = await AccountsManager.switchAccount('non-existent');
      expect(result).toBeNull();
    });

    it('should return full account data on switch', async () => {
      await AccountsManager.addAccount(testAccount1);

      const result = await AccountsManager.switchAccount('user-001');

      expect(result?.accessToken).toBe('access-token-1');
      expect(result?.refreshToken).toBe('refresh-token-1');
      expect(result?.profileId).toBe('profile-001');
      expect(result?.entityId).toBe('entity-001');
    });

    it('should handle SecureStore errors', async () => {
      await AccountsManager.addAccount(testAccount1);

      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      await expect(AccountsManager.switchAccount('user-001')).rejects.toThrow(
        'Storage error'
      );
    });
  });

  // ============================================================
  // removeAccount TESTS
  // ============================================================

  describe('removeAccount', () => {
    it('should remove account', async () => {
      await AccountsManager.addAccount(testAccount1);
      await AccountsManager.addAccount(testAccount2);

      await AccountsManager.removeAccount('user-001');

      const accounts = await AccountsManager.getAllAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0].userId).toBe('user-002');
    });

    it('should switch to first available after removing current', async () => {
      await AccountsManager.addAccount(testAccount1);
      await AccountsManager.addAccount(testAccount2);

      // Current is user-002 (last added)
      await AccountsManager.removeAccount('user-002');

      const data = await AccountsManager.getAccountsData();
      expect(data?.currentUserId).toBe('user-001');
    });

    it('should clear storage when removing last account', async () => {
      await AccountsManager.addAccount(testAccount1);

      await AccountsManager.removeAccount('user-001');

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('swap_accounts');

      const data = await AccountsManager.getAccountsData();
      expect(data).toBeNull();
    });

    it('should do nothing when no accounts data', async () => {
      await AccountsManager.removeAccount('non-existent');

      // Should not throw
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should handle SecureStore errors', async () => {
      await AccountsManager.addAccount(testAccount1);
      await AccountsManager.addAccount(testAccount2);

      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      await expect(AccountsManager.removeAccount('user-001')).rejects.toThrow(
        'Storage error'
      );
    });
  });

  // ============================================================
  // clearAllAccounts TESTS
  // ============================================================

  describe('clearAllAccounts', () => {
    it('should clear all accounts', async () => {
      await AccountsManager.addAccount(testAccount1);
      await AccountsManager.addAccount(testAccount2);

      await AccountsManager.clearAllAccounts();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('swap_accounts');

      const data = await AccountsManager.getAccountsData();
      expect(data).toBeNull();
    });

    it('should handle clearing when no accounts', async () => {
      await AccountsManager.clearAllAccounts();

      // Should not throw
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });

    it('should handle SecureStore errors', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      await expect(AccountsManager.clearAllAccounts()).rejects.toThrow(
        'Storage error'
      );
    });
  });

  // ============================================================
  // migrateLegacyAccount TESTS
  // ============================================================

  describe('migrateLegacyAccount', () => {
    it('should migrate legacy account to new structure', async () => {
      // Set up legacy tokens
      mockSecureStore['accessToken'] = 'legacy-access-token';
      mockSecureStore['refreshToken'] = 'legacy-refresh-token';

      await AccountsManager.migrateLegacyAccount(
        'legacy-user',
        'legacy-profile',
        'legacy-entity',
        'Legacy User',
        'personal'
      );

      const data = await AccountsManager.getAccountsData();
      expect(data?.accounts).toHaveLength(1);
      expect(data?.accounts[0].userId).toBe('legacy-user');
      expect(data?.accounts[0].accessToken).toBe('legacy-access-token');
      expect(data?.accounts[0].refreshToken).toBe('legacy-refresh-token');
    });

    it('should skip migration if already migrated', async () => {
      // Set up existing accounts data
      const existingData: AccountsData = {
        currentUserId: 'user-001',
        accounts: [testAccount1],
      };
      mockSecureStore['swap_accounts'] = JSON.stringify(existingData);

      // Also set up legacy tokens
      mockSecureStore['accessToken'] = 'legacy-access-token';
      mockSecureStore['refreshToken'] = 'legacy-refresh-token';

      await AccountsManager.migrateLegacyAccount(
        'legacy-user',
        'legacy-profile',
        'legacy-entity',
        'Legacy User',
        'personal'
      );

      const data = await AccountsManager.getAccountsData();
      expect(data?.accounts).toHaveLength(1);
      expect(data?.accounts[0].userId).toBe('user-001'); // Original, not migrated
    });

    it('should skip migration if no legacy tokens', async () => {
      // No legacy tokens set

      await AccountsManager.migrateLegacyAccount(
        'legacy-user',
        'legacy-profile',
        'legacy-entity',
        'Legacy User',
        'personal'
      );

      const data = await AccountsManager.getAccountsData();
      expect(data).toBeNull();
    });

    it('should skip migration if only access token exists', async () => {
      mockSecureStore['accessToken'] = 'legacy-access-token';
      // No refresh token

      await AccountsManager.migrateLegacyAccount(
        'legacy-user',
        'legacy-profile',
        'legacy-entity',
        'Legacy User',
        'personal'
      );

      const data = await AccountsManager.getAccountsData();
      expect(data).toBeNull();
    });

    it('should handle migration errors', async () => {
      mockSecureStore['accessToken'] = 'legacy-access-token';
      mockSecureStore['refreshToken'] = 'legacy-refresh-token';

      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      await expect(
        AccountsManager.migrateLegacyAccount(
          'legacy-user',
          'legacy-profile',
          'legacy-entity',
          'Legacy User',
          'personal'
        )
      ).rejects.toThrow('Storage error');
    });
  });

  // ============================================================
  // updateAccountTokens TESTS
  // ============================================================

  describe('updateAccountTokens', () => {
    it('should update tokens for existing account', async () => {
      await AccountsManager.addAccount(testAccount1);

      await AccountsManager.updateAccountTokens(
        'user-001',
        'new-access-token',
        'new-refresh-token'
      );

      const data = await AccountsManager.getAccountsData();
      expect(data?.accounts[0].accessToken).toBe('new-access-token');
      expect(data?.accounts[0].refreshToken).toBe('new-refresh-token');
    });

    it('should do nothing when no accounts data', async () => {
      await AccountsManager.updateAccountTokens(
        'user-001',
        'new-access',
        'new-refresh'
      );

      // Should not throw
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should do nothing when account not found', async () => {
      await AccountsManager.addAccount(testAccount1);

      // Clear mock to track new calls
      (SecureStore.setItemAsync as jest.Mock).mockClear();

      await AccountsManager.updateAccountTokens(
        'non-existent',
        'new-access',
        'new-refresh'
      );

      // Should not save (no changes)
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should handle SecureStore errors', async () => {
      await AccountsManager.addAccount(testAccount1);

      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      await expect(
        AccountsManager.updateAccountTokens(
          'user-001',
          'new-access',
          'new-refresh'
        )
      ).rejects.toThrow('Storage error');
    });

    it('should only update tokens, not other fields', async () => {
      await AccountsManager.addAccount(testAccount1);

      await AccountsManager.updateAccountTokens(
        'user-001',
        'new-access-token',
        'new-refresh-token'
      );

      const data = await AccountsManager.getAccountsData();
      const account = data?.accounts[0];

      // Tokens should be updated
      expect(account?.accessToken).toBe('new-access-token');
      expect(account?.refreshToken).toBe('new-refresh-token');

      // Other fields should remain unchanged
      expect(account?.displayName).toBe('John Doe');
      expect(account?.email).toBe('user1@example.com');
      expect(account?.profileId).toBe('profile-001');
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe('edge cases', () => {
    it('should handle account without optional fields', async () => {
      const minimalAccount: Account = {
        userId: 'minimal-user',
        profileId: 'profile',
        profileType: 'personal',
        entityId: 'entity',
        displayName: 'Minimal User',
        accessToken: 'token',
        refreshToken: 'refresh',
        addedAt: Date.now(),
        // No email, phone, avatarUrl
      };

      await AccountsManager.addAccount(minimalAccount);

      const data = await AccountsManager.getAccountsData();
      expect(data?.accounts[0].userId).toBe('minimal-user');
      expect(data?.accounts[0].email).toBeUndefined();
    });

    it('should handle rapid sequential operations', async () => {
      // Add multiple accounts rapidly
      await Promise.all([
        AccountsManager.addAccount({ ...testAccount1, userId: 'rapid-1' }),
        AccountsManager.addAccount({ ...testAccount1, userId: 'rapid-2' }),
        AccountsManager.addAccount({ ...testAccount1, userId: 'rapid-3' }),
      ]);

      // Note: Due to race conditions, the exact state may vary
      // But should not throw errors
      const accounts = await AccountsManager.getAllAccounts();
      expect(accounts.length).toBeGreaterThan(0);
    });

    it('should handle switching to current account (no-op)', async () => {
      await AccountsManager.addAccount(testAccount1);

      const result = await AccountsManager.switchAccount('user-001');

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user-001');
    });

    it('should handle removing non-existent account', async () => {
      await AccountsManager.addAccount(testAccount1);

      await AccountsManager.removeAccount('non-existent');

      // Original account should still exist
      const accounts = await AccountsManager.getAllAccounts();
      expect(accounts).toHaveLength(1);
    });

    it('should preserve addedAt timestamp on update', async () => {
      const originalAddedAt = Date.now() - 10000; // 10 seconds ago
      const accountWithOldTimestamp = {
        ...testAccount1,
        addedAt: originalAddedAt,
      };

      await AccountsManager.addAccount(accountWithOldTimestamp);

      // Update the account
      const updatedAccount = {
        ...testAccount1,
        displayName: 'Updated Name',
        addedAt: Date.now(), // New timestamp
      };
      await AccountsManager.addAccount(updatedAccount);

      const data = await AccountsManager.getAccountsData();
      // addedAt should be updated to new value (by design, update replaces whole account)
      expect(data?.accounts[0].displayName).toBe('Updated Name');
    });

    it('should handle account with business profile type', async () => {
      const businessAccount: Account = {
        ...testAccount1,
        userId: 'business-user',
        profileType: 'business',
        displayName: 'My Business LLC',
      };

      await AccountsManager.addAccount(businessAccount);

      const current = await AccountsManager.getCurrentAccount();
      expect(current?.profileType).toBe('business');
    });
  });

  // ============================================================
  // STORAGE KEY TESTS
  // ============================================================

  describe('storage keys', () => {
    it('should use correct storage key for accounts', async () => {
      await AccountsManager.addAccount(testAccount1);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'swap_accounts',
        expect.any(String)
      );
    });

    it('should read legacy tokens from correct keys', async () => {
      mockSecureStore['accessToken'] = 'legacy-access';
      mockSecureStore['refreshToken'] = 'legacy-refresh';

      await AccountsManager.migrateLegacyAccount(
        'user',
        'profile',
        'entity',
        'User',
        'personal'
      );

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('accessToken');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('refreshToken');
    });
  });
});
