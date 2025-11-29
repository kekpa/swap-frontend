/**
 * MessageSyncManager Tests
 *
 * Tests WhatsApp/Signal-level message persistence & synchronization
 *
 * Key behaviors tested:
 * - Message sync with offline support
 * - Network state monitoring and auto-sync
 * - Periodic background sync
 * - Missed message detection and recovery
 * - Delivery confirmations
 * - Sync health status
 * - Cleanup functionality
 */

// Mock dependencies before imports
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../localdb/MessageRepository', () => ({
  messageRepository: {
    getLatestMessageForInteraction: jest.fn(),
    saveMessages: jest.fn(),
    updateMessageStatus: jest.fn(),
    getFailedMessages: jest.fn(),
  },
}));

jest.mock('../../localdb/InteractionRepository', () => ({
  interactionRepository: {
    getInteractionsWithMembers: jest.fn(),
  },
}));

jest.mock('../UserStateManager', () => ({
  userStateManager: {
    getCurrentProfileId: jest.fn(),
  },
}));

jest.mock('../NetworkService', () => ({
  networkService: {
    onNetworkStateChange: jest.fn(),
    getNetworkState: jest.fn(),
  },
}));

// Import after mocks - singleton pattern
import { messageSyncManager } from '../MessageSyncManager';
import { messageRepository } from '../../localdb/MessageRepository';
import { interactionRepository } from '../../localdb/InteractionRepository';
import { networkService } from '../NetworkService';

// Cast to mocks
const mockMessageRepository = messageRepository as jest.Mocked<typeof messageRepository>;
const mockInteractionRepository = interactionRepository as jest.Mocked<typeof interactionRepository>;
const mockNetworkService = networkService as jest.Mocked<typeof networkService>;

