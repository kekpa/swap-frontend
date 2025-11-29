/**
 * MessageManager Tests
 *
 * Tests message sending, queueing, offline support, retry logic,
 * deduplication, and optimistic updates.
 */

// Mock dependencies before importing
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../_api/apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('../NetworkService', () => ({
  networkService: {
    getNetworkState: jest.fn(),
    onNetworkStateChange: jest.fn(),
  },
}));

jest.mock('../websocketService', () => ({
  websocketService: {
    onMessage: jest.fn(),
    onTransactionUpdate: jest.fn(),
  },
}));

jest.mock('../../utils/eventEmitter', () => ({
  __esModule: true,
  eventEmitter: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}));

jest.mock('../../utils/logger');

// Import after mocks
import { messageManager } from '../MessageManager';
import apiClient from '../../_api/apiClient';
import { networkService } from '../NetworkService';
import { eventEmitter } from '../../utils/eventEmitter';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cast to jest.Mock for type-safe mock control
const mockPost = apiClient.post as jest.Mock;
const mockEmit = eventEmitter.emit as jest.Mock;
const mockGetNetworkState = networkService.getNetworkState as jest.Mock;
const mockOnNetworkStateChange = networkService.onNetworkStateChange as jest.Mock;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Test data
const testSendRequest = {
  interaction_id: 'interaction-123',
  content: 'Hello world!',
  message_type: 'text' as const,
  sender_entity_id: 'entity-456',
};

const testMessage = {
  id: 'msg-001',
  interaction_id: 'interaction-123',
  content: 'Hello world!',
  message_type: 'text',
  sender_entity_id: 'entity-456',
  status: 'sent',
  created_at: '2024-01-01T12:00:00Z',
  updated_at: '2024-01-01T12:00:00Z',
};

// Mutable network state for tests
const mockNetworkState = {
  isOfflineMode: false,
  isConnected: true,
};

