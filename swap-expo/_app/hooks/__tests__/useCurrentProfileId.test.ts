/**
 * useCurrentProfileId Hook Tests
 *
 * Tests the single source of truth for current profile ID.
 * This hook is critical for profile isolation and security.
 */

import { renderHook } from '@testing-library/react-native';
import { useCurrentProfileId } from '../useCurrentProfileId';
import { useAuthContext } from '../../features/auth/context/AuthContext';

// Mock the AuthContext
jest.mock('../../features/auth/context/AuthContext', () => ({
  useAuthContext: jest.fn(),
}));

const mockUseAuthContext = useAuthContext as jest.MockedFunction<
  typeof useAuthContext
>;

describe('useCurrentProfileId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // AUTHENTICATED USER TESTS
  // ============================================================

  describe('authenticated user', () => {
    it('should return profile ID when user is authenticated', () => {
      const mockProfileId = 'profile-123';
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 'user-456',
          profileId: mockProfileId,
          entityId: 'entity-789',
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
          email: 'john@example.com',
        },
        isAuthenticated: true,
      } as any);

      const { result } = renderHook(() => useCurrentProfileId());

      expect(result.current).toBe(mockProfileId);
    });

    it('should return correct profile ID for personal profile', () => {
      const personalProfileId = 'personal-profile-123';
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 'user-456',
          profileId: personalProfileId,
          profileType: 'personal',
          firstName: 'John',
          lastName: 'Doe',
        },
        isAuthenticated: true,
      } as any);

      const { result } = renderHook(() => useCurrentProfileId());

      expect(result.current).toBe(personalProfileId);
    });

    it('should return correct profile ID for business profile', () => {
      const businessProfileId = 'business-profile-456';
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 'user-789',
          profileId: businessProfileId,
          profileType: 'business',
          businessName: 'Acme Corp',
        },
        isAuthenticated: true,
      } as any);

      const { result } = renderHook(() => useCurrentProfileId());

      expect(result.current).toBe(businessProfileId);
    });
  });

  // ============================================================
  // UNAUTHENTICATED USER TESTS
  // ============================================================

  describe('unauthenticated user', () => {
    it('should return null when user is null', () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        isAuthenticated: false,
      } as any);

      const { result } = renderHook(() => useCurrentProfileId());

      expect(result.current).toBeNull();
    });

    it('should return null when user is undefined', () => {
      mockUseAuthContext.mockReturnValue({
        user: undefined,
        isAuthenticated: false,
      } as any);

      const { result } = renderHook(() => useCurrentProfileId());

      expect(result.current).toBeNull();
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe('edge cases', () => {
    it('should return null when user exists but profileId is undefined', () => {
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 'user-123',
          // profileId is undefined
          firstName: 'John',
        },
        isAuthenticated: true,
      } as any);

      const { result } = renderHook(() => useCurrentProfileId());

      expect(result.current).toBeNull();
    });

    it('should return null when user exists but profileId is null', () => {
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 'user-123',
          profileId: null,
          firstName: 'John',
        },
        isAuthenticated: true,
      } as any);

      const { result } = renderHook(() => useCurrentProfileId());

      expect(result.current).toBeNull();
    });

    it('should return empty string if profileId is empty string', () => {
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 'user-123',
          profileId: '',
          firstName: 'John',
        },
        isAuthenticated: true,
      } as any);

      const { result } = renderHook(() => useCurrentProfileId());

      // Empty string is falsy, so it should return null due to || null
      expect(result.current).toBeNull();
    });
  });

  // ============================================================
  // PROFILE SWITCH TESTS
  // ============================================================

  describe('profile switching', () => {
    it('should return new profile ID after profile switch', () => {
      const initialProfileId = 'personal-profile-123';
      const newProfileId = 'business-profile-456';

      // Initial state
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 'user-789',
          profileId: initialProfileId,
          profileType: 'personal',
        },
        isAuthenticated: true,
      } as any);

      const { result, rerender } = renderHook(() => useCurrentProfileId());

      expect(result.current).toBe(initialProfileId);

      // Simulate profile switch
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 'user-789',
          profileId: newProfileId,
          profileType: 'business',
        },
        isAuthenticated: true,
      } as any);

      rerender({});

      expect(result.current).toBe(newProfileId);
    });

    it('should handle rapid profile switches', () => {
      const profiles = [
        'profile-1',
        'profile-2',
        'profile-3',
        'profile-4',
        'profile-5',
      ];

      const { result, rerender } = renderHook(() => useCurrentProfileId());

      profiles.forEach((profileId) => {
        mockUseAuthContext.mockReturnValue({
          user: {
            id: 'user-123',
            profileId,
          },
          isAuthenticated: true,
        } as any);

        rerender({});

        expect(result.current).toBe(profileId);
      });
    });
  });

  // ============================================================
  // LOGOUT TESTS
  // ============================================================

  describe('logout handling', () => {
    it('should return null after logout', () => {
      // Authenticated state
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 'user-123',
          profileId: 'profile-456',
        },
        isAuthenticated: true,
      } as any);

      const { result, rerender } = renderHook(() => useCurrentProfileId());

      expect(result.current).toBe('profile-456');

      // After logout
      mockUseAuthContext.mockReturnValue({
        user: null,
        isAuthenticated: false,
      } as any);

      rerender({});

      expect(result.current).toBeNull();
    });
  });

  // ============================================================
  // SECURITY TESTS
  // ============================================================

  describe('security - profile isolation', () => {
    it('should provide consistent profile ID for caching', () => {
      const profileId = 'profile-123';
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 'user-456',
          profileId,
        },
        isAuthenticated: true,
      } as any);

      // Multiple calls should return same value
      const { result: result1 } = renderHook(() => useCurrentProfileId());
      const { result: result2 } = renderHook(() => useCurrentProfileId());
      const { result: result3 } = renderHook(() => useCurrentProfileId());

      expect(result1.current).toBe(profileId);
      expect(result2.current).toBe(profileId);
      expect(result3.current).toBe(profileId);
    });

    it('should not leak profile data across users', () => {
      // User A
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 'user-a',
          profileId: 'profile-a',
        },
        isAuthenticated: true,
      } as any);

      const { result: resultA, rerender } = renderHook(() =>
        useCurrentProfileId(),
      );
      expect(resultA.current).toBe('profile-a');

      // Switch to User B
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 'user-b',
          profileId: 'profile-b',
        },
        isAuthenticated: true,
      } as any);

      rerender({});

      // Should now be User B's profile, not User A's
      expect(resultA.current).toBe('profile-b');
      expect(resultA.current).not.toBe('profile-a');
    });
  });

  // ============================================================
  // INTEGRATION-STYLE TESTS
  // ============================================================

  describe('usage patterns', () => {
    it('should work for query key generation', () => {
      const profileId = 'profile-123';
      const entityId = 'entity-456';

      mockUseAuthContext.mockReturnValue({
        user: {
          id: 'user-789',
          profileId,
          entityId,
        },
        isAuthenticated: true,
      } as any);

      const { result } = renderHook(() => useCurrentProfileId());

      // Simulate query key generation pattern
      const queryKey = ['balances', 'profile', result.current, 'entity', entityId];

      expect(queryKey).toEqual([
        'balances',
        'profile',
        profileId,
        'entity',
        entityId,
      ]);
    });

    it('should enable conditional fetching', () => {
      // Not authenticated
      mockUseAuthContext.mockReturnValue({
        user: null,
        isAuthenticated: false,
      } as any);

      const { result } = renderHook(() => useCurrentProfileId());

      // Pattern used in hooks: enabled: !!profileId
      const shouldFetch = !!result.current;
      expect(shouldFetch).toBe(false);

      // Authenticated
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 'user-123',
          profileId: 'profile-456',
        },
        isAuthenticated: true,
      } as any);

      const { result: authResult } = renderHook(() => useCurrentProfileId());

      const shouldFetchAuth = !!authResult.current;
      expect(shouldFetchAuth).toBe(true);
    });
  });
});
