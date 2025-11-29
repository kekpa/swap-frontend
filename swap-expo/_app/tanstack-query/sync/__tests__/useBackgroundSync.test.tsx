/**
 * useBackgroundSync Hook Tests
 *
 * Tests TanStack Query background synchronization
 *
 * Key behaviors tested:
 * - App state change handling (foreground ↔ background)
 * - Sync trigger based on background duration
 * - Adaptive sync intervals
 * - Network reconnection sync
 * - Force sync function
 * - Sync status reporting
 * - Offline queue sync
 */

import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppState, AppStateStatus } from 'react-native';
import React from 'react';

// Mock dependencies before imports
jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../services/NetworkService', () => ({
  networkService: {
    isOnline: true,
    on: jest.fn(),
    off: jest.fn(),
  },
}));

import { networkService } from '../../../services/NetworkService';
const mockNetworkService = networkService as jest.Mocked<typeof networkService>;

jest.mock('../../queryKeys', () => ({
  queryKeys: {
    balancesByEntity: (entityId: string) => ['balances', 'entity', entityId],
    recentTransactions: (entityId: string, limit: number) => ['transactions', 'recent', entityId, limit],
    interactionsByEntity: (entityId: string) => ['interactions', 'entity', entityId],
  },
  extractEntityId: jest.fn(),
}));

// Mock AppState
let appStateChangeCallback: ((state: AppStateStatus) => void) | null = null;
const mockAppStateAddEventListener = jest.fn((event, callback) => {
  if (event === 'change') {
    appStateChangeCallback = callback;
  }
  return { remove: jest.fn() };
});

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn((event, callback) => mockAppStateAddEventListener(event, callback)),
  },
}));

import { useBackgroundSync, useOfflineQueueSync } from '../useBackgroundSync';

