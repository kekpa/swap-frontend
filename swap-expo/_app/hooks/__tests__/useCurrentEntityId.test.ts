/**
 * useCurrentEntityId Hook Tests
 *
 * Tests the single source of truth for current entity ID.
 * Entity ID is the backend's universal identifier (entities.id).
 *
 * IMPORTANT: This is DIFFERENT from profileId:
 * - entityId = "Who performed this action" (backend identifier)
 * - profileId = "Whose cache is this" (data isolation per profile)
 */

import { renderHook } from '@testing-library/react-native';
import { useCurrentEntityId } from '../useCurrentEntityId';
import { useAuthContext, AuthContextType } from '../../features/auth/context/AuthContext';
import { User } from '../../types/auth.types';

// Mock the AuthContext
jest.mock('../../features/auth/context/AuthContext', () => ({
  useAuthContext: jest.fn(),
}));

const mockUseAuthContext = useAuthContext as jest.MockedFunction<
  typeof useAuthContext
>;

/**
 * Mock User Factory - ensures all required fields are present
 */
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default',
  profileId: 'profile-default',
  entityId: 'entity-default',
  firstName: 'Test',
  lastName: 'User',
  username: 'testuser',
  email: 'test@example.com',
  ...overrides,
});

/**
 * Mock AuthContext Factory
 */
const createMockAuthContext = (overrides: Partial<AuthContextType> = {}): Partial<AuthContextType> => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  ...overrides,
});

