/**
 * CurrencyWalletsRepository Tests
 *
 * Tests the local SQLite currency wallets storage for offline capability.
 * Tests CRUD operations, profile isolation, batch processing, and sync.
 */

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock logger
jest.mock('../../utils/logger');

// Mock eventEmitter
jest.mock('../../utils/eventEmitter');

// Mock database
const mockDatabase = {
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn(),
  runAsync: jest.fn(),
  prepareAsync: jest.fn(),
};

const mockStatement = {
  executeAsync: jest.fn(),
  finalizeAsync: jest.fn(),
};

// Mock DatabaseManager
jest.mock('../DatabaseManager', () => {
  return {
    databaseManager: {
      initialize: jest.fn(),
      getDatabase: jest.fn(),
      isDatabaseReady: jest.fn(),
    },
  };
});

// Import after mocks
import {
  currencyWalletsRepository,
  CurrencyWalletsRepository,
  CurrencyWallet,
} from '../CurrencyWalletsRepository';
import { databaseManager } from '../DatabaseManager';
import { Platform } from 'react-native';
import logger from '../../utils/logger';
import { eventEmitter } from '../../utils/eventEmitter';

const mockDatabaseManager = databaseManager as jest.Mocked<typeof databaseManager>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockEmit = eventEmitter.emit as jest.Mock;

// Test data
const mockWallet: CurrencyWallet = {
  id: 'wallet-123',
  account_id: 'account-456',
  currency_id: 'currency-789',
  currency_code: 'HTG',
  currency_symbol: 'G',
  currency_name: 'Haitian Gourde',
  balance: 1000.5,
  reserved_balance: 50,
  available_balance: 950.5,
  balance_last_updated: '2024-01-01T12:00:00Z',
  is_active: true,
  is_primary: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T12:00:00Z',
  is_synced: true,
};

const mockProfileId = 'profile-123';