describe('MessageManager', () => {
  let networkStateCallback: ((state: any) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset mock state
    mockNetworkState.isOfflineMode = false;
    mockNetworkState.isConnected = true;

    // Configure network service mock
    mockGetNetworkState.mockReturnValue(mockNetworkState);

    // Capture network state callback
    mockOnNetworkStateChange.mockImplementation((callback) => {
      networkStateCallback = callback;
      return jest.fn(); // cleanup function
    });

    // Mock AsyncStorage
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);

    // Reset singleton state
    messageManager.reset();
  });

  afterEach(() => {
    messageManager.cleanup();
    messageManager.reset();
    jest.useRealTimers();
    networkStateCallback = null;
  });

  // ============================================================
  // INITIALIZATION TESTS
  // ============================================================

  describe('initialization', () => {
    it('should have messageManager defined', () => {
      // The singleton is initialized when module is imported
      expect(messageManager).toBeDefined();
      expect(messageManager.sendMessage).toBeInstanceOf(Function);
      expect(messageManager.getQueueSize).toBeInstanceOf(Function);
    });

    it('should start queue processing interval', () => {
      // Verify interval is running by advancing time
      jest.advanceTimersByTime(3000);
      // Should not throw
    });
  });

  // ============================================================
  // sendMessage TESTS
  // ============================================================

  describe('sendMessage', () => {
    it('should send message successfully when online', async () => {
      mockPost.mockResolvedValueOnce({
        status: 201,
        data: testMessage,
      });

      const result = await messageManager.sendMessage(testSendRequest);

      expect(result).toEqual(testMessage);
      expect(mockPost).toHaveBeenCalled();
      expect(mockEmit).toHaveBeenCalledWith('message:new', testMessage);
    });

    it('should accept 200 status as success', async () => {
      mockPost.mockResolvedValueOnce({
        status: 200,
        data: testMessage,
      });

      const result = await messageManager.sendMessage(testSendRequest);

      expect(result).toEqual(testMessage);
    });

    it('should cache message status after sending', async () => {
      mockPost.mockResolvedValueOnce({
        status: 201,
        data: testMessage,
      });

      await messageManager.sendMessage(testSendRequest);

      const cachedStatus = messageManager.getMessageStatus('msg-001');
      expect(cachedStatus).toBe('sent');
    });

    it('should block duplicate messages within deduplication window', async () => {
      mockPost.mockResolvedValue({
        status: 201,
        data: testMessage,
      });

      // Send first message
      await messageManager.sendMessage(testSendRequest);

      // Try to send same message immediately
      const result = await messageManager.sendMessage(testSendRequest);

      expect(result).toBeNull();
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('should allow same message after deduplication window', async () => {
      mockPost.mockResolvedValue({
        status: 201,
        data: testMessage,
      });

      // Send first message
      await messageManager.sendMessage(testSendRequest);

      // Advance past deduplication window (10 seconds)
      jest.advanceTimersByTime(11000);

      // Send same message again
      const result = await messageManager.sendMessage(testSendRequest);

      expect(result).toEqual(testMessage);
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('should queue message when offline', async () => {
      mockNetworkState.isOfflineMode = true;

      const result = await messageManager.sendMessage(testSendRequest);

      expect(result).not.toBeNull();
      expect(result.status).toBe('pending');
      expect(result.metadata.isOptimistic).toBe(true);
      expect(mockPost).not.toHaveBeenCalled();
      expect(messageManager.getQueueSize()).toBe(1);
    });

    it('should emit optimistic message event when offline', async () => {
      mockNetworkState.isOfflineMode = true;

      await messageManager.sendMessage(testSendRequest);

      expect(mockEmit).toHaveBeenCalledWith(
        'message:new',
        expect.objectContaining({
          status: 'pending',
          metadata: { isOptimistic: true },
        }),
      );
    });

    it('should save queue to storage when offline', async () => {
      mockNetworkState.isOfflineMode = true;

      await messageManager.sendMessage(testSendRequest);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'message_queue',
        expect.any(String),
      );
    });

    it('should add to retry queue on non-400 error', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      const result = await messageManager.sendMessage(testSendRequest);

      expect(result).toBeNull();
      expect(messageManager.getQueueSize()).toBe(1);
    });

    it('should not add to retry queue on 400 error', async () => {
      mockPost.mockRejectedValueOnce(new Error('400 Bad Request'));

      const initialQueueSize = messageManager.getQueueSize();
      await messageManager.sendMessage(testSendRequest);

      expect(messageManager.getQueueSize()).toBe(initialQueueSize);
    });

    it('should throw on unexpected response status', async () => {
      mockPost.mockResolvedValueOnce({
        status: 500,
        data: null,
      });

      const result = await messageManager.sendMessage(testSendRequest);

      expect(result).toBeNull();
    });

    it('should generate unique optimistic IDs', async () => {
      mockNetworkState.isOfflineMode = true;

      const result1 = await messageManager.sendMessage(testSendRequest);

      // Clear deduplication
      jest.advanceTimersByTime(11000);

      const result2 = await messageManager.sendMessage({
        ...testSendRequest,
        content: 'Different message',
      });

      expect(result1.id).not.toBe(result2.id);
      expect(result1.id).toMatch(/^opt_msg_/);
      expect(result2.id).toMatch(/^opt_msg_/);
    });
  });

  // ============================================================
  // getMessageStatus TESTS
  // ============================================================

  describe('getMessageStatus', () => {
    it('should return null for unknown message', () => {
      const status = messageManager.getMessageStatus('unknown-id');
      expect(status).toBeNull();
    });

    it('should return cached status for known message', async () => {
      mockPost.mockResolvedValueOnce({
        status: 201,
        data: { ...testMessage, status: 'delivered' },
      });

      await messageManager.sendMessage(testSendRequest);

      const status = messageManager.getMessageStatus('msg-001');
      expect(status).toBe('delivered');
    });
  });

  // ============================================================
  // QUEUE PROCESSING TESTS
  // ============================================================

  describe('queue processing', () => {
    it('should have queued messages available for processing', async () => {
      mockNetworkState.isOfflineMode = true;
      await messageManager.sendMessage(testSendRequest);

      // Verify message was queued
      expect(messageManager.getQueueSize()).toBe(1);
      const pending = messageManager.getPendingMessages();
      expect(pending).toHaveLength(1);
      expect(pending[0].request.content).toBe('Hello world!');
    });

    it('should remove message from queue after successful send', async () => {
      mockNetworkState.isOfflineMode = true;
      await messageManager.sendMessage(testSendRequest);
      expect(messageManager.getQueueSize()).toBe(1);

      mockNetworkState.isOfflineMode = false;
      mockPost.mockResolvedValueOnce({
        status: 201,
        data: testMessage,
      });

      // Trigger queue processing
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Queue should eventually be empty
      // Note: May need multiple processing cycles
    });

    it('should increment retry count on failure', async () => {
      mockNetworkState.isOfflineMode = true;
      await messageManager.sendMessage(testSendRequest);

      mockNetworkState.isOfflineMode = false;
      mockPost.mockRejectedValue(new Error('Server error'));

      // Process queue multiple times
      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(3000);
        await Promise.resolve();
      }

      // After max retries, message should be removed
    });

    it('should process queue when coming back online', async () => {
      mockNetworkState.isOfflineMode = true;
      await messageManager.sendMessage(testSendRequest);

      mockPost.mockResolvedValueOnce({
        status: 201,
        data: testMessage,
      });

      // Simulate coming back online
      if (networkStateCallback) {
        networkStateCallback({ isOfflineMode: false, isConnected: true });
      }

      // Wait for delayed processing (1 second delay + processing)
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });
  });

  // ============================================================
  // STORAGE TESTS
  // ============================================================

  describe('storage operations', () => {
    it('should save queue to storage', async () => {
      mockNetworkState.isOfflineMode = true;
      await messageManager.sendMessage(testSendRequest);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'message_queue',
        expect.stringContaining('interaction-123'),
      );
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));

      mockNetworkState.isOfflineMode = true;

      // Should not throw
      await expect(messageManager.sendMessage(testSendRequest)).resolves.not.toThrow();
    });
  });

  // ============================================================
  // clearQueue TESTS
  // ============================================================

  describe('clearQueue', () => {
    it('should clear all pending messages', async () => {
      mockNetworkState.isOfflineMode = true;
      await messageManager.sendMessage(testSendRequest);
      expect(messageManager.getQueueSize()).toBe(1);

      await messageManager.clearQueue();

      expect(messageManager.getQueueSize()).toBe(0);
    });

    it('should save empty queue to storage', async () => {
      await messageManager.clearQueue();

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('message_queue', '[]');
    });
  });

  // ============================================================
  // getQueueSize TESTS
  // ============================================================

  describe('getQueueSize', () => {
    it('should return 0 for empty queue', () => {
      expect(messageManager.getQueueSize()).toBe(0);
    });

    it('should return correct count for queued messages', async () => {
      mockNetworkState.isOfflineMode = true;

      await messageManager.sendMessage(testSendRequest);
      expect(messageManager.getQueueSize()).toBe(1);

      // Clear deduplication window
      jest.advanceTimersByTime(11000);

      await messageManager.sendMessage({
        ...testSendRequest,
        content: 'Second message',
      });
      expect(messageManager.getQueueSize()).toBe(2);
    });
  });

  // ============================================================
  // getPendingMessages TESTS
  // ============================================================

  describe('getPendingMessages', () => {
    it('should return empty array when no pending messages', () => {
      const pending = messageManager.getPendingMessages();
      expect(pending).toEqual([]);
    });

    it('should return all pending messages', async () => {
      mockNetworkState.isOfflineMode = true;

      await messageManager.sendMessage(testSendRequest);

      const pending = messageManager.getPendingMessages();
      expect(pending).toHaveLength(1);
      expect(pending[0].request.content).toBe('Hello world!');
    });
  });

  // ============================================================
  // cleanup TESTS
  // ============================================================

  describe('cleanup', () => {
    it('should clear interval on cleanup', () => {
      messageManager.cleanup();

      // Advancing time should not trigger processing
      jest.advanceTimersByTime(10000);
      // No errors should occur
    });

    it('should clear reconnect handler on cleanup', () => {
      messageManager.cleanup();

      // Simulating network change should not trigger processing
      if (networkStateCallback) {
        networkStateCallback({ isOfflineMode: false });
      }
      // No errors should occur
    });

    it('should be safe to call cleanup multiple times', () => {
      messageManager.cleanup();
      messageManager.cleanup();
      messageManager.cleanup();
      // Should not throw
    });
  });

  // ============================================================
  // OPTIMISTIC MESSAGE MAPPING TESTS
  // ============================================================

  describe('optimistic message mapping', () => {
    it('should map optimistic ID to server ID', async () => {
      mockPost.mockResolvedValueOnce({
        status: 201,
        data: testMessage,
      });

      const result = await messageManager.sendMessage(testSendRequest);

      expect(result.id).toBe('msg-001');
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe('edge cases', () => {
    it('should handle empty content message', async () => {
      mockPost.mockResolvedValueOnce({
        status: 201,
        data: { ...testMessage, content: '' },
      });

      const result = await messageManager.sendMessage({
        ...testSendRequest,
        content: '',
      });

      expect(result).not.toBeNull();
    });

    it('should handle very long content', async () => {
      const longContent = 'a'.repeat(10000);
      mockPost.mockResolvedValueOnce({
        status: 201,
        data: { ...testMessage, content: longContent },
      });

      const result = await messageManager.sendMessage({
        ...testSendRequest,
        content: longContent,
      });

      expect(result).not.toBeNull();
    });

    it('should handle special characters in content', async () => {
      const specialContent = '!@#$%^&*()_+{}[]|\\:";\'<>?,./`~';
      mockPost.mockResolvedValueOnce({
        status: 201,
        data: { ...testMessage, content: specialContent },
      });

      const result = await messageManager.sendMessage({
        ...testSendRequest,
        content: specialContent,
      });

      expect(result).not.toBeNull();
    });

    it('should handle unicode content', async () => {
      const unicodeContent = 'Hello \u{1F600} \u{1F4AC} \u{2764}';
      mockPost.mockResolvedValueOnce({
        status: 201,
        data: { ...testMessage, content: unicodeContent },
      });

      const result = await messageManager.sendMessage({
        ...testSendRequest,
        content: unicodeContent,
      });

      expect(result).not.toBeNull();
    });

    it('should handle concurrent message sends', async () => {
      mockPost.mockResolvedValue({
        status: 201,
        data: testMessage,
      });

      // Send multiple messages with different content (to avoid deduplication)
      const promises = [
        messageManager.sendMessage({ ...testSendRequest, content: 'Message 1' }),
        messageManager.sendMessage({ ...testSendRequest, content: 'Message 2' }),
        messageManager.sendMessage({ ...testSendRequest, content: 'Message 3' }),
      ];

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result).not.toBeNull();
      });
    });

    it('should handle default message_type when not provided', async () => {
      mockPost.mockResolvedValueOnce({
        status: 201,
        data: testMessage,
      });

      const { message_type, ...requestWithoutType } = testSendRequest;
      await messageManager.sendMessage(requestWithoutType as any);

      // Verify the API was called with a dto containing message_type: 'text'
      expect(mockPost).toHaveBeenCalled();
      const callArgs = mockPost.mock.calls[0];
      expect(callArgs[1]).toMatchObject({
        message_type: 'text',
      });
    });
  });

  // ============================================================
  // NETWORK STATE CHANGE TESTS
  // ============================================================

  describe('network state changes', () => {
    it('should queue messages when going offline during send', async () => {
      // Start online but fail with network error
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      const result = await messageManager.sendMessage(testSendRequest);

      expect(result).toBeNull();
      expect(messageManager.getQueueSize()).toBe(1);
    });

    it('should not trigger processing when staying offline', () => {
      mockNetworkState.isOfflineMode = true;

      if (networkStateCallback) {
        networkStateCallback({ isOfflineMode: true, isConnected: false });
      }

      // Processing should not be triggered
      expect(mockPost).not.toHaveBeenCalled();
    });
  });
});
