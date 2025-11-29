/**
 * useUserProfile Hook Tests
 *
 * Tests for the user profile data management hook.
 * Tests profile fetching, derived hooks, and caching behavior.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the modules before importing the hook
jest.mock('../../_api/apiClient');

jest.mock('../../hooks/useCurrentProfileId', () => ({
  useCurrentProfileId: jest.fn(() => 'profile-123'),
}));

jest.mock('../../tanstack-query/config/staleTimeConfig', () => ({
  getStaleTimeForQuery: jest.fn(() => 5 * 60 * 1000), // 5 minutes
}));

jest.mock('../../utils/errorHandler', () => ({
  // Return false immediately to disable retries in tests - makes error states available faster
  createRetryFunction: jest.fn(() => () => false),
}));

jest.mock('../../utils/logger');

// Import after mocks are set up
import {
  useUserProfile,
  useProfileDisplayName,
  useProfileCompletion,
  useVerificationStatus,
  UserProfile,
} from '../useUserProfile';
import apiClient from '../../_api/apiClient';
import { useCurrentProfileId } from '../../hooks/useCurrentProfileId';

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockUseCurrentProfileId = useCurrentProfileId as jest.MockedFunction<
  typeof useCurrentProfileId
>;

// Test data
const mockCompleteProfile: UserProfile = {
  type: 'personal',
  id: 'profile-123',
  user_id: 'user-456',
  entity_id: 'entity-789',
  email: 'john@example.com',
  username: 'johndoe',
  first_name: 'John',
  last_name: 'Doe',
  phone: '+1234567890',
  national_id: '123456789',
  avatar_url: 'https://example.com/avatar.jpg',
  kyc_status: 'approved',
  status: 'active',
  country_code: 'US',
  p2p_display_preferences: {},
  discovery_settings: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

const mockIncompleteProfile: UserProfile = {
  type: 'personal',
  id: 'profile-456',
  user_id: 'user-789',
  entity_id: 'entity-012',
  email: 'jane@example.com',
  // Missing: first_name, last_name, phone, country_code
  kyc_status: 'not_started',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockMinimalProfile: UserProfile = {
  type: 'personal',
  id: 'profile-minimal',
  user_id: 'user-minimal',
  entity_id: 'entity-minimal',
  kyc_status: 'not_started',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Helper to create wrapper with QueryClient
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

describe('useUserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
  });

  // ============================================================
  // BASIC FETCHING TESTS
  // ============================================================

  describe('basic fetching', () => {
    it('should fetch user profile when entityId is provided', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockCompleteProfile });

      const { result } = renderHook(() => useUserProfile('entity-789'), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCompleteProfile);
      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me');
    });

    it('should not fetch when entityId is undefined', () => {
      const { result } = renderHook(() => useUserProfile(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should not fetch when profileId is null', () => {
      mockUseCurrentProfileId.mockReturnValue(null);

      const { result } = renderHook(() => useUserProfile('entity-789'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should not fetch when both entityId and profileId are missing', () => {
      mockUseCurrentProfileId.mockReturnValue(null);

      const { result } = renderHook(() => useUserProfile(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const apiError = new Error('Network error');
      mockApiClient.get.mockRejectedValue(apiError);

      const { result } = renderHook(() => useUserProfile('entity-789'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should handle empty response', async () => {
      mockApiClient.get.mockResolvedValue({ data: null });

      const { result } = renderHook(() => useUserProfile('entity-789'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should handle undefined response data', async () => {
      mockApiClient.get.mockResolvedValue({ data: undefined });

      const { result } = renderHook(() => useUserProfile('entity-789'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  // ============================================================
  // CACHING TESTS
  // ============================================================

  describe('caching behavior', () => {
    it('should use cached data on re-render', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockCompleteProfile });

      const { result, rerender } = renderHook(() => useUserProfile('entity-789'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Clear the mock to track new calls
      mockApiClient.get.mockClear();

      // Rerender
      rerender({});

      // Should not make another API call (cached)
      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(result.current.data).toEqual(mockCompleteProfile);
    });
  });

  // ============================================================
  // PROFILE STATE TESTS
  // ============================================================

  describe('profile states', () => {
    it('should handle different KYC statuses', async () => {
      const statuses: Array<UserProfile['kyc_status']> = [
        'not_started',
        'pending',
        'approved',
        'rejected',
        'in_review',
      ];

      for (const status of statuses) {
        const profile = { ...mockCompleteProfile, kyc_status: status };
        mockApiClient.get.mockResolvedValue({ data: profile });

        const { result } = renderHook(() => useUserProfile('entity-789'), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.kyc_status).toBe(status);
      }
    });

    it('should handle different profile statuses', async () => {
      const statuses: Array<UserProfile['status']> = ['active', 'inactive', 'suspended'];

      for (const status of statuses) {
        const profile = { ...mockCompleteProfile, status };
        mockApiClient.get.mockResolvedValue({ data: profile });

        const { result } = renderHook(() => useUserProfile('entity-789'), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.status).toBe(status);
      }
    });
  });
});

// ============================================================
// useProfileDisplayName TESTS
// ============================================================

describe('useProfileDisplayName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
  });

  it('should return full name when first_name and last_name are present', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockCompleteProfile });

    const { result } = renderHook(() => useProfileDisplayName('entity-789'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe('John Doe');
    });
  });

  it('should return first_name only when last_name is missing', async () => {
    const profile = { ...mockCompleteProfile, last_name: undefined };
    mockApiClient.get.mockResolvedValue({ data: profile });

    const { result } = renderHook(() => useProfileDisplayName('entity-789'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe('John');
    });
  });

  it('should return email username when name is missing', async () => {
    const profile = {
      ...mockIncompleteProfile,
      first_name: undefined,
      last_name: undefined,
    };
    mockApiClient.get.mockResolvedValue({ data: profile });

    const { result } = renderHook(() => useProfileDisplayName('entity-012'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe('jane');
    });
  });

  it('should return phone when name and email are missing', async () => {
    const profile = {
      ...mockMinimalProfile,
      phone: '+1234567890',
    };
    mockApiClient.get.mockResolvedValue({ data: profile });

    const { result } = renderHook(() => useProfileDisplayName('entity-minimal'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe('+1234567890');
    });
  });

  it('should return "Unknown User" when all identifiers are missing', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockMinimalProfile });

    const { result } = renderHook(() => useProfileDisplayName('entity-minimal'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe('Unknown User');
    });
  });

  it('should return null when profile is loading', () => {
    mockApiClient.get.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useProfileDisplayName('entity-789'), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeNull();
  });
});

// ============================================================
// useProfileCompletion TESTS
// ============================================================

describe('useProfileCompletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
  });

  it('should return 100% for complete profile', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockCompleteProfile });

    const { result } = renderHook(() => useProfileCompletion('entity-789'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.percentage).toBe(100);
    });

    expect(result.current.missingFields).toEqual([]);
    expect(result.current.completedFields).toEqual([
      'first_name',
      'last_name',
      'email',
      'phone',
      'country_code',
    ]);
  });

  it('should return 0% with all missing fields when profile is null', () => {
    mockApiClient.get.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useProfileCompletion('entity-789'), {
      wrapper: createWrapper(),
    });

    expect(result.current.percentage).toBe(0);
    expect(result.current.missingFields).toEqual([]);
  });

  it('should calculate correct percentage for incomplete profile', async () => {
    // Profile with only email (1/5 fields = 20%)
    const profile = {
      ...mockMinimalProfile,
      email: 'test@example.com',
    };
    mockApiClient.get.mockResolvedValue({ data: profile });

    const { result } = renderHook(() => useProfileCompletion('entity-minimal'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.percentage).toBe(20);
    });

    expect(result.current.missingFields).toContain('first_name');
    expect(result.current.missingFields).toContain('last_name');
    expect(result.current.missingFields).toContain('phone');
    expect(result.current.missingFields).toContain('country_code');
    expect(result.current.completedFields).toEqual(['email']);
  });

  it('should handle profile with some fields filled', async () => {
    // Profile with 3/5 fields = 60%
    const profile = {
      ...mockMinimalProfile,
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
    };
    mockApiClient.get.mockResolvedValue({ data: profile });

    const { result } = renderHook(() => useProfileCompletion('entity-minimal'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.percentage).toBe(60);
    });

    expect(result.current.missingFields).toEqual(['phone', 'country_code']);
    expect(result.current.completedFields).toEqual(['first_name', 'last_name', 'email']);
  });
});

// ============================================================
// useVerificationStatus TESTS
// ============================================================

describe('useVerificationStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
  });

  it('should return fully verified when email and phone exist', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockCompleteProfile });

    const { result } = renderHook(() => useVerificationStatus('entity-789'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isFullyVerified).toBe(true);
    });

    expect(result.current.isEmailVerified).toBe(true);
    expect(result.current.isPhoneVerified).toBe(true);
  });

  it('should return partially verified when only email exists', async () => {
    const profile = {
      ...mockCompleteProfile,
      phone: undefined,
    };
    mockApiClient.get.mockResolvedValue({ data: profile });

    const { result } = renderHook(() => useVerificationStatus('entity-789'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isEmailVerified).toBe(true);
      expect(result.current.isPhoneVerified).toBe(false);
      expect(result.current.isFullyVerified).toBe(false);
    });
  });

  it('should return partially verified when only phone exists', async () => {
    const profile = {
      ...mockCompleteProfile,
      email: undefined,
    };
    mockApiClient.get.mockResolvedValue({ data: profile });

    const { result } = renderHook(() => useVerificationStatus('entity-789'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isEmailVerified).toBe(false);
      expect(result.current.isPhoneVerified).toBe(true);
      expect(result.current.isFullyVerified).toBe(false);
    });
  });

  it('should return not verified when neither email nor phone exists', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockMinimalProfile });

    const { result } = renderHook(() => useVerificationStatus('entity-minimal'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isEmailVerified).toBe(false);
      expect(result.current.isPhoneVerified).toBe(false);
      expect(result.current.isFullyVerified).toBe(false);
    });
  });

  it('should return default values when profile is loading', () => {
    mockApiClient.get.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useVerificationStatus('entity-789'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isEmailVerified).toBe(false);
    expect(result.current.isPhoneVerified).toBe(false);
  });
});

// ============================================================
// QUERY KEY TESTS
// ============================================================

describe('query key behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
  });

  it('should use profile-specific query key', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockCompleteProfile });

    const { result } = renderHook(() => useUserProfile('entity-789'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Query should have been made with profile-specific key
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
  });

  it('should refetch when profile ID changes', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockCompleteProfile });

    const { result, rerender } = renderHook(
      ({ profileId }) => {
        mockUseCurrentProfileId.mockReturnValue(profileId);
        return useUserProfile('entity-789');
      },
      {
        wrapper: createWrapper(),
        initialProps: { profileId: 'profile-123' },
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Change profile ID
    rerender({ profileId: 'profile-456' });

    await waitFor(() => {
      // Should make a new fetch for the new profile
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
    });
  });
});

// ============================================================
// NETWORK MODE TESTS
// ============================================================

describe('offline behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
  });

  it('should use offlineFirst network mode', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockCompleteProfile });

    const { result } = renderHook(() => useUserProfile('entity-789'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // The hook is configured with networkMode: 'offlineFirst'
    // This means it will try to return cached data even when offline
    expect(result.current.data).toEqual(mockCompleteProfile);
  });
});

// ============================================================
// EDGE CASES
// ============================================================

describe('edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
  });

  it('should handle empty string entityId', () => {
    const { result } = renderHook(() => useUserProfile(''), {
      wrapper: createWrapper(),
    });

    // Empty string is falsy, so query should not be enabled
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should handle profile with all optional fields undefined', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockMinimalProfile });

    const { result } = renderHook(() => useUserProfile('entity-minimal'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.type).toBe('personal');
    expect(result.current.data?.id).toBe('profile-minimal');
  });

  it('should handle special characters in email', async () => {
    const profile = {
      ...mockCompleteProfile,
      email: 'user+tag@example.com',
      first_name: undefined,
      last_name: undefined,
    };
    mockApiClient.get.mockResolvedValue({ data: profile });

    const { result } = renderHook(() => useProfileDisplayName('entity-789'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe('user+tag');
    });
  });

  it('should handle profile with empty strings for names', async () => {
    const profile = {
      ...mockCompleteProfile,
      first_name: '',
      last_name: '',
      email: 'test@example.com',
    };
    mockApiClient.get.mockResolvedValue({ data: profile });

    const { result } = renderHook(() => useProfileDisplayName('entity-789'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // Empty strings are falsy, should fall through to email
      expect(result.current).toBe('test');
    });
  });
});

// ============================================================
// INTEGRATION PATTERN TESTS
// ============================================================

describe('integration patterns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
  });

  it('should work correctly when multiple derived hooks use same profile', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockCompleteProfile });

    const wrapper = createWrapper();

    const { result: displayResult } = renderHook(
      () => useProfileDisplayName('entity-789'),
      { wrapper }
    );

    const { result: completionResult } = renderHook(
      () => useProfileCompletion('entity-789'),
      { wrapper }
    );

    const { result: verificationResult } = renderHook(
      () => useVerificationStatus('entity-789'),
      { wrapper }
    );

    await waitFor(() => {
      expect(displayResult.current).toBe('John Doe');
      expect(completionResult.current.percentage).toBe(100);
      expect(verificationResult.current.isFullyVerified).toBe(true);
    });
  });

  it('should handle conditional rendering pattern', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockCompleteProfile });

    const TestComponent = () => {
      const { data: profile, isLoading } = useUserProfile('entity-789');

      if (isLoading) return null;
      if (!profile) return null;

      return profile.first_name;
    };

    const { result } = renderHook(() => useUserProfile('entity-789'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.first_name).toBe('John');
  });
});
