/**
 * useProfileAwareQueryKey Hook Tests
 *
 * Tests profile-aware query key generation for cache isolation
 *
 * Key behaviors tested:
 * - Query key format: [feature, 'profile', profileId, ...subKeys]
 * - Profile ID injection from useCurrentProfileId
 * - Error throwing when profile ID is missing
 * - Utility functions: isProfileAwareQueryKey, extractProfileIdFromQueryKey
 * - Memoization behavior
 */

import { renderHook } from '@testing-library/react-native';
import {
  useProfileAwareQueryKey,
  isProfileAwareQueryKey,
  extractProfileIdFromQueryKey,
} from '../useProfileAwareQueryKey';
import { useCurrentProfileId } from '../useCurrentProfileId';

// Mock the useCurrentProfileId hook
jest.mock('../useCurrentProfileId', () => ({
  useCurrentProfileId: jest.fn(),
}));

// Mock the logger
jest.mock('../../utils/logger');

// Mock __DEV__
(global as any).__DEV__ = true;

const mockUseCurrentProfileId = useCurrentProfileId as jest.Mock;

describe('useProfileAwareQueryKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('query key generation', () => {
    it('should generate correct query key format', () => {
      mockUseCurrentProfileId.mockReturnValue('profile_123');

      const { result } = renderHook(() => useProfileAwareQueryKey('balances'));

      expect(result.current).toEqual(['balances', 'profile', 'profile_123']);
    });

    it('should include subKeys in query key', () => {
      mockUseCurrentProfileId.mockReturnValue('profile_123');

      const { result } = renderHook(() =>
        useProfileAwareQueryKey('balances', 'entity', 'entity_456')
      );

      expect(result.current).toEqual([
        'balances',
        'profile',
        'profile_123',
        'entity',
        'entity_456',
      ]);
    });

    it('should handle multiple subKeys', () => {
      mockUseCurrentProfileId.mockReturnValue('profile_123');

      const { result } = renderHook(() =>
        useProfileAwareQueryKey('transactions', 'list', { page: 1, limit: 10 })
      );

      expect(result.current).toEqual([
        'transactions',
        'profile',
        'profile_123',
        'list',
        { page: 1, limit: 10 },
      ]);
    });

    it('should work with no subKeys', () => {
      mockUseCurrentProfileId.mockReturnValue('profile_abc');

      const { result } = renderHook(() => useProfileAwareQueryKey('interactions'));

      expect(result.current).toEqual(['interactions', 'profile', 'profile_abc']);
    });
  });

  describe('profile ID injection', () => {
    it('should inject current profile ID into query key', () => {
      mockUseCurrentProfileId.mockReturnValue('personal_profile_id');

      const { result } = renderHook(() => useProfileAwareQueryKey('messages'));

      expect(result.current[2]).toBe('personal_profile_id');
    });

    it('should use different profile IDs for different profiles', () => {
      mockUseCurrentProfileId.mockReturnValue('business_profile_id');

      const { result } = renderHook(() => useProfileAwareQueryKey('messages'));

      expect(result.current[2]).toBe('business_profile_id');
    });

    it('should update query key when profile changes', () => {
      mockUseCurrentProfileId.mockReturnValue('profile_1');

      const { result, rerender } = renderHook(() => useProfileAwareQueryKey('balances'));

      expect(result.current[2]).toBe('profile_1');

      // Simulate profile switch
      mockUseCurrentProfileId.mockReturnValue('profile_2');
      rerender();

      expect(result.current[2]).toBe('profile_2');
    });
  });

  describe('error handling', () => {
    it('should throw error when profile ID is null', () => {
      mockUseCurrentProfileId.mockReturnValue(null);

      expect(() => {
        renderHook(() => useProfileAwareQueryKey('balances'));
      }).toThrow('Profile ID required for balances query. User must be authenticated.');
    });

    it('should throw error when profile ID is undefined', () => {
      mockUseCurrentProfileId.mockReturnValue(undefined);

      expect(() => {
        renderHook(() => useProfileAwareQueryKey('transactions'));
      }).toThrow('Profile ID required for transactions query. User must be authenticated.');
    });

    it('should throw error when profile ID is empty string', () => {
      mockUseCurrentProfileId.mockReturnValue('');

      expect(() => {
        renderHook(() => useProfileAwareQueryKey('messages'));
      }).toThrow('Profile ID required for messages query. User must be authenticated.');
    });

    it('should include feature name in error message', () => {
      mockUseCurrentProfileId.mockReturnValue(null);

      expect(() => {
        renderHook(() => useProfileAwareQueryKey('custom-feature'));
      }).toThrow(/custom-feature/);
    });
  });

  describe('memoization', () => {
    it('should return same reference for same inputs', () => {
      mockUseCurrentProfileId.mockReturnValue('profile_123');

      const { result, rerender } = renderHook(() =>
        useProfileAwareQueryKey('balances', 'entity', 'entity_456')
      );

      const firstResult = result.current;
      rerender();

      expect(result.current).toBe(firstResult);
    });

    it('should return new reference when feature changes', () => {
      mockUseCurrentProfileId.mockReturnValue('profile_123');

      const { result, rerender } = renderHook(
        ({ feature }) => useProfileAwareQueryKey(feature),
        { initialProps: { feature: 'balances' } }
      );

      const firstResult = result.current;
      rerender({ feature: 'transactions' });

      expect(result.current).not.toBe(firstResult);
      expect(result.current[0]).toBe('transactions');
    });

    it('should return new reference when subKeys change', () => {
      mockUseCurrentProfileId.mockReturnValue('profile_123');

      const { result, rerender } = renderHook(
        ({ entityId }) => useProfileAwareQueryKey('balances', 'entity', entityId),
        { initialProps: { entityId: 'entity_1' } }
      );

      const firstResult = result.current;
      rerender({ entityId: 'entity_2' });

      expect(result.current).not.toBe(firstResult);
      expect(result.current[3]).toBe('entity');
      expect(result.current[4]).toBe('entity_2');
    });
  });

  describe('readonly return type', () => {
    it('should return readonly array', () => {
      mockUseCurrentProfileId.mockReturnValue('profile_123');

      const { result } = renderHook(() => useProfileAwareQueryKey('balances'));

      // TypeScript should enforce this, but we can verify the structure
      expect(Array.isArray(result.current)).toBe(true);
    });
  });
});

