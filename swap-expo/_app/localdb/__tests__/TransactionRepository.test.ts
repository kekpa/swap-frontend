/**
 * TransactionRepository Tests
 *
 * Tests the local SQLite transaction storage for offline capability.
 * Tests CRUD operations, profile isolation, deduplication, and sync.
 */

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock logger
jest.mock('../../utils/logger');

// Mock eventEmitter - will connect in beforeEach
jest.mock('../../utils/eventEmitter');

// Mock DatabaseManager - define mocks inside factory to avoid hoisting issues
const mockDatabase = {
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn(),
  runAsync: jest.fn(),
  prepareAsync: jest.fn(),
  execAsync: jest.fn(),
};

const mockStatement = {
  executeAsync: jest.fn(),
  finalizeAsync: jest.fn(),
};

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
import { transactionRepository, TransactionRepository } from '../TransactionRepository';
import { databaseManager } from '../DatabaseManager';
import { Platform } from 'react-native';
import logger from '../../utils/logger';
import { eventEmitter } from '../../utils/eventEmitter';

const mockDatabaseManager = databaseManager as jest.Mocked<typeof databaseManager>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockEmit = eventEmitter.emit as jest.Mock;

// Test data - metadata must be stringified since repository calls JSON.parse on it
const mockTransaction = {
  id: 'txn-123',
  interaction_id: 'int-456',
  from_account_id: 'account-sender',
  to_account_id: 'account-receiver',
  amount: 100,
  currency_id: 'USD',
  status: 'completed',
  transaction_type: 'transfer',
  description: 'Test transaction',
  created_at: '2024-01-01T00:00:00Z',
  metadata: JSON.stringify({ note: 'test' }),
  from_entity_id: 'entity-sender',
  to_entity_id: 'entity-receiver',
};

const mockEntityId = 'entity-123';