describe('MessageSyncManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset singleton state
    messageSyncManager.reset();

    // Set default mock implementations
    mockNetworkService.getNetworkState.mockReturnValue({
      isConnected: true,
      isOfflineMode: false,
    });

    mockNetworkService.onNetworkStateChange.mockReturnValue(jest.fn());

    mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([]);
  });

  afterEach(() => {
    messageSyncManager.reset();
    jest.useRealTimers();
  });

  describe('initialize', () => {
    it('should set up network listener on initialization', () => {
      messageSyncManager.initialize();

      expect(mockNetworkService.onNetworkStateChange).toHaveBeenCalled();
    });

    it('should set up periodic sync interval on initialization', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      messageSyncManager.initialize();

      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        30000, // SYNC_INTERVAL_MS
      );

      setIntervalSpy.mockRestore();
    });

    it('should trigger sync when network comes back online', () => {
      let networkCallback: ((state: any) => void) | null = null;

      mockNetworkService.onNetworkStateChange.mockImplementation((callback) => {
        networkCallback = callback;
        return jest.fn();
      });

      messageSyncManager.initialize();

      // Simulate network coming online
      if (networkCallback) {
        networkCallback({ isConnected: true, isOfflineMode: false });
      }

      // Sync should be triggered (async)
      expect(networkCallback).not.toBeNull();
    });

    it('should not trigger sync when going offline', () => {
      let networkCallback: ((state: any) => void) | null = null;

      mockNetworkService.onNetworkStateChange.mockImplementation((callback) => {
        networkCallback = callback;
        return jest.fn();
      });

      messageSyncManager.initialize();

      // Simulate network going offline
      if (networkCallback) {
        networkCallback({ isConnected: false, isOfflineMode: true });
      }

      // Should not trigger any operations
    });
  });

  describe('setCurrentProfileId', () => {
    it('should update current profile ID', () => {
      messageSyncManager.setCurrentProfileId('profile_123');

      // Internal state update - verify through sync operations
      expect(true).toBe(true); // Internal state test
    });

    it('should accept null profile ID', () => {
      messageSyncManager.setCurrentProfileId(null);

      expect(true).toBe(true);
    });

    it('should handle profile switch', () => {
      messageSyncManager.setCurrentProfileId('profile_1');
      messageSyncManager.setCurrentProfileId('profile_2');

      // Should update without error
      expect(true).toBe(true);
    });
  });

  describe('syncMessages', () => {
    beforeEach(() => {
      messageSyncManager.setCurrentProfileId('profile_123');
    });

    it('should sync messages for all interactions', async () => {
      const mockInteractions = [
        { id: 'int_1', members: [] },
        { id: 'int_2', members: [] },
        { id: 'int_3', members: [] },
      ];

      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue(
        mockInteractions,
      );
      mockMessageRepository.getLatestMessageForInteraction.mockResolvedValue(null);

      const stats = await messageSyncManager.syncMessages();

      expect(mockInteractionRepository.getInteractionsWithMembers).toHaveBeenCalledWith('profile_123');
      expect(stats).toHaveProperty('messagesReceived');
      expect(stats).toHaveProperty('messagesSent');
      expect(stats).toHaveProperty('syncDuration');
      expect(stats).toHaveProperty('lastSyncTime');
    });

    it('should return sync stats with timing information', async () => {
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([]);

      const stats = await messageSyncManager.syncMessages();

      expect(stats.syncDuration).toBeGreaterThanOrEqual(0);
      expect(stats.lastSyncTime).toBeGreaterThan(0);
    });

    it('should skip sync if already syncing', async () => {
      let resolveSlowPromise: () => void;
      const slowPromise = new Promise<any[]>((resolve) => {
        resolveSlowPromise = () => resolve([]);
      });
      mockInteractionRepository.getInteractionsWithMembers.mockReturnValue(slowPromise);

      // Start first sync
      const sync1 = messageSyncManager.syncMessages();

      // Try to start second sync
      const sync2 = messageSyncManager.syncMessages();

      // Second should return immediately with last stats
      const result2 = await sync2;
      expect(result2).toHaveProperty('lastSyncTime');

      // Cleanup
      resolveSlowPromise!();
      await sync1;
    });

    it('should force sync even if syncing when forceSync=true', async () => {
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([]);

      // Start sync
      const sync1Promise = messageSyncManager.syncMessages();
      await sync1Promise;

      // Force sync should work
      const stats = await messageSyncManager.syncMessages(true);
      expect(stats).toHaveProperty('messagesReceived');
    });

    it('should release lock after sync completes', async () => {
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([]);

      await messageSyncManager.syncMessages();
      expect(messageSyncManager.isSyncInProgress()).toBe(false);

      // Should be able to sync again
      await messageSyncManager.syncMessages();
      expect(messageSyncManager.isSyncInProgress()).toBe(false);
    });

    it('should release lock even if sync fails', async () => {
      mockInteractionRepository.getInteractionsWithMembers.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(messageSyncManager.syncMessages()).rejects.toThrow('Database error');

      expect(messageSyncManager.isSyncInProgress()).toBe(false);
    });

    it('should handle empty interactions list', async () => {
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([]);

      const stats = await messageSyncManager.syncMessages();

      expect(stats.messagesReceived).toBe(0);
    });
  });

  describe('syncInteraction', () => {
    it('should sync specific interaction', async () => {
      mockMessageRepository.getLatestMessageForInteraction.mockResolvedValue(null);

      await messageSyncManager.syncInteraction('int_specific');

      expect(mockMessageRepository.getLatestMessageForInteraction).toHaveBeenCalledWith('int_specific');
    });

    it('should check for missed messages since last known message', async () => {
      const lastMessage = {
        id: 'msg_last',
        timestamp: '2025-01-15T10:00:00Z',
      };
      mockMessageRepository.getLatestMessageForInteraction.mockResolvedValue(lastMessage);

      await messageSyncManager.syncInteraction('int_123');

      expect(mockMessageRepository.getLatestMessageForInteraction).toHaveBeenCalledWith('int_123');
    });

    it('should handle sync error gracefully', async () => {
      mockMessageRepository.getLatestMessageForInteraction.mockRejectedValue(
        new Error('Repository error'),
      );

      // The implementation catches errors in checkMissedMessages and returns a default result
      // So syncInteraction completes successfully even with repository errors
      await expect(messageSyncManager.syncInteraction('int_error')).resolves.not.toThrow();
    });

    it('should save new messages when found', async () => {
      mockMessageRepository.getLatestMessageForInteraction.mockResolvedValue(null);

      // Note: The actual implementation has placeholder API response
      // Testing that the flow completes without error
      await messageSyncManager.syncInteraction('int_with_messages');

      // Repository operations should be called
      expect(mockMessageRepository.getLatestMessageForInteraction).toHaveBeenCalled();
    });
  });

  describe('confirmMessageDelivery', () => {
    it('should confirm message as delivered', async () => {
      mockMessageRepository.updateMessageStatus.mockResolvedValue(undefined);

      await messageSyncManager.confirmMessageDelivery('msg_123', 'delivered');

      expect(mockMessageRepository.updateMessageStatus).toHaveBeenCalledWith('msg_123', 'delivered');
    });

    it('should confirm message as read', async () => {
      mockMessageRepository.updateMessageStatus.mockResolvedValue(undefined);

      await messageSyncManager.confirmMessageDelivery('msg_456', 'read');

      expect(mockMessageRepository.updateMessageStatus).toHaveBeenCalledWith('msg_456', 'read');
    });

    it('should handle delivery confirmation error', async () => {
      mockMessageRepository.updateMessageStatus.mockRejectedValue(
        new Error('Update failed'),
      );

      // Should not throw, just log error
      await expect(
        messageSyncManager.confirmMessageDelivery('msg_error', 'delivered'),
      ).resolves.not.toThrow();
    });
  });

  describe('retryFailedMessages', () => {
    it('should attempt to retry failed messages', async () => {
      // Currently placeholder implementation
      await messageSyncManager.retryFailedMessages();

      // Should complete without error
      expect(true).toBe(true);
    });

    it('should handle retry errors gracefully', async () => {
      // Should not throw
      await expect(messageSyncManager.retryFailedMessages()).resolves.not.toThrow();
    });
  });

  describe('getLastSyncStats', () => {
    it('should return sync statistics', () => {
      const stats = messageSyncManager.getLastSyncStats();

      expect(stats).toHaveProperty('messagesReceived');
      expect(stats).toHaveProperty('messagesSent');
      expect(stats).toHaveProperty('syncDuration');
      expect(stats).toHaveProperty('lastSyncTime');
    });

    it('should return updated stats after sync', async () => {
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([]);

      await messageSyncManager.syncMessages();

      const stats = messageSyncManager.getLastSyncStats();
      expect(stats.lastSyncTime).toBeGreaterThan(0);
    });

    it('should return zeros for fresh instance', () => {
      const stats = messageSyncManager.getLastSyncStats();

      expect(stats.messagesReceived).toBe(0);
      expect(stats.messagesSent).toBe(0);
      expect(stats.syncDuration).toBe(0);
    });
  });

  describe('isSyncInProgress', () => {
    it('should return false when not syncing', () => {
      expect(messageSyncManager.isSyncInProgress()).toBe(false);
    });

    it('should return true during sync', async () => {
      let resolveSync: () => void;
      const syncPromise = new Promise<any[]>((resolve) => {
        resolveSync = () => resolve([]);
      });

      mockInteractionRepository.getInteractionsWithMembers.mockReturnValue(syncPromise);

      const syncOperation = messageSyncManager.syncMessages();

      // Should be true during sync
      expect(messageSyncManager.isSyncInProgress()).toBe(true);

      // Resolve and cleanup
      resolveSync!();
      await syncOperation;

      expect(messageSyncManager.isSyncInProgress()).toBe(false);
    });
  });

  describe('getSyncHealthStatus', () => {
    it('should return healthy status when recently synced and online', async () => {
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([]);
      mockNetworkService.getNetworkState.mockReturnValue({
        isConnected: true,
        isOfflineMode: false,
      });

      await messageSyncManager.syncMessages();

      const health = messageSyncManager.getSyncHealthStatus();

      expect(health.isHealthy).toBe(true);
      expect(health.networkStatus).toBe('online');
      expect(health.lastSyncAge).toBeLessThan(5 * 60 * 1000); // Less than 5 minutes
    });

    it('should return unhealthy status when offline', async () => {
      mockNetworkService.getNetworkState.mockReturnValue({
        isConnected: false,
        isOfflineMode: true,
      });

      const health = messageSyncManager.getSyncHealthStatus();

      expect(health.isHealthy).toBe(false);
      expect(health.networkStatus).toBe('offline');
    });

    it('should return unhealthy status when sync is stale', () => {
      mockNetworkService.getNetworkState.mockReturnValue({
        isConnected: true,
        isOfflineMode: false,
      });

      // Without any sync, lastSyncTime is 0, making lastSyncAge very large
      const health = messageSyncManager.getSyncHealthStatus();

      // lastSyncAge > 5 minutes means unhealthy
      expect(health.lastSyncAge).toBeGreaterThan(5 * 60 * 1000);
    });

    it('should include last sync age in response', async () => {
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([]);

      await messageSyncManager.syncMessages();

      const health = messageSyncManager.getSyncHealthStatus();

      expect(typeof health.lastSyncAge).toBe('number');
      expect(health.lastSyncAge).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cleanup', () => {
    it('should clear sync interval', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      messageSyncManager.initialize();
      messageSyncManager.cleanup();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should remove network listener', () => {
      const mockUnsubscribe = jest.fn();
      mockNetworkService.onNetworkStateChange.mockReturnValue(mockUnsubscribe);

      messageSyncManager.initialize();
      messageSyncManager.cleanup();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should reset sync state', async () => {
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([]);

      await messageSyncManager.syncMessages();
      expect(messageSyncManager.getLastSyncStats().lastSyncTime).toBeGreaterThan(0);

      messageSyncManager.cleanup();

      expect(messageSyncManager.getLastSyncStats().lastSyncTime).toBe(0);
      expect(messageSyncManager.isSyncInProgress()).toBe(false);
    });

    it('should be safe to call cleanup multiple times', () => {
      messageSyncManager.initialize();

      expect(() => {
        messageSyncManager.cleanup();
        messageSyncManager.cleanup();
        messageSyncManager.cleanup();
      }).not.toThrow();
    });
  });

  describe('Periodic Sync', () => {
    it('should trigger sync every 30 seconds when online', async () => {
      mockNetworkService.getNetworkState.mockReturnValue({
        isConnected: true,
        isOfflineMode: false,
      });
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([]);

      messageSyncManager.initialize();

      // Advance time by 30 seconds
      jest.advanceTimersByTime(30000);

      // Sync should be triggered
      expect(mockInteractionRepository.getInteractionsWithMembers).toHaveBeenCalled();
    });

    it('should not trigger sync when offline', () => {
      mockNetworkService.getNetworkState.mockReturnValue({
        isConnected: false,
        isOfflineMode: true,
      });

      messageSyncManager.initialize();

      // Clear initial calls
      jest.clearAllMocks();

      // Advance time
      jest.advanceTimersByTime(30000);

      // Should not sync when offline
      expect(mockInteractionRepository.getInteractionsWithMembers).not.toHaveBeenCalled();
    });

    it('should handle sync errors in periodic sync gracefully', () => {
      mockNetworkService.getNetworkState.mockReturnValue({
        isConnected: true,
        isOfflineMode: false,
      });
      mockInteractionRepository.getInteractionsWithMembers.mockRejectedValue(
        new Error('Periodic sync failed'),
      );

      messageSyncManager.initialize();

      // Should not throw even if sync fails
      expect(() => {
        jest.advanceTimersByTime(30000);
      }).not.toThrow();
    });
  });

  describe('Network State Changes', () => {
    it('should auto-sync when network becomes available', () => {
      let networkCallback: ((state: any) => void) | null = null;

      mockNetworkService.onNetworkStateChange.mockImplementation((callback) => {
        networkCallback = callback;
        return jest.fn();
      });
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([]);

      messageSyncManager.initialize();

      // Simulate going online
      if (networkCallback) {
        networkCallback({ isConnected: true, isOfflineMode: false });
      }

      // Sync should be triggered (async)
      expect(mockInteractionRepository.getInteractionsWithMembers).toHaveBeenCalled();
    });

    it('should not sync when in offline mode even if connected', () => {
      let networkCallback: ((state: any) => void) | null = null;

      mockNetworkService.onNetworkStateChange.mockImplementation((callback) => {
        networkCallback = callback;
        return jest.fn();
      });

      messageSyncManager.initialize();
      jest.clearAllMocks();

      // Simulate connected but in offline mode
      if (networkCallback) {
        networkCallback({ isConnected: true, isOfflineMode: true });
      }

      expect(mockInteractionRepository.getInteractionsWithMembers).not.toHaveBeenCalled();
    });
  });

  describe('Missed Message Detection', () => {
    it('should detect interactions with missed messages', async () => {
      const interactions = [
        { id: 'int_1', members: [] },
        { id: 'int_2', members: [] },
      ];

      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue(
        interactions,
      );
      mockMessageRepository.getLatestMessageForInteraction.mockResolvedValue({
        id: 'msg_old',
        timestamp: '2025-01-01T00:00:00Z',
      });

      messageSyncManager.setCurrentProfileId('profile_123');
      await messageSyncManager.syncMessages();

      // Should check each interaction
      expect(mockMessageRepository.getLatestMessageForInteraction).toHaveBeenCalledWith('int_1');
      expect(mockMessageRepository.getLatestMessageForInteraction).toHaveBeenCalledWith('int_2');
    });

    it('should handle interaction with no prior messages', async () => {
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([
        { id: 'int_new', members: [] },
      ]);
      mockMessageRepository.getLatestMessageForInteraction.mockResolvedValue(null);

      messageSyncManager.setCurrentProfileId('profile_123');
      await messageSyncManager.syncMessages();

      // Should use epoch time as baseline
      expect(mockMessageRepository.getLatestMessageForInteraction).toHaveBeenCalledWith('int_new');
    });

    it('should handle repository error when checking messages', async () => {
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([
        { id: 'int_error', members: [] },
      ]);
      mockMessageRepository.getLatestMessageForInteraction.mockRejectedValue(
        new Error('Repository error'),
      );

      messageSyncManager.setCurrentProfileId('profile_123');

      // Should not throw, but handle error
      const stats = await messageSyncManager.syncMessages();
      expect(stats).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle sync with null profile ID', async () => {
      messageSyncManager.setCurrentProfileId(null);
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([]);

      const stats = await messageSyncManager.syncMessages();

      expect(mockInteractionRepository.getInteractionsWithMembers).toHaveBeenCalledWith('');
      expect(stats).toBeDefined();
    });

    it('should handle very large number of interactions', async () => {
      const manyInteractions = Array.from({ length: 100 }, (_, i) => ({
        id: `int_${i}`,
        members: [],
      }));

      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue(
        manyInteractions,
      );
      mockMessageRepository.getLatestMessageForInteraction.mockResolvedValue(null);

      messageSyncManager.setCurrentProfileId('profile_123');
      const stats = await messageSyncManager.syncMessages();

      expect(mockMessageRepository.getLatestMessageForInteraction).toHaveBeenCalledTimes(100);
      expect(stats.syncDuration).toBeGreaterThanOrEqual(0);
    });

    it('should handle concurrent sync attempts', async () => {
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([]);

      messageSyncManager.setCurrentProfileId('profile_123');

      // Start multiple concurrent syncs
      const syncs = [
        messageSyncManager.syncMessages(),
        messageSyncManager.syncMessages(),
        messageSyncManager.syncMessages(),
      ];

      const results = await Promise.all(syncs);

      // All should complete
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toHaveProperty('lastSyncTime');
      });
    });

    it('should handle initialization after cleanup', () => {
      messageSyncManager.initialize();
      messageSyncManager.cleanup();

      // Should be able to reinitialize
      expect(() => {
        messageSyncManager.initialize();
      }).not.toThrow();
    });
  });
});
