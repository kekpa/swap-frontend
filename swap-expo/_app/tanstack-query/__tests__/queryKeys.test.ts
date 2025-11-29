/**
 * QueryKeys Tests
 *
 * Tests the centralized query key factory for TanStack Query.
 * Tests query key generation, utilities, validation, profile-awareness,
 * and type safety helpers.
 */

import {
  queryKeys,
  queryKeyUtils,
  validateQueryKey,
  matchesQueryKey,
  extractEntityId,
  isEntityQuery,
  groupQueryKeysByType,
  createQueryKeyPredicate,
  typedQueryKeys,
  debugQueryKeys,
  assertProfileAware,
  isProfileAware,
  extractProfileId,
  validateProfileQueryKey,
  getProfileQueryKeys,
  profileQueryDebug,
} from '../queryKeys';

// Mock __DEV__ for testing
declare const __DEV__: boolean;
(global as any).__DEV__ = true;

describe('queryKeys', () => {
  // ============================================================
  // BASIC QUERY KEY GENERATION TESTS
  // ============================================================

  describe('basic query key generation', () => {
    describe('static keys', () => {
      it('should return correct balances key', () => {
        expect(queryKeys.balances).toEqual(['balances']);
      });

      it('should return correct interactions key', () => {
        expect(queryKeys.interactions).toEqual(['interactions']);
      });

      it('should return correct transactions key', () => {
        expect(queryKeys.transactions).toEqual(['transactions']);
      });

      it('should return correct messages key', () => {
        expect(queryKeys.messages).toEqual(['messages']);
      });

      it('should return correct search key', () => {
        expect(queryKeys.search).toEqual(['search']);
      });

      it('should return correct profile key', () => {
        expect(queryKeys.profile).toEqual(['profile']);
      });

      it('should return correct contacts key', () => {
        expect(queryKeys.contacts).toEqual(['contacts']);
      });

      it('should return correct currencies key', () => {
        expect(queryKeys.currencies).toEqual(['currencies']);
      });

      it('should return correct countries key', () => {
        expect(queryKeys.countries).toEqual(['countries']);
      });

      it('should return correct exchangeRates key', () => {
        expect(queryKeys.exchangeRates).toEqual(['exchange-rates']);
      });

      it('should return correct availableProfiles key', () => {
        expect(queryKeys.availableProfiles).toEqual(['profile', 'available']);
      });

      it('should return correct kyc key', () => {
        expect(queryKeys.kyc).toEqual(['kyc']);
      });

      it('should return correct conversations key', () => {
        expect(queryKeys.conversations).toEqual(['conversations']);
      });
    });

    describe('parameterized keys', () => {
      it('should generate balancesByEntity key with profile and entity', () => {
        const key = queryKeys.balancesByEntity('profile-123', 'entity-456');
        expect(key).toEqual(['balances', 'profile', 'profile-123', 'entity', 'entity-456']);
      });

      it('should generate walletsByEntity key', () => {
        const key = queryKeys.walletsByEntity('profile-123', 'entity-456');
        expect(key).toEqual(['wallets', 'profile', 'profile-123', 'entity', 'entity-456']);
      });

      it('should generate interactionsByEntity key', () => {
        const key = queryKeys.interactionsByEntity('profile-123', 'entity-456');
        expect(key).toEqual(['interactions', 'profile', 'profile-123', 'entity', 'entity-456']);
      });

      it('should generate interactionDetails key', () => {
        const key = queryKeys.interactionDetails('interaction-789');
        expect(key).toEqual(['interactions', 'details', 'interaction-789']);
      });

      it('should generate timeline key', () => {
        const key = queryKeys.timeline('interaction-123');
        expect(key).toEqual(['timeline', 'interaction-123']);
      });

      it('should generate timelineWithLimit key', () => {
        const key = queryKeys.timelineWithLimit('interaction-123', 50);
        expect(key).toEqual(['timeline', 'interaction-123', 'limit', 50]);
      });

      it('should generate timelineInfinite key', () => {
        const key = queryKeys.timelineInfinite('interaction-123', 20);
        expect(key).toEqual(['timeline', 'interaction-123', 'infinite', 20]);
      });

      it('should generate messagesByInteraction key', () => {
        const key = queryKeys.messagesByInteraction('interaction-123');
        expect(key).toEqual(['messages', 'interaction', 'interaction-123']);
      });

      it('should generate recentMessages key', () => {
        const key = queryKeys.recentMessages('profile-123', 'entity-456', 10);
        expect(key).toEqual(['messages', 'profile', 'profile-123', 'recent', 'entity-456', 'limit', 10]);
      });

      it('should generate transactionsByEntity key', () => {
        const key = queryKeys.transactionsByEntity('profile-123', 'entity-456');
        expect(key).toEqual(['transactions', 'profile', 'profile-123', 'entity', 'entity-456']);
      });

      it('should generate transactionsByWallet key', () => {
        const key = queryKeys.transactionsByWallet('profile-123', 'wallet-789');
        expect(key).toEqual(['transactions', 'profile', 'profile-123', 'wallet', 'wallet-789']);
      });

      it('should generate transactionsByAccount key', () => {
        const key = queryKeys.transactionsByAccount('profile-123', 'account-456', 20);
        expect(key).toEqual(['transactions', 'profile', 'profile-123', 'account', 'account-456', 'limit', 20]);
      });

      it('should generate recentTransactions key', () => {
        const key = queryKeys.recentTransactions('profile-123', 'entity-456', 5);
        expect(key).toEqual(['transactions', 'profile', 'profile-123', 'recent', 'entity-456', 'limit', 5]);
      });

      it('should generate transactionDetails key', () => {
        const key = queryKeys.transactionDetails('txn-123');
        expect(key).toEqual(['transactions', 'details', 'txn-123']);
      });

      it('should generate searchEntities key', () => {
        const key = queryKeys.searchEntities('john');
        expect(key).toEqual(['search', 'entities', 'john']);
      });

      it('should generate searchContacts key', () => {
        const key = queryKeys.searchContacts('jane');
        expect(key).toEqual(['search', 'contacts', 'jane']);
      });

      it('should generate userProfile key', () => {
        const key = queryKeys.userProfile('profile-123');
        expect(key).toEqual(['profile', 'profile-123']);
      });

      it('should generate currentProfile key', () => {
        const key = queryKeys.currentProfile('profile-123');
        expect(key).toEqual(['profile', 'current', 'profile-123']);
      });

      it('should generate profileDetails key', () => {
        const key = queryKeys.profileDetails('profile-123');
        expect(key).toEqual(['profile', 'details', 'profile-123']);
      });

      it('should generate kycStatus key', () => {
        const key = queryKeys.kycStatus('profile-123');
        expect(key).toEqual(['kyc', 'status', 'profile', 'profile-123']);
      });

      it('should generate verificationStatus key', () => {
        const key = queryKeys.verificationStatus('profile-123');
        expect(key).toEqual(['verification', 'status', 'profile', 'profile-123']);
      });

      it('should generate kycByEntity key', () => {
        const key = queryKeys.kycByEntity('profile-123', 'entity-456');
        expect(key).toEqual(['kyc', 'profile', 'profile-123', 'entity', 'entity-456']);
      });

      it('should generate kycStep key', () => {
        const key = queryKeys.kycStep('profile-123', 'entity-456', 'document_verification');
        expect(key).toEqual(['kyc', 'profile', 'profile-123', 'step', 'entity-456', 'document_verification']);
      });

      it('should generate kycProgress key', () => {
        const key = queryKeys.kycProgress('profile-123', 'entity-456');
        expect(key).toEqual(['kyc', 'profile', 'profile-123', 'progress', 'entity-456']);
      });

      it('should generate contactsByEntity key', () => {
        const key = queryKeys.contactsByEntity('profile-123', 'entity-456');
        expect(key).toEqual(['contacts', 'profile', 'profile-123', 'entity', 'entity-456']);
      });

      it('should generate contactDetails key', () => {
        const key = queryKeys.contactDetails('contact-123');
        expect(key).toEqual(['contacts', 'details', 'contact-123']);
      });

      it('should generate recentConversations key', () => {
        const key = queryKeys.recentConversations('profile-123', 'entity-456', { unread: true });
        expect(key).toEqual([
          'conversations', 'profile', 'profile-123', 'recent', 'entity-456', { unread: true },
        ]);
      });

      it('should generate conversationDetails key', () => {
        const key = queryKeys.conversationDetails('conv-123');
        expect(key).toEqual(['conversations', 'details', 'conv-123']);
      });

      it('should generate liveBalances key', () => {
        const key = queryKeys.liveBalances('profile-123', 'entity-456');
        expect(key).toEqual(['live', 'balances', 'profile', 'profile-123', 'entity-456']);
      });

      it('should generate liveTransactions key', () => {
        const key = queryKeys.liveTransactions('profile-123', 'entity-456');
        expect(key).toEqual(['live', 'transactions', 'profile', 'profile-123', 'entity-456']);
      });

      it('should generate liveMessages key', () => {
        const key = queryKeys.liveMessages('interaction-123');
        expect(key).toEqual(['live', 'messages', 'interaction-123']);
      });
    });
  });

  // ============================================================
  // QUERY KEY UTILS TESTS
  // ============================================================

  describe('queryKeyUtils', () => {
    describe('getUserDataKeys', () => {
      it('should return all user-related query keys', () => {
        const keys = queryKeyUtils.getUserDataKeys('profile-123', 'entity-456');

        expect(keys).toContainEqual(queryKeys.balancesByEntity('profile-123', 'entity-456'));
        expect(keys).toContainEqual(queryKeys.walletsByEntity('profile-123', 'entity-456'));
        expect(keys).toContainEqual(queryKeys.interactionsByEntity('profile-123', 'entity-456'));
        expect(keys).toContainEqual(queryKeys.transactionsByEntity('profile-123', 'entity-456'));
        expect(keys).toContainEqual(queryKeys.contactsByEntity('profile-123', 'entity-456'));
        expect(keys).toContainEqual(queryKeys.currentProfile('profile-123'));
        expect(keys).toContainEqual(queryKeys.kycByEntity('profile-123', 'entity-456'));
        expect(keys).toContainEqual(queryKeys.kycProgress('profile-123', 'entity-456'));
      });

      it('should include correct number of keys', () => {
        const keys = queryKeyUtils.getUserDataKeys('profile-123', 'entity-456');
        expect(keys.length).toBe(8);
      });
    });

    describe('getNetworkDependentKeys', () => {
      it('should return network-dependent query keys', () => {
        const keys = queryKeyUtils.getNetworkDependentKeys();

        expect(keys).toContainEqual(queryKeys.balances);
        expect(keys).toContainEqual(queryKeys.interactions);
        expect(keys).toContainEqual(queryKeys.transactions);
        expect(keys).toContainEqual(queryKeys.currencies);
        expect(keys).toContainEqual(queryKeys.exchangeRates);
      });

      it('should return 5 network-dependent keys', () => {
        const keys = queryKeyUtils.getNetworkDependentKeys();
        expect(keys.length).toBe(5);
      });
    });

    describe('getInteractionKeys', () => {
      it('should return all interaction-related query keys', () => {
        const keys = queryKeyUtils.getInteractionKeys('interaction-123');

        expect(keys).toContainEqual(queryKeys.interactionDetails('interaction-123'));
        expect(keys).toContainEqual(queryKeys.timeline('interaction-123'));
        expect(keys).toContainEqual(queryKeys.messagesByInteraction('interaction-123'));
        expect(keys).toContainEqual(queryKeys.liveMessages('interaction-123'));
      });

      it('should return 4 interaction keys', () => {
        const keys = queryKeyUtils.getInteractionKeys('interaction-123');
        expect(keys.length).toBe(4);
      });
    });

    describe('getWalletKeys', () => {
      it('should return wallet-related query keys', () => {
        const keys = queryKeyUtils.getWalletKeys('profile-123', 'wallet-456', 'entity-789');

        expect(keys).toContainEqual(queryKeys.transactionsByWallet('profile-123', 'wallet-456'));
        expect(keys).toContainEqual(queryKeys.balancesByEntity('profile-123', 'entity-789'));
        expect(keys).toContainEqual(queryKeys.walletsByEntity('profile-123', 'entity-789'));
      });

      it('should return 3 wallet keys', () => {
        const keys = queryKeyUtils.getWalletKeys('profile-123', 'wallet-456', 'entity-789');
        expect(keys.length).toBe(3);
      });
    });

    describe('getAccountKeys', () => {
      it('should return account-related query keys', () => {
        const keys = queryKeyUtils.getAccountKeys('profile-123', 'account-456', 'entity-789');

        expect(keys).toContainEqual(queryKeys.transactionsByAccount('profile-123', 'account-456', 20));
        expect(keys).toContainEqual(queryKeys.balancesByEntity('profile-123', 'entity-789'));
        expect(keys).toContainEqual(queryKeys.walletsByEntity('profile-123', 'entity-789'));
      });

      it('should use default limit of 20', () => {
        const keys = queryKeyUtils.getAccountKeys('profile-123', 'account-456', 'entity-789');
        const accountKey = keys[0];
        expect(accountKey).toEqual(queryKeys.transactionsByAccount('profile-123', 'account-456', 20));
      });
    });
  });

  // ============================================================
  // VALIDATION UTILITIES TESTS
  // ============================================================

  describe('validateQueryKey', () => {
    it('should return valid query key unchanged', () => {
      const key = queryKeys.balances;
      expect(validateQueryKey(key)).toBe(key);
    });

    it('should throw for non-array input', () => {
      expect(() => validateQueryKey('not-an-array' as any)).toThrow('Query key must be an array');
    });

    it('should throw for empty array', () => {
      expect(() => validateQueryKey([] as any)).toThrow('Query key cannot be empty');
    });

    it('should accept parameterized keys', () => {
      const key = queryKeys.balancesByEntity('profile-123', 'entity-456');
      expect(() => validateQueryKey(key)).not.toThrow();
    });
  });

  describe('matchesQueryKey', () => {
    it('should return true for exact match', () => {
      const key = ['balances', 'profile', 'profile-123', 'entity', 'entity-456'];
      const pattern = queryKeys.balancesByEntity('profile-123', 'entity-456');
      expect(matchesQueryKey(key, pattern)).toBe(true);
    });

    it('should return false for different length', () => {
      const key = ['balances', 'entity'];
      const pattern = queryKeys.balancesByEntity('profile-123', 'entity-456');
      expect(matchesQueryKey(key, pattern)).toBe(false);
    });

    it('should return false for different values', () => {
      const key = ['balances', 'profile', 'different-profile', 'entity', 'entity-456'];
      const pattern = queryKeys.balancesByEntity('profile-123', 'entity-456');
      expect(matchesQueryKey(key, pattern)).toBe(false);
    });

    it('should support wildcard matching', () => {
      const key = ['balances', 'profile', 'any-profile'];
      const pattern = ['balances', '*', 'any-profile'] as const;
      expect(matchesQueryKey(key, pattern)).toBe(true);
    });
  });

  // ============================================================
  // ENTITY EXTRACTION TESTS
  // ============================================================

  describe('extractEntityId', () => {
    it('should extract entity ID from entity-specific key', () => {
      // Note: This function checks for 'entity' at index 1 specifically
      const key = ['balances', 'entity', 'entity-123'] as const;
      expect(extractEntityId(key)).toBe('entity-123');
    });

    it('should extract from profile query keys', () => {
      const key = queryKeys.userProfile('profile-123');
      // This key is ['profile', 'profile-123'] so index 2 doesn't exist
      expect(extractEntityId(key)).toBeNull();
    });

    it('should return null for static keys', () => {
      expect(extractEntityId(queryKeys.balances)).toBeNull();
    });

    it('should return null for short keys', () => {
      const key = ['balances'] as const;
      expect(extractEntityId(key)).toBeNull();
    });
  });

  describe('isEntityQuery', () => {
    it('should return true when entity ID matches', () => {
      const key = ['balances', 'entity', 'entity-123'] as const;
      expect(isEntityQuery(key, 'entity-123')).toBe(true);
    });

    it('should return false when entity ID does not match', () => {
      const key = ['balances', 'entity', 'entity-123'] as const;
      expect(isEntityQuery(key, 'different-entity')).toBe(false);
    });

    it('should return false for keys without entity ID', () => {
      expect(isEntityQuery(queryKeys.balances, 'any-entity')).toBe(false);
    });
  });

  // ============================================================
  // GROUP & PREDICATE TESTS
  // ============================================================

  describe('groupQueryKeysByType', () => {
    it('should group keys by first segment', () => {
      const keys = [
        queryKeys.balances,
        queryKeys.balancesByEntity('p1', 'e1'),
        queryKeys.transactions,
        queryKeys.transactionsByEntity('p1', 'e1'),
      ];

      const grouped = groupQueryKeysByType(keys);

      expect(grouped['balances']).toHaveLength(2);
      expect(grouped['transactions']).toHaveLength(2);
    });

    it('should handle empty array', () => {
      const grouped = groupQueryKeysByType([]);
      expect(grouped).toEqual({});
    });

    it('should handle single key', () => {
      const grouped = groupQueryKeysByType([queryKeys.balances]);
      expect(grouped['balances']).toHaveLength(1);
    });
  });

  describe('createQueryKeyPredicate', () => {
    it('should create predicate from function', () => {
      const predicate = createQueryKeyPredicate((key) => key[0] === 'balances');

      expect(predicate(queryKeys.balances)).toBe(true);
      expect(predicate(queryKeys.transactions)).toBe(false);
    });

    it('should create predicate from partial pattern', () => {
      const predicate = createQueryKeyPredicate(['balances'] as const);

      expect(predicate(queryKeys.balances)).toBe(true);
      expect(predicate(queryKeys.balancesByEntity('p1', 'e1'))).toBe(true);
      expect(predicate(queryKeys.transactions)).toBe(false);
    });

    it('should skip undefined segments in pattern', () => {
      const predicate = createQueryKeyPredicate([undefined, 'profile'] as any);

      expect(predicate(queryKeys.balancesByEntity('p1', 'e1'))).toBe(true);
      expect(predicate(queryKeys.transactionsByEntity('p1', 'e1'))).toBe(true);
    });
  });

  // ============================================================
  // TYPED QUERY KEYS TESTS
  // ============================================================

  describe('typedQueryKeys', () => {
    describe('balances', () => {
      it('should throw for empty entity ID', () => {
        expect(() => typedQueryKeys.balances.byEntity('')).toThrow(
          'Entity ID must be a non-empty string',
        );
      });

      it('should throw for non-string entity ID', () => {
        expect(() => typedQueryKeys.balances.byEntity(123 as any)).toThrow(
          'Entity ID must be a non-empty string',
        );
      });

      it('should return validated all key', () => {
        expect(typedQueryKeys.balances.all()).toEqual(['balances']);
      });
    });

    describe('interactions', () => {
      it('should throw for invalid entity ID', () => {
        expect(() => typedQueryKeys.interactions.byEntity(null as any)).toThrow();
      });

      it('should return validated all key', () => {
        expect(typedQueryKeys.interactions.all()).toEqual(['interactions']);
      });
    });

    describe('timeline', () => {
      it('should throw for empty interaction ID', () => {
        expect(() => typedQueryKeys.timeline.byInteraction('')).toThrow(
          'Interaction ID must be a non-empty string',
        );
      });
    });

    describe('transactions', () => {
      it('should validate limit range', () => {
        expect(() => typedQueryKeys.transactions.recent('e1', 0)).toThrow(
          'Limit must be between 1 and 100',
        );
        expect(() => typedQueryKeys.transactions.recent('e1', 101)).toThrow(
          'Limit must be between 1 and 100',
        );
      });

      it('should accept valid limit', () => {
        expect(() => typedQueryKeys.transactions.recent('e1', 50)).not.toThrow();
      });
    });

    describe('profile', () => {
      it('should validate entity ID', () => {
        expect(() => typedQueryKeys.profile.byEntity('')).toThrow(
          'Entity ID must be a non-empty string',
        );
      });
    });
  });

  // ============================================================
  // DEBUG UTILITIES TESTS
  // ============================================================

  describe('debugQueryKeys', () => {
    describe('format', () => {
      it('should format query key as string', () => {
        const key = queryKeys.balancesByEntity('profile-123', 'entity-456');
        const formatted = debugQueryKeys.format(key);

        expect(formatted).toBe(
          '["balances", "profile", "profile-123", "entity", "entity-456"]',
        );
      });

      it('should handle static keys', () => {
        const formatted = debugQueryKeys.format(queryKeys.balances);
        expect(formatted).toBe('["balances"]');
      });
    });

    describe('analyze', () => {
      it('should return query key info', () => {
        const key = queryKeys.balancesByEntity('profile-123', 'entity-456');
        const info = debugQueryKeys.analyze(key);

        expect(info.type).toBe('balances');
        expect(info.segments).toBe(5);
        expect(info.formatted).toBeDefined();
      });

      it('should return unknown type for non-array', () => {
        const info = debugQueryKeys.analyze('not-array' as any);
        expect(info.type).toBe('unknown');
        expect(info.segments).toBe(0);
      });
    });
  });

  // ============================================================
  // PROFILE-AWARE ASSERTIONS TESTS
  // ============================================================

  describe('assertProfileAware', () => {
    it('should pass for valid profile-aware key', () => {
      const key = ['kyc', 'profile', 'profile-123', 'entity', 'entity-456'];
      expect(() => assertProfileAware(key)).not.toThrow();
    });

    it('should throw for non-array', () => {
      expect(() => assertProfileAware('not-array' as any)).toThrow(
        'Query key must be an array',
      );
    });

    it('should throw for short array', () => {
      expect(() => assertProfileAware(['kyc', 'status'])).toThrow(
        'Query key must have at least 3 segments',
      );
    });

    it('should throw when profile segment missing', () => {
      expect(() => assertProfileAware(['kyc', 'entity', 'entity-123'])).toThrow(
        "Query key must include 'profile' at index 1",
      );
    });

    it('should throw when profileId is empty', () => {
      expect(() => assertProfileAware(['kyc', 'profile', ''])).toThrow(
        'Query key must include profileId (string) at index 2',
      );
    });

    it('should include context in error message', () => {
      expect(() => assertProfileAware(['kyc'], 'useKycStatus')).toThrow(
        /context: useKycStatus/,
      );
    });
  });

  describe('isProfileAware', () => {
    it('should return true for profile-aware key', () => {
      const key = ['kyc', 'profile', 'profile-123', 'status'];
      expect(isProfileAware(key)).toBe(true);
    });

    it('should return false for non-profile-aware key', () => {
      const key = ['kyc', 'status'];
      expect(isProfileAware(key)).toBe(false);
    });

    it('should return false for invalid key', () => {
      expect(isProfileAware([])).toBe(false);
      expect(isProfileAware(['kyc'])).toBe(false);
    });
  });

  describe('extractProfileId', () => {
    it('should extract profileId from profile-aware key', () => {
      const key = ['kyc', 'profile', 'profile-123', 'status'];
      expect(extractProfileId(key)).toBe('profile-123');
    });

    it('should return null for non-profile-aware key', () => {
      const key = ['kyc', 'status'];
      expect(extractProfileId(key)).toBeNull();
    });

    it('should return null for empty key', () => {
      expect(extractProfileId([])).toBeNull();
    });
  });

  // ============================================================
  // PROFILE QUERY KEY VALIDATION TESTS
  // ============================================================

  describe('validateProfileQueryKey', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return key unchanged', () => {
      const key = queryKeys.kycByEntity('profile-123', 'entity-456');
      expect(validateProfileQueryKey(key)).toBe(key);
    });

    it('should log error for non-profile-aware sensitive key', () => {
      const key = ['kyc', 'status'] as const;
      validateProfileQueryKey(key, 'useKycStatus');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[QueryKey Validation]'),
      );
    });

    it('should not log for non-sensitive keys', () => {
      const key = queryKeys.currencies;
      validateProfileQueryKey(key, 'useCurrencies');

      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('getProfileQueryKeys', () => {
    it('should return all profile-specific query keys', () => {
      const keys = getProfileQueryKeys('profile-123');

      expect(keys.length).toBeGreaterThan(0);
      keys.forEach((key) => {
        expect(key[2]).toBe('profile-123');
      });
    });

    it('should include profile and KYC keys', () => {
      const keys = getProfileQueryKeys('profile-123');

      const types = keys.map((k) => k[0]);
      expect(types).toContain('profile');
      expect(types).toContain('kyc');
      expect(types).toContain('verification');
    });
  });

  // ============================================================
  // PROFILE QUERY DEBUG TESTS
  // ============================================================

  describe('profileQueryDebug', () => {
    describe('isMissingProfile', () => {
      it('should return true for sensitive keys without profile', () => {
        expect(profileQueryDebug.isMissingProfile(['kyc', 'status'])).toBe(true);
        expect(profileQueryDebug.isMissingProfile(['balances', 'entity', 'e1'])).toBe(true);
        expect(profileQueryDebug.isMissingProfile(['transactions', 'all'])).toBe(true);
      });

      it('should return false for profile-aware keys', () => {
        const key = ['kyc', 'profile', 'profile-123', 'status'];
        expect(profileQueryDebug.isMissingProfile(key)).toBe(false);
      });

      it('should return false for non-sensitive keys', () => {
        expect(profileQueryDebug.isMissingProfile(['currencies'])).toBe(false);
        expect(profileQueryDebug.isMissingProfile(['countries'])).toBe(false);
        expect(profileQueryDebug.isMissingProfile(['exchange-rates'])).toBe(false);
      });

      it('should return false for empty array', () => {
        expect(profileQueryDebug.isMissingProfile([])).toBe(false);
      });
    });

    describe('analyze', () => {
      it('should return full analysis for profile-aware key', () => {
        const key = ['kyc', 'profile', 'profile-123', 'status'];
        const analysis = profileQueryDebug.analyze(key);

        expect(analysis.isProfileAware).toBe(true);
        expect(analysis.profileId).toBe('profile-123');
        expect(analysis.needsProfile).toBe(false);
        expect(analysis.recommendation).toBe('OK');
      });

      it('should flag missing profile for sensitive keys', () => {
        const key = ['kyc', 'status'];
        const analysis = profileQueryDebug.analyze(key);

        expect(analysis.isProfileAware).toBe(false);
        expect(analysis.needsProfile).toBe(true);
        expect(analysis.recommendation).toContain('CRITICAL');
      });

      it('should suggest consideration for non-standard keys', () => {
        const key = ['custom-feature', 'data'];
        const analysis = profileQueryDebug.analyze(key);

        expect(analysis.isProfileAware).toBe(false);
        expect(analysis.needsProfile).toBe(false);
        expect(analysis.recommendation).toContain('Consider');
      });

      it('should return OK for system/reference keys', () => {
        const key = ['currencies'];
        const analysis = profileQueryDebug.analyze(key);

        expect(analysis.recommendation).toBe('OK');
      });
    });
  });

  // ============================================================
  // IMMUTABILITY TESTS
  // ============================================================

  describe('immutability', () => {
    it('should return arrays that can be used as query keys', () => {
      const key = queryKeys.balances;
      expect(Array.isArray(key)).toBe(true);
      expect(key.length).toBeGreaterThan(0);
    });

    it('should return new array for each parameterized call', () => {
      const key1 = queryKeys.balancesByEntity('p1', 'e1');
      const key2 = queryKeys.balancesByEntity('p1', 'e1');

      expect(key1).not.toBe(key2); // Different references
      expect(key1).toEqual(key2); // Same values
    });
  });
});
