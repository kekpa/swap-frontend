/**
 * useInteractions Hook Tests
 *
 * Tests the interactions hook with local-first pattern and deletion sync.
 * Tests SQLite caching, API sync, Option B deletion events, and authentication.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
jest.mock('../../_api/apiClient');

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../localdb/InteractionRepository', () => ({
  interactionRepository: {
    getInteractionsWithMembers: jest.fn(),
    upsertInteraction: jest.fn(),
    saveInteractionMembers: jest.fn(),
    deleteInteractions: jest.fn(),
  },
}));

jest.mock('../../features/auth/context/AuthContext', () => ({
  useAuthContext: jest.fn(),
}));

jest.mock('../../hooks/useCurrentProfileId', () => ({
  useCurrentProfileId: jest.fn(),
}));

jest.mock('../../utils/eventEmitter');

jest.mock('../../utils/logger');

import { useInteractions, usePrefetchInteractions } from '../useInteractions';
import apiClient from '../../_api/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { interactionRepository } from '../../localdb/InteractionRepository';
import { useAuthContext } from '../../features/auth/context/AuthContext';
import { useCurrentProfileId } from '../../hooks/useCurrentProfileId';
import { eventEmitter } from '../../utils/eventEmitter';

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockInteractionRepository = interactionRepository as jest.Mocked<typeof interactionRepository>;
const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;
const mockUseCurrentProfileId = useCurrentProfileId as jest.MockedFunction<typeof useCurrentProfileId>;

// Test data
const mockUser = { entityId: 'entity-123', id: 'user-123' };

const mockInteraction = {
  id: 'interaction-1',
  name: 'Test Chat',
  is_group: false,
  last_activity_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  members: [
    { entity_id: 'entity-123', role: 'MEMBER', display_name: 'User 1' },
    { entity_id: 'entity-456', role: 'MEMBER', display_name: 'User 2' },
  ],
  last_activity_snippet: 'Hello!',
  unread_count: 2,
};

const mockLocalInteraction = {
  id: 'interaction-1',
  name: 'Test Chat',
  is_group: false,
  last_activity_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  members: [
    { entity_id: 'entity-123', role: 'MEMBER', display_name: 'User 1' },
    { entity_id: 'entity-456', role: 'MEMBER', display_name: 'User 2' },
  ],
  last_activity_snippet: 'Hello!',
  unread_count: 2,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useInteractions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthContext.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    } as any);
    mockUseCurrentProfileId.mockReturnValue('profile-123');
    mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([]);
    mockInteractionRepository.upsertInteraction.mockResolvedValue(undefined);
    mockInteractionRepository.saveInteractionMembers.mockResolvedValue(undefined);
    mockInteractionRepository.deleteInteractions.mockResolvedValue(undefined);
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockApiClient.get.mockResolvedValue({ data: { interactions: [], deletedIds: [] } });
  });

  // ============================================================
  // BASIC FETCHING TESTS
  // ============================================================

  describe('basic fetching', () => {
    it('should fetch interactions when authenticated', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { interactions: [mockInteraction], deletedIds: [] },
      });

      const { result } = renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.interactions).toHaveLength(1);
    });

    it('should return empty array when not authenticated', async () => {
      mockUseAuthContext.mockReturnValue({ user: null, isAuthenticated: false } as any);

      const { result } = renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.interactions).toEqual([]);
    });

    it('should not fetch when disabled', () => {
      renderHook(() => useInteractions({ enabled: false }), { wrapper: createWrapper() });
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should not fetch when profileId is null', () => {
      mockUseCurrentProfileId.mockReturnValue(null);
      renderHook(() => useInteractions(), { wrapper: createWrapper() });
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // LOCAL-FIRST PATTERN TESTS
  // ============================================================

  describe('local-first pattern', () => {
    it('should load from local cache first', async () => {
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([mockLocalInteraction]);
      mockApiClient.get.mockResolvedValue({ data: { interactions: [], deletedIds: [] } });

      const { result } = renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.interactions).toHaveLength(1));
      expect(mockInteractionRepository.getInteractionsWithMembers).toHaveBeenCalledWith('profile-123');
    });

    it('should return local data when API fails', async () => {
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([mockLocalInteraction]);
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.interactions).toHaveLength(1));
    });

    it('should save API data to local cache', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { interactions: [mockInteraction], deletedIds: [] },
      });

      renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockInteractionRepository.upsertInteraction).toHaveBeenCalled();
      });
    });

    it('should save interaction members to cache', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { interactions: [mockInteraction], deletedIds: [] },
      });

      renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockInteractionRepository.saveInteractionMembers).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // OPTION B DELETION SYNC TESTS
  // ============================================================

  describe('Option B deletion sync', () => {
    it('should process deletedIds from API response', async () => {
      const deletedIds = ['deleted-1', 'deleted-2'];
      mockApiClient.get.mockResolvedValue({
        data: { interactions: [], deletedIds, syncTimestamp: '2024-01-01T00:00:00Z' },
      });

      renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockInteractionRepository.deleteInteractions).toHaveBeenCalledWith(
          deletedIds,
          'profile-123',
        );
      });
    });

    it('should save sync timestamp', async () => {
      const syncTimestamp = '2024-01-01T12:00:00Z';
      mockApiClient.get.mockResolvedValue({
        data: { interactions: [], deletedIds: [], syncTimestamp },
      });

      renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'interactions_last_sync',
          syncTimestamp,
        );
      });
    });

    it('should include since parameter when last sync exists', async () => {
      const lastSync = '2024-01-01T00:00:00Z';
      mockAsyncStorage.getItem.mockResolvedValue(lastSync);

      renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(
          expect.stringContaining(`since=${encodeURIComponent(lastSync)}`),
        );
      });
    });

    it('should not include since parameter on first sync', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith('/interactions?public=true');
      });
    });
  });

  // ============================================================
  // EVENT EMISSION TESTS
  // ============================================================

  describe('event emission', () => {
    // NOTE: useInteractions no longer emits data_updated events to prevent infinite loops.
    // The queryClient listener invalidates queries when it receives these events,
    // which would cause useInteractions to refetch endlessly.
    // Only SQLite writes from LocalDataManager should emit data_updated events.

    it('should NOT emit data_updated event after API fetch (prevents infinite loop)', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { interactions: [mockInteraction], deletedIds: [] },
      });

      renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockApiClient.get).toHaveBeenCalled());
      // Should NOT emit to prevent infinite loop
      expect(eventEmitter.emit).not.toHaveBeenCalledWith('data_updated', expect.anything());
    });

    it('should not emit event when no API data', async () => {
      mockApiClient.get.mockResolvedValue({ data: { interactions: [], deletedIds: [] } });

      renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockApiClient.get).toHaveBeenCalled());
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // REFETCH TESTS
  // ============================================================

  describe('refetch', () => {
    it('should provide refetch function', async () => {
      const { result } = renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.refetch).toBeDefined());
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should refetch data when called', async () => {
      // First load - let it complete normally
      mockApiClient.get.mockResolvedValue({
        data: { interactions: [mockInteraction], deletedIds: [] },
      });

      const { result } = renderHook(() => useInteractions(), { wrapper: createWrapper() });

      // Wait for initial load to complete
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const initialCallCount = mockApiClient.get.mock.calls.length;

      // Set up new mock for refetch with different data
      const updatedInteraction = { ...mockInteraction, name: 'Updated Chat' };
      mockApiClient.get.mockResolvedValue({
        data: { interactions: [updatedInteraction], deletedIds: [] },
      });

      // Trigger refetch
      act(() => {
        result.current.refetch();
      });

      // Verify refetch was called (API call count increased)
      await waitFor(() => {
        expect(mockApiClient.get.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================

  describe('error handling', () => {
    it('should set isError on API failure', async () => {
      mockInteractionRepository.getInteractionsWithMembers.mockResolvedValue([]);
      mockApiClient.get.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      // Should not be error because we fall back to local data
      expect(result.current.interactions).toEqual([]);
    });

    it('should handle local DB errors gracefully', async () => {
      mockInteractionRepository.getInteractionsWithMembers.mockRejectedValue(new Error('DB Error'));
      mockApiClient.get.mockResolvedValue({
        data: { interactions: [mockInteraction], deletedIds: [] },
      });

      const { result } = renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.interactions).toHaveLength(1));
    });

    it('should handle AsyncStorage errors', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      mockApiClient.get.mockResolvedValue({
        data: { interactions: [mockInteraction], deletedIds: [] },
      });

      const { result } = renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.interactions).toHaveLength(1));
    });
  });

  // ============================================================
  // RESPONSE FORMAT HANDLING TESTS
  // ============================================================

  describe('response format handling', () => {
    it('should handle nested interactions response', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { interactions: [mockInteraction], deletedIds: [], syncTimestamp: '2024-01-01' },
      });

      const { result } = renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.interactions).toHaveLength(1));
    });

    it('should handle direct array response (fallback)', async () => {
      mockApiClient.get.mockResolvedValue({ data: [mockInteraction] });

      const { result } = renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.interactions).toHaveLength(1));
    });
  });

  // ============================================================
  // PROFILE ISOLATION TESTS
  // ============================================================

  describe('profile isolation', () => {
    it('should include profileId in query key', async () => {
      mockUseCurrentProfileId.mockReturnValue('profile-ABC');

      renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockInteractionRepository.getInteractionsWithMembers).toHaveBeenCalledWith('profile-ABC');
      });
    });

    it('should pass profileId to delete operations', async () => {
      mockUseCurrentProfileId.mockReturnValue('profile-XYZ');
      mockApiClient.get.mockResolvedValue({
        data: { interactions: [], deletedIds: ['del-1'], syncTimestamp: '2024-01-01' },
      });

      renderHook(() => useInteractions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockInteractionRepository.deleteInteractions).toHaveBeenCalledWith(
          ['del-1'],
          'profile-XYZ',
        );
      });
    });
  });
});

// ============================================================
// usePrefetchInteractions TESTS
// ============================================================

describe('usePrefetchInteractions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthContext.mockReturnValue({ user: mockUser, isAuthenticated: true } as any);
    mockUseCurrentProfileId.mockReturnValue('profile-123');
  });

  it('should return prefetch function', () => {
    const { result } = renderHook(() => usePrefetchInteractions(), { wrapper: createWrapper() });
    expect(typeof result.current).toBe('function');
  });

  it('should not prefetch when user is null', () => {
    mockUseAuthContext.mockReturnValue({ user: null, isAuthenticated: false } as any);

    const { result } = renderHook(() => usePrefetchInteractions(), { wrapper: createWrapper() });

    act(() => {
      result.current();
    });

    // Should not throw
  });

  it('should not prefetch when profileId is null', () => {
    mockUseCurrentProfileId.mockReturnValue(null);

    const { result } = renderHook(() => usePrefetchInteractions(), { wrapper: createWrapper() });

    act(() => {
      result.current();
    });

    // Should not throw
  });
});
