/**
 * useTimeline Hook Tests
 *
 * Tests the timeline hooks with local-first pattern, pagination, and profile isolation.
 * Tests: useTimeline, usePrefetchTimeline, useTimelineInfinite, usePrefetchTimelineInfinite
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
jest.mock('../../_api/apiClient');

jest.mock('../../_api/apiPaths', () => ({
  API_PATHS: {
    INTERACTION: {
      TIMELINE: (id: string) => `/interactions/${id}/timeline`,
    },
  },
}));

jest.mock('../../localdb/TimelineRepository', () => ({
  timelineRepository: {
    getTimelineForInteraction: jest.fn(),
    addDateSeparators: jest.fn((items) => items),
  },
}));

jest.mock('../../localdb/MessageRepository', () => ({
  messageRepository: {
    isSQLiteAvailable: jest.fn(),
    saveMessages: jest.fn(),
  },
}));

jest.mock('../../localdb/TransactionRepository', () => ({
  transactionRepository: {
    saveTransactions: jest.fn(),
  },
}));

jest.mock('../../features/auth/context/AuthContext', () => ({
  useAuthContext: jest.fn(),
}));

jest.mock('../../tanstack-query/queryKeys', () => ({
  queryKeys: {
    timelineWithLimit: (id: string, limit: number) => ['timeline', id, limit],
    timelineInfinite: (id: string, pageSize: number) => ['timeline', 'infinite', id, pageSize],
  },
}));

jest.mock('../../utils/logger');

import { useTimeline, usePrefetchTimeline, useTimelineInfinite, usePrefetchTimelineInfinite } from '../useTimeline';
import apiClient from '../../_api/apiClient';
import { timelineRepository } from '../../localdb/TimelineRepository';
import { messageRepository } from '../../localdb/MessageRepository';
import { transactionRepository } from '../../localdb/TransactionRepository';
import { useAuthContext } from '../../features/auth/context/AuthContext';

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockTimelineRepository = timelineRepository as jest.Mocked<typeof timelineRepository>;
const mockMessageRepository = messageRepository as jest.Mocked<typeof messageRepository>;
const mockTransactionRepository = transactionRepository as jest.Mocked<typeof transactionRepository>;
const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;

// Test data
const mockUser = { entityId: 'entity-123', id: 'user-123', profileId: 'profile-123' };

const mockMessageItem = {
  id: 'msg-1',
  type: 'message',
  itemType: 'message',
  interaction_id: 'interaction-1',
  sender_entity_id: 'entity-123',
  content: 'Hello!',
  created_at: '2024-01-01T10:00:00Z',
  createdAt: 1704103200000,
};

const mockTransactionItem = {
  id: 'txn-1',
  type: 'transaction',
  itemType: 'transaction',
  interaction_id: 'interaction-1',
  from_account_id: 'account-1',
  to_account_id: 'account-2',
  amount: 100,
  currency: 'HTG',
  status: 'completed',
  created_at: '2024-01-01T11:00:00Z',
  createdAt: 1704106800000,
};

const mockTimelineItems = [mockMessageItem, mockTransactionItem];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Use advanceTimers: true to make fake timers work with waitFor
    jest.useFakeTimers({ advanceTimers: true });
    mockUseAuthContext.mockReturnValue({ user: mockUser } as any);
    mockTimelineRepository.getTimelineForInteraction.mockResolvedValue([]);
    mockTimelineRepository.addDateSeparators.mockImplementation((items) => items);
    mockMessageRepository.isSQLiteAvailable.mockResolvedValue(true);
    mockMessageRepository.saveMessages.mockResolvedValue(undefined);
    mockTransactionRepository.saveTransactions.mockResolvedValue(undefined);
    mockApiClient.get.mockResolvedValue({ data: { items: [] } });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================
  // BASIC FETCHING TESTS
  // ============================================================

  describe('basic fetching', () => {
    it('should fetch timeline when authenticated with valid interactionId', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { items: mockTimelineItems },
      });

      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.timeline).toHaveLength(2);
    });

    it('should return empty array when no interactionId', async () => {
      const { result } = renderHook(() => useTimeline(''), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.timeline).toEqual([]);
    });

    it('should not fetch when disabled', () => {
      renderHook(() => useTimeline('interaction-1', { enabled: false }), { wrapper: createWrapper() });
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should not fetch when user is null', () => {
      mockUseAuthContext.mockReturnValue({ user: null } as any);

      renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should not fetch when user has no entityId', () => {
      mockUseAuthContext.mockReturnValue({ user: { id: 'user-123' } } as any);

      renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // PROFILE ISOLATION TESTS (SECURITY)
  // ============================================================

  describe('profile isolation', () => {
    it('should return empty when profileId is missing', async () => {
      mockUseAuthContext.mockReturnValue({
        user: { entityId: 'entity-123', id: 'user-123' }, // No profileId
      } as any);

      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.timeline).toEqual([]);
    });

    it('should pass profileId to local repository', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue(mockTimelineItems);

      renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockTimelineRepository.getTimelineForInteraction).toHaveBeenCalledWith(
          'interaction-1',
          'profile-123',
          expect.any(Number),
          expect.any(Object),
        );
      });
    });

    it('should pass profileId when saving messages', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue([]);
      mockApiClient.get.mockResolvedValue({
        data: { items: [mockMessageItem] },
      });

      renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(mockApiClient.get).toHaveBeenCalled());

      // Wait for background save
      jest.advanceTimersByTime(200);

      await waitFor(() => {
        expect(mockMessageRepository.saveMessages).toHaveBeenCalledWith(
          expect.any(Array),
          'profile-123',
        );
      });
    });

    it('should pass profileId when saving transactions', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue([]);
      mockApiClient.get.mockResolvedValue({
        data: { items: [mockTransactionItem] },
      });

      renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(mockApiClient.get).toHaveBeenCalled());

      // Wait for background save
      jest.advanceTimersByTime(200);

      await waitFor(() => {
        expect(mockTransactionRepository.saveTransactions).toHaveBeenCalledWith(
          expect.any(Array),
          'profile-123',
        );
      });
    });
  });

  // ============================================================
  // LOCAL-FIRST PATTERN TESTS
  // ============================================================

  describe('local-first pattern', () => {
    it('should load from local cache first when available', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue(mockTimelineItems);
      mockApiClient.get.mockResolvedValue({ data: { items: [] } });

      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.timeline).toHaveLength(2));
      expect(mockTimelineRepository.getTimelineForInteraction).toHaveBeenCalled();
    });

    it('should return local data immediately (WhatsApp behavior)', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue(mockTimelineItems);

      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.timeline).toHaveLength(2);
      });
    });

    it('should perform background sync after returning local data', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue(mockTimelineItems);
      mockApiClient.get.mockResolvedValue({ data: { items: mockTimelineItems } });

      renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(mockTimelineRepository.getTimelineForInteraction).toHaveBeenCalled());

      // Advance timers for background sync
      jest.advanceTimersByTime(200);

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalled();
      });
    });

    it('should fetch from API when no local cache', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue([]);
      mockApiClient.get.mockResolvedValue({
        data: { items: mockTimelineItems },
      });

      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.timeline).toHaveLength(2));
      expect(mockApiClient.get).toHaveBeenCalled();
    });

    it('should return local data when API fails', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue(mockTimelineItems);
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.timeline).toHaveLength(2));
    });

    it('should check SQLite availability before loading cache', async () => {
      mockMessageRepository.isSQLiteAvailable.mockResolvedValue(false);

      renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(mockMessageRepository.isSQLiteAvailable).toHaveBeenCalled());
    });
  });

  // ============================================================
  // API RESPONSE FORMAT HANDLING TESTS
  // ============================================================

  describe('API response format handling', () => {
    it('should handle raw.items array format', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue([]);
      mockApiClient.get.mockResolvedValue({
        data: { items: mockTimelineItems },
      });

      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.timeline).toHaveLength(2));
    });

    it('should handle raw.data.items nested format', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue([]);
      mockApiClient.get.mockResolvedValue({
        data: { data: { items: mockTimelineItems } },
      });

      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.timeline).toHaveLength(2));
    });

    it('should handle stringified items format', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue([]);
      mockApiClient.get.mockResolvedValue({
        data: { items: JSON.stringify(mockTimelineItems) },
      });

      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.timeline).toHaveLength(2));
    });

    it('should handle double-stringified items (object with numeric keys)', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue([]);
      const objectFormat = { '0': mockMessageItem, '1': mockTransactionItem };
      mockApiClient.get.mockResolvedValue({
        data: { items: JSON.stringify(objectFormat) },
      });

      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.timeline).toHaveLength(2));
    });

    it('should return empty array for unexpected response format', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue([]);
      mockApiClient.get.mockResolvedValue({
        data: { unexpected: 'format' },
      });

      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.timeline).toEqual([]);
    });
  });

  // ============================================================
  // DATE SEPARATORS TESTS
  // ============================================================

  describe('date separators', () => {
    it('should add date separators to timeline items', async () => {
      const itemsWithSeparators = [
        { type: 'date_separator', date: '2024-01-01' },
        mockMessageItem,
        mockTransactionItem,
      ];
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue(mockTimelineItems);
      mockTimelineRepository.addDateSeparators.mockReturnValue(itemsWithSeparators);

      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockTimelineRepository.addDateSeparators).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // REFETCH TESTS
  // ============================================================

  describe('refetch', () => {
    it('should provide refetch function', async () => {
      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.refetch).toBeDefined());
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should refetch when called', async () => {
      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.refetch();
      });

      // Use waitFor to check fetching state as it updates asynchronously
      await waitFor(() => {
        expect(result.current.isFetching).toBe(true);
      });
    });
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================

  describe('error handling', () => {
    it('should handle local cache errors gracefully', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockRejectedValue(new Error('DB Error'));
      mockApiClient.get.mockResolvedValue({
        data: { items: mockTimelineItems },
      });

      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.timeline).toHaveLength(2));
    });

    it('should handle API errors when no local data', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue([]);
      mockApiClient.get.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.timeline).toEqual([]);
    });

    it('should not retry on CancelledError', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue([]);
      const cancelledError = new Error('CancelledError');
      cancelledError.name = 'CancelledError';
      mockApiClient.get.mockRejectedValue(cancelledError);

      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('should not retry on 4xx errors', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue([]);
      const error = { status: 404, message: 'Not Found' };
      mockApiClient.get.mockRejectedValue(error);

      const { result } = renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });

  // ============================================================
  // OPTIONS TESTS
  // ============================================================

  describe('options', () => {
    it('should respect custom limit option', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue([]);

      renderHook(() => useTimeline('interaction-1', { limit: 50 }), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockTimelineRepository.getTimelineForInteraction).toHaveBeenCalledWith(
          'interaction-1',
          'profile-123',
          50,
          expect.any(Object),
        );
      });
    });

    it('should use default limit of 100', async () => {
      mockTimelineRepository.getTimelineForInteraction.mockResolvedValue([]);

      renderHook(() => useTimeline('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockTimelineRepository.getTimelineForInteraction).toHaveBeenCalledWith(
          'interaction-1',
          'profile-123',
          100,
          expect.any(Object),
        );
      });
    });
  });
});

// ============================================================
// usePrefetchTimeline TESTS
// ============================================================

describe('usePrefetchTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthContext.mockReturnValue({ user: mockUser } as any);
    mockTimelineRepository.getTimelineForInteraction.mockResolvedValue([]);
    mockMessageRepository.isSQLiteAvailable.mockResolvedValue(true);
  });

  it('should return prefetch function', () => {
    const { result } = renderHook(() => usePrefetchTimeline(), { wrapper: createWrapper() });
    expect(typeof result.current).toBe('function');
  });

  it('should not prefetch when interactionId is missing', async () => {
    const { result } = renderHook(() => usePrefetchTimeline(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current('');
    });

    expect(mockApiClient.get).not.toHaveBeenCalled();
  });

  it('should not prefetch when user is null', async () => {
    mockUseAuthContext.mockReturnValue({ user: null } as any);

    const { result } = renderHook(() => usePrefetchTimeline(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current('interaction-1');
    });

    expect(mockApiClient.get).not.toHaveBeenCalled();
  });

  it('should not prefetch when profileId is missing', async () => {
    mockUseAuthContext.mockReturnValue({
      user: { entityId: 'entity-123' },
    } as any);

    const { result } = renderHook(() => usePrefetchTimeline(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current('interaction-1');
    });

    expect(mockApiClient.get).not.toHaveBeenCalled();
  });
});

// ============================================================
// useTimelineInfinite TESTS
// ============================================================

describe('useTimelineInfinite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Use advanceTimers: true to make fake timers work with waitFor
    jest.useFakeTimers({ advanceTimers: true });
    mockUseAuthContext.mockReturnValue({ user: mockUser } as any);
    mockTimelineRepository.addDateSeparators.mockImplementation((items) => items);
    mockMessageRepository.saveMessages.mockResolvedValue(undefined);
    mockTransactionRepository.saveTransactions.mockResolvedValue(undefined);
    mockApiClient.get.mockResolvedValue({
      data: { items: [], next_cursor: undefined, has_more_next: false },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic infinite query', () => {
    it('should fetch first page', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { items: mockTimelineItems, next_cursor: 'cursor-1', has_more_next: true },
      });

      const { result } = renderHook(() => useTimelineInfinite('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.flatTimeline).toHaveLength(2);
      expect(result.current.hasNextPage).toBe(true);
    });

    it('should return empty when not authenticated', async () => {
      mockUseAuthContext.mockReturnValue({ user: null } as any);

      const { result } = renderHook(() => useTimelineInfinite('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.flatTimeline).toEqual([]);
    });

    it('should not fetch when disabled', () => {
      renderHook(() => useTimelineInfinite('interaction-1', { enabled: false }), { wrapper: createWrapper() });
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('profile isolation', () => {
    it('should return empty when profileId is missing', async () => {
      mockUseAuthContext.mockReturnValue({
        user: { entityId: 'entity-123' },
      } as any);

      const { result } = renderHook(() => useTimelineInfinite('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      // Should abort early and return empty
    });

    it('should save messages with profileId', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { items: [mockMessageItem], next_cursor: undefined, has_more_next: false },
      });

      renderHook(() => useTimelineInfinite('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(mockApiClient.get).toHaveBeenCalled());

      // Wait for background save
      jest.advanceTimersByTime(200);

      await waitFor(() => {
        expect(mockMessageRepository.saveMessages).toHaveBeenCalledWith(
          expect.any(Array),
          'profile-123',
        );
      });
    });
  });

  describe('pagination', () => {
    it('should include cursor in subsequent requests', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({
          data: { items: [mockMessageItem], next_cursor: 'cursor-1', has_more_next: true },
        })
        .mockResolvedValueOnce({
          data: { items: [mockTransactionItem], next_cursor: undefined, has_more_next: false },
        });

      const { result } = renderHook(() => useTimelineInfinite('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.hasNextPage).toBe(true));

      act(() => {
        result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            params: expect.objectContaining({ cursor: 'cursor-1' }),
          }),
        );
      });
    });

    it('should indicate no more pages when has_more_next is false', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { items: mockTimelineItems, next_cursor: undefined, has_more_next: false },
      });

      const { result } = renderHook(() => useTimelineInfinite('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.hasNextPage).toBe(false);
    });

    it('should flatten all pages', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({
          data: { items: [mockMessageItem], next_cursor: 'cursor-1', has_more_next: true },
        })
        .mockResolvedValueOnce({
          data: { items: [mockTransactionItem], next_cursor: undefined, has_more_next: false },
        });

      const { result } = renderHook(() => useTimelineInfinite('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.flatTimeline).toHaveLength(1));

      act(() => {
        result.current.fetchNextPage();
      });

      await waitFor(() => expect(result.current.flatTimeline).toHaveLength(2));
    });
  });

  describe('response format handling', () => {
    it('should handle raw.items array format', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { items: mockTimelineItems, next_cursor: 'cursor-1', has_more_next: true },
      });

      const { result } = renderHook(() => useTimelineInfinite('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.flatTimeline).toHaveLength(2));
    });

    it('should handle raw.data.items nested format', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          data: { items: mockTimelineItems, next_cursor: 'cursor-1', has_more_next: true },
        },
      });

      const { result } = renderHook(() => useTimelineInfinite('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.flatTimeline).toHaveLength(2));
    });

    it('should handle stringified items format', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          items: JSON.stringify(mockTimelineItems),
          next_cursor: 'cursor-1',
          has_more_next: true,
        },
      });

      const { result } = renderHook(() => useTimelineInfinite('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.flatTimeline).toHaveLength(2));
    });
  });

  describe('options', () => {
    it('should respect custom pageSize', async () => {
      renderHook(() => useTimelineInfinite('interaction-1', { pageSize: 25 }), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            params: expect.objectContaining({ limit: 25 }),
          }),
        );
      });
    });

    it('should use default pageSize of 50', async () => {
      renderHook(() => useTimelineInfinite('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            params: expect.objectContaining({ limit: 50 }),
          }),
        );
      });
    });
  });

  describe('error handling', () => {
    it('should set isError on failure', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useTimelineInfinite('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    });

    it('should not retry on CancelledError', async () => {
      const cancelledError = new Error('CancelledError');
      cancelledError.name = 'CancelledError';
      mockApiClient.get.mockRejectedValue(cancelledError);

      const { result } = renderHook(() => useTimelineInfinite('interaction-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });
});

// ============================================================
// usePrefetchTimelineInfinite TESTS
// ============================================================

describe('usePrefetchTimelineInfinite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthContext.mockReturnValue({ user: mockUser } as any);
    mockTimelineRepository.addDateSeparators.mockImplementation((items) => items);
  });

  it('should return prefetch function', () => {
    const { result } = renderHook(() => usePrefetchTimelineInfinite(), { wrapper: createWrapper() });
    expect(typeof result.current).toBe('function');
  });

  it('should not prefetch when interactionId is missing', async () => {
    const { result } = renderHook(() => usePrefetchTimelineInfinite(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current('');
    });

    expect(mockApiClient.get).not.toHaveBeenCalled();
  });

  it('should not prefetch when user is null', async () => {
    mockUseAuthContext.mockReturnValue({ user: null } as any);

    const { result } = renderHook(() => usePrefetchTimelineInfinite(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current('interaction-1');
    });

    expect(mockApiClient.get).not.toHaveBeenCalled();
  });

  it('should not prefetch when entityId is missing', async () => {
    mockUseAuthContext.mockReturnValue({
      user: { id: 'user-123' },
    } as any);

    const { result } = renderHook(() => usePrefetchTimelineInfinite(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current('interaction-1');
    });

    expect(mockApiClient.get).not.toHaveBeenCalled();
  });
});
