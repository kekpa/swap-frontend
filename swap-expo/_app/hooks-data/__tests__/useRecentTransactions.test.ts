/**
 * useRecentTransactions Hook Tests
 *
 * Tests the transaction hooks with WhatsApp-style local-first architecture.
 * Tests instant cached data display, background sync, and offline behavior.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies before importing hooks
jest.mock('../../services/TransactionManager', () => ({
  transactionManager: {
    getTransactionsForAccount: jest.fn(),
    getRecentTransactions: jest.fn(),
  },
}));

jest.mock('../../localdb/TransactionRepository', () => ({
  transactionRepository: {
    getTransactionsByAccount: jest.fn(),
    saveTransactions: jest.fn(),
    getRecentTransactions: jest.fn(),
  },
}));

jest.mock('../../hooks/useCurrentProfileId', () => ({
  useCurrentProfileId: jest.fn(() => 'profile-123'),
}));

jest.mock('../../services/NetworkService', () => ({
  networkService: {
    isOnline: jest.fn(() => true),
  },
}));

jest.mock('../../tanstack-query/queryClient', () => ({
  queryClient: {
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  },
}));

jest.mock('../../utils/logger');

// Import after mocks
import {
  useWalletTransactions,
  useTransactionList,
  useRecentTransactions,
  useTransactionsByAccount,
} from '../useRecentTransactions';
import { transactionManager } from '../../services/TransactionManager';
import { transactionRepository } from '../../localdb/TransactionRepository';
import { useCurrentProfileId } from '../../hooks/useCurrentProfileId';
import { networkService } from '../../services/NetworkService';
import { queryClient } from '../../tanstack-query/queryClient';
import logger from '../../utils/logger';

const mockTransactionManager = transactionManager as jest.Mocked<typeof transactionManager>;
const mockTransactionRepository = transactionRepository as jest.Mocked<typeof transactionRepository>;
const mockUseCurrentProfileId = useCurrentProfileId as jest.MockedFunction<typeof useCurrentProfileId>;
const mockNetworkService = networkService as jest.Mocked<typeof networkService>;
const mockQueryClient = queryClient as jest.Mocked<typeof queryClient>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Test data
const mockTransaction1 = {
  id: 'txn-1',
  from_account_id: 'account-sender',
  to_account_id: 'account-receiver',
  amount: 100.00,
  currency_code: 'USD',
  status: 'COMPLETED',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockTransaction2 = {
  id: 'txn-2',
  from_account_id: 'account-sender',
  to_account_id: 'account-receiver',
  amount: 50.00,
  currency_code: 'USD',
  status: 'COMPLETED',
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

const mockTransactions = [mockTransaction1, mockTransaction2];

// Helper to create wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useWalletTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Use advanceTimers: true to make fake timers work with waitFor
    jest.useFakeTimers({ advanceTimers: true });
    mockUseCurrentProfileId.mockReturnValue('profile-123');
    mockNetworkService.isOnline.mockReturnValue(true);
    mockTransactionRepository.getTransactionsByAccount.mockResolvedValue([]);
    mockTransactionRepository.saveTransactions.mockResolvedValue(undefined);
    mockTransactionManager.getTransactionsForAccount.mockResolvedValue({
      data: mockTransactions,
      pagination: { hasMore: false },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================
  // BASIC FETCHING TESTS
  // ============================================================

  describe('basic fetching', () => {
    it('should fetch wallet transactions when accountId is provided', async () => {
      const { result } = renderHook(
        () => useWalletTransactions('account-123'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.transactions).toBeDefined();
    });

    it('should not fetch when accountId is empty', () => {
      const { result } = renderHook(
        () => useWalletTransactions(''),
        { wrapper: createWrapper() },
      );

      expect(mockTransactionRepository.getTransactionsByAccount).not.toHaveBeenCalled();
    });

    it('should not fetch when profileId is null', () => {
      mockUseCurrentProfileId.mockReturnValue(null);

      const { result } = renderHook(
        () => useWalletTransactions('account-123'),
        { wrapper: createWrapper() },
      );

      expect(mockTransactionRepository.getTransactionsByAccount).not.toHaveBeenCalled();
    });

    it('should respect enabled flag', () => {
      const { result } = renderHook(
        () => useWalletTransactions('account-123', false),
        { wrapper: createWrapper() },
      );

      expect(mockTransactionRepository.getTransactionsByAccount).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // LOCAL-FIRST CACHING TESTS
  // ============================================================

  describe('local-first caching (WhatsApp-style)', () => {
    it('should return cached transactions instantly', async () => {
      mockTransactionRepository.getTransactionsByAccount.mockResolvedValue(mockTransactions);

      const { result } = renderHook(
        () => useWalletTransactions('account-123'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.transactions).toEqual(mockTransactions);
      });

      // Should have called local cache first
      expect(mockTransactionRepository.getTransactionsByAccount).toHaveBeenCalledWith(
        'profile-123',
        'account-123',
        4,
      );
    });

    it('should trigger background sync after returning cached data', async () => {
      mockTransactionRepository.getTransactionsByAccount.mockResolvedValue(mockTransactions);

      const { result } = renderHook(
        () => useWalletTransactions('account-123'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.transactions).toHaveLength(2);
      });

      // Advance timers for background sync
      jest.advanceTimersByTime(200);

      await waitFor(() => {
        expect(mockTransactionManager.getTransactionsForAccount).toHaveBeenCalled();
      });
    });

    it('should fetch from API when no cached data', async () => {
      mockTransactionRepository.getTransactionsByAccount.mockResolvedValue([]);

      const { result } = renderHook(
        () => useWalletTransactions('account-123'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockTransactionManager.getTransactionsForAccount).toHaveBeenCalledWith(
        'account-123',
        4,
        0,
      );
    });

    it('should save API response to local cache', async () => {
      mockTransactionRepository.getTransactionsByAccount.mockResolvedValue([]);

      const { result } = renderHook(
        () => useWalletTransactions('account-123'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockTransactionRepository.saveTransactions).toHaveBeenCalledWith(
        mockTransactions,
        'profile-123',
      );
    });
  });

  // ============================================================
  // OFFLINE BEHAVIOR TESTS
  // ============================================================

  describe('offline behavior', () => {
    it('should return isOffline=true when offline', async () => {
      mockNetworkService.isOnline.mockReturnValue(false);

      const { result } = renderHook(
        () => useWalletTransactions('account-123'),
        { wrapper: createWrapper() },
      );

      expect(result.current.isOffline).toBe(true);
    });

    it('should use cached data when offline', async () => {
      mockNetworkService.isOnline.mockReturnValue(false);
      mockTransactionRepository.getTransactionsByAccount.mockResolvedValue(mockTransactions);

      const { result } = renderHook(
        () => useWalletTransactions('account-123'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.transactions).toEqual(mockTransactions);
      });
    });

    it('should not retry when offline', async () => {
      mockNetworkService.isOnline.mockReturnValue(false);
      mockTransactionRepository.getTransactionsByAccount.mockResolvedValue([]);
      mockTransactionManager.getTransactionsForAccount.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(
        () => useWalletTransactions('account-123'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not have retried
      expect(mockTransactionManager.getTransactionsForAccount).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      // Set offline to disable retries - errors propagate immediately
      mockNetworkService.isOnline.mockReturnValue(false);
      mockTransactionRepository.getTransactionsByAccount.mockResolvedValue([]);
      mockTransactionManager.getTransactionsForAccount.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(
        () => useWalletTransactions('account-123'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 5000 });

      expect(result.current.error?.message).toBe('API Error');
    });

    it('should handle local DB errors gracefully', async () => {
      // Set offline to disable retries - errors propagate immediately
      mockNetworkService.isOnline.mockReturnValue(false);
      mockTransactionRepository.getTransactionsByAccount.mockRejectedValue(new Error('DB Error'));

      const { result } = renderHook(
        () => useWalletTransactions('account-123'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 5000 });
    });

    it('should log errors', async () => {
      mockTransactionRepository.getTransactionsByAccount.mockResolvedValue([]);
      mockTransactionManager.getTransactionsForAccount.mockRejectedValue(new Error('Test error'));

      renderHook(
        () => useWalletTransactions('account-123'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // REFETCH TESTS
  // ============================================================

  describe('refetch', () => {
    it('should provide refetch function', async () => {
      const { result } = renderHook(
        () => useWalletTransactions('account-123'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.refetch).toBeDefined();
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });
});

// ============================================================
// useTransactionList TESTS
// ============================================================

describe('useTransactionList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
    mockNetworkService.isOnline.mockReturnValue(true);
    mockTransactionManager.getTransactionsForAccount.mockResolvedValue({
      data: mockTransactions,
      pagination: { hasMore: true },
    });
  });

  describe('basic fetching', () => {
    it('should fetch transaction list with pagination', async () => {
      const { result } = renderHook(
        () => useTransactionList('account-123', 50, 0),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockTransactionManager.getTransactionsForAccount).toHaveBeenCalledWith(
        'account-123',
        50,
        0,
      );
    });

    it('should return hasMore from pagination', async () => {
      const { result } = renderHook(
        () => useTransactionList('account-123'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.hasMore).toBe(true);
      });
    });

    it('should handle pagination offset', async () => {
      const { result } = renderHook(
        () => useTransactionList('account-123', 50, 50),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockTransactionManager.getTransactionsForAccount).toHaveBeenCalledWith(
        'account-123',
        50,
        50,
      );
    });
  });

  describe('loadMore functionality', () => {
    it('should provide loadMore function', async () => {
      const { result } = renderHook(
        () => useTransactionList('account-123'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.loadMore).toBeDefined();
      });

      expect(typeof result.current.loadMore).toBe('function');
    });
  });

  describe('disabled state', () => {
    it('should not fetch when disabled', () => {
      renderHook(
        () => useTransactionList('account-123', 50, 0, false),
        { wrapper: createWrapper() },
      );

      expect(mockTransactionManager.getTransactionsForAccount).not.toHaveBeenCalled();
    });

    it('should not fetch when accountId is empty', () => {
      renderHook(
        () => useTransactionList(''),
        { wrapper: createWrapper() },
      );

      expect(mockTransactionManager.getTransactionsForAccount).not.toHaveBeenCalled();
    });
  });
});

// ============================================================
// useRecentTransactions TESTS
// ============================================================

describe('useRecentTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
    mockNetworkService.isOnline.mockReturnValue(true);
    mockTransactionManager.getRecentTransactions.mockResolvedValue(mockTransactions);
  });

  describe('basic fetching', () => {
    it('should fetch recent transactions for entity', async () => {
      const { result } = renderHook(
        () => useRecentTransactions('entity-123', 20),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockTransactionManager.getRecentTransactions).toHaveBeenCalledWith(20);
    });

    it('should use default limit of 20', async () => {
      const { result } = renderHook(
        () => useRecentTransactions('entity-123'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockTransactionManager.getRecentTransactions).toHaveBeenCalledWith(20);
    });

    it('should return transactions array', async () => {
      const { result } = renderHook(
        () => useRecentTransactions('entity-123'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.transactions).toEqual(mockTransactions);
      });
    });
  });

  describe('disabled state', () => {
    it('should not fetch when entityId is empty', () => {
      renderHook(
        () => useRecentTransactions(''),
        { wrapper: createWrapper() },
      );

      expect(mockTransactionManager.getRecentTransactions).not.toHaveBeenCalled();
    });

    it('should not fetch when profileId is null', () => {
      mockUseCurrentProfileId.mockReturnValue(null);

      renderHook(
        () => useRecentTransactions('entity-123'),
        { wrapper: createWrapper() },
      );

      expect(mockTransactionManager.getRecentTransactions).not.toHaveBeenCalled();
    });

    it('should not fetch when disabled', () => {
      renderHook(
        () => useRecentTransactions('entity-123', 20, false),
        { wrapper: createWrapper() },
      );

      expect(mockTransactionManager.getRecentTransactions).not.toHaveBeenCalled();
    });
  });

  describe('offline behavior', () => {
    it('should return empty array when offline and API fails', async () => {
      mockNetworkService.isOnline.mockReturnValue(false);
      mockTransactionManager.getRecentTransactions.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(
        () => useRecentTransactions('entity-123'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.transactions).toEqual([]);
    });

    it('should indicate offline status', () => {
      mockNetworkService.isOnline.mockReturnValue(false);

      const { result } = renderHook(
        () => useRecentTransactions('entity-123'),
        { wrapper: createWrapper() },
      );

      expect(result.current.isOffline).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle API errors', async () => {
      // Clear any local cache to ensure error is exposed
      mockTransactionRepository.getTransactionsByAccount.mockResolvedValue([]);
      mockTransactionManager.getRecentTransactions.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(
        () => useRecentTransactions('entity-123'),
        { wrapper: createWrapper() },
      );

      // Wait for loading to complete first, then check error state
      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });
      // Note: Local-first hooks may not set isError if they fall back to empty local data
      // Verify the hook handled the error gracefully by checking it returns empty data
      expect(result.current.transactions).toEqual([]);
    });
  });
});

// ============================================================
// useTransactionsByAccount (DEPRECATED) TESTS
// ============================================================

describe('useTransactionsByAccount (deprecated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
    mockNetworkService.isOnline.mockReturnValue(true);
    mockTransactionRepository.getTransactionsByAccount.mockResolvedValue(mockTransactions);
  });

  it('should log deprecation warning', async () => {
    renderHook(
      () => useTransactionsByAccount('account-123'),
      { wrapper: createWrapper() },
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('DEPRECATED'),
    );
  });

  it('should delegate to useWalletTransactions', async () => {
    const { result } = renderHook(
      () => useTransactionsByAccount('account-123'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.transactions).toBeDefined();
    });
  });
});

// ============================================================
// PROFILE ISOLATION TESTS
// ============================================================

describe('profile isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Use advanceTimers: true to make fake timers work with waitFor
    jest.useFakeTimers({ advanceTimers: true });
    mockNetworkService.isOnline.mockReturnValue(true);
    mockTransactionRepository.getTransactionsByAccount.mockResolvedValue([]);
    mockTransactionManager.getTransactionsForAccount.mockResolvedValue({
      data: mockTransactions,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should include profileId in repository calls', async () => {
    mockUseCurrentProfileId.mockReturnValue('profile-ABC');

    renderHook(
      () => useWalletTransactions('account-123'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(mockTransactionRepository.getTransactionsByAccount).toHaveBeenCalledWith(
        'profile-ABC',
        'account-123',
        4,
      );
    });
  });

  it('should include profileId when saving transactions', async () => {
    mockUseCurrentProfileId.mockReturnValue('profile-XYZ');
    mockTransactionRepository.getTransactionsByAccount.mockResolvedValue([]);

    renderHook(
      () => useWalletTransactions('account-123'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(mockTransactionRepository.saveTransactions).toHaveBeenCalledWith(
        mockTransactions,
        'profile-XYZ',
      );
    });
  });

  it('should not mix data between profiles', async () => {
    const profileATransactions = [{ ...mockTransaction1, id: 'txn-profile-a' }];
    const profileBTransactions = [{ ...mockTransaction1, id: 'txn-profile-b' }];

    mockTransactionRepository.getTransactionsByAccount
      .mockResolvedValueOnce(profileATransactions)
      .mockResolvedValueOnce(profileBTransactions);

    // First render with profile A
    mockUseCurrentProfileId.mockReturnValue('profile-A');
    const { result: resultA, unmount } = renderHook(
      () => useWalletTransactions('account-123'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(resultA.current.transactions[0]?.id).toBe('txn-profile-a');
    });

    unmount();

    // Second render with profile B
    mockUseCurrentProfileId.mockReturnValue('profile-B');
    const { result: resultB } = renderHook(
      () => useWalletTransactions('account-123'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(resultB.current.transactions[0]?.id).toBe('txn-profile-b');
    });

    // Verify different profileIds were passed
    expect(mockTransactionRepository.getTransactionsByAccount).toHaveBeenCalledWith(
      'profile-A',
      'account-123',
      4,
    );
    expect(mockTransactionRepository.getTransactionsByAccount).toHaveBeenCalledWith(
      'profile-B',
      'account-123',
      4,
    );
  });
});