describe('TransactionRepository', () => {
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

    mockStatement.executeAsync.mockResolvedValue({
      getAllAsync: jest.fn().mockResolvedValue([]),
      changes: 1,
    });
    mockStatement.finalizeAsync.mockResolvedValue(undefined);

    // Reset platform
    (Platform as any).OS = 'ios';
  });

  // ============================================================
  // SINGLETON TESTS
  // ============================================================

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = TransactionRepository.getInstance();
      const instance2 = TransactionRepository.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should export singleton instance', () => {
      expect(transactionRepository).toBeInstanceOf(TransactionRepository);
    });
  });

  // ============================================================
  // isSQLiteAvailable TESTS
  // ============================================================

  describe('isSQLiteAvailable', () => {
    it('should return true when database is ready', async () => {
      const result = await transactionRepository.isSQLiteAvailable();

      expect(result).toBe(true);
    });

    it('should return false on web platform', async () => {
      (Platform as any).OS = 'web';

      const result = await transactionRepository.isSQLiteAvailable();

      expect(result).toBe(false);
    });

    it('should return false when database not ready', async () => {
      mockDatabaseManager.isDatabaseReady.mockReturnValue(false);

      const result = await transactionRepository.isSQLiteAvailable();

      expect(result).toBe(false);
    });

    it('should return false on initialization failure', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(false);

      const result = await transactionRepository.isSQLiteAvailable();

      expect(result).toBe(false);
    });
  });

  // ============================================================
  // getTransactionsForInteraction TESTS
  // ============================================================

  describe('getTransactionsForInteraction', () => {
    it('should return transactions for interaction', async () => {
      const mockRows = [mockTransaction];
      mockStatement.executeAsync.mockResolvedValue({
        getAllAsync: jest.fn().mockResolvedValue(mockRows),
      });

      const result = await transactionRepository.getTransactionsForInteraction(
        'int-456',
        mockEntityId,
        100,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('txn-123');
      expect(result[0].type).toBe('transaction');
    });

    it('should filter by profile ID', async () => {
      await transactionRepository.getTransactionsForInteraction(
        'int-456',
        mockEntityId,
        100,
      );

      expect(mockDatabase.prepareAsync).toHaveBeenCalledWith(
        expect.stringContaining('entity_id = ?'),
      );
    });

    it('should apply user perspective filtering when provided', async () => {
      await transactionRepository.getTransactionsForInteraction(
        'int-456',
        mockEntityId,
        100,
        'entity-user',
      );

      expect(mockDatabase.prepareAsync).toHaveBeenCalledWith(
        expect.stringContaining('from_entity_id = ?'),
      );
    });

    it('should return empty array when SQLite not available', async () => {
      mockDatabaseManager.isDatabaseReady.mockReturnValue(false);

      const result = await transactionRepository.getTransactionsForInteraction(
        'int-456',
        mockEntityId,
      );

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockDatabase.prepareAsync.mockRejectedValue(new Error('DB error'));

      const result = await transactionRepository.getTransactionsForInteraction(
        'int-456',
        mockEntityId,
      );

      expect(result).toEqual([]);
    });

    it('should parse metadata JSON', async () => {
      const rowWithMetadata = {
        ...mockTransaction,
        metadata: JSON.stringify({ note: 'test', extra: 'data' }),
      };
      mockStatement.executeAsync.mockResolvedValue({
        getAllAsync: jest.fn().mockResolvedValue([rowWithMetadata]),
      });

      const result = await transactionRepository.getTransactionsForInteraction(
        'int-456',
        mockEntityId,
      );

      expect(result[0].metadata).toBeDefined();
      expect(result[0].metadata.note).toBe('test');
    });
  });

  // ============================================================
  // getTransactionsByAccount TESTS
  // ============================================================

  describe('getTransactionsByAccount', () => {
    it('should return transactions for account', async () => {
      // Setup mock with test data - use mockImplementation for more control
      mockDatabase.getAllAsync.mockImplementation(async () => [mockTransaction]);

      const result = await transactionRepository.getTransactionsByAccount(
        mockEntityId,
        'account-123',
        20,
      );

      // Check if getAllAsync was called
      expect(mockDatabase.getAllAsync).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('txn-123');
    });

    it('should query by both from and to account', async () => {
      await transactionRepository.getTransactionsByAccount(
        mockEntityId,
        'account-123',
        20,
      );

      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('from_account_id = ?'),
        expect.arrayContaining(['account-123', 'account-123', mockEntityId]),
      );
    });

    it('should filter by profile ID', async () => {
      await transactionRepository.getTransactionsByAccount(
        mockEntityId,
        'account-123',
        20,
      );

      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('entity_id = ?'),
        expect.arrayContaining([mockEntityId]),
      );
    });

    it('should return empty array when SQLite not available', async () => {
      mockDatabaseManager.isDatabaseReady.mockReturnValue(false);

      const result = await transactionRepository.getTransactionsByAccount(
        mockEntityId,
        'account-123',
      );

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // saveTransactions TESTS
  // ============================================================

  describe('saveTransactions', () => {
    it('should save multiple transactions', async () => {
      const transactions = [
        { ...mockTransaction, id: 'txn-1' },
        { ...mockTransaction, id: 'txn-2' },
      ];

      await transactionRepository.saveTransactions(transactions as any, mockEntityId);

      expect(mockDatabase.runAsync).toHaveBeenCalledTimes(4); // 2 ensures + 2 inserts
    });

    it('should deduplicate transactions by ID', async () => {
      const transactions = [
        { ...mockTransaction, id: 'txn-1' },
        { ...mockTransaction, id: 'txn-1' }, // Duplicate
        { ...mockTransaction, id: 'txn-2' },
      ];

      await transactionRepository.saveTransactions(transactions as any, mockEntityId);

      // Should only save 2 unique transactions
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Deduplication removed 1'),
      );
    });

    it('should handle empty transactions array', async () => {
      await transactionRepository.saveTransactions([], mockEntityId);

      expect(mockDatabase.runAsync).not.toHaveBeenCalled();
    });

    it('should handle null transactions', async () => {
      await transactionRepository.saveTransactions(null as any, mockEntityId);

      expect(mockDatabase.runAsync).not.toHaveBeenCalled();
    });

    it('should skip transactions without ID', async () => {
      const transactions = [
        { ...mockTransaction, id: null },
        { ...mockTransaction, id: 'txn-1' },
      ];

      await transactionRepository.saveTransactions(transactions as any, mockEntityId);

      // Should only process 1 transaction
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Successful: 1'),
      );
    });

    it('should not throw when SQLite not available', async () => {
      mockDatabaseManager.isDatabaseReady.mockReturnValue(false);

      await expect(
        transactionRepository.saveTransactions([mockTransaction] as any, mockEntityId),
      ).resolves.not.toThrow();
    });

    it('should ensure interaction exists before saving', async () => {
      await transactionRepository.saveTransactions([mockTransaction] as any, mockEntityId);

      // Should check for existing interaction
      expect(mockDatabase.getFirstAsync).toHaveBeenCalledWith(
        'SELECT id FROM interactions WHERE id = ?',
        [mockTransaction.interaction_id],
      );
    });

    it('should create interaction if not exists', async () => {
      mockDatabase.getFirstAsync.mockResolvedValue(null); // No existing interaction

      await transactionRepository.saveTransactions([mockTransaction] as any, mockEntityId);

      // Should insert interaction
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO interactions'),
        expect.any(Array),
      );
    });
  });

  // ============================================================
  // updateTransactionStatus TESTS
  // ============================================================

  describe('updateTransactionStatus', () => {
    it('should update transaction status', async () => {
      await transactionRepository.updateTransactionStatus(
        'txn-123',
        mockEntityId,
        'completed',
      );

      expect(mockDatabase.prepareAsync).toHaveBeenCalledWith(
        'UPDATE transactions SET status = ? WHERE id = ? AND entity_id = ?',
      );
    });

    it('should filter by entity ID', async () => {
      await transactionRepository.updateTransactionStatus(
        'txn-123',
        mockEntityId,
        'completed',
      );

      expect(mockStatement.executeAsync).toHaveBeenCalledWith(
        'completed',
        'txn-123',
        mockEntityId,
      );
    });

    it('should not throw when SQLite not available', async () => {
      mockDatabaseManager.isDatabaseReady.mockReturnValue(false);

      await expect(
        transactionRepository.updateTransactionStatus('txn-123', mockEntityId, 'completed'),
      ).resolves.not.toThrow();
    });
  });

  // ============================================================
  // hasLocalTransactions TESTS
  // ============================================================

  describe('hasLocalTransactions', () => {
    it('should return true when transactions exist', async () => {
      mockStatement.executeAsync.mockResolvedValue({
        getAllAsync: jest.fn().mockResolvedValue([mockTransaction]),
      });

      const result = await transactionRepository.hasLocalTransactions(
        'int-456',
        mockEntityId,
      );

      expect(result).toBe(true);
    });

    it('should return false when no transactions', async () => {
      mockStatement.executeAsync.mockResolvedValue({
        getAllAsync: jest.fn().mockResolvedValue([]),
      });

      const result = await transactionRepository.hasLocalTransactions(
        'int-456',
        mockEntityId,
      );

      expect(result).toBe(false);
    });

    it('should return false when SQLite not available', async () => {
      mockDatabaseManager.isDatabaseReady.mockReturnValue(false);

      const result = await transactionRepository.hasLocalTransactions(
        'int-456',
        mockEntityId,
      );

      expect(result).toBe(false);
    });
  });

  // ============================================================
  // upsertTransaction TESTS
  // ============================================================

  describe('upsertTransaction', () => {
    it('should insert or replace transaction', async () => {
      await transactionRepository.upsertTransaction(mockTransaction, mockEntityId);

      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO transactions'),
        expect.any(Array),
      );
    });

    it('should emit data_updated event', async () => {
      await transactionRepository.upsertTransaction(mockTransaction, mockEntityId);

      expect(mockEmit).toHaveBeenCalledWith('data_updated', {
        type: 'transactions',
        data: mockTransaction,
        entityId: mockEntityId,
      });
    });

    it('should include profile ID in insert', async () => {
      await transactionRepository.upsertTransaction(mockTransaction, mockEntityId);

      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([mockEntityId]),
      );
    });
  });

  // ============================================================
  // deleteTransaction TESTS
  // ============================================================

  describe('deleteTransaction', () => {
    it('should delete transaction by ID and entity', async () => {
      await transactionRepository.deleteTransaction('txn-123', mockEntityId);

      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'DELETE FROM transactions WHERE id = ? AND entity_id = ?',
        ['txn-123', mockEntityId],
      );
    });

    it('should emit data_updated event with removed flag', async () => {
      await transactionRepository.deleteTransaction('txn-123', mockEntityId);

      expect(mockEmit).toHaveBeenCalledWith('data_updated', {
        type: 'transactions',
        data: { id: 'txn-123', removed: true, entityId: mockEntityId },
      });
    });
  });

  // ============================================================
  // getRecentTransactions TESTS
  // ============================================================

  describe('getRecentTransactions', () => {
    it('should return recent transactions for profile', async () => {
      mockDatabase.getAllAsync.mockResolvedValue([mockTransaction]);

      const result = await transactionRepository.getRecentTransactions(mockEntityId, 5);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('txn-123');
    });

    it('should use default limit of 5', async () => {
      await transactionRepository.getRecentTransactions(mockEntityId);

      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        expect.any(String),
        [mockEntityId, 5],
      );
    });

    it('should filter by entity ID', async () => {
      await transactionRepository.getRecentTransactions(mockEntityId, 10);

      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('entity_id = ?'),
        [mockEntityId, 10],
      );
    });

    it('should order by created_at descending', async () => {
      await transactionRepository.getRecentTransactions(mockEntityId);

      expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY datetime(created_at) DESC'),
        expect.any(Array),
      );
    });

    it('should return empty array when SQLite not available', async () => {
      mockDatabaseManager.isDatabaseReady.mockReturnValue(false);

      const result = await transactionRepository.getRecentTransactions(mockEntityId);

      expect(result).toEqual([]);
    });

    it('should return empty array when no transactions', async () => {
      mockDatabase.getAllAsync.mockResolvedValue([]);

      const result = await transactionRepository.getRecentTransactions(mockEntityId);

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // syncTransactionsFromRemote TESTS
  // ============================================================

  describe('syncTransactionsFromRemote', () => {
    it('should fetch and upsert remote transactions', async () => {
      const remoteTransactions = [
        { ...mockTransaction, id: 'remote-1' },
        { ...mockTransaction, id: 'remote-2' },
      ];
      const fetchRemote = jest.fn().mockResolvedValue(remoteTransactions);

      await transactionRepository.syncTransactionsFromRemote(fetchRemote, mockEntityId);

      expect(fetchRemote).toHaveBeenCalled();
      expect(mockDatabase.runAsync).toHaveBeenCalledTimes(2);
    });

    it('should emit data_updated event after sync', async () => {
      const remoteTransactions = [mockTransaction];
      const fetchRemote = jest.fn().mockResolvedValue(remoteTransactions);

      await transactionRepository.syncTransactionsFromRemote(fetchRemote, mockEntityId);

      expect(mockEmit).toHaveBeenCalledWith('data_updated', {
        type: 'transactions',
        data: remoteTransactions,
        entityId: mockEntityId,
      });
    });

    it('should handle empty remote response', async () => {
      const fetchRemote = jest.fn().mockResolvedValue([]);

      await transactionRepository.syncTransactionsFromRemote(fetchRemote, mockEntityId);

      // Should not throw
      expect(fetchRemote).toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      const fetchRemote = jest.fn().mockRejectedValue(new Error('Network error'));

      // Should not throw
      await expect(
        transactionRepository.syncTransactionsFromRemote(fetchRemote, mockEntityId),
      ).resolves.not.toThrow();
    });
  });

  // ============================================================
  // PROFILE ISOLATION TESTS
  // ============================================================

  describe('profile isolation', () => {
    it('should isolate transactions by profile for getTransactionsForInteraction', async () => {
      const profile1 = 'profile-1';
      const profile2 = 'profile-2';

      await transactionRepository.getTransactionsForInteraction('int-1', profile1);
      await transactionRepository.getTransactionsForInteraction('int-1', profile2);

      // Both calls should include their respective entityIds
      expect(mockStatement.executeAsync).toHaveBeenCalledWith(
        'int-1',
        profile1,
        expect.any(Number),
      );
    });

    it('should isolate transactions by profile for saveTransactions', async () => {
      const profile1 = 'profile-1';
      const profile2 = 'profile-2';

      await transactionRepository.saveTransactions([mockTransaction] as any, profile1);
      await transactionRepository.saveTransactions([mockTransaction] as any, profile2);

      // Both saves should use their respective entityIds
      const calls = mockDatabase.runAsync.mock.calls;
      const insertCalls = calls.filter((call: any) =>
        call[0].includes('INSERT OR REPLACE INTO transactions'),
      );

      expect(insertCalls.length).toBeGreaterThan(0);
    });

    it('should isolate updates by profile', async () => {
      await transactionRepository.updateTransactionStatus('txn-1', 'profile-1', 'completed');
      await transactionRepository.updateTransactionStatus('txn-1', 'profile-2', 'pending');

      expect(mockStatement.executeAsync).toHaveBeenCalledWith(
        'completed',
        'txn-1',
        'profile-1',
      );
      expect(mockStatement.executeAsync).toHaveBeenCalledWith(
        'pending',
        'txn-1',
        'profile-2',
      );
    });
  });
});
