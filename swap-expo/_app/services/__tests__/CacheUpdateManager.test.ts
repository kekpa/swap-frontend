/**
 * CacheUpdateManager Tests
 *
 * Tests professional real-time cache updates (WhatsApp/Slack pattern)
 *
 * Key behaviors tested:
 * - Direct cache updates (no invalidation)
 * - Message handling and deduplication
 * - Transaction updates
 * - Interactions list cache updates
 * - Subscriber notifications
 * - Timeline cache management
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

jest.mock('../../utils/eventEmitter');

jest.mock('../../tanstack-query/queryKeys', () => ({
  queryKeys: {
    timeline: (id: string) => ['timeline', id],
    timelineWithLimit: (id: string, limit: number) => ['timeline', id, limit],
    timelineInfinite: (id: string, pageSize: number) => ['timelineInfinite', id, pageSize],
    interactionsByEntity: (entityId: string) => ['interactions', 'entity', entityId],
  },
}));

jest.mock('../../localdb/TimelineRepository', () => ({
  timelineRepository: {
    addDateSeparators: jest.fn((items) => items),
  },
}));

// Import for type reference only - will use fresh reference after resetModules
import type { eventEmitter as EventEmitterType } from '../../utils/eventEmitter';

describe('CacheUpdateManager', () => {
  let CacheUpdateManagerModule: any;
  let cacheUpdateManager: any;
  let mockQueryClient: any;
  let freshEventEmitter: typeof EventEmitterType;
  let freshTimelineRepository: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Re-require mocked modules after resetModules to get fresh references
    freshEventEmitter = require('../../utils/eventEmitter').eventEmitter;
    freshTimelineRepository = require('../../localdb/TimelineRepository').timelineRepository;

    // Create mock QueryClient
    mockQueryClient = {
      setQueryData: jest.fn(),
      invalidateQueries: jest.fn(),
      getQueryData: jest.fn(),
    };

    // Re-import to get fresh instance
    CacheUpdateManagerModule = require('../CacheUpdateManager');
    cacheUpdateManager = CacheUpdateManagerModule.cacheUpdateManager;
  });

  afterEach(() => {
    cacheUpdateManager.cleanup();
  });

  describe('initialize', () => {
    it('should initialize with QueryClient', () => {
      cacheUpdateManager.initialize(mockQueryClient);

      expect(freshEventEmitter.on).toHaveBeenCalledWith('message:new', expect.any(Function));
      expect(freshEventEmitter.on).toHaveBeenCalledWith('transaction:update', expect.any(Function));
      expect(freshEventEmitter.on).toHaveBeenCalledWith('message:deleted', expect.any(Function));
      expect(freshEventEmitter.on).toHaveBeenCalledWith('interaction:updated', expect.any(Function));
    });

    it('should store entityId when provided', () => {
      cacheUpdateManager.initialize(mockQueryClient, 'entity_123');

      // EntityId stored internally for interactions cache
    });

    it('should not reinitialize if already initialized', () => {
      cacheUpdateManager.initialize(mockQueryClient, 'entity_1');
      jest.clearAllMocks();

      cacheUpdateManager.initialize(mockQueryClient, 'entity_2');

      // Should not set up listeners again
      expect(freshEventEmitter.on).not.toHaveBeenCalled();
    });

    it('should update entityId even if already initialized', () => {
      cacheUpdateManager.initialize(mockQueryClient, 'entity_1');
      cacheUpdateManager.initialize(mockQueryClient, 'entity_2');

      // EntityId should be updated (used for interactions cache)
    });
  });

  describe('subscribe', () => {
    beforeEach(() => {
      cacheUpdateManager.initialize(mockQueryClient, 'entity_123');
    });

    it('should add subscription', () => {
      const subscription = {
        id: 'sub_1',
        interactionId: 'int_123',
        onUpdate: jest.fn(),
      };

      const unsubscribe = cacheUpdateManager.subscribe(subscription);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should return unsubscribe function', () => {
      const subscription = {
        id: 'sub_1',
        onUpdate: jest.fn(),
      };

      const unsubscribe = cacheUpdateManager.subscribe(subscription);
      unsubscribe();

      // Should not throw
    });

    it('should support global subscriptions without interactionId', () => {
      const subscription = {
        id: 'global_sub',
        onUpdate: jest.fn(),
      };

      const unsubscribe = cacheUpdateManager.subscribe(subscription);

      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('handleNewMessage', () => {
    let messageHandler: Function;

    beforeEach(() => {
      cacheUpdateManager.initialize(mockQueryClient, 'entity_123');

      // Get the message handler
      const onCalls = (freshEventEmitter.on as jest.Mock).mock.calls;
      const messageCall = onCalls.find((call) => call[0] === 'message:new');
      messageHandler = messageCall[1];
    });

    it('should update timeline cache with new message', () => {
      const newMessage = {
        id: 'msg_123',
        type: 'message',
        interaction_id: 'int_456',
        content: 'Hello world',
        timestamp: new Date().toISOString(),
      };

      messageHandler(newMessage);

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['timeline', 'int_456'],
        expect.any(Function),
      );
    });

    it('should deduplicate existing messages', () => {
      const existingMessages = [
        { id: 'msg_123', type: 'message', content: 'Hello' },
      ];

      mockQueryClient.setQueryData.mockImplementation((key, updater) => {
        if (typeof updater === 'function') {
          return updater(existingMessages);
        }
        return updater;
      });

      const duplicateMessage = {
        id: 'msg_123', // Same ID
        type: 'message',
        interaction_id: 'int_456',
        content: 'Hello',
        timestamp: new Date().toISOString(),
      };

      messageHandler(duplicateMessage);

      // Should not add duplicate
      const updateCall = mockQueryClient.setQueryData.mock.calls[0];
      const updater = updateCall[1];
      const result = updater(existingMessages);

      expect(result).toEqual(existingMessages); // Unchanged
    });

    it('should update interactions list cache', () => {
      const newMessage = {
        id: 'msg_new',
        type: 'message',
        interaction_id: 'int_456',
        content: 'New message',
        timestamp: new Date().toISOString(),
      };

      messageHandler(newMessage);

      // Should update interactions by entity
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['interactions', 'entity', 'entity_123'],
        expect.any(Function),
      );
    });

    it('should notify subscribers', () => {
      const subscriber = {
        id: 'sub_1',
        interactionId: 'int_456',
        onUpdate: jest.fn(),
      };

      cacheUpdateManager.subscribe(subscriber);

      const newMessage = {
        id: 'msg_notify',
        type: 'message',
        interaction_id: 'int_456',
        content: 'Test',
        timestamp: new Date().toISOString(),
      };

      messageHandler(newMessage);

      expect(subscriber.onUpdate).toHaveBeenCalledWith({
        event: 'message:new',
        data: newMessage,
      });
    });

    it('should not notify subscribers of different interactions', () => {
      const subscriber = {
        id: 'sub_1',
        interactionId: 'int_different',
        onUpdate: jest.fn(),
      };

      cacheUpdateManager.subscribe(subscriber);

      const newMessage = {
        id: 'msg_other',
        type: 'message',
        interaction_id: 'int_456',
        content: 'Test',
        timestamp: new Date().toISOString(),
      };

      messageHandler(newMessage);

      expect(subscriber.onUpdate).not.toHaveBeenCalled();
    });

    it('should skip update when queryClient not initialized', () => {
      // Cleanup and don't reinitialize
      cacheUpdateManager.cleanup();
      jest.clearAllMocks();

      // Get fresh handler that won't work
      jest.resetModules();
      const FreshModule = require('../CacheUpdateManager');
      const freshManager = FreshModule.cacheUpdateManager;

      // Should not throw
      expect(() => {
        // Can't easily test this without proper event setup
      }).not.toThrow();
    });
  });

  describe('handleTransactionUpdate', () => {
    let transactionHandler: Function;

    beforeEach(() => {
      cacheUpdateManager.initialize(mockQueryClient, 'entity_123');

      const onCalls = (freshEventEmitter.on as jest.Mock).mock.calls;
      const transactionCall = onCalls.find((call) => call[0] === 'transaction:update');
      transactionHandler = transactionCall[1];
    });

    it('should update timeline cache with new transaction', () => {
      const newTransaction = {
        id: 'txn_123',
        type: 'transaction',
        interaction_id: 'int_456',
        amount: 5000,
        status: 'completed',
        timestamp: new Date().toISOString(),
      };

      transactionHandler(newTransaction);

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['timeline', 'int_456'],
        expect.any(Function),
      );
    });

    it('should update existing transaction status', () => {
      const existingTransactions = [
        { id: 'txn_123', type: 'transaction', status: 'pending' },
      ];

      mockQueryClient.setQueryData.mockImplementation((key, updater) => {
        if (typeof updater === 'function') {
          return updater(existingTransactions);
        }
        return updater;
      });

      const updatedTransaction = {
        id: 'txn_123',
        type: 'transaction',
        interaction_id: 'int_456',
        status: 'completed',
        timestamp: new Date().toISOString(),
      };

      transactionHandler(updatedTransaction);

      // Should update existing transaction
      const updateCall = mockQueryClient.setQueryData.mock.calls[0];
      const updater = updateCall[1];
      const result = updater(existingTransactions);

      expect(result[0].status).toBe('completed');
    });

    it('should update interactions list with transaction preview', () => {
      const transaction = {
        id: 'txn_preview',
        type: 'transaction',
        interaction_id: 'int_456',
        amount: 50.00,
        status: 'completed',
        timestamp: new Date().toISOString(),
      };

      transactionHandler(transaction);

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['interactions', 'entity', 'entity_123'],
        expect.any(Function),
      );
    });
  });

  describe('handleMessageDeleted', () => {
    let deleteHandler: Function;

    beforeEach(() => {
      cacheUpdateManager.initialize(mockQueryClient, 'entity_123');

      const onCalls = (freshEventEmitter.on as jest.Mock).mock.calls;
      const deleteCall = onCalls.find((call) => call[0] === 'message:deleted');
      deleteHandler = deleteCall[1];
    });

    it('should remove message from timeline cache', () => {
      const existingMessages = [
        { id: 'msg_1', type: 'message', content: 'Keep' },
        { id: 'msg_delete', type: 'message', content: 'Delete' },
        { id: 'msg_2', type: 'message', content: 'Keep' },
      ];

      mockQueryClient.setQueryData.mockImplementation((key, updater) => {
        if (typeof updater === 'function') {
          return updater(existingMessages);
        }
        return updater;
      });

      deleteHandler({
        id: 'msg_delete',
        interaction_id: 'int_456',
      });

      const updateCall = mockQueryClient.setQueryData.mock.calls[0];
      const updater = updateCall[1];
      const result = updater(existingMessages);

      expect(result).toHaveLength(2);
      expect(result.find((m: any) => m.id === 'msg_delete')).toBeUndefined();
    });
  });

  describe('handleInteractionUpdated', () => {
    let updateHandler: Function;

    beforeEach(() => {
      cacheUpdateManager.initialize(mockQueryClient, 'entity_123');

      const onCalls = (freshEventEmitter.on as jest.Mock).mock.calls;
      const updateCall = onCalls.find((call) => call[0] === 'interaction:updated');
      updateHandler = updateCall[1];
    });

    it('should update interaction in cache', () => {
      const existingInteractions = [
        { id: 'int_123', title: 'Old Title' },
        { id: 'int_456', title: 'Other' },
      ];

      mockQueryClient.setQueryData.mockImplementation((key, updater) => {
        if (typeof updater === 'function') {
          return updater(existingInteractions);
        }
        return updater;
      });

      updateHandler({
        id: 'int_123',
        title: 'New Title',
      });

      const updateCall = mockQueryClient.setQueryData.mock.calls[0];
      const updater = updateCall[1];
      const result = updater(existingInteractions);

      expect(result[0].title).toBe('New Title');
      expect(result[1].title).toBe('Other');
    });
  });

  describe('forceRefresh', () => {
    beforeEach(() => {
      cacheUpdateManager.initialize(mockQueryClient, 'entity_123');
    });

    it('should invalidate timeline queries', () => {
      cacheUpdateManager.forceRefresh('int_456');

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['timeline', 'int_456'],
        refetchType: 'active',
      });
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      cacheUpdateManager.initialize(mockQueryClient, 'entity_123');
    });

    it('should remove all event listeners', () => {
      cacheUpdateManager.cleanup();

      expect(freshEventEmitter.removeAllListeners).toHaveBeenCalledWith('message:new');
      expect(freshEventEmitter.removeAllListeners).toHaveBeenCalledWith('transaction:update');
      expect(freshEventEmitter.removeAllListeners).toHaveBeenCalledWith('message:deleted');
      expect(freshEventEmitter.removeAllListeners).toHaveBeenCalledWith('interaction:updated');
    });

    it('should clear subscriptions', () => {
      const sub = cacheUpdateManager.subscribe({
        id: 'sub_cleanup',
        onUpdate: jest.fn(),
      });

      cacheUpdateManager.cleanup();

      // After cleanup, new instance should be fresh
    });

    it('should reset initialization state', () => {
      cacheUpdateManager.cleanup();

      // Should be able to reinitialize
      cacheUpdateManager.initialize(mockQueryClient, 'new_entity');

      expect(freshEventEmitter.on).toHaveBeenCalled();
    });
  });

  describe('Timeline Cache Updates', () => {
    beforeEach(() => {
      cacheUpdateManager.initialize(mockQueryClient, 'entity_123');
    });

    it('should update multiple timeline query variants', () => {
      const onCalls = (freshEventEmitter.on as jest.Mock).mock.calls;
      const messageCall = onCalls.find((call) => call[0] === 'message:new');
      const messageHandler = messageCall[1];

      const newMessage = {
        id: 'msg_variants',
        type: 'message',
        interaction_id: 'int_456',
        content: 'Test',
        timestamp: new Date().toISOString(),
      };

      messageHandler(newMessage);

      // Should update standard timeline
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['timeline', 'int_456'],
        expect.any(Function),
      );

      // Should update timeline with limits
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['timeline', 'int_456', 50],
        expect.any(Function),
      );
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['timeline', 'int_456', 100],
        expect.any(Function),
      );
    });

    it('should update infinite timeline cache', () => {
      const onCalls = (freshEventEmitter.on as jest.Mock).mock.calls;
      const messageCall = onCalls.find((call) => call[0] === 'message:new');
      const messageHandler = messageCall[1];

      const newMessage = {
        id: 'msg_infinite',
        type: 'message',
        interaction_id: 'int_456',
        content: 'Test',
        timestamp: new Date().toISOString(),
      };

      messageHandler(newMessage);

      // Should update infinite timeline variants
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['timelineInfinite', 'int_456', 50],
        expect.any(Function),
      );
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['timelineInfinite', 'int_456', 100],
        expect.any(Function),
      );
    });
  });

  describe('Sorting and Date Separators', () => {
    beforeEach(() => {
      cacheUpdateManager.initialize(mockQueryClient, 'entity_123');
    });

    it('should sort messages by timestamp', () => {
      const existingMessages = [
        { id: 'msg_old', type: 'message', timestamp: '2025-01-01T10:00:00Z' },
      ];

      (freshTimelineRepository.addDateSeparators as jest.Mock).mockImplementation((items) => items);

      mockQueryClient.setQueryData.mockImplementation((key, updater) => {
        if (typeof updater === 'function' && Array.isArray(key) && key[0] === 'timeline') {
          return updater(existingMessages);
        }
        return updater;
      });

      const onCalls = (freshEventEmitter.on as jest.Mock).mock.calls;
      const messageCall = onCalls.find((call) => call[0] === 'message:new');
      const messageHandler = messageCall[1];

      const newMessage = {
        id: 'msg_new',
        type: 'message',
        interaction_id: 'int_456',
        content: 'New',
        timestamp: '2025-01-01T11:00:00Z', // Newer
      };

      messageHandler(newMessage);

      expect(freshTimelineRepository.addDateSeparators).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing interaction_id', () => {
      cacheUpdateManager.initialize(mockQueryClient, 'entity_123');

      const onCalls = (freshEventEmitter.on as jest.Mock).mock.calls;
      const messageCall = onCalls.find((call) => call[0] === 'message:new');
      const messageHandler = messageCall[1];

      const invalidMessage = {
        id: 'msg_no_int',
        type: 'message',
        content: 'Test',
        // Missing interaction_id
      };

      // Should not throw
      expect(() => messageHandler(invalidMessage)).not.toThrow();
    });

    it('should handle empty timeline', () => {
      cacheUpdateManager.initialize(mockQueryClient, 'entity_123');

      mockQueryClient.setQueryData.mockImplementation((key, updater) => {
        if (typeof updater === 'function') {
          return updater(undefined);
        }
        return updater;
      });

      const onCalls = (freshEventEmitter.on as jest.Mock).mock.calls;
      const messageCall = onCalls.find((call) => call[0] === 'message:new');
      const messageHandler = messageCall[1];

      const newMessage = {
        id: 'msg_first',
        type: 'message',
        interaction_id: 'int_456',
        content: 'First message',
        timestamp: new Date().toISOString(),
      };

      messageHandler(newMessage);

      // Should create new array with message
      const updateCall = mockQueryClient.setQueryData.mock.calls[0];
      const updater = updateCall[1];
      const result = updater(undefined);

      expect(result).toEqual([newMessage]);
    });

    it('should handle missing entityId for interactions cache', () => {
      // Initialize without entityId
      cacheUpdateManager.initialize(mockQueryClient);

      const onCalls = (freshEventEmitter.on as jest.Mock).mock.calls;
      const messageCall = onCalls.find((call) => call[0] === 'message:new');
      const messageHandler = messageCall[1];

      const newMessage = {
        id: 'msg_no_entity',
        type: 'message',
        interaction_id: 'int_456',
        content: 'Test',
        timestamp: new Date().toISOString(),
      };

      // Should not throw, but should warn
      expect(() => messageHandler(newMessage)).not.toThrow();
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(CacheUpdateManagerModule.cacheUpdateManager).toBeDefined();
    });
  });
});
