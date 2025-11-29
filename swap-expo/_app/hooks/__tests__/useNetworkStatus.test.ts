/**
 * useNetworkStatus Tests
 *
 * Tests the network connectivity monitoring hook.
 * Tests initial state, state updates, subscription lifecycle, and utility functions.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock logger
jest.mock('../../utils/logger');

// Mock NetInfo - uses __mocks__/@react-native-community/netinfo.ts
jest.mock('@react-native-community/netinfo');

// Import after mocks
import { useNetworkStatus, checkNetworkStatus } from '../useNetworkStatus';
import NetInfo from '@react-native-community/netinfo';
import logger from '../../utils/logger';

const mockLogger = logger as jest.Mocked<typeof logger>;

// Get mock functions from the mocked module
const mockAddEventListener = NetInfo.addEventListener as jest.Mock;
const mockFetch = NetInfo.fetch as jest.Mock;

describe('useNetworkStatus', () => {
  let listenerCallback: ((state: any) => void) | null = null;
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    listenerCallback = null;

    // Setup default mock behavior
    mockAddEventListener.mockImplementation((callback) => {
      listenerCallback = callback;
      return mockUnsubscribe;
    });

    mockFetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
  });

  // ============================================================
  // INITIAL STATE TESTS
  // ============================================================

  describe('initial state', () => {
    it('should return connected state by default', () => {
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isConnected).toBe(true);
      expect(result.current.isOnline).toBe(true);
      expect(result.current.type).toBeNull();
    });

    it('should fetch initial state on mount', async () => {
      renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('should update state from initial fetch', async () => {
      mockFetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.type).toBe('wifi');
      });
    });
  });

  // ============================================================
  // SUBSCRIPTION TESTS
  // ============================================================

  describe('event listener subscription', () => {
    it('should subscribe to network events on mount', () => {
      renderHook(() => useNetworkStatus());

      expect(mockAddEventListener).toHaveBeenCalledTimes(1);
      expect(mockAddEventListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should unsubscribe on unmount', () => {
      const { unmount } = renderHook(() => useNetworkStatus());

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should update state when network event fires', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      // Simulate network event
      act(() => {
        if (listenerCallback) {
          listenerCallback({
            isConnected: false,
            isInternetReachable: false,
            type: 'none',
          });
        }
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isOnline).toBe(false);
      expect(result.current.type).toBe('none');
    });
  });

  // ============================================================
  // NETWORK STATE CHANGES TESTS
  // ============================================================

  describe('network state changes', () => {
    it('should handle WiFi connection', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      act(() => {
        if (listenerCallback) {
          listenerCallback({
            isConnected: true,
            isInternetReachable: true,
            type: 'wifi',
          });
        }
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.isOnline).toBe(true);
      expect(result.current.type).toBe('wifi');
    });

    it('should handle cellular connection', () => {
      const { result } = renderHook(() => useNetworkStatus());

      act(() => {
        if (listenerCallback) {
          listenerCallback({
            isConnected: true,
            isInternetReachable: true,
            type: 'cellular',
          });
        }
      });

      expect(result.current.type).toBe('cellular');
    });

    it('should handle disconnection', () => {
      const { result } = renderHook(() => useNetworkStatus());

      act(() => {
        if (listenerCallback) {
          listenerCallback({
            isConnected: false,
            isInternetReachable: false,
            type: 'none',
          });
        }
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isOnline).toBe(false);
    });

    it('should handle connected but no internet', () => {
      const { result } = renderHook(() => useNetworkStatus());

      act(() => {
        if (listenerCallback) {
          listenerCallback({
            isConnected: true,
            isInternetReachable: false,
            type: 'wifi',
          });
        }
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.isOnline).toBe(false);
    });

    it('should handle ethernet connection', () => {
      const { result } = renderHook(() => useNetworkStatus());

      act(() => {
        if (listenerCallback) {
          listenerCallback({
            isConnected: true,
            isInternetReachable: true,
            type: 'ethernet',
          });
        }
      });

      expect(result.current.type).toBe('ethernet');
    });

    it('should handle unknown connection type', () => {
      const { result } = renderHook(() => useNetworkStatus());

      act(() => {
        if (listenerCallback) {
          listenerCallback({
            isConnected: true,
            isInternetReachable: true,
            type: 'unknown',
          });
        }
      });

      expect(result.current.type).toBe('unknown');
    });
  });

  // ============================================================
  // NULL/UNDEFINED HANDLING TESTS
  // ============================================================

  describe('null/undefined handling', () => {
    it('should default isConnected to false when null', () => {
      const { result } = renderHook(() => useNetworkStatus());

      act(() => {
        if (listenerCallback) {
          listenerCallback({
            isConnected: null,
            isInternetReachable: null,
            type: 'wifi',
          });
        }
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should fall back isOnline to isConnected when null', () => {
      const { result } = renderHook(() => useNetworkStatus());

      act(() => {
        if (listenerCallback) {
          listenerCallback({
            isConnected: true,
            isInternetReachable: null,
            type: 'wifi',
          });
        }
      });

      expect(result.current.isOnline).toBe(true);
    });

    it('should handle undefined values', () => {
      const { result } = renderHook(() => useNetworkStatus());

      act(() => {
        if (listenerCallback) {
          listenerCallback({
            isConnected: undefined,
            isInternetReachable: undefined,
            type: undefined,
          });
        }
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isOnline).toBe(false);
    });
  });

  // ============================================================
  // LOGGING TESTS
  // ============================================================

  describe('logging', () => {
    it('should log network status updates', () => {
      renderHook(() => useNetworkStatus());

      act(() => {
        if (listenerCallback) {
          listenerCallback({
            isConnected: true,
            isInternetReachable: true,
            type: 'wifi',
          });
        }
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[NetworkStatus] Updated:',
        expect.objectContaining({
          isConnected: true,
          isOnline: true,
          type: 'wifi',
        }),
      );
    });
  });

  // ============================================================
  // MULTIPLE RENDERS TESTS
  // ============================================================

  describe('multiple renders', () => {
    it('should maintain state across re-renders', () => {
      const { result, rerender } = renderHook(() => useNetworkStatus());

      act(() => {
        if (listenerCallback) {
          listenerCallback({
            isConnected: true,
            isInternetReachable: true,
            type: 'wifi',
          });
        }
      });

      const initialState = { ...result.current };

      rerender();

      expect(result.current.isConnected).toBe(initialState.isConnected);
      expect(result.current.isOnline).toBe(initialState.isOnline);
      expect(result.current.type).toBe(initialState.type);
    });

    it('should not create multiple subscriptions on re-render', () => {
      const { rerender } = renderHook(() => useNetworkStatus());

      rerender();
      rerender();

      // Should only have one subscription
      expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // RAPID CHANGES TESTS
  // ============================================================

  describe('rapid state changes', () => {
    it('should handle rapid network changes', () => {
      const { result } = renderHook(() => useNetworkStatus());

      // Simulate rapid changes
      act(() => {
        if (listenerCallback) {
          listenerCallback({ isConnected: false, isInternetReachable: false, type: 'none' });
          listenerCallback({ isConnected: true, isInternetReachable: false, type: 'wifi' });
          listenerCallback({ isConnected: true, isInternetReachable: true, type: 'wifi' });
        }
      });

      // Should reflect final state
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isOnline).toBe(true);
      expect(result.current.type).toBe('wifi');
    });
  });
});

// ============================================================
// checkNetworkStatus UTILITY TESTS
// ============================================================

describe('checkNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when connected', async () => {
    mockFetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });

    const result = await checkNetworkStatus();

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalled();
  });

  it('should return false when disconnected', async () => {
    mockFetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });

    const result = await checkNetworkStatus();

    expect(result).toBe(false);
  });

  it('should return false when isConnected is null', async () => {
    mockFetch.mockResolvedValue({
      isConnected: null,
      isInternetReachable: true,
    });

    const result = await checkNetworkStatus();

    expect(result).toBe(false);
  });

  it('should return false on error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await checkNetworkStatus();

    expect(result).toBe(false);
  });

  it('should log error when fetch fails', async () => {
    const error = new Error('Fetch failed');
    mockFetch.mockRejectedValue(error);

    await checkNetworkStatus();

    expect(mockLogger.error).toHaveBeenCalledWith(
      '[NetworkStatus] Error checking status:',
      error,
    );
  });
});
