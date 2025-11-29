/**
 * Profile Isolation Guards Tests
 *
 * Tests the security guards that prevent profile context bleeding.
 * Tests query key validation, profile detection, and filtering.
 */

// Mock __DEV__ global
declare const global: { __DEV__: boolean };

// Mock logger - define inside factory to avoid hoisting issues
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  isProfileAwareQueryKey,
  isProfileSensitiveFeature,
  extractProfileId,
  validateQueryKeyForProfileIsolation,
  isSameProfile,
  filterProfileQueries,
  debugProfileQueries,
} from '../profileIsolationGuards';
import logger from '../../utils/logger';

// Get reference to the mocked logger for assertions
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('profileIsolationGuards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set __DEV__ to true for testing
    (global as any).__DEV__ = true;
  });

  // ============================================================
  // isProfileAwareQueryKey TESTS
  // ============================================================

  describe('isProfileAwareQueryKey', () => {
    it('should return true for valid profile-aware query key', () => {
      const queryKey = ['transactions', 'profile', 'profile-123', 'list'];

      expect(isProfileAwareQueryKey(queryKey)).toBe(true);
    });

    it('should return true for minimal profile-aware key', () => {
      const queryKey = ['wallets', 'profile', 'profile-456'];

      expect(isProfileAwareQueryKey(queryKey)).toBe(true);
    });

    it('should return false for query key without profile marker', () => {
      const queryKey = ['transactions', 'profile-123', 'list'];

      expect(isProfileAwareQueryKey(queryKey)).toBe(false);
    });

    it('should return false for query key with wrong second element', () => {
      const queryKey = ['transactions', 'user', 'profile-123'];

      expect(isProfileAwareQueryKey(queryKey)).toBe(false);
    });

    it('should return false for query key with non-string profileId', () => {
      const queryKey = ['transactions', 'profile', 123];

      expect(isProfileAwareQueryKey(queryKey)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(isProfileAwareQueryKey([])).toBe(false);
    });

    it('should return false for array with only one element', () => {
      expect(isProfileAwareQueryKey(['transactions'])).toBe(false);
    });

    it('should return false for array with only two elements', () => {
      expect(isProfileAwareQueryKey(['transactions', 'profile'])).toBe(false);
    });

    it('should return false for non-array input', () => {
      expect(isProfileAwareQueryKey('transactions' as any)).toBe(false);
    });

    it('should return false for null profileId', () => {
      const queryKey = ['transactions', 'profile', null];

      expect(isProfileAwareQueryKey(queryKey)).toBe(false);
    });

    it('should return false for undefined profileId', () => {
      const queryKey = ['transactions', 'profile', undefined];

      expect(isProfileAwareQueryKey(queryKey)).toBe(false);
    });

    it('should handle query key with complex nested data', () => {
      const queryKey = ['transactions', 'profile', 'profile-123', { filter: 'pending' }];

      expect(isProfileAwareQueryKey(queryKey)).toBe(true);
    });
  });

  // ============================================================
  // isProfileSensitiveFeature TESTS
  // ============================================================

  describe('isProfileSensitiveFeature', () => {
    it('should return true for balances', () => {
      expect(isProfileSensitiveFeature('balances')).toBe(true);
    });

    it('should return true for wallets', () => {
      expect(isProfileSensitiveFeature('wallets')).toBe(true);
    });

    it('should return true for transactions', () => {
      expect(isProfileSensitiveFeature('transactions')).toBe(true);
    });

    it('should return true for interactions', () => {
      expect(isProfileSensitiveFeature('interactions')).toBe(true);
    });

    it('should return true for messages', () => {
      expect(isProfileSensitiveFeature('messages')).toBe(true);
    });

    it('should return true for kyc', () => {
      expect(isProfileSensitiveFeature('kyc')).toBe(true);
    });

    it('should return true for verification', () => {
      expect(isProfileSensitiveFeature('verification')).toBe(true);
    });

    it('should return true for contacts', () => {
      expect(isProfileSensitiveFeature('contacts')).toBe(true);
    });

    it('should return true for conversations', () => {
      expect(isProfileSensitiveFeature('conversations')).toBe(true);
    });

    it('should return true for live', () => {
      expect(isProfileSensitiveFeature('live')).toBe(true);
    });

    it('should return false for non-sensitive features', () => {
      expect(isProfileSensitiveFeature('settings')).toBe(false);
      expect(isProfileSensitiveFeature('currencies')).toBe(false);
      expect(isProfileSensitiveFeature('exchange-rates')).toBe(false);
      expect(isProfileSensitiveFeature('countries')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isProfileSensitiveFeature('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isProfileSensitiveFeature('WALLETS')).toBe(false);
      expect(isProfileSensitiveFeature('Wallets')).toBe(false);
    });
  });

  // ============================================================
  // extractProfileId TESTS
  // ============================================================

  describe('extractProfileId', () => {
    it('should extract profileId from valid profile-aware key', () => {
      const queryKey = ['transactions', 'profile', 'profile-123', 'list'];

      expect(extractProfileId(queryKey)).toBe('profile-123');
    });

    it('should return null for non-profile-aware key', () => {
      const queryKey = ['transactions', 'list'];

      expect(extractProfileId(queryKey)).toBeNull();
    });

    it('should return null for key without profile marker', () => {
      const queryKey = ['transactions', 'user', 'profile-123'];

      expect(extractProfileId(queryKey)).toBeNull();
    });

    it('should return null for empty array', () => {
      expect(extractProfileId([])).toBeNull();
    });

    it('should return null for key with non-string profileId', () => {
      const queryKey = ['transactions', 'profile', 123];

      expect(extractProfileId(queryKey)).toBeNull();
    });

    it('should extract UUID-style profileId', () => {
      const queryKey = ['wallets', 'profile', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'];

      expect(extractProfileId(queryKey)).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    });
  });

  // ============================================================
  // validateQueryKeyForProfileIsolation TESTS
  // ============================================================

  describe('validateQueryKeyForProfileIsolation', () => {
    it('should not log for valid profile-aware sensitive query', () => {
      const queryKey = ['transactions', 'profile', 'profile-123', 'list'];

      validateQueryKeyForProfileIsolation(queryKey);

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Profile-aware query'),
      );
    });

    it('should log error for sensitive query without profile context', () => {
      const queryKey = ['transactions', 'list'];

      validateQueryKeyForProfileIsolation(queryKey);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('PROFILE ISOLATION WARNING'),
      );
    });

    it('should log error for wallets without profile context', () => {
      const queryKey = ['wallets'];

      validateQueryKeyForProfileIsolation(queryKey);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log error for balances without profile context', () => {
      const queryKey = ['balances', 'total'];

      validateQueryKeyForProfileIsolation(queryKey);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should not log for non-sensitive features', () => {
      const queryKey = ['settings', 'theme'];

      validateQueryKeyForProfileIsolation(queryKey);

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should log warning for invalid query key', () => {
      validateQueryKeyForProfileIsolation([]);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[Profile Isolation] Invalid query key:',
        [],
      );
    });

    it('should not run in production mode', () => {
      (global as any).__DEV__ = false;

      const queryKey = ['transactions', 'list'];
      validateQueryKeyForProfileIsolation(queryKey);

      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle null input gracefully', () => {
      validateQueryKeyForProfileIsolation(null as any);

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should include feature name in error message', () => {
      const queryKey = ['kyc', 'status'];

      validateQueryKeyForProfileIsolation(queryKey);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('kyc'),
      );
    });

    it('should include fix instructions in error message', () => {
      const queryKey = ['messages', 'list'];

      validateQueryKeyForProfileIsolation(queryKey);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('useCurrentProfileId'),
      );
    });

    it('should validate all sensitive features', () => {
      const sensitiveFeatures = [
        'balances',
        'wallets',
        'transactions',
        'interactions',
        'messages',
        'kyc',
        'verification',
        'contacts',
        'conversations',
        'live',
      ];

      sensitiveFeatures.forEach((feature) => {
        jest.clearAllMocks();
        const queryKey = [feature, 'list'];

        validateQueryKeyForProfileIsolation(queryKey);

        expect(mockLogger.error).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // isSameProfile TESTS
  // ============================================================

  describe('isSameProfile', () => {
    it('should return true for matching profile IDs', () => {
      const key1 = ['transactions', 'profile', 'profile-123', 'list'];
      const key2 = ['wallets', 'profile', 'profile-123'];

      expect(isSameProfile(key1, key2)).toBe(true);
    });

    it('should return false for different profile IDs', () => {
      const key1 = ['transactions', 'profile', 'profile-123', 'list'];
      const key2 = ['wallets', 'profile', 'profile-456'];

      expect(isSameProfile(key1, key2)).toBe(false);
    });

    it('should return false if first key has no profile', () => {
      const key1 = ['transactions', 'list'];
      const key2 = ['wallets', 'profile', 'profile-123'];

      expect(isSameProfile(key1, key2)).toBe(false);
    });

    it('should return false if second key has no profile', () => {
      const key1 = ['transactions', 'profile', 'profile-123'];
      const key2 = ['wallets', 'list'];

      expect(isSameProfile(key1, key2)).toBe(false);
    });

    it('should return false if neither key has profile', () => {
      const key1 = ['transactions', 'list'];
      const key2 = ['wallets', 'list'];

      expect(isSameProfile(key1, key2)).toBe(false);
    });

    it('should return false for empty arrays', () => {
      expect(isSameProfile([], [])).toBe(false);
    });

    it('should handle UUID profile IDs', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const key1 = ['transactions', 'profile', uuid];
      const key2 = ['wallets', 'profile', uuid];

      expect(isSameProfile(key1, key2)).toBe(true);
    });
  });

  // ============================================================
  // filterProfileQueries TESTS
  // ============================================================

  describe('filterProfileQueries', () => {
    it('should filter queries by profile ID', () => {
      const queries = [
        { queryKey: ['transactions', 'profile', 'profile-123', 'list'] },
        { queryKey: ['wallets', 'profile', 'profile-456'] },
        { queryKey: ['balances', 'profile', 'profile-123'] },
      ];

      const result = filterProfileQueries(queries, 'profile-123');

      expect(result).toHaveLength(2);
      expect(result[0].queryKey[0]).toBe('transactions');
      expect(result[1].queryKey[0]).toBe('balances');
    });

    it('should return empty array if no matches', () => {
      const queries = [
        { queryKey: ['transactions', 'profile', 'profile-123'] },
        { queryKey: ['wallets', 'profile', 'profile-456'] },
      ];

      const result = filterProfileQueries(queries, 'profile-789');

      expect(result).toHaveLength(0);
    });

    it('should exclude queries without profile context', () => {
      const queries = [
        { queryKey: ['transactions', 'profile', 'profile-123'] },
        { queryKey: ['settings', 'theme'] },
        { queryKey: ['currencies', 'list'] },
      ];

      const result = filterProfileQueries(queries, 'profile-123');

      expect(result).toHaveLength(1);
    });

    it('should handle empty queries array', () => {
      const result = filterProfileQueries([], 'profile-123');

      expect(result).toHaveLength(0);
    });

    it('should filter all queries for same profile', () => {
      const queries = [
        { queryKey: ['transactions', 'profile', 'profile-123', 'list'] },
        { queryKey: ['wallets', 'profile', 'profile-123'] },
        { queryKey: ['balances', 'profile', 'profile-123', 'total'] },
        { queryKey: ['messages', 'profile', 'profile-123', 'unread'] },
      ];

      const result = filterProfileQueries(queries, 'profile-123');

      expect(result).toHaveLength(4);
    });
  });

  // ============================================================
  // debugProfileQueries TESTS
  // ============================================================

  describe('debugProfileQueries', () => {
    let consoleGroupSpy: jest.SpyInstance;
    let consoleGroupEndSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleGroupSpy = jest.spyOn(console, 'group').mockImplementation();
      consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleGroupSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should not run in production mode', () => {
      (global as any).__DEV__ = false;

      const queries = [{ queryKey: ['transactions', 'profile', 'profile-123'] }];

      debugProfileQueries(queries);

      expect(consoleGroupSpy).not.toHaveBeenCalled();
    });

    it('should log total and profile-sensitive query counts', () => {
      const queries = [
        { queryKey: ['transactions', 'profile', 'profile-123'] },
        { queryKey: ['settings', 'theme'] },
        { queryKey: ['wallets', 'profile', 'profile-123'] },
      ];

      debugProfileQueries(queries);

      expect(consoleLogSpy).toHaveBeenCalledWith('Total queries: 3');
      expect(consoleLogSpy).toHaveBeenCalledWith('Profile-sensitive: 2');
    });

    it('should group queries by profile ID', () => {
      const queries = [
        { queryKey: ['transactions', 'profile', 'profile-123'] },
        { queryKey: ['wallets', 'profile', 'profile-456'] },
      ];

      debugProfileQueries(queries);

      expect(consoleGroupSpy).toHaveBeenCalledWith('Profile: profile-123');
      expect(consoleGroupSpy).toHaveBeenCalledWith('Profile: profile-456');
    });

    it('should label queries without profile as MISSING_PROFILE', () => {
      const queries = [{ queryKey: ['wallets', 'list'] }];

      debugProfileQueries(queries);

      expect(consoleGroupSpy).toHaveBeenCalledWith('Profile: MISSING_PROFILE');
    });

    it('should handle empty queries array', () => {
      debugProfileQueries([]);

      expect(consoleLogSpy).toHaveBeenCalledWith('Total queries: 0');
      expect(consoleLogSpy).toHaveBeenCalledWith('Profile-sensitive: 0');
    });

    it('should only include profile-sensitive features', () => {
      const queries = [
        { queryKey: ['transactions', 'profile', 'profile-123'] },
        { queryKey: ['settings', 'profile', 'profile-123'] }, // Not sensitive
        { queryKey: ['currencies', 'list'] }, // Not sensitive
      ];

      debugProfileQueries(queries);

      expect(consoleLogSpy).toHaveBeenCalledWith('Profile-sensitive: 1');
    });
  });

  // ============================================================
  // INTEGRATION TESTS
  // ============================================================

  describe('integration', () => {
    it('should work together to validate and filter queries', () => {
      const queries = [
        { queryKey: ['transactions', 'profile', 'profile-123', 'list'] },
        { queryKey: ['wallets', 'profile', 'profile-123'] },
        { queryKey: ['balances', 'total'] }, // Missing profile - would trigger warning
        { queryKey: ['settings', 'theme'] }, // Non-sensitive
      ];

      // Validate each query
      queries.forEach((query) => {
        validateQueryKeyForProfileIsolation(query.queryKey);
      });

      // Filter by profile
      const profileQueries = filterProfileQueries(queries, 'profile-123');

      // Should have error for balances (missing profile)
      expect(mockLogger.error).toHaveBeenCalledTimes(1);

      // Should have found 2 profile-123 queries
      expect(profileQueries).toHaveLength(2);
    });

    it('should correctly identify profile context throughout lifecycle', () => {
      const queryKey = ['transactions', 'profile', 'profile-123', 'pending'];

      // Check if profile-aware
      expect(isProfileAwareQueryKey(queryKey)).toBe(true);

      // Check if sensitive
      expect(isProfileSensitiveFeature('transactions')).toBe(true);

      // Extract profile ID
      expect(extractProfileId(queryKey)).toBe('profile-123');

      // Validate - should pass without error
      validateQueryKeyForProfileIsolation(queryKey);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should detect cross-profile data access attempt', () => {
      const profileAQuery = ['transactions', 'profile', 'profile-A', 'list'];
      const profileBQuery = ['transactions', 'profile', 'profile-B', 'list'];

      expect(isSameProfile(profileAQuery, profileBQuery)).toBe(false);
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe('edge cases', () => {
    it('should handle special characters in profile ID', () => {
      const queryKey = ['transactions', 'profile', 'profile@#$%^&*', 'list'];

      expect(isProfileAwareQueryKey(queryKey)).toBe(true);
      expect(extractProfileId(queryKey)).toBe('profile@#$%^&*');
    });

    it('should handle very long profile ID', () => {
      const longProfileId = 'a'.repeat(1000);
      const queryKey = ['transactions', 'profile', longProfileId];

      expect(isProfileAwareQueryKey(queryKey)).toBe(true);
      expect(extractProfileId(queryKey)).toBe(longProfileId);
    });

    it('should handle empty string profile ID', () => {
      const queryKey = ['transactions', 'profile', ''];

      // Empty string is technically a string, so it passes the type check
      expect(isProfileAwareQueryKey(queryKey)).toBe(true);
      expect(extractProfileId(queryKey)).toBe('');
    });

    it('should handle query key with object elements', () => {
      const queryKey = [
        'transactions',
        'profile',
        'profile-123',
        { status: 'pending', page: 1 },
      ];

      expect(isProfileAwareQueryKey(queryKey)).toBe(true);
      expect(extractProfileId(queryKey)).toBe('profile-123');
    });

    it('should handle query key with array elements', () => {
      const queryKey = ['transactions', 'profile', 'profile-123', ['id1', 'id2']];

      expect(isProfileAwareQueryKey(queryKey)).toBe(true);
    });

    it('should handle feature names with numbers', () => {
      expect(isProfileSensitiveFeature('balances2')).toBe(false);
      expect(isProfileSensitiveFeature('2wallets')).toBe(false);
    });

    it('should handle whitespace in feature names', () => {
      expect(isProfileSensitiveFeature(' wallets')).toBe(false);
      expect(isProfileSensitiveFeature('wallets ')).toBe(false);
    });
  });

  // ============================================================
  // SECURITY TESTS
  // ============================================================

  describe('security', () => {
    it('should detect data leakage attempt between profiles', () => {
      const userAData = { queryKey: ['wallets', 'profile', 'user-A'] };
      const userBData = { queryKey: ['wallets', 'profile', 'user-B'] };

      const userAQueries = filterProfileQueries([userAData, userBData], 'user-A');

      // User A should only see their own data
      expect(userAQueries).toHaveLength(1);
      expect(userAQueries[0].queryKey[2]).toBe('user-A');
    });

    it('should flag all sensitive queries without profile context', () => {
      const sensitiveQueries = [
        ['balances'],
        ['wallets', 'list'],
        ['transactions', { page: 1 }],
        ['messages', 'unread'],
        ['kyc', 'status'],
      ];

      sensitiveQueries.forEach((queryKey) => {
        jest.clearAllMocks();
        validateQueryKeyForProfileIsolation(queryKey);
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });

    it('should not allow profile spoofing via wrong key position', () => {
      // Attempt to put profile ID in wrong position
      const spoofedKey = ['transactions', 'profile-123', 'profile', 'list'];

      expect(isProfileAwareQueryKey(spoofedKey)).toBe(false);
      expect(extractProfileId(spoofedKey)).toBeNull();
    });
  });
});