describe('isProfileAwareQueryKey', () => {
  it('should return true for valid profile-aware query key', () => {
    const queryKey = ['balances', 'profile', 'profile_123'];

    expect(isProfileAwareQueryKey(queryKey)).toBe(true);
  });

  it('should return true for query key with subKeys', () => {
    const queryKey = ['balances', 'profile', 'profile_123', 'entity', 'entity_456'];

    expect(isProfileAwareQueryKey(queryKey)).toBe(true);
  });

  it('should return false for query key without profile marker', () => {
    const queryKey = ['balances', 'entity', 'entity_456'];

    expect(isProfileAwareQueryKey(queryKey)).toBe(false);
  });

  it('should return false for query key with wrong position', () => {
    const queryKey = ['profile', 'balances', 'profile_123'];

    expect(isProfileAwareQueryKey(queryKey)).toBe(false);
  });

  it('should return false for short query keys', () => {
    expect(isProfileAwareQueryKey(['balances'])).toBe(false);
    expect(isProfileAwareQueryKey(['balances', 'profile'])).toBe(false);
  });

  it('should return false for non-array', () => {
    expect(isProfileAwareQueryKey('balances' as any)).toBe(false);
    expect(isProfileAwareQueryKey(null as any)).toBe(false);
    expect(isProfileAwareQueryKey(undefined as any)).toBe(false);
  });

  it('should return false if profile ID is not a string', () => {
    const queryKey = ['balances', 'profile', 123];

    expect(isProfileAwareQueryKey(queryKey)).toBe(false);
  });
});

describe('extractProfileIdFromQueryKey', () => {
  it('should extract profile ID from valid query key', () => {
    const queryKey = ['balances', 'profile', 'profile_123'];

    expect(extractProfileIdFromQueryKey(queryKey)).toBe('profile_123');
  });

  it('should extract profile ID from query key with subKeys', () => {
    const queryKey = ['transactions', 'profile', 'profile_abc', 'list', 'recent'];

    expect(extractProfileIdFromQueryKey(queryKey)).toBe('profile_abc');
  });

  it('should return null for non-profile-aware query key', () => {
    const queryKey = ['balances', 'entity', 'entity_456'];

    expect(extractProfileIdFromQueryKey(queryKey)).toBeNull();
  });

  it('should return null for short query keys', () => {
    expect(extractProfileIdFromQueryKey(['balances'])).toBeNull();
  });

  it('should return null for query key with wrong marker', () => {
    const queryKey = ['balances', 'user', 'user_123'];

    expect(extractProfileIdFromQueryKey(queryKey)).toBeNull();
  });
});

describe('security isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should isolate personal profile data', () => {
    mockUseCurrentProfileId.mockReturnValue('personal_profile_id');

    const { result } = renderHook(() => useProfileAwareQueryKey('balances'));

    expect(result.current).toContain('personal_profile_id');
    expect(isProfileAwareQueryKey(result.current as unknown[])).toBe(true);
  });

  it('should isolate business profile data', () => {
    mockUseCurrentProfileId.mockReturnValue('business_profile_id');

    const { result } = renderHook(() => useProfileAwareQueryKey('balances'));

    expect(result.current).toContain('business_profile_id');
    expect(isProfileAwareQueryKey(result.current as unknown[])).toBe(true);
  });

  it('should generate different keys for different profiles', () => {
    mockUseCurrentProfileId.mockReturnValue('personal_profile');
    const { result: personalResult } = renderHook(() =>
      useProfileAwareQueryKey('balances')
    );

    mockUseCurrentProfileId.mockReturnValue('business_profile');
    const { result: businessResult } = renderHook(() =>
      useProfileAwareQueryKey('balances')
    );

    expect(personalResult.current).not.toEqual(businessResult.current);
    expect(extractProfileIdFromQueryKey(personalResult.current as unknown[])).toBe(
      'personal_profile'
    );
    expect(extractProfileIdFromQueryKey(businessResult.current as unknown[])).toBe(
      'business_profile'
    );
  });
});
