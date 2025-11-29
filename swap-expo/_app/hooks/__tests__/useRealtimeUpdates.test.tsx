/**
 * useRealtimeUpdates Hook Tests
 *
 * Tests real-time WebSocket subscription and cache update handling
 *
 * Key behaviors tested:
 * - CacheUpdateManager initialization with QueryClient
 * - Subscription on mount
 * - Unsubscription on unmount
 * - Interaction-specific subscriptions
 * - onUpdate callback handling
 * - forceRefresh functionality
 * - Re-subscription on dependency changes
 */

import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRealtimeUpdates, useWebSocketQueryInvalidation } from '../useRealtimeUpdates';
import { cacheUpdateManager } from '../../services/CacheUpdateManager';

// Mock the CacheUpdateManager
jest.mock('../../services/CacheUpdateManager', () => ({
  cacheUpdateManager: {
    initialize: jest.fn(),
    subscribe: jest.fn(() => jest.fn()), // Returns unsubscribe function
    forceRefresh: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

describe('useRealtimeUpdates', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    jest.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('initialization', () => {
    it('should initialize CacheUpdateManager with QueryClient on mount', () => {
      renderHook(() => useRealtimeUpdates(), { wrapper });

      expect(cacheUpdateManager.initialize).toHaveBeenCalledWith(queryClient);
    });

    it('should initialize only once per mount', () => {
      const { rerender } = renderHook(() => useRealtimeUpdates(), { wrapper });

      rerender();

      // Should still be called once (on initial mount)
      expect(cacheUpdateManager.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscription', () => {
    it('should subscribe to updates on mount', () => {
      renderHook(() => useRealtimeUpdates(), { wrapper });

      expect(cacheUpdateManager.subscribe).toHaveBeenCalled();
    });

    it('should subscribe with generated subscription ID', () => {
      renderHook(() => useRealtimeUpdates(), { wrapper });

      const subscribeCall = (cacheUpdateManager.subscribe as jest.Mock).mock.calls[0][0];
      expect(subscribeCall.id).toMatch(/^realtime-/);
    });

    it('should subscribe with undefined interactionId when not provided', () => {
      renderHook(() => useRealtimeUpdates(), { wrapper });

      const subscribeCall = (cacheUpdateManager.subscribe as jest.Mock).mock.calls[0][0];
      expect(subscribeCall.interactionId).toBeUndefined();
    });

    it('should subscribe with specific interactionId when provided', () => {
      renderHook(() => useRealtimeUpdates({ interactionId: 'int_123' }), { wrapper });

      const subscribeCall = (cacheUpdateManager.subscribe as jest.Mock).mock.calls[0][0];
      expect(subscribeCall.interactionId).toBe('int_123');
    });

    it('should pass onUpdate callback to subscription', () => {
      const onUpdate = jest.fn();

      renderHook(() => useRealtimeUpdates({ onUpdate }), { wrapper });

      const subscribeCall = (cacheUpdateManager.subscribe as jest.Mock).mock.calls[0][0];
      expect(subscribeCall.onUpdate).toBe(onUpdate);
    });
  });

  describe('unsubscription', () => {
    it('should unsubscribe on unmount', () => {
      const mockUnsubscribe = jest.fn();
      (cacheUpdateManager.subscribe as jest.Mock).mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useRealtimeUpdates(), { wrapper });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should unsubscribe and resubscribe when interactionId changes', () => {
      const mockUnsubscribe = jest.fn();
      (cacheUpdateManager.subscribe as jest.Mock).mockReturnValue(mockUnsubscribe);

      const { rerender } = renderHook(
        ({ interactionId }) => useRealtimeUpdates({ interactionId }),
        {
          wrapper,
          initialProps: { interactionId: 'int_1' },
        }
      );

      // Change interactionId
      rerender({ interactionId: 'int_2' });

      // Should have unsubscribed from old and subscribed to new
      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(cacheUpdateManager.subscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('forceRefresh', () => {
    it('should return forceRefresh function', () => {
      const { result } = renderHook(() => useRealtimeUpdates({ interactionId: 'int_123' }), {
        wrapper,
      });

      expect(result.current.forceRefresh).toBeDefined();
      expect(typeof result.current.forceRefresh).toBe('function');
    });

    it('should call cacheUpdateManager.forceRefresh when interactionId is provided', () => {
      const { result } = renderHook(() => useRealtimeUpdates({ interactionId: 'int_123' }), {
        wrapper,
      });

      act(() => {
        result.current.forceRefresh();
      });

      expect(cacheUpdateManager.forceRefresh).toHaveBeenCalledWith('int_123');
    });

    it('should not call forceRefresh when interactionId is not provided', () => {
      const { result } = renderHook(() => useRealtimeUpdates(), { wrapper });

      act(() => {
        result.current.forceRefresh();
      });

      expect(cacheUpdateManager.forceRefresh).not.toHaveBeenCalled();
    });
  });

  describe('onUpdate callback', () => {
    it('should trigger onUpdate when event is received', () => {
      const onUpdate = jest.fn();
      let capturedSubscription: any;

      (cacheUpdateManager.subscribe as jest.Mock).mockImplementation((sub) => {
        capturedSubscription = sub;
        return jest.fn();
      });

      renderHook(() => useRealtimeUpdates({ onUpdate }), { wrapper });

      // Simulate event
      const mockEvent = { event: 'new_message', data: { id: 'msg_123' } };
      capturedSubscription.onUpdate(mockEvent);

      expect(onUpdate).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe('dependency changes', () => {
    it('should resubscribe when onUpdate callback changes', () => {
      const mockUnsubscribe = jest.fn();
      (cacheUpdateManager.subscribe as jest.Mock).mockReturnValue(mockUnsubscribe);

      const onUpdate1 = jest.fn();
      const onUpdate2 = jest.fn();

      const { rerender } = renderHook(
        ({ onUpdate }) => useRealtimeUpdates({ onUpdate }),
        {
          wrapper,
          initialProps: { onUpdate: onUpdate1 },
        }
      );

      rerender({ onUpdate: onUpdate2 });

      // Should have subscribed twice (initial + after change)
      expect(cacheUpdateManager.subscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('multiple instances', () => {
    it('should support multiple hook instances with different interactionIds', () => {
      renderHook(() => useRealtimeUpdates({ interactionId: 'int_1' }), { wrapper });
      renderHook(() => useRealtimeUpdates({ interactionId: 'int_2' }), { wrapper });

      expect(cacheUpdateManager.subscribe).toHaveBeenCalledTimes(2);

      const calls = (cacheUpdateManager.subscribe as jest.Mock).mock.calls;
      expect(calls[0][0].interactionId).toBe('int_1');
      expect(calls[1][0].interactionId).toBe('int_2');
    });

    it('should generate unique subscription IDs', () => {
      renderHook(() => useRealtimeUpdates(), { wrapper });
      renderHook(() => useRealtimeUpdates(), { wrapper });

      const calls = (cacheUpdateManager.subscribe as jest.Mock).mock.calls;
      expect(calls[0][0].id).not.toBe(calls[1][0].id);
    });
  });

  describe('backwards compatibility', () => {
    it('should export useWebSocketQueryInvalidation as alias', () => {
      expect(useWebSocketQueryInvalidation).toBe(useRealtimeUpdates);
    });

    it('should work with useWebSocketQueryInvalidation alias', () => {
      const { result } = renderHook(
        () => useWebSocketQueryInvalidation({ interactionId: 'int_123' }),
        { wrapper }
      );

      expect(result.current.forceRefresh).toBeDefined();
      expect(cacheUpdateManager.subscribe).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const { result } = renderHook(() => useRealtimeUpdates({}), { wrapper });

      expect(result.current.forceRefresh).toBeDefined();
      expect(cacheUpdateManager.subscribe).toHaveBeenCalled();
    });

    it('should handle undefined interactionId explicitly', () => {
      const { result } = renderHook(
        () => useRealtimeUpdates({ interactionId: undefined }),
        { wrapper }
      );

      act(() => {
        result.current.forceRefresh();
      });

      expect(cacheUpdateManager.forceRefresh).not.toHaveBeenCalled();
    });

    it('should handle rapid mount/unmount cycles', () => {
      const mockUnsubscribe = jest.fn();
      (cacheUpdateManager.subscribe as jest.Mock).mockReturnValue(mockUnsubscribe);

      // Rapid mount/unmount
      for (let i = 0; i < 5; i++) {
        const { unmount } = renderHook(() => useRealtimeUpdates(), { wrapper });
        unmount();
      }

      expect(cacheUpdateManager.subscribe).toHaveBeenCalledTimes(5);
      expect(mockUnsubscribe).toHaveBeenCalledTimes(5);
    });
  });
});
