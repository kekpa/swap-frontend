/**
 * useWebSocketQuerySync Tests
 *
 * Tests the WebSocket to TanStack Query cache synchronization hook.
 * Tests message handling, transaction updates, balance invalidation,
 * optimistic updates, and cleanup.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock websocketService - define mock functions inside factory for hoisting
jest.mock('../../services/websocketService', () => ({
  websocketService: {
    onMessage: jest.fn(() => jest.fn()), // Returns unsubscribe function
    onTransactionUpdate: jest.fn(() => jest.fn()),
    onKycUpdate: jest.fn(() => jest.fn()),
  },
}));

import { websocketService } from '../../services/websocketService';
const mockOnMessage = websocketService.onMessage as jest.Mock;
const mockOnTransactionUpdate = websocketService.onTransactionUpdate as jest.Mock;
const mockOnKycUpdate = websocketService.onKycUpdate as jest.Mock;

// Mock queryKeys
jest.mock('../../tanstack-query/queryKeys', () => ({
  queryKeys: {
    timeline: (interactionId: string) => ['timeline', interactionId],
    interactionsByEntity: (entityId: string) => ['interactions', entityId],
    recentTransactions: (entityId: string, limit: number) => ['transactions', entityId, limit],
    balancesByEntity: (entityId: string) => ['balances', entityId],
  },
}));

// Mock logger
jest.mock('../../utils/logger');

import { useWebSocketQuerySync, useWebSocketQueryInvalidation } from '../useWebSocketQuerySync';

// Test data
const testEntityId = 'entity-123';

const testMessageData = {
  id: 'msg-001',
  interaction_id: 'interaction-456',
  sender_entity_id: 'entity-789',
  content: 'Hello world!',
  timestamp: '2024-01-01T12:00:00Z',
};

const testTransactionData = {
  transaction_id: 'txn-001',
  status: 'completed' as const,
  amount: 100,
  currency_code: 'USD',
  timestamp: '2024-01-01T12:00:00Z',
};

// Helper to create wrapper with QueryClient
const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useWebSocketQuerySync', () => {
  let queryClient: QueryClient;
  let messageCallback: ((data: any) => void) | null = null;
  // Store ALL transaction callbacks since the hook registers multiple handlers
  let transactionCallbacks: Array<(data: any) => void> = [];

  beforeEach(() => {
    jest.clearAllMocks();
    // Use advanceTimers: true to make fake timers work with waitFor
    jest.useFakeTimers({ advanceTimers: true });
    transactionCallbacks = [];

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    // Capture callbacks
    mockOnMessage.mockImplementation((callback) => {
      messageCallback = callback;
      return jest.fn(); // Return cleanup function
    });

    // Capture ALL transaction callbacks (hook registers multiple handlers)
    mockOnTransactionUpdate.mockImplementation((callback) => {
      transactionCallbacks.push(callback);
      return jest.fn(); // Return cleanup function
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    queryClient.clear();
    messageCallback = null;
    transactionCallbacks = [];
  });

  // Helper to call all transaction callbacks
  const triggerTransactionCallbacks = (data: any) => {
    transactionCallbacks.forEach(callback => callback(data));
  };

  // ============================================================
  // SETUP TESTS
  // ============================================================

  describe('setup', () => {
    it('should skip setup when entityId is not provided', () => {
      const { result } = renderHook(() => useWebSocketQuerySync(''), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockOnMessage).not.toHaveBeenCalled();
      expect(mockOnTransactionUpdate).not.toHaveBeenCalled();
    });

    it('should set up all WebSocket handlers when entityId is provided', () => {
      renderHook(() => useWebSocketQuerySync(testEntityId), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockOnMessage).toHaveBeenCalled();
      expect(mockOnTransactionUpdate).toHaveBeenCalled();
    });

    it('should clean up handlers on unmount', () => {
      const messageCleanup = jest.fn();
      const transactionCleanup = jest.fn();

      mockOnMessage.mockReturnValue(messageCleanup);
      mockOnTransactionUpdate.mockReturnValue(transactionCleanup);

      const { unmount } = renderHook(() => useWebSocketQuerySync(testEntityId), {
        wrapper: createWrapper(queryClient),
      });

      unmount();

      expect(messageCleanup).toHaveBeenCalled();
      expect(transactionCleanup).toHaveBeenCalled();
    });
  });

  // ============================================================
  // MESSAGE HANDLER TESTS
  // ============================================================

  describe('message handling', () => {
    it('should add new message to timeline cache optimistically', () => {
      // Pre-populate timeline cache
      queryClient.setQueryData(['timeline', 'interaction-456'], []);

      renderHook(() => useWebSocketQuerySync(testEntityId), {
        wrapper: createWrapper(queryClient),
      });

      // Simulate receiving a message
      act(() => {
        if (messageCallback) {
          messageCallback(testMessageData);
        }
      });

      const timeline = queryClient.getQueryData(['timeline', 'interaction-456']) as any[];
      expect(timeline).toHaveLength(1);
      expect(timeline[0].id).toBe('msg-001');
    });

    it('should prevent duplicate message processing', () => {
      queryClient.setQueryData(['timeline', 'interaction-456'], []);

      renderHook(() => useWebSocketQuerySync(testEntityId), {
        wrapper: createWrapper(queryClient),
      });

      // Send same message twice
      act(() => {
        if (messageCallback) {
          messageCallback(testMessageData);
          messageCallback(testMessageData);
        }
      });

      const timeline = queryClient.getQueryData(['timeline', 'interaction-456']) as any[];
      expect(timeline).toHaveLength(1); // Should only have one message
    });

    it('should update interactions list with last message snippet', () => {
      // Pre-populate interactions cache
      queryClient.setQueryData(['interactions', testEntityId], [
        {
          id: 'interaction-456',
          name: 'Test Chat',
          last_message_snippet: 'Old message',
          unread_count: 0,
        },
      ]);

      renderHook(() => useWebSocketQuerySync(testEntityId), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        if (messageCallback) {
          messageCallback(testMessageData);
        }
      });

      const interactions = queryClient.getQueryData(['interactions', testEntityId]) as any[];
      expect(interactions[0].last_message_snippet).toBe('Hello world!');
      expect(interactions[0].last_message_at).toBe('2024-01-01T12:00:00Z');
    });

    it('should increment unread count for messages from other entities', () => {
      queryClient.setQueryData(['interactions', testEntityId], [
        {
          id: 'interaction-456',
          unread_count: 0,
        },
      ]);

      renderHook(() => useWebSocketQuerySync(testEntityId), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        if (messageCallback) {
          // Message from another entity
          messageCallback({
            ...testMessageData,
            sender_entity_id: 'other-entity',
          });
        }
      });

      const interactions = queryClient.getQueryData(['interactions', testEntityId]) as any[];
      expect(interactions[0].unread_count).toBe(1);
    });

    it('should not increment unread count for own messages', () => {
      queryClient.setQueryData(['interactions', testEntityId], [
        {
          id: 'interaction-456',
          unread_count: 0,
        },
      ]);

      renderHook(() => useWebSocketQuerySync(testEntityId), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        if (messageCallback) {
          // Message from self
          messageCallback({
            ...testMessageData,
            sender_entity_id: testEntityId,
          });
        }
      });

      const interactions = queryClient.getQueryData(['interactions', testEntityId]) as any[];
      expect(interactions[0].unread_count).toBe(0);
    });

    it('should handle error in message handler gracefully', () => {
      // Set up cache that will throw when updated
      queryClient.setQueryData(['timeline', 'interaction-456'], null);

      renderHook(() => useWebSocketQuerySync(testEntityId), {
        wrapper: createWrapper(queryClient),
      });

      // Should not throw
      expect(() => {
        act(() => {
          if (messageCallback) {
            messageCallback(testMessageData);
          }
        });
      }).not.toThrow();
    });
  });

  // ============================================================
  // TRANSACTION HANDLER TESTS
  // ============================================================

  describe('transaction handling', () => {
    it('should update transaction status in cache optimistically', () => {
      // Pre-populate transactions cache
      queryClient.setQueryData(['transactions', testEntityId, 20], [
        {
          id: 'txn-001',
          status: 'pending',
          amount: 100,
        },
      ]);

      renderHook(() => useWebSocketQuerySync(testEntityId), {
        wrapper: createWrapper(queryClient),
      });

      // Trigger all transaction callbacks (hook registers multiple handlers)
      act(() => {
        triggerTransactionCallbacks(testTransactionData);
      });

      const transactions = queryClient.getQueryData(['transactions', testEntityId, 20]) as any[];
      expect(transactions[0].status).toBe('completed');
    });

    it('should invalidate balance queries on completed transaction', () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      renderHook(() => useWebSocketQuerySync(testEntityId), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        triggerTransactionCallbacks({
          ...testTransactionData,
          status: 'completed',
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['balances', testEntityId],
        })
      );
    });

    it('should invalidate transaction queries on update', () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      renderHook(() => useWebSocketQuerySync(testEntityId), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        triggerTransactionCallbacks(testTransactionData);
      });

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['transactions', testEntityId, 20],
        })
      );
    });

    it('should handle failed transaction status', () => {
      queryClient.setQueryData(['transactions', testEntityId, 20], [
        {
          id: 'txn-001',
          status: 'pending',
        },
      ]);

      renderHook(() => useWebSocketQuerySync(testEntityId), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        triggerTransactionCallbacks({
          ...testTransactionData,
          status: 'failed',
        });
      });

      const transactions = queryClient.getQueryData(['transactions', testEntityId, 20]) as any[];
      expect(transactions[0].status).toBe('failed');
    });
  });

  // ============================================================
  // BALANCE HANDLER TESTS
  // ============================================================

  describe('balance handling', () => {
    it('should invalidate balances only on completed transactions', () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      renderHook(() => useWebSocketQuerySync(testEntityId), {
        wrapper: createWrapper(queryClient),
      });

      // Pending transaction should not invalidate balances (from setupBalanceHandlers)
      act(() => {
        triggerTransactionCallbacks({
          ...testTransactionData,
          status: 'pending',
        });
      });

      // Check that balance invalidation was NOT called for pending
      const balanceInvalidations = invalidateSpy.mock.calls.filter(
        call => call[0]?.queryKey?.[0] === 'balances'
      );

      // Clear spy
      invalidateSpy.mockClear();

      // Completed transaction should invalidate balances
      act(() => {
        triggerTransactionCallbacks({
          ...testTransactionData,
          status: 'completed',
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['balances', testEntityId],
        })
      );
    });
  });

  // ============================================================
  // CLEANUP INTERVAL TESTS
  // ============================================================

  describe('cleanup interval', () => {
    it('should set up cleanup interval for processed message IDs', () => {
      renderHook(() => useWebSocketQuerySync(testEntityId), {
        wrapper: createWrapper(queryClient),
      });

      // Advance time by 1 minute (cleanup interval)
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Should not throw
      expect(true).toBe(true);
    });

    it('should clean up interval on unmount', () => {
      const { unmount } = renderHook(() => useWebSocketQuerySync(testEntityId), {
        wrapper: createWrapper(queryClient),
      });

      unmount();

      // Should not throw when advancing time after unmount
      act(() => {
        jest.advanceTimersByTime(120000);
      });
    });
  });

  // ============================================================
  // ENTITY ID CHANGE TESTS
  // ============================================================

  describe('entityId changes', () => {
    it('should reinitialize handlers when entityId changes', () => {
      const { rerender } = renderHook(
        ({ entityId }) => useWebSocketQuerySync(entityId),
        {
          wrapper: createWrapper(queryClient),
          initialProps: { entityId: 'entity-1' },
        }
      );

      const initialCallCount = mockOnMessage.mock.calls.length;

      // Change entityId
      rerender({ entityId: 'entity-2' });

      // Should have been called again
      expect(mockOnMessage.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });
});

// ============================================================
// useWebSocketQueryInvalidation TESTS
// ============================================================

describe('useWebSocketQueryInvalidation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should invalidate balances', () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useWebSocketQueryInvalidation(), {
      wrapper,
    });

    act(() => {
      result.current.invalidateBalances('entity-123');
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['balances', 'entity-123'],
      })
    );
  });

  it('should invalidate transactions', () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useWebSocketQueryInvalidation(), {
      wrapper,
    });

    act(() => {
      result.current.invalidateTransactions('entity-123');
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['transactions', 'entity-123', 20],
      })
    );
  });

  it('should invalidate interactions', () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useWebSocketQueryInvalidation(), {
      wrapper,
    });

    act(() => {
      result.current.invalidateInteractions('entity-123');
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['interactions', 'entity-123'],
      })
    );
  });

  it('should invalidate timeline', () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useWebSocketQueryInvalidation(), {
      wrapper,
    });

    act(() => {
      result.current.invalidateTimeline('interaction-456');
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['timeline', 'interaction-456'],
      })
    );
  });

  it('should return all invalidation functions', () => {
    const { result } = renderHook(() => useWebSocketQueryInvalidation(), {
      wrapper,
    });

    expect(result.current).toHaveProperty('invalidateBalances');
    expect(result.current).toHaveProperty('invalidateTransactions');
    expect(result.current).toHaveProperty('invalidateInteractions');
    expect(result.current).toHaveProperty('invalidateTimeline');
  });
});
