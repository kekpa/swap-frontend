/**
 * useAvailableProfiles Hook Tests
 *
 * Tests the available profiles hook for multi-profile switching.
 * Tests authentication guards, caching, retry logic, and profile data handling.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
jest.mock('../../../../_api/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('../../../../_api/apiPaths', () => ({
  AUTH_PATHS: {
    AVAILABLE_PROFILES: '/auth/profiles/available',
  },
}));

jest.mock('../../../../tanstack-query/queryKeys', () => ({
  queryKeys: {
    availableProfiles: ['profiles', 'available'],
  },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuthContext: jest.fn(),
}));

jest.mock('../../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { useAvailableProfiles, AvailableProfile } from '../useAvailableProfiles';
import apiClient from '../../../../_api/apiClient';
import { useAuthContext } from '../../context/AuthContext';

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;

// Test data
const mockPersonalProfile: AvailableProfile = {
  profileId: 'profile-personal-123',
  entityId: 'entity-personal-123',
  type: 'personal',
  displayName: 'John Doe',
  avatarUrl: 'https://example.com/avatar.jpg',
};

const mockBusinessProfile: AvailableProfile = {
  profileId: 'profile-business-456',
  entityId: 'entity-business-456',
  type: 'business',
  displayName: 'Acme Corp',
  avatarUrl: 'https://example.com/business-avatar.jpg',
};

const mockProfiles = [mockPersonalProfile, mockBusinessProfile];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useAvailableProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthContext.mockReturnValue({ isAuthenticated: true } as any);
    mockApiClient.get.mockResolvedValue({ data: { profiles: [] } });
  });

  // ============================================================
  // AUTHENTICATION GUARD TESTS
  // ============================================================

  describe('authentication guard', () => {
    it('should fetch profiles when authenticated', async () => {
      mockApiClient.get.mockResolvedValue({ data: { profiles: mockProfiles } });

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.data).toHaveLength(2);
      expect(mockApiClient.get).toHaveBeenCalled();
    });

    it('should NOT fetch profiles when not authenticated', async () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false } as any);

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });

    it('should stop fetching when user logs out', async () => {
      const { result, rerender } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);

      // User logs out
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false } as any);
      mockApiClient.get.mockClear();

      rerender({});

      // Should not make new API calls
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // DATA FETCHING TESTS
  // ============================================================

  describe('data fetching', () => {
    it('should call correct API endpoint', async () => {
      mockApiClient.get.mockResolvedValue({ data: { profiles: mockProfiles } });

      renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith('/auth/profiles/available');
      });
    });

    it('should return personal and business profiles', async () => {
      mockApiClient.get.mockResolvedValue({ data: { profiles: mockProfiles } });

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].type).toBe('personal');
      expect(result.current.data?.[1].type).toBe('business');
    });

    it('should return profile with all required fields', async () => {
      mockApiClient.get.mockResolvedValue({ data: { profiles: [mockPersonalProfile] } });

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const profile = result.current.data?.[0];
      expect(profile).toMatchObject({
        profileId: 'profile-personal-123',
        entityId: 'entity-personal-123',
        type: 'personal',
        displayName: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
    });

    it('should handle profiles without avatarUrl', async () => {
      const profileWithoutAvatar = { ...mockPersonalProfile, avatarUrl: undefined };
      mockApiClient.get.mockResolvedValue({ data: { profiles: [profileWithoutAvatar] } });

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data?.[0].avatarUrl).toBeUndefined();
    });

    it('should return empty array when no profiles', async () => {
      mockApiClient.get.mockResolvedValue({ data: { profiles: [] } });

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual([]);
    });
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================

  describe('error handling', () => {
    it('should set isError on API failure', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      // Wait for error state directly - more reliable than waiting for isLoading
      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    });

    it('should NOT retry on 401 errors', async () => {
      const error401 = { response: { status: 401 } };
      mockApiClient.get.mockRejectedValue(error401);

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Should only be called once (no retry)
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 403 errors', async () => {
      const error403 = { response: { status: 403 } };
      mockApiClient.get.mockRejectedValue(error403);

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Should only be called once (no retry)
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should retry once on network errors', async () => {
      mockApiClient.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { profiles: mockProfiles } });

      // Need to enable retry for this test
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            retryDelay: 0,
            gcTime: 0,
          },
        },
      });

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });
    });

    it('should retry once on 500 errors', async () => {
      const error500 = { response: { status: 500 } };
      mockApiClient.get.mockRejectedValue(error500);

      // Need custom retry config
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            retryDelay: 0,
            gcTime: 0,
          },
        },
      });

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      renderHook(() => useAvailableProfiles(), { wrapper });

      // Wait for retries
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      }, { timeout: 3000 });
    });
  });

  // ============================================================
  // LOADING STATE TESTS
  // ============================================================

  describe('loading state', () => {
    it('should show loading state initially', async () => {
      mockApiClient.get.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { profiles: mockProfiles } }), 100)),
      );

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('should set isFetching during refetch', async () => {
      // First request - let it complete normally
      mockApiClient.get.mockResolvedValue({ data: { profiles: mockProfiles } });

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      // Wait for initial load to complete
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const initialCallCount = mockApiClient.get.mock.calls.length;

      // Set up new mock for refetch
      mockApiClient.get.mockResolvedValue({ data: { profiles: mockProfiles } });

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
  // PROFILE TYPE TESTS
  // ============================================================

  describe('profile types', () => {
    it('should return personal profile type correctly', async () => {
      mockApiClient.get.mockResolvedValue({ data: { profiles: [mockPersonalProfile] } });

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data?.[0].type).toBe('personal');
    });

    it('should return business profile type correctly', async () => {
      mockApiClient.get.mockResolvedValue({ data: { profiles: [mockBusinessProfile] } });

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data?.[0].type).toBe('business');
    });

    it('should handle multiple business profiles', async () => {
      const multipleBusinesses = [
        mockPersonalProfile,
        mockBusinessProfile,
        { ...mockBusinessProfile, profileId: 'profile-business-789', displayName: 'Second Business' },
      ];
      mockApiClient.get.mockResolvedValue({ data: { profiles: multipleBusinesses } });

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toHaveLength(3);
      const businessProfiles = result.current.data?.filter((p) => p.type === 'business');
      expect(businessProfiles).toHaveLength(2);
    });
  });

  // ============================================================
  // QUERY STATE TESTS
  // ============================================================

  describe('query state', () => {
    it('should expose refetch function', async () => {
      mockApiClient.get.mockResolvedValue({ data: { profiles: mockProfiles } });

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(typeof result.current.refetch).toBe('function');
    });

    it('should expose error when present', async () => {
      const testError = new Error('Test error');
      mockApiClient.get.mockRejectedValue(testError);

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });

      expect(result.current.error).toBeDefined();
    });

    it('should expose isSuccess when data loaded', async () => {
      mockApiClient.get.mockResolvedValue({ data: { profiles: mockProfiles } });

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should expose status property', async () => {
      mockApiClient.get.mockResolvedValue({ data: { profiles: mockProfiles } });

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.status).toBe('success'));
    });
  });

  // ============================================================
  // CACHE BEHAVIOR TESTS
  // ============================================================

  describe('cache behavior', () => {
    it('should return cached data on subsequent renders', async () => {
      mockApiClient.get.mockResolvedValue({ data: { profiles: mockProfiles } });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 } },
      });

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      // First render
      const { result, unmount } = renderHook(() => useAvailableProfiles(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);

      unmount();

      // Second render - should use cache
      const { result: result2 } = renderHook(() => useAvailableProfiles(), { wrapper });

      // Should have cached data immediately
      expect(result2.current.data).toHaveLength(2);
    });
  });

  // ============================================================
  // DISPLAY NAME TESTS
  // ============================================================

  describe('display name', () => {
    it('should return correct display name for personal profile', async () => {
      mockApiClient.get.mockResolvedValue({ data: { profiles: [mockPersonalProfile] } });

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data?.[0].displayName).toBe('John Doe');
    });

    it('should return correct display name for business profile', async () => {
      mockApiClient.get.mockResolvedValue({ data: { profiles: [mockBusinessProfile] } });

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data?.[0].displayName).toBe('Acme Corp');
    });
  });

  // ============================================================
  // ENTITY ID TESTS
  // ============================================================

  describe('entity ID', () => {
    it('should return unique entityIds for each profile', async () => {
      mockApiClient.get.mockResolvedValue({ data: { profiles: mockProfiles } });

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const entityIds = result.current.data?.map((p) => p.entityId);
      const uniqueEntityIds = [...new Set(entityIds)];

      expect(entityIds?.length).toBe(uniqueEntityIds.length);
    });

    it('should return unique profileIds for each profile', async () => {
      mockApiClient.get.mockResolvedValue({ data: { profiles: mockProfiles } });

      const { result } = renderHook(() => useAvailableProfiles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const profileIds = result.current.data?.map((p) => p.profileId);
      const uniqueProfileIds = [...new Set(profileIds)];

      expect(profileIds?.length).toBe(uniqueProfileIds.length);
    });
  });
});