describe('CurrencyWalletsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockDatabaseManager.initialize.mockResolvedValue(true);
    mockDatabaseManager.getDatabase.mockReturnValue(mockDatabase as any);
    mockDatabaseManager.isDatabaseReady.mockReturnValue(true);

    mockDatabase.getFirstAsync.mockResolvedValue(null);
    mockDatabase.getAllAsync.mockResolvedValue([]);
    mockDatabase.runAsync.mockResolvedValue({ changes: 1 });
    mockDatabase.prepareAsync.mockResolvedValue(mockStatement);

    mockStatement.executeAsync.mockResolvedValue({ changes: 1 });
    mockStatement.finalizeAsync.mockResolvedValue(undefined);

    // Reset platform
    (Platform as any).OS = 'ios';
  });

  // ============================================================
  // SINGLETON TESTS
  // ============================================================

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = CurrencyWalletsRepository.getInstance();
      const instance2 = CurrencyWalletsRepository.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should export singleton instance', () => {
      expect(currencyWalletsRepository).toBeInstanceOf(CurrencyWalletsRepository);
    });
  });

  // ============================================================
  // isSQLiteAvailable TESTS
  // ============================================================

  describe('isSQLiteAvailable', () => {
    it('should return true when database is ready', async () => {
      const result = await currencyWalletsRepository.isSQLiteAvailable();

      expect(result).toBe(true);
    });

    it('should return false on web platform', async () => {
      (Platform as any).OS = 'web';

      const result = await currencyWalletsRepository.isSQLiteAvailable();

      expect(result).toBe(false);
    });

    it('should return false when database not ready', async () => {
      mockDatabaseManager.isDatabaseReady.mockReturnValue(false);

      const result = await currencyWalletsRepository.isSQLiteAvailable();

      expect(result).toBe(false);
    });

    it('should return false on initialization failure', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(false);

      const result = await currencyWalletsRepository.isSQLiteAvailable();

      expect(result).toBe(false);
    });
  });

  // ============================================================
  // insertCurrencyWallet TESTS
  // ============================================================

  describe('insertCurrencyWallet', () => {
    it('should insert wallet successfully', async () => {
      await currencyWalletsRepository.insertCurrencyWallet(mockWallet, mockProfileId);

      expect(mockDatabase.prepareAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO currency_wallets'),
      );
      expect(mockStatement.executeAsync).toHaveBeenCalled();
      expect(mockStatement.finalizeAsync).toHaveBeenCalled();
    });

    it('should include profileId in insert', async () => {
      await currencyWalletsRepository.insertCurrencyWallet(mockWallet, mockProfileId);

      expect(mockStatement.executeAsync).toHaveBeenCalledWith(
        mockWallet.id,
        mockWallet.account_id,
        mockWallet.currency_id,
        mockWallet.currency_code,
        mockWallet.currency_symbol,
        mockWallet.currency_name,
        mockWallet.balance,
        mockWallet.reserved_balance,
        mockWallet.available_balance,
        expect.any(String), // balance_last_updated
        1, // is_active
        1, // is_primary
        expect.any(String), // created_at
        expect.any(String), // updated_at
        1, // is_synced
        mockProfileId,
      );
    });

    it('should emit data_updated event', async () => {
      await currencyWalletsRepository.insertCurrencyWallet(mockWallet, mockProfileId);

      expect(mockEmit).toHaveBeenCalledWith('data_updated', {
        type: 'wallets',
        data: mockWallet,
        profileId: mockProfileId,
      });
    });

    it('should not insert when SQLite not available', async () => {
      mockDatabaseManager.isDatabaseReady.mockReturnValue(false);

      await currencyWalletsRepository.insertCurrencyWallet(mockWallet, mockProfileId);

      expect(mockDatabase.prepareAsync).not.toHaveBeenCalled();
    });

    it('should not insert when missing required fields', async () => {
      const invalidWallet = { ...mockWallet, id: null } as any;

      await currencyWalletsRepository.insertCurrencyWallet(invalidWallet, mockProfileId);

      expect(mockDatabase.prepareAsync).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Missing required fields'),
      );
    });

    it('should not insert when missing account_id', async () => {
      const invalidWallet = { ...mockWallet, account_id: null } as any;

      await currencyWalletsRepository.insertCurrencyWallet(invalidWallet, mockProfileId);

      expect(mockDatabase.prepareAsync).not.toHaveBeenCalled();
    });

    it('should not insert when missing currency_id', async () => {
      const invalidWallet = { ...mockWallet, currency_id: '' };

      await currencyWalletsRepository.insertCurrencyWallet(invalidWallet, mockProfileId);

      expect(mockDatabase.prepareAsync).not.toHaveBeenCalled();
    });

    it('should handle insert errors gracefully', async () => {
      mockStatement.executeAsync.mockRejectedValue(new Error('DB error'));

      await expect(
        currencyWalletsRepository.insertCurrencyWallet(mockWallet, mockProfileId),
      ).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // ============================================================
  // getAllCurrencyWallets TESTS
  // ============================================================

  describe('getAllCurrencyWallets', () => {
    it('should return all active wallets for profile', async () => {
      const mockRows = [
        { ...mockWallet, is_active: 1, is_primary: 1, is_synced: 1 },
      ];
      mockDatabase.getAllAsync.mockResolvedValue(mockRows);

      const result = await currencyWalletsRepository.getAllCurrencyWallets(mockProfileId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('wallet-123');
      expect(result[0].is_active).toBe(true);
    });

    it('should filter by profile ID', async () => {
      await currencyWalletsRepository.getAllCurrencyWallets(mockProfileId);

      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('profile_id = ?'),
        [mockProfileId],
      );
    });

    it('should filter only active wallets', async () => {
      await currencyWalletsRepository.getAllCurrencyWallets(mockProfileId);

      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('is_active = 1'),
        expect.any(Array),
      );
    });

    it('should order by primary then currency code', async () => {
      await currencyWalletsRepository.getAllCurrencyWallets(mockProfileId);

      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY is_primary DESC, currency_code ASC'),
        expect.any(Array),
      );
    });

    it('should return empty array when SQLite not available', async () => {
      mockDatabaseManager.isDatabaseReady.mockReturnValue(false);

      const result = await currencyWalletsRepository.getAllCurrencyWallets(mockProfileId);

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockDatabase.getAllAsync.mockRejectedValue(new Error('DB error'));

      const result = await currencyWalletsRepository.getAllCurrencyWallets(mockProfileId);

      expect(result).toEqual([]);
    });

    it('should convert numeric values correctly', async () => {
      const mockRows = [
        { ...mockWallet, balance: '1000.50', reserved_balance: '50', available_balance: '950.50' },
      ];
      mockDatabase.getAllAsync.mockResolvedValue(mockRows);

      const result = await currencyWalletsRepository.getAllCurrencyWallets(mockProfileId);

      expect(typeof result[0].balance).toBe('number');
      expect(result[0].balance).toBe(1000.5);
    });

    it('should convert boolean values correctly', async () => {
      const mockRows = [
        { ...mockWallet, is_active: 1, is_primary: 0, is_synced: 1 },
      ];
      mockDatabase.getAllAsync.mockResolvedValue(mockRows);

      const result = await currencyWalletsRepository.getAllCurrencyWallets(mockProfileId);

      expect(result[0].is_active).toBe(true);
      expect(result[0].is_primary).toBe(false);
      expect(result[0].is_synced).toBe(true);
    });
  });

  // ============================================================
  // saveCurrencyWallets TESTS
  // ============================================================

  describe('saveCurrencyWallets', () => {
    it('should save multiple wallets', async () => {
      const wallets = [
        { ...mockWallet, id: 'wallet-1' },
        { ...mockWallet, id: 'wallet-2' },
      ];

      await currencyWalletsRepository.saveCurrencyWallets(wallets, mockProfileId);

      expect(mockDatabase.prepareAsync).toHaveBeenCalledTimes(2);
    });

    it('should deduplicate wallets by ID', async () => {
      const wallets = [
        { ...mockWallet, id: 'wallet-1' },
        { ...mockWallet, id: 'wallet-1' }, // Duplicate
        { ...mockWallet, id: 'wallet-2' },
      ];

      await currencyWalletsRepository.saveCurrencyWallets(wallets, mockProfileId);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Deduplication removed 1'),
      );
    });

    it('should handle empty array', async () => {
      await currencyWalletsRepository.saveCurrencyWallets([], mockProfileId);

      expect(mockDatabase.prepareAsync).not.toHaveBeenCalled();
    });

    it('should handle null input', async () => {
      await currencyWalletsRepository.saveCurrencyWallets(null as any, mockProfileId);

      expect(mockDatabase.prepareAsync).not.toHaveBeenCalled();
    });

    it('should skip wallets without ID', async () => {
      const wallets = [
        { ...mockWallet, id: '' },
        { ...mockWallet, id: 'wallet-1' },
      ];

      await currencyWalletsRepository.saveCurrencyWallets(wallets, mockProfileId);

      // Only 1 wallet should be processed
      expect(mockDatabase.prepareAsync).toHaveBeenCalledTimes(1);
    });

    it('should not throw when SQLite not available', async () => {
      mockDatabaseManager.isDatabaseReady.mockReturnValue(false);

      await expect(
        currencyWalletsRepository.saveCurrencyWallets([mockWallet], mockProfileId),
      ).resolves.not.toThrow();
    });
  });

  // ============================================================
  // saveWalletBalances ALIAS TEST
  // ============================================================

  describe('saveWalletBalances', () => {
    it('should call saveCurrencyWallets', async () => {
      const wallets = [mockWallet];

      await currencyWalletsRepository.saveWalletBalances(wallets, mockProfileId);

      expect(mockDatabase.prepareAsync).toHaveBeenCalled();
    });
  });

  // ============================================================
  // clearAllCurrencyWallets TESTS
  // ============================================================

  describe('clearAllCurrencyWallets', () => {
    it('should delete all wallets for profile', async () => {
      await currencyWalletsRepository.clearAllCurrencyWallets(mockProfileId);

      expect(mockDatabase.prepareAsync).toHaveBeenCalledWith(
        'DELETE FROM currency_wallets WHERE profile_id = ?',
      );
      expect(mockStatement.executeAsync).toHaveBeenCalledWith(mockProfileId);
    });

    it('should not throw when SQLite not available', async () => {
      mockDatabaseManager.isDatabaseReady.mockReturnValue(false);

      await expect(
        currencyWalletsRepository.clearAllCurrencyWallets(mockProfileId),
      ).resolves.not.toThrow();
    });

    it('should handle errors gracefully', async () => {
      mockStatement.executeAsync.mockRejectedValue(new Error('DB error'));

      await expect(
        currencyWalletsRepository.clearAllCurrencyWallets(mockProfileId),
      ).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // ============================================================
  // updatePrimaryWallet TESTS
  // ============================================================

  describe('updatePrimaryWallet', () => {
    it('should update primary wallet status', async () => {
      await currencyWalletsRepository.updatePrimaryWallet('wallet-123', mockProfileId);

      // Should first set all to non-primary
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'UPDATE currency_wallets SET is_primary = 0, updated_at = ? WHERE profile_id = ?',
        expect.any(Array),
      );

      // Then set the selected as primary
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'UPDATE currency_wallets SET is_primary = 1, updated_at = ? WHERE id = ? AND profile_id = ?',
        expect.any(Array),
      );
    });

    it('should emit primary_wallet_changed event', async () => {
      await currencyWalletsRepository.updatePrimaryWallet('wallet-123', mockProfileId);

      expect(mockEmit).toHaveBeenCalledWith('data_updated', {
        type: 'primary_wallet_changed',
        data: { walletId: 'wallet-123', profileId: mockProfileId },
      });
    });

    it('should filter by profile ID', async () => {
      await currencyWalletsRepository.updatePrimaryWallet('wallet-123', mockProfileId);

      // Both updates should include profileId
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('profile_id = ?'),
        expect.arrayContaining([mockProfileId]),
      );
    });

    it('should not throw when SQLite not available', async () => {
      mockDatabaseManager.isDatabaseReady.mockReturnValue(false);

      await expect(
        currencyWalletsRepository.updatePrimaryWallet('wallet-123', mockProfileId),
      ).resolves.not.toThrow();
    });
  });

  // ============================================================
  // getWalletByCurrencyCode TESTS
  // ============================================================

  describe('getWalletByCurrencyCode', () => {
    it('should return wallet for currency code', async () => {
      const mockRow = { ...mockWallet, is_active: 1, is_primary: 1, is_synced: 1 };
      mockDatabase.getFirstAsync.mockResolvedValue(mockRow);

      const result = await currencyWalletsRepository.getWalletByCurrencyCode(
        'HTG',
        mockProfileId,
      );

      expect(result).not.toBeNull();
      expect(result?.currency_code).toBe('HTG');
    });

    it('should filter by currency code and profile ID', async () => {
      await currencyWalletsRepository.getWalletByCurrencyCode('HTG', mockProfileId);

      expect(mockDatabase.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('currency_code = ?'),
        ['HTG', mockProfileId],
      );
    });

    it('should only return active wallets', async () => {
      await currencyWalletsRepository.getWalletByCurrencyCode('HTG', mockProfileId);

      expect(mockDatabase.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('is_active = 1'),
        expect.any(Array),
      );
    });

    it('should return null when wallet not found', async () => {
      mockDatabase.getFirstAsync.mockResolvedValue(null);

      const result = await currencyWalletsRepository.getWalletByCurrencyCode(
        'USD',
        mockProfileId,
      );

      expect(result).toBeNull();
    });

    it('should return null when SQLite not available', async () => {
      mockDatabaseManager.isDatabaseReady.mockReturnValue(false);

      const result = await currencyWalletsRepository.getWalletByCurrencyCode(
        'HTG',
        mockProfileId,
      );

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockDatabase.getFirstAsync.mockRejectedValue(new Error('DB error'));

      const result = await currencyWalletsRepository.getWalletByCurrencyCode(
        'HTG',
        mockProfileId,
      );

      expect(result).toBeNull();
    });
  });

  // ============================================================
  // syncWalletsFromRemote TESTS
  // ============================================================

  describe('syncWalletsFromRemote', () => {
    it('should fetch and insert remote wallets', async () => {
      const remoteWallets = [
        { ...mockWallet, id: 'remote-1' },
        { ...mockWallet, id: 'remote-2' },
      ];
      const fetchRemote = jest.fn().mockResolvedValue(remoteWallets);

      await currencyWalletsRepository.syncWalletsFromRemote(fetchRemote, mockProfileId);

      expect(fetchRemote).toHaveBeenCalled();
      expect(mockDatabase.prepareAsync).toHaveBeenCalledTimes(2);
    });

    it('should emit data_updated event after sync', async () => {
      const remoteWallets = [mockWallet];
      const fetchRemote = jest.fn().mockResolvedValue(remoteWallets);

      await currencyWalletsRepository.syncWalletsFromRemote(fetchRemote, mockProfileId);

      expect(mockEmit).toHaveBeenCalledWith('data_updated', {
        type: 'wallets',
        data: remoteWallets,
        profileId: mockProfileId,
      });
    });

    it('should handle empty remote response', async () => {
      const fetchRemote = jest.fn().mockResolvedValue([]);

      await currencyWalletsRepository.syncWalletsFromRemote(fetchRemote, mockProfileId);

      expect(fetchRemote).toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      const fetchRemote = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        currencyWalletsRepository.syncWalletsFromRemote(fetchRemote, mockProfileId),
      ).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // ============================================================
  // PROFILE ISOLATION TESTS
  // ============================================================

  describe('profile isolation', () => {
    it('should isolate wallet queries by profile', async () => {
      await currencyWalletsRepository.getAllCurrencyWallets('profile-1');
      await currencyWalletsRepository.getAllCurrencyWallets('profile-2');

      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        expect.any(String),
        ['profile-1'],
      );
      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        expect.any(String),
        ['profile-2'],
      );
    });

    it('should isolate wallet inserts by profile', async () => {
      await currencyWalletsRepository.insertCurrencyWallet(mockWallet, 'profile-1');
      await currencyWalletsRepository.insertCurrencyWallet(mockWallet, 'profile-2');

      const calls = mockStatement.executeAsync.mock.calls;

      // Last parameter should be profileId
      expect(calls[0][calls[0].length - 1]).toBe('profile-1');
      expect(calls[1][calls[1].length - 1]).toBe('profile-2');
    });

    it('should isolate clear operations by profile', async () => {
      await currencyWalletsRepository.clearAllCurrencyWallets('profile-1');
      await currencyWalletsRepository.clearAllCurrencyWallets('profile-2');

      expect(mockStatement.executeAsync).toHaveBeenCalledWith('profile-1');
      expect(mockStatement.executeAsync).toHaveBeenCalledWith('profile-2');
    });
  });
});