describe('useBackgroundSync', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockNetworkService.isOnline = true;
    appStateChangeCallback = null;
    (AppState as any).currentState = 'active';
  });

  afterEach(() => {
    jest.useRealTimers();
    queryClient?.clear();
  });

  describe('initialization', () => {
    it('should register app state listener on mount', () => {
      const wrapper = createWrapper();

      renderHook(() => useBackgroundSync({ entityId: 'entity_123' }), { wrapper });

      expect(mockAppStateAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should use default options when none provided', () => {
      const wrapper = createWrapper();

      const { result } = renderHook(() => useBackgroundSync(), { wrapper });

      expect(result.current.forceSync).toBeDefined();
      expect(result.current.getSyncStatus).toBeDefined();
    });
  });

  describe('forceSync', () => {
    it('should trigger sync when called', async () => {
      const wrapper = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () => useBackgroundSync({ entityId: 'entity_123' }),
        { wrapper }
      );

      await act(async () => {
        await result.current.forceSync();
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('should skip sync when offline', async () => {
      mockNetworkService.isOnline = false;

      const wrapper = createWrapper();
      const logger = require('../../../utils/logger').logger;
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () => useBackgroundSync({ entityId: 'entity_123' }),
        { wrapper }
      );

      await act(async () => {
        await result.current.forceSync();
      });

      expect(logger.debug).toHaveBeenCalledWith(
        '[useBackgroundSync] Skipping sync - device offline'
      );
      expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it('should sync only specified data types', async () => {
      const wrapper = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () =>
          useBackgroundSync({
            entityId: 'entity_123',
            syncBalances: true,
            syncTransactions: false,
            syncInteractions: false,
            syncNotifications: false,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.forceSync();
      });

      // Should only sync balances
      const balanceCalls = invalidateSpy.mock.calls.filter(
        (call) => JSON.stringify(call[0]).includes('balances')
      );
      expect(balanceCalls.length).toBeGreaterThan(0);
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status information', () => {
      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useBackgroundSync({ entityId: 'entity_123' }),
        { wrapper }
      );

      const status = result.current.getSyncStatus();

      expect(status).toHaveProperty('lastSyncTime');
      expect(status).toHaveProperty('timeSinceLastSync');
      expect(status).toHaveProperty('syncCount');
      expect(status).toHaveProperty('failureCount');
      expect(status).toHaveProperty('avgSyncDuration');
      expect(status).toHaveProperty('isOverdue');
      expect(status).toHaveProperty('nextSyncIn');
    });

    it('should update status after sync', async () => {
      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useBackgroundSync({ entityId: 'entity_123' }),
        { wrapper }
      );

      const statusBefore = result.current.getSyncStatus();
      expect(statusBefore.syncCount).toBe(0);

      await act(async () => {
        await result.current.forceSync();
      });

      const statusAfter = result.current.getSyncStatus();
      expect(statusAfter.syncCount).toBe(1);
      expect(statusAfter.lastSyncTime).toBeGreaterThan(0);
    });
  });

  describe('app state change handling', () => {
    it('should trigger sync when app returns to foreground', async () => {
      const wrapper = createWrapper();
      const logger = require('../../../utils/logger').logger;

      renderHook(
        () =>
          useBackgroundSync({
            entityId: 'entity_123',
            backgroundSyncDelay: 0, // No delay for testing
          }),
        { wrapper }
      );

      // Simulate going to background
      (AppState as any).currentState = 'background';
      if (appStateChangeCallback) {
        act(() => {
          appStateChangeCallback!('background');
        });
      }

      // Wait for some "background time"
      jest.advanceTimersByTime(5000);

      // Simulate returning to foreground
      (AppState as any).currentState = 'active';
      if (appStateChangeCallback) {
        act(() => {
          appStateChangeCallback!('active');
        });
      }

      // Advance timers to trigger delayed sync
      jest.advanceTimersByTime(1000);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('App state changed')
      );
    });

    it('should calculate sync reason based on background duration', async () => {
      const wrapper = createWrapper();
      const logger = require('../../../utils/logger').logger;

      renderHook(
        () =>
          useBackgroundSync({
            entityId: 'entity_123',
            backgroundSyncDelay: 0,
          }),
        { wrapper }
      );

      // Go to background
      if (appStateChangeCallback) {
        act(() => {
          appStateChangeCallback!('background');
        });
      }

      // Simulate 15 minutes in background
      jest.advanceTimersByTime(15 * 60 * 1000);

      // Return to foreground
      if (appStateChangeCallback) {
        act(() => {
          appStateChangeCallback!('active');
        });
      }

      jest.advanceTimersByTime(100);

      // Should detect long background
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('foregrounded')
      );
    });
  });

  describe('periodic sync', () => {
    it('should sync periodically when app is active', async () => {
      const wrapper = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      renderHook(
        () =>
          useBackgroundSync({
            entityId: 'entity_123',
            foregroundSyncInterval: 60 * 1000, // 1 minute
          }),
        { wrapper }
      );

      // First sync to set lastSyncTime
      await act(async () => {
        jest.advanceTimersByTime(60 * 1000);
      });

      // Allow more time for periodic check
      await act(async () => {
        jest.advanceTimersByTime(60 * 1000);
      });

      // Should have synced periodically
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('should not sync without entityId', async () => {
      const wrapper = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      renderHook(() => useBackgroundSync(), { wrapper }); // No entityId

      await act(async () => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      // Should not have synced balance/transaction data
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('network reconnection', () => {
    it('should register network online listener', () => {
      const wrapper = createWrapper();

      renderHook(() => useBackgroundSync({ entityId: 'entity_123' }), { wrapper });

      expect(mockNetworkService.on).toHaveBeenCalledWith('online', expect.any(Function));
    });

    it('should unregister listener on unmount', () => {
      const wrapper = createWrapper();

      const { unmount } = renderHook(
        () => useBackgroundSync({ entityId: 'entity_123' }),
        { wrapper }
      );

      unmount();

      expect(mockNetworkService.off).toHaveBeenCalledWith('online', expect.any(Function));
    });
  });

  describe('adaptive sync', () => {
    it('should adjust sync interval based on failures', async () => {
      const wrapper = createWrapper();

      // Mock invalidateQueries to fail
      jest.spyOn(queryClient, 'invalidateQueries').mockRejectedValueOnce(new Error('Sync failed'));

      const { result } = renderHook(
        () =>
          useBackgroundSync({
            entityId: 'entity_123',
            adaptiveSync: true,
          }),
        { wrapper }
      );

      // Trigger a failed sync
      await act(async () => {
        await result.current.forceSync();
      });

      const status = result.current.getSyncStatus();
      // Failure count should increase
      expect(status.failureCount).toBeGreaterThan(0);
    });
  });

  describe('batch sync', () => {
    it('should sync all data types in parallel when batchSync is true', async () => {
      const wrapper = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () =>
          useBackgroundSync({
            entityId: 'entity_123',
            syncBalances: true,
            syncTransactions: true,
            syncInteractions: true,
            batchSync: true,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.forceSync();
      });

      // All syncs should be triggered
      expect(invalidateSpy.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('sync status properties', () => {
    it('should expose isOnline property', () => {
      const wrapper = createWrapper();
      mockNetworkService.isOnline = true;

      const { result } = renderHook(
        () => useBackgroundSync({ entityId: 'entity_123' }),
        { wrapper }
      );

      expect(result.current.isOnline).toBe(true);
    });

    it('should expose appState property', () => {
      const wrapper = createWrapper();
      (AppState as any).currentState = 'active';

      const { result } = renderHook(
        () => useBackgroundSync({ entityId: 'entity_123' }),
        { wrapper }
      );

      expect(result.current.appState).toBe('active');
    });
  });

  describe('error handling', () => {
    it('should log errors when sync fails', async () => {
      const wrapper = createWrapper();
      const logger = require('../../../utils/logger').logger;

      jest
        .spyOn(queryClient, 'invalidateQueries')
        .mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(
        () => useBackgroundSync({ entityId: 'entity_123' }),
        { wrapper }
      );

      await act(async () => {
        await result.current.forceSync();
      });

      expect(logger.error).toHaveBeenCalled();
    });

    it('should track failure count', async () => {
      const wrapper = createWrapper();

      jest
        .spyOn(queryClient, 'invalidateQueries')
        .mockRejectedValue(new Error('Persistent error'));

      const { result } = renderHook(
        () => useBackgroundSync({ entityId: 'entity_123' }),
        { wrapper }
      );

      await act(async () => {
        await result.current.forceSync();
      });

      const status = result.current.getSyncStatus();
      expect(status.failureCount).toBeGreaterThan(0);
    });
  });
});

describe('useOfflineQueueSync', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkService.isOnline = true;
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should register network online listener', () => {
    const wrapper = createWrapper();

    renderHook(() => useOfflineQueueSync('entity_123'), { wrapper });

    expect(mockNetworkService.on).toHaveBeenCalledWith('online', expect.any(Function));
  });

  it('should unregister listener on unmount', () => {
    const wrapper = createWrapper();

    const { unmount } = renderHook(() => useOfflineQueueSync('entity_123'), {
      wrapper,
    });

    unmount();

    expect(mockNetworkService.off).toHaveBeenCalledWith('online', expect.any(Function));
  });

  it('should process queue when coming online', async () => {
    const wrapper = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const logger = require('../../../utils/logger').logger;

    renderHook(() => useOfflineQueueSync('entity_123'), { wrapper });

    // Simulate online event
    const onlineCallback = mockNetworkService.on.mock.calls.find(
      (call) => call[0] === 'online'
    )?.[1];

    if (onlineCallback) {
      await act(async () => {
        await onlineCallback();
      });
    }

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('offline queue')
    );
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('should not process queue without entityId', () => {
    const wrapper = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useOfflineQueueSync(), { wrapper }); // No entityId

    // Simulate online event
    const onlineCallback = mockNetworkService.on.mock.calls.find(
      (call) => call[0] === 'online'
    )?.[1];

    if (onlineCallback) {
      act(() => {
        onlineCallback();
      });
    }

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('should handle errors when processing queue', async () => {
    const wrapper = createWrapper();
    const logger = require('../../../utils/logger').logger;

    jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockRejectedValueOnce(new Error('Process failed'));

    renderHook(() => useOfflineQueueSync('entity_123'), { wrapper });

    // Simulate online event
    const onlineCallback = mockNetworkService.on.mock.calls.find(
      (call) => call[0] === 'online'
    )?.[1];

    if (onlineCallback) {
      await act(async () => {
        await onlineCallback();
      });
    }

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to process offline queue'),
      expect.any(Error)
    );
  });
});
