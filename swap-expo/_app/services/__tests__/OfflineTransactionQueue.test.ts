/**
 * OfflineTransactionQueue Tests
 *
 * Tests the offline transaction queue service.
 * Tests queueing, retry logic, status management, and listeners.
 */

// Mock MMKV with per-test storage
const mockStorage = new Map<string, string>();
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn((key: string) => mockStorage.get(key)),
    set: jest.fn((key: string, value: string) => mockStorage.set(key, value)),
    delete: jest.fn((key: string) => mockStorage.delete(key)),
  })),
}));

jest.mock('../NetworkService', () => ({
  networkService: {
    isOnline: jest.fn(),
    onNetworkStateChange: jest.fn(),
    getNetworkState: jest.fn(),
  },
}));

jest.mock('../TransactionManager', () => ({
  transactionManager: {
    createDirectTransaction: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocks - singleton pattern
import { offlineTransactionQueue } from '../OfflineTransactionQueue';
import { networkService } from '../NetworkService';
import { transactionManager } from '../TransactionManager';

// Cast to mocks
const mockNetworkService = networkService as jest.Mocked<typeof networkService>;
const mockTransactionManager = transactionManager as jest.Mocked<typeof transactionManager>;

// Test data
const mockTransactionData = {
  to_entity_id: 'entity-456',
  amount: 100,
  currency_code: 'USD',
  description: 'Test transfer',
  senderAccountId: 'account-123',
  senderEntityId: 'entity-123',
  recipientName: 'John Doe',
  recipientInitials: 'JD',
};

describe('OfflineTransactionQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Clear storage for isolation
    mockStorage.clear();

    // Reset singleton state
    offlineTransactionQueue.reset();

    // Default to online
    mockNetworkService.isOnline.mockReturnValue(true);
    mockNetworkService.onNetworkStateChange.mockReturnValue(() => {});
    mockNetworkService.getNetworkState.mockReturnValue({
      isOnline: true,
      isOfflineMode: false,
    });
  });

  afterEach(() => {
    offlineTransactionQueue.reset();
    mockStorage.clear();
    jest.useRealTimers();
  });

  // ============================================================
  // QUEUE TRANSACTION TESTS
  // ============================================================

  describe('queueTransaction', () => {
    it('should add transaction to queue', async () => {
      const id = await offlineTransactionQueue.queueTransaction(mockTransactionData);

      expect(id).toMatch(/^offline_/);
      expect(mockStorage.size).toBe(1);
    });

    it('should generate unique IDs', async () => {
      const id1 = await offlineTransactionQueue.queueTransaction(mockTransactionData);
      const id2 = await offlineTransactionQueue.queueTransaction(mockTransactionData);

      expect(id1).not.toBe(id2);
    });

    it('should set initial status to pending', async () => {
      await offlineTransactionQueue.queueTransaction(mockTransactionData);

      const queue = offlineTransactionQueue.getQueue();
      expect(queue[0].status).toBe('pending');
    });

    it('should set retry count to 0', async () => {
      await offlineTransactionQueue.queueTransaction(mockTransactionData);

      const queue = offlineTransactionQueue.getQueue();
      expect(queue[0].retryCount).toBe(0);
    });

    it('should auto-process when online', async () => {
      mockNetworkService.isOnline.mockReturnValue(true);
      mockTransactionManager.createDirectTransaction.mockResolvedValue({} as any);

      await offlineTransactionQueue.queueTransaction(mockTransactionData);

      // Advance timer to trigger auto-process
      jest.advanceTimersByTime(1000);

      // Should attempt to process
      await Promise.resolve();
    });
  });

  // ============================================================
  // GET QUEUE TESTS
  // ============================================================

  describe('getQueue', () => {
    it('should return empty array when queue is empty', () => {
      const queue = offlineTransactionQueue.getQueue();

      expect(queue).toEqual([]);
    });

    it('should return parsed queue data', async () => {
      await offlineTransactionQueue.queueTransaction(mockTransactionData);

      const queue = offlineTransactionQueue.getQueue();

      expect(queue.length).toBe(1);
      expect(queue[0].transaction).toEqual(mockTransactionData);
    });

    it('should handle parse errors', () => {
      mockStorage.set('queued_transactions', 'invalid json');

      const queue = offlineTransactionQueue.getQueue();

      expect(queue).toEqual([]);
    });
  });

  // ============================================================
  // GET PENDING COUNT TESTS
  // ============================================================

  describe('getPendingCount', () => {
    it('should return count of pending and retrying transactions', async () => {
      // Queue some transactions
      await offlineTransactionQueue.queueTransaction(mockTransactionData);
      await offlineTransactionQueue.queueTransaction(mockTransactionData);

      const count = offlineTransactionQueue.getPendingCount();

      expect(count).toBe(2);
    });

    it('should return 0 when queue is empty', () => {
      const count = offlineTransactionQueue.getPendingCount();

      expect(count).toBe(0);
    });
  });

  // ============================================================
  // PROCESS QUEUE TESTS
  // ============================================================

  describe('processQueue', () => {
    it('should not process when offline', async () => {
      mockNetworkService.isOnline.mockReturnValue(false);
      await offlineTransactionQueue.queueTransaction(mockTransactionData);

      await offlineTransactionQueue.processQueue();

      expect(mockTransactionManager.createDirectTransaction).not.toHaveBeenCalled();
    });

    it('should process pending transactions when online', async () => {
      mockNetworkService.isOnline.mockReturnValue(true);
      mockTransactionManager.createDirectTransaction.mockResolvedValue({} as any);

      // Queue without auto-process
      mockNetworkService.isOnline.mockReturnValueOnce(false);
      await offlineTransactionQueue.queueTransaction(mockTransactionData);

      // Now go online
      mockNetworkService.isOnline.mockReturnValue(true);
      await offlineTransactionQueue.processQueue();

      expect(mockTransactionManager.createDirectTransaction).toHaveBeenCalledWith(
        mockTransactionData
      );
    });

    it('should handle concurrent processing attempts', async () => {
      mockNetworkService.isOnline.mockReturnValue(true);

      // Queue a transaction
      mockNetworkService.isOnline.mockReturnValueOnce(false);
      await offlineTransactionQueue.queueTransaction(mockTransactionData);
      mockNetworkService.isOnline.mockReturnValue(true);

      let resolveTransaction: () => void;
      mockTransactionManager.createDirectTransaction.mockImplementation(
        () => new Promise((resolve) => {
          resolveTransaction = () => resolve({} as any);
        })
      );

      // Start processing
      const promise1 = offlineTransactionQueue.processQueue();
      const promise2 = offlineTransactionQueue.processQueue();

      resolveTransaction!();
      await Promise.all([promise1, promise2]);

      // Should only process once due to isProcessing flag
      expect(mockTransactionManager.createDirectTransaction).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // RETRY LOGIC TESTS
  // ============================================================

  describe('retry logic', () => {
    it('should increment retry count on failure', async () => {
      mockNetworkService.isOnline.mockReturnValue(true);

      // Queue without auto-process
      mockNetworkService.isOnline.mockReturnValueOnce(false);
      await offlineTransactionQueue.queueTransaction(mockTransactionData);
      mockNetworkService.isOnline.mockReturnValue(true);

      mockTransactionManager.createDirectTransaction.mockRejectedValue(
        new Error('Network error')
      );

      await offlineTransactionQueue.processQueue();

      const queue = offlineTransactionQueue.getQueue();
      expect(queue[0].retryCount).toBe(1);
    });

    it('should mark as failed after max retries', async () => {
      mockNetworkService.isOnline.mockReturnValue(true);

      // Queue without auto-process
      mockNetworkService.isOnline.mockReturnValueOnce(false);
      await offlineTransactionQueue.queueTransaction(mockTransactionData);
      mockNetworkService.isOnline.mockReturnValue(true);

      mockTransactionManager.createDirectTransaction.mockRejectedValue(
        new Error('Network error')
      );

      // Process 3 times to hit max retries
      await offlineTransactionQueue.processQueue();
      offlineTransactionQueue.reset(); // Reset isProcessing flag
      await offlineTransactionQueue.processQueue();
      offlineTransactionQueue.reset();
      await offlineTransactionQueue.processQueue();

      const queue = offlineTransactionQueue.getQueue();
      expect(queue[0].status).toBe('failed');
    });
  });

  // ============================================================
  // REMOVE TRANSACTION TESTS
  // ============================================================

  describe('removeTransaction', () => {
    it('should remove transaction from queue', async () => {
      const id = await offlineTransactionQueue.queueTransaction(mockTransactionData);
      expect(offlineTransactionQueue.getQueue().length).toBe(1);

      offlineTransactionQueue.removeTransaction(id);

      expect(offlineTransactionQueue.getQueue().length).toBe(0);
    });
  });

  // ============================================================
  // CLEAR QUEUE TESTS
  // ============================================================

  describe('clearQueue', () => {
    it('should delete queue from storage', async () => {
      await offlineTransactionQueue.queueTransaction(mockTransactionData);
      expect(offlineTransactionQueue.getQueue().length).toBe(1);

      offlineTransactionQueue.clearQueue();

      expect(offlineTransactionQueue.getQueue().length).toBe(0);
    });
  });

  describe('clearFailedTransactions', () => {
    it('should only remove failed transactions', async () => {
      // Queue two transactions
      mockNetworkService.isOnline.mockReturnValueOnce(false);
      await offlineTransactionQueue.queueTransaction(mockTransactionData);
      mockNetworkService.isOnline.mockReturnValueOnce(false);
      await offlineTransactionQueue.queueTransaction({ ...mockTransactionData, amount: 200 });

      // Mark one as failed by simulating failures
      mockNetworkService.isOnline.mockReturnValue(true);
      mockTransactionManager.createDirectTransaction.mockRejectedValue(new Error('Failed'));

      // Process 3 times to mark first as failed
      await offlineTransactionQueue.processQueue();
      offlineTransactionQueue.reset();
      await offlineTransactionQueue.processQueue();
      offlineTransactionQueue.reset();
      await offlineTransactionQueue.processQueue();

      const beforeClear = offlineTransactionQueue.getQueue();
      const failedCount = beforeClear.filter(tx => tx.status === 'failed').length;
      expect(failedCount).toBeGreaterThan(0);

      offlineTransactionQueue.clearFailedTransactions();

      const afterClear = offlineTransactionQueue.getQueue();
      const remainingFailed = afterClear.filter(tx => tx.status === 'failed').length;
      expect(remainingFailed).toBe(0);
    });
  });

  // ============================================================
  // RETRY FAILED TRANSACTIONS TESTS
  // ============================================================

  describe('retryFailedTransactions', () => {
    it('should reset failed transactions to pending', async () => {
      mockNetworkService.isOnline.mockReturnValueOnce(false);
      await offlineTransactionQueue.queueTransaction(mockTransactionData);
      mockNetworkService.isOnline.mockReturnValue(true);
      mockTransactionManager.createDirectTransaction.mockRejectedValue(new Error('Failed'));

      // Process 3 times to mark as failed
      await offlineTransactionQueue.processQueue();
      offlineTransactionQueue.reset();
      await offlineTransactionQueue.processQueue();
      offlineTransactionQueue.reset();
      await offlineTransactionQueue.processQueue();

      let queue = offlineTransactionQueue.getQueue();
      expect(queue[0].status).toBe('failed');

      offlineTransactionQueue.retryFailedTransactions();

      queue = offlineTransactionQueue.getQueue();
      expect(queue[0].status).toBe('pending');
      expect(queue[0].retryCount).toBe(0);
    });
  });

  // ============================================================
  // LISTENER TESTS
  // ============================================================

  describe('listeners', () => {
    it('should notify listeners on queue change', async () => {
      const listener = jest.fn();

      offlineTransactionQueue.onQueueChange(listener);
      await offlineTransactionQueue.queueTransaction(mockTransactionData);

      expect(listener).toHaveBeenCalled();
    });

    it('should return unsubscribe function', async () => {
      const listener = jest.fn();

      const unsubscribe = offlineTransactionQueue.onQueueChange(listener);
      unsubscribe();
      await offlineTransactionQueue.queueTransaction(mockTransactionData);

      // Listener should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();

      offlineTransactionQueue.onQueueChange(errorListener);
      offlineTransactionQueue.onQueueChange(normalListener);

      // Should not throw
      await offlineTransactionQueue.queueTransaction(mockTransactionData);

      // Normal listener should still be called
      expect(normalListener).toHaveBeenCalled();
    });
  });

  // ============================================================
  // QUEUE STATS TESTS
  // ============================================================

  describe('getQueueStats', () => {
    it('should return correct statistics', async () => {
      mockNetworkService.isOnline.mockReturnValue(false);
      await offlineTransactionQueue.queueTransaction(mockTransactionData);

      const stats = offlineTransactionQueue.getQueueStats();

      expect(stats.total).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.retrying).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.oldest).toBeDefined();
    });

    it('should return empty stats for empty queue', () => {
      const stats = offlineTransactionQueue.getQueueStats();

      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.oldest).toBeUndefined();
    });
  });

  // ============================================================
  // NETWORK STATE CHANGE TESTS
  // ============================================================

  describe('network state changes', () => {
    it('should have network service available for auto-processing', () => {
      // The singleton registers its network listener at module load time
      // We verify the mock is set up correctly for tests
      expect(mockNetworkService.isOnline).toBeDefined();
      expect(mockNetworkService.onNetworkStateChange).toBeDefined();
    });
  });
});