describe('useCurrentEntityId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // AUTHENTICATED USER TESTS
  // ============================================================

  describe('authenticated user', () => {
    it('should return entity ID when user is authenticated', () => {
      const mockEntityId = 'entity-123';
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: createMockUser({
          id: 'user-456',
          entityId: mockEntityId,
          profileId: 'profile-789',
        }),
        isAuthenticated: true,
      }) as AuthContextType);

      const { result } = renderHook(() => useCurrentEntityId());

      expect(result.current).toBe(mockEntityId);
    });

    it('should return entity ID regardless of profile type', () => {
      const entityId = 'entity-universal-123';

      // Personal profile
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: createMockUser({
          entityId,
          profileId: 'personal-profile-123',
          profileType: 'personal',
        }),
        isAuthenticated: true,
      }) as AuthContextType);

      const { result: personalResult } = renderHook(() => useCurrentEntityId());
      expect(personalResult.current).toBe(entityId);

      // Business profile - same entity
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: createMockUser({
          entityId,
          profileId: 'business-profile-456',
          profileType: 'business',
        }),
        isAuthenticated: true,
      }) as AuthContextType);

      const { result: businessResult } = renderHook(() => useCurrentEntityId());
      expect(businessResult.current).toBe(entityId);
    });
  });

  // ============================================================
  // UNAUTHENTICATED USER TESTS
  // ============================================================

  describe('unauthenticated user', () => {
    it('should return null when user is null', () => {
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: null,
        isAuthenticated: false,
      }) as AuthContextType);

      const { result } = renderHook(() => useCurrentEntityId());

      expect(result.current).toBeNull();
    });

    it('should return null when user is undefined', () => {
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: undefined as unknown as null,
        isAuthenticated: false,
      }) as AuthContextType);

      const { result } = renderHook(() => useCurrentEntityId());

      expect(result.current).toBeNull();
    });
  });

  // ============================================================
  // EDGE CASES - CRITICAL FOR DATA INTEGRITY
  // ============================================================

  describe('edge cases', () => {
    it('should return null when entityId is undefined', () => {
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: {
          id: 'user-123',
          profileId: 'profile-123',
          entityId: undefined as unknown as string,
          firstName: 'John',
        } as User,
        isAuthenticated: true,
      }) as AuthContextType);

      const { result } = renderHook(() => useCurrentEntityId());

      expect(result.current).toBeNull();
    });

    it('should return null when entityId is empty string (data integrity issue)', () => {
      // Empty string from backend = entity lookup failed
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: createMockUser({
          entityId: '',
          profileId: 'profile-123',
        }),
        isAuthenticated: true,
      }) as AuthContextType);

      const { result } = renderHook(() => useCurrentEntityId());

      // CRITICAL: Empty string should be treated as null (data integrity issue)
      expect(result.current).toBeNull();
    });

    it('should return null when entityId is null', () => {
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: {
          id: 'user-123',
          profileId: 'profile-123',
          entityId: null as unknown as string,
          firstName: 'John',
        } as User,
        isAuthenticated: true,
      }) as AuthContextType);

      const { result } = renderHook(() => useCurrentEntityId());

      expect(result.current).toBeNull();
    });
  });

  // ============================================================
  // PROFILE SWITCH TESTS
  // ============================================================

  describe('profile switching', () => {
    it('should maintain entity ID during profile switch', () => {
      // Entity ID stays the same when switching profiles
      const entityId = 'entity-constant-123';

      // Personal profile
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: createMockUser({
          entityId,
          profileId: 'personal-profile',
          profileType: 'personal',
        }),
        isAuthenticated: true,
      }) as AuthContextType);

      const { result, rerender } = renderHook(() => useCurrentEntityId());
      expect(result.current).toBe(entityId);

      // Switch to business profile - entity remains the same
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: createMockUser({
          entityId, // Same entity!
          profileId: 'business-profile',
          profileType: 'business',
        }),
        isAuthenticated: true,
      }) as AuthContextType);

      rerender({});

      expect(result.current).toBe(entityId);
    });

    it('should update entity ID when switching to different user', () => {
      // User A
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: createMockUser({
          id: 'user-a',
          entityId: 'entity-a',
        }),
        isAuthenticated: true,
      }) as AuthContextType);

      const { result, rerender } = renderHook(() => useCurrentEntityId());
      expect(result.current).toBe('entity-a');

      // User B (different entity)
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: createMockUser({
          id: 'user-b',
          entityId: 'entity-b',
        }),
        isAuthenticated: true,
      }) as AuthContextType);

      rerender({});

      expect(result.current).toBe('entity-b');
    });
  });

  // ============================================================
  // LOGOUT TESTS
  // ============================================================

  describe('logout handling', () => {
    it('should return null after logout', () => {
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: createMockUser({
          entityId: 'entity-123',
        }),
        isAuthenticated: true,
      }) as AuthContextType);

      const { result, rerender } = renderHook(() => useCurrentEntityId());
      expect(result.current).toBe('entity-123');

      // Logout
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: null,
        isAuthenticated: false,
      }) as AuthContextType);

      rerender({});

      expect(result.current).toBeNull();
    });
  });

  // ============================================================
  // TIMELINE USAGE TESTS
  // ============================================================

  describe('timeline usage patterns', () => {
    it('should work for local_timeline queries', () => {
      const entityId = 'entity-123';
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: createMockUser({
          entityId,
          profileId: 'profile-456',
        }),
        isAuthenticated: true,
      }) as AuthContextType);

      const { result } = renderHook(() => useCurrentEntityId());

      // Pattern used in timeline queries
      const timelineQuery = {
        entity_id: result.current,
        from_entity_id: result.current,
      };

      expect(timelineQuery.entity_id).toBe(entityId);
      expect(timelineQuery.from_entity_id).toBe(entityId);
    });

    it('should enable conditional fetching for timeline', () => {
      // Not authenticated
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: null,
        isAuthenticated: false,
      }) as AuthContextType);

      const { result } = renderHook(() => useCurrentEntityId());

      // Pattern: enabled: !!entityId
      const shouldFetch = !!result.current;
      expect(shouldFetch).toBe(false);

      // Authenticated
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: createMockUser({
          entityId: 'entity-123',
        }),
        isAuthenticated: true,
      }) as AuthContextType);

      const { result: authResult } = renderHook(() => useCurrentEntityId());

      const shouldFetchAuth = !!authResult.current;
      expect(shouldFetchAuth).toBe(true);
    });
  });

  // ============================================================
  // SECURITY TESTS
  // ============================================================

  describe('security - entity isolation', () => {
    it('should provide consistent entity ID for caching', () => {
      const entityId = 'entity-123';
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: createMockUser({ entityId }),
        isAuthenticated: true,
      }) as AuthContextType);

      // Multiple calls should return same value
      const { result: result1 } = renderHook(() => useCurrentEntityId());
      const { result: result2 } = renderHook(() => useCurrentEntityId());
      const { result: result3 } = renderHook(() => useCurrentEntityId());

      expect(result1.current).toBe(entityId);
      expect(result2.current).toBe(entityId);
      expect(result3.current).toBe(entityId);
    });

    it('should not leak entity data across users', () => {
      // User A
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: createMockUser({
          id: 'user-a',
          entityId: 'entity-a',
        }),
        isAuthenticated: true,
      }) as AuthContextType);

      const { result, rerender } = renderHook(() => useCurrentEntityId());
      expect(result.current).toBe('entity-a');

      // Switch to User B
      mockUseAuthContext.mockReturnValue(createMockAuthContext({
        user: createMockUser({
          id: 'user-b',
          entityId: 'entity-b',
        }),
        isAuthenticated: true,
      }) as AuthContextType);

      rerender({});

      // Should now be User B's entity, not User A's
      expect(result.current).toBe('entity-b');
      expect(result.current).not.toBe('entity-a');
    });
  });
});
