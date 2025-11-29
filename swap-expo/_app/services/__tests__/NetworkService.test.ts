/**
 * NetworkService Tests
 *
 * Tests the network connectivity and offline mode detection service.
 * Critical for local-first architecture.
 */

import NetInfo from '@react-native-community/netinfo';

// Mock functions
const mockFetch = jest.fn();
const mockAddEventListener = jest.fn();

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: mockFetch,
  addEventListener: mockAddEventListener,
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('NetworkService', () => {
  let networkService: any;

  const mockOnlineState = {
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  };

  const mockOfflineState = {
    isConnected: false,
    isInternetReachable: false,
    type: 'none',
  };

  const mockCellularState = {
    isConnected: true,
    isInternetReachable: true,
    type: 'cellular',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default to online state
    mockFetch.mockResolvedValue(mockOnlineState);
    mockAddEventListener.mockReturnValue(() => {}); // Return unsubscribe

    // Get fresh instance by re-requiring
    jest.resetModules();
    // Re-apply mocks after reset
    jest.doMock('@react-native-community/netinfo', () => ({
      fetch: mockFetch,
      addEventListener: mockAddEventListener,
    }));
    const module = await import('../NetworkService');
    networkService = module.networkService;
  });

  afterEach(() => {
    if (networkService) {
      networkService.cleanup();
    }
  });

  // ============================================================
  // INITIALIZATION TESTS
  // ============================================================

  describe('initialization', () => {
    it('should initialize and fetch initial network state', async () => {
      await networkService.initialize();

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should subscribe to network state changes', async () => {
      await networkService.initialize();

      expect(mockAddEventListener).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      await networkService.initialize();
      await networkService.initialize();

      // Should only call once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization failure gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await networkService.initialize();

      // Should default to offline mode
      const state = networkService.getNetworkState();
      expect(state.isOfflineMode).toBe(true);
    });
  });

  // ============================================================
  // NETWORK STATE TESTS
  // ============================================================

  describe('getNetworkState', () => {
    it('should return current network state', async () => {
      await networkService.initialize();

      const state = networkService.getNetworkState();

      expect(state.isConnected).toBe(true);
      expect(state.isInternetReachable).toBe(true);
      expect(state.type).toBe('wifi');
      expect(state.isOfflineMode).toBe(false);
    });

    it('should return copy of state (immutable)', async () => {
      await networkService.initialize();

      const state1 = networkService.getNetworkState();
      const state2 = networkService.getNetworkState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Different object references
    });
  });

  describe('isOffline', () => {
    it('should return true when disconnected', async () => {
      mockFetch.mockResolvedValue(mockOfflineState);
      await networkService.initialize();

      expect(networkService.isOffline()).toBe(true);
    });

    it('should return false when connected', async () => {
      mockFetch.mockResolvedValue(mockOnlineState);
      await networkService.initialize();

      expect(networkService.isOffline()).toBe(false);
    });
  });

  describe('isOnline', () => {
    it('should return true when connected', async () => {
      mockFetch.mockResolvedValue(mockOnlineState);
      await networkService.initialize();

      expect(networkService.isOnline()).toBe(true);
    });

    it('should return false when disconnected', async () => {
      mockFetch.mockResolvedValue(mockOfflineState);
      await networkService.initialize();

      expect(networkService.isOnline()).toBe(false);
    });

    it('should work with cellular connection', async () => {
      mockFetch.mockResolvedValue(mockCellularState);
      await networkService.initialize();

      expect(networkService.isOnline()).toBe(true);
    });
  });

  // ============================================================
  // EVENT EMISSION TESTS
  // ============================================================

  describe('events', () => {
    it('should emit networkStateChange when state changes', async () => {
      await networkService.initialize();

      const callback = jest.fn();
      networkService.onNetworkStateChange(callback);

      // Simulate network state change
      const eventListener =
        mockAddEventListener.mock.calls[0][0];
      eventListener(mockOfflineState);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isOfflineMode: true,
        }),
      );
    });

    it('should emit offline event when going offline', async () => {
      await networkService.initialize();

      const callback = jest.fn();
      networkService.onOffline(callback);

      // Simulate going offline
      const eventListener =
        mockAddEventListener.mock.calls[0][0];
      eventListener(mockOfflineState);

      expect(callback).toHaveBeenCalled();
    });

    it('should emit online event when coming online', async () => {
      mockFetch.mockResolvedValue(mockOfflineState);
      await networkService.initialize();

      const callback = jest.fn();
      networkService.onOnline(callback);

      // Simulate coming online
      const eventListener =
        mockAddEventListener.mock.calls[0][0];
      eventListener(mockOnlineState);

      expect(callback).toHaveBeenCalled();
    });

    it('should return unsubscribe function', async () => {
      await networkService.initialize();

      const callback = jest.fn();
      const unsubscribe = networkService.onNetworkStateChange(callback);

      // Unsubscribe
      unsubscribe();

      // Trigger event
      const eventListener =
        mockAddEventListener.mock.calls[0][0];
      eventListener(mockOfflineState);

      // Should not be called after unsubscribe
      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // waitForOnline TESTS
  // ============================================================

  describe('waitForOnline', () => {
    it('should resolve immediately if already online', async () => {
      mockFetch.mockResolvedValue(mockOnlineState);
      await networkService.initialize();

      const result = await networkService.waitForOnline();

      expect(result).toBe(true);
    });

    it('should resolve when network comes online', async () => {
      mockFetch.mockResolvedValue(mockOfflineState);
      await networkService.initialize();

      // Start waiting
      const waitPromise = networkService.waitForOnline(5000);

      // Simulate coming online after a delay
      setTimeout(() => {
        const eventListener =
          mockAddEventListener.mock.calls[0][0];
        eventListener(mockOnlineState);
      }, 100);

      const result = await waitPromise;

      expect(result).toBe(true);
    });

    it('should timeout if network does not come online', async () => {
      mockFetch.mockResolvedValue(mockOfflineState);
      await networkService.initialize();

      const result = await networkService.waitForOnline(100);

      expect(result).toBe(false);
    });
  });

  // ============================================================
  // executeWhenOnline TESTS
  // ============================================================

  describe('executeWhenOnline', () => {
    it('should execute function when online', async () => {
      mockFetch.mockResolvedValue(mockOnlineState);
      await networkService.initialize();

      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await networkService.executeWhenOnline(mockFn);

      expect(mockFn).toHaveBeenCalled();
      expect(result).toBe('success');
    });

    it('should return fallback when offline', async () => {
      mockFetch.mockResolvedValue(mockOfflineState);
      await networkService.initialize();

      const mockFn = jest.fn().mockResolvedValue('success');
      const fallback = 'offline-fallback';

      const result = await networkService.executeWhenOnline(mockFn, fallback);

      expect(mockFn).not.toHaveBeenCalled();
      expect(result).toBe(fallback);
    });

    it('should return undefined when offline with no fallback', async () => {
      mockFetch.mockResolvedValue(mockOfflineState);
      await networkService.initialize();

      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await networkService.executeWhenOnline(mockFn);

      expect(result).toBeUndefined();
    });

    it('should return fallback on function error', async () => {
      mockFetch.mockResolvedValue(mockOnlineState);
      await networkService.initialize();

      const mockFn = jest.fn().mockRejectedValue(new Error('API error'));
      const fallback = 'error-fallback';

      const result = await networkService.executeWhenOnline(mockFn, fallback);

      expect(result).toBe(fallback);
    });
  });

  // ============================================================
  // executeWithOfflineFallback TESTS
  // ============================================================

  describe('executeWithOfflineFallback', () => {
    it('should execute online function when online', async () => {
      mockFetch.mockResolvedValue(mockOnlineState);
      await networkService.initialize();

      const onlineFn = jest.fn().mockResolvedValue('online-data');
      const offlineFn = jest.fn().mockResolvedValue('offline-data');

      const result = await networkService.executeWithOfflineFallback(
        onlineFn,
        offlineFn,
      );

      expect(onlineFn).toHaveBeenCalled();
      expect(offlineFn).not.toHaveBeenCalled();
      expect(result).toBe('online-data');
    });

    it('should execute offline function when offline', async () => {
      mockFetch.mockResolvedValue(mockOfflineState);
      await networkService.initialize();

      const onlineFn = jest.fn().mockResolvedValue('online-data');
      const offlineFn = jest.fn().mockResolvedValue('offline-data');

      const result = await networkService.executeWithOfflineFallback(
        onlineFn,
        offlineFn,
      );

      expect(onlineFn).not.toHaveBeenCalled();
      expect(offlineFn).toHaveBeenCalled();
      expect(result).toBe('offline-data');
    });

    it('should fallback to offline function on error', async () => {
      mockFetch.mockResolvedValue(mockOnlineState);
      await networkService.initialize();

      const onlineFn = jest.fn().mockRejectedValue(new Error('API error'));
      const offlineFn = jest.fn().mockResolvedValue('offline-data');

      const result = await networkService.executeWithOfflineFallback(
        onlineFn,
        offlineFn,
      );

      expect(onlineFn).toHaveBeenCalled();
      expect(offlineFn).toHaveBeenCalled();
      expect(result).toBe('offline-data');
    });

    it('should work with sync offline function', async () => {
      mockFetch.mockResolvedValue(mockOfflineState);
      await networkService.initialize();

      const onlineFn = jest.fn().mockResolvedValue('online-data');
      const offlineFn = () => 'sync-offline-data';

      const result = await networkService.executeWithOfflineFallback(
        onlineFn,
        offlineFn,
      );

      expect(result).toBe('sync-offline-data');
    });
  });

  // ============================================================
  // CLEANUP TESTS
  // ============================================================

  describe('cleanup', () => {
    it('should unsubscribe from NetInfo', async () => {
      const mockUnsubscribe = jest.fn();
      mockAddEventListener.mockReturnValue(mockUnsubscribe);

      await networkService.initialize();
      networkService.cleanup();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should remove all event listeners', async () => {
      await networkService.initialize();

      const callback = jest.fn();
      networkService.onNetworkStateChange(callback);

      networkService.cleanup();

      // Re-initialize to get new event listener
      await networkService.initialize();

      // Trigger event
      const eventListener =
        mockAddEventListener.mock.calls[1][0];
      eventListener(mockOfflineState);

      // Original callback should not be called
      expect(callback).not.toHaveBeenCalled();
    });

    it('should allow re-initialization after cleanup', async () => {
      await networkService.initialize();
      networkService.cleanup();
      await networkService.initialize();

      expect(networkService.getNetworkState()).toBeDefined();
    });
  });

  // ============================================================
  // SINGLETON PATTERN TESTS
  // ============================================================

  describe('singleton pattern', () => {
    it('should return same instance', async () => {
      const module1 = await import('../NetworkService');
      const module2 = await import('../NetworkService');

      expect(module1.networkService).toBe(module2.networkService);
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe('edge cases', () => {
    it('should handle null isConnected', async () => {
      mockFetch.mockResolvedValue({
        isConnected: null,
        isInternetReachable: null,
        type: 'unknown',
      });
      await networkService.initialize();

      const state = networkService.getNetworkState();
      expect(state.isConnected).toBe(false);
      expect(state.isOfflineMode).toBe(true);
    });

    it('should handle undefined type', async () => {
      mockFetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: undefined,
      });
      await networkService.initialize();

      const state = networkService.getNetworkState();
      expect(state.type).toBe('unknown');
    });

    it('should not emit duplicate offline events', async () => {
      mockFetch.mockResolvedValue(mockOfflineState);
      await networkService.initialize();

      const callback = jest.fn();
      networkService.onOffline(callback);

      // Trigger offline event twice with same state
      const eventListener =
        mockAddEventListener.mock.calls[0][0];
      eventListener(mockOfflineState);
      eventListener(mockOfflineState);

      // Should only be called once (no state change)
      expect(callback).toHaveBeenCalledTimes(0);
    });

    it('should handle errors in event callbacks gracefully', async () => {
      await networkService.initialize();

      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const normalCallback = jest.fn();

      networkService.onNetworkStateChange(errorCallback);
      networkService.onNetworkStateChange(normalCallback);

      // Trigger event - should not throw
      const eventListener =
        mockAddEventListener.mock.calls[0][0];

      expect(() => eventListener(mockOfflineState)).not.toThrow();

      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalled();
    });
  });
});
