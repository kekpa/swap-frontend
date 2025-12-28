/**
 * QueryKeys Tests
 *
 * Tests the centralized query key factory for TanStack Query.
 * Tests query key generation, utilities, validation, entity-awareness,
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
  assertEntityAware,
  isEntityAware,
  extractEntityIdFromKey,
  validateEntityQueryKey,
  getEntityQueryKeys,
  entityQueryDebug,
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
      it('should generate balancesByEntity key', () => {
        const key = queryKeys.balancesByEntity('entity-123');
        expect(key).toEqual(['balances', 'entity', 'entity-123']);
      });

      it('should generate walletsByEntity key', () => {
        const key = queryKeys.walletsByEntity('entity-123');
        expect(key).toEqual(['wallets', 'entity', 'entity-123']);
      });

      it('should generate interactionsByEntity key', () => {
        const key = queryKeys.interactionsByEntity('entity-123');
        expect(key).toEqual(['interactions', 'entity', 'entity-123']);
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
        const key = queryKeys.recentMessages('entity-123', 10);
        expect(key).toEqual(['messages', 'entity', 'entity-123', 'recent', 'limit', 10]);
      });

      it('should generate transactionsByEntity key', () => {
        const key = queryKeys.transactionsByEntity('entity-123');
        expect(key).toEqual(['transactions', 'entity', 'entity-123']);
      });

      it('should generate transactionsByWallet key', () => {
        const key = queryKeys.transactionsByWallet('entity-123', 'wallet-789');
        expect(key).toEqual(['transactions', 'entity', 'entity-123', 'wallet', 'wallet-789']);
      });

      it('should generate transactionsByAccount key', () => {
        const key = queryKeys.transactionsByAccount('entity-123', 'account-456', 20);
        expect(key).toEqual(['transactions', 'entity', 'entity-123', 'account', 'account-456', 'limit', 20]);
      });

      it('should generate recentTransactions key', () => {
        const key = queryKeys.recentTransactions('entity-123', 5);
        expect(key).toEqual(['transactions', 'entity', 'entity-123', 'recent', 'limit', 5]);
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
        const key = queryKeys.userProfile('entity-123');
        expect(key).toEqual(['profile', 'entity', 'entity-123']);
      });

      it('should generate currentProfile key', () => {
        const key = queryKeys.currentProfile('entity-123');
        expect(key).toEqual(['profile', 'current', 'entity', 'entity-123']);
      });

      it('should generate profileDetails key', () => {
        const key = queryKeys.profileDetails('entity-123');
        expect(key).toEqual(['profile', 'details', 'entity', 'entity-123']);
      });

      it('should generate kycStatus key', () => {
        const key = queryKeys.kycStatus('entity-123');
        expect(key).toEqual(['kyc', 'status', 'entity', 'entity-123']);
      });

      it('should generate verificationStatus key', () => {
        const key = queryKeys.verificationStatus('entity-123');
        expect(key).toEqual(['verification', 'status', 'entity', 'entity-123']);
      });

      it('should generate kycByEntity key', () => {
        const key = queryKeys.kycByEntity('entity-123');
        expect(key).toEqual(['kyc', 'entity', 'entity-123']);
      });

      it('should generate kycStep key', () => {
        const key = queryKeys.kycStep('entity-123', 'document_verification');
        expect(key).toEqual(['kyc', 'entity', 'entity-123', 'step', 'document_verification']);
      });

      it('should generate kycProgress key', () => {
        const key = queryKeys.kycProgress('entity-123');
        expect(key).toEqual(['kyc', 'entity', 'entity-123', 'progress']);
      });

      it('should generate contactsByEntity key', () => {
        const key = queryKeys.contactsByEntity('entity-123');
        expect(key).toEqual(['contacts', 'entity', 'entity-123']);
      });

      it('should generate contactDetails key', () => {
        const key = queryKeys.contactDetails('contact-123');
        expect(key).toEqual(['contacts', 'details', 'contact-123']);
      });

      it('should generate recentConversations key', () => {
        const key = queryKeys.recentConversations('entity-123', { unread: true });
        expect(key).toEqual([
          'conversations', 'entity', 'entity-123', 'recent', { unread: true },
        ]);
      });

      it('should generate conversationDetails key', () => {
        const key = queryKeys.conversationDetails('conv-123');
        expect(key).toEqual(['conversations', 'details', 'conv-123']);
      });

      it('should generate liveBalances key', () => {
        const key = queryKeys.liveBalances('entity-123');
        expect(key).toEqual(['live', 'balances', 'entity', 'entity-123']);
      });

      it('should generate liveTransactions key', () => {
        const key = queryKeys.liveTransactions('entity-123');
        expect(key).toEqual(['live', 'transactions', 'entity', 'entity-123']);
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
        const keys = queryKeyUtils.getUserDataKeys('entity-123');

        expect(keys).toContainEqual(queryKeys.balancesByEntity('entity-123'));
        expect(keys).toContainEqual(queryKeys.walletsByEntity('entity-123'));
        expect(keys).toContainEqual(queryKeys.interactionsByEntity('entity-123'));
        expect(keys).toContainEqual(queryKeys.transactionsByEntity('entity-123'));
        expect(keys).toContainEqual(queryKeys.contactsByEntity('entity-123'));
        expect(keys).toContainEqual(queryKeys.currentProfile('entity-123'));
        expect(keys).toContainEqual(queryKeys.kycByEntity('entity-123'));
        expect(keys).toContainEqual(queryKeys.kycProgress('entity-123'));
      });

      it('should include correct number of keys', () => {
        const keys = queryKeyUtils.getUserDataKeys('entity-123');
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
        const keys = queryKeyUtils.getWalletKeys('entity-123', 'wallet-456');

        expect(keys).toContainEqual(queryKeys.transactionsByWallet('entity-123', 'wallet-456'));
        expect(keys).toContainEqual(queryKeys.balancesByEntity('entity-123'));
        expect(keys).toContainEqual(queryKeys.walletsByEntity('entity-123'));
      });

      it('should return 3 wallet keys', () => {
        const keys = queryKeyUtils.getWalletKeys('entity-123', 'wallet-456');
        expect(keys.length).toBe(3);
      });
    });

    describe('getAccountKeys', () => {
      it('should return account-related query keys', () => {
        const keys = queryKeyUtils.getAccountKeys('entity-123', 'account-456');

        expect(keys).toContainEqual(queryKeys.transactionsByAccount('entity-123', 'account-456', 20));
        expect(keys).toContainEqual(queryKeys.balancesByEntity('entity-123'));
        expect(keys).toContainEqual(queryKeys.walletsByEntity('entity-123'));
      });

      it('should use default limit of 20', () => {
        const keys = queryKeyUtils.getAccountKeys('entity-123', 'account-456');
        const accountKey = keys[0];
        expect(accountKey).toEqual(queryKeys.transactionsByAccount('entity-123', 'account-456', 20));
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
      const key = queryKeys.balancesByEntity('entity-123');
      expect(() => validateQueryKey(key)).not.toThrow();
    });
  });

  describe('matchesQueryKey', () => {
    it('should return true for exact match', () => {
      const key = ['balances', 'entity', 'entity-123'];
      const pattern = queryKeys.balancesByEntity('entity-123');
      expect(matchesQueryKey(key, pattern)).toBe(true);
    });

    it('should return false for different length', () => {
      const key = ['balances', 'entity'];
      const pattern = queryKeys.balancesByEntity('entity-123');
      expect(matchesQueryKey(key, pattern)).toBe(false);
    });

    it('should return false for different values', () => {
      const key = ['balances', 'entity', 'different-entity'];
      const pattern = queryKeys.balancesByEntity('entity-123');
      expect(matchesQueryKey(key, pattern)).toBe(false);
    });

    it('should support wildcard matching', () => {
      const key = ['balances', 'entity', 'any-entity'];
      const pattern = ['balances', '*', 'any-entity'] as const;
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
      const key = queryKeys.userProfile('entity-123');
      // This key is ['profile', 'entity', 'entity-123'] so it should extract 'entity-123'
      expect(extractEntityId(key)).toBe('entity-123');
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
        queryKeys.balancesByEntity('entity-123'),
        queryKeys.transactions,
        queryKeys.transactionsByEntity('entity-123'),
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
      expect(predicate(queryKeys.balancesByEntity('entity-123'))).toBe(true);
      expect(predicate(queryKeys.transactions)).toBe(false);
    });

    it('should skip undefined segments in pattern', () => {
      const predicate = createQueryKeyPredicate([undefined, 'entity'] as any);

      expect(predicate(queryKeys.balancesByEntity('entity-123'))).toBe(true);
      expect(predicate(queryKeys.transactionsByEntity('entity-123'))).toBe(true);
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
        const key = queryKeys.balancesByEntity('entity-123');
        const formatted = debugQueryKeys.format(key);

        expect(formatted).toBe(
          '["balances", "entity", "entity-123"]',
        );
      });

      it('should handle static keys', () => {
        const formatted = debugQueryKeys.format(queryKeys.balances);
        expect(formatted).toBe('["balances"]');
      });
    });

    describe('analyze', () => {
      it('should return query key info', () => {
        const key = queryKeys.balancesByEntity('entity-123');
        const info = debugQueryKeys.analyze(key);

        expect(info.type).toBe('balances');
        expect(info.segments).toBe(3);
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
  // ENTITY-AWARE ASSERTIONS TESTS
  // ============================================================

  describe('assertEntityAware', () => {
    it('should pass for valid entity-aware key', () => {
      const key = ['kyc', 'entity', 'entity-123'];
      expect(() => assertEntityAware(key)).not.toThrow();
    });

    it('should pass for entity-aware key with extra segments', () => {
      const key = ['kyc', 'entity', 'entity-123', 'status'];
      expect(() => assertEntityAware(key)).not.toThrow();
    });

    it('should throw for non-array', () => {
      expect(() => assertEntityAware('not-array' as any)).toThrow(
        'Query key must be an array',
      );
    });

    it('should throw for short array', () => {
      expect(() => assertEntityAware(['kyc', 'status'])).toThrow(
        'Query key must have at least 3 segments',
      );
    });

    it('should throw when entity segment missing', () => {
      expect(() => assertEntityAware(['kyc', 'status', 'pending'])).toThrow(
        "Query key must include 'entity' at index 1",
      );
    });

    it('should throw when entityId is empty', () => {
      expect(() => assertEntityAware(['kyc', 'entity', ''])).toThrow(
        'Query key must include entityId (string) at index 2',
      );
    });

    it('should include context in error message', () => {
      expect(() => assertEntityAware(['kyc'], 'useKycStatus')).toThrow(
        /context: useKycStatus/,
      );
    });
  });

  describe('isEntityAware', () => {
    it('should return true for entity-aware key', () => {
      const key = ['kyc', 'entity', 'entity-123'];
      expect(isEntityAware(key)).toBe(true);
    });

    it('should return true for entity-aware key with extra segments', () => {
      const key = ['kyc', 'entity', 'entity-123', 'status'];
      expect(isEntityAware(key)).toBe(true);
    });

    it('should return false for non-entity-aware key', () => {
      const key = ['kyc', 'status'];
      expect(isEntityAware(key)).toBe(false);
    });

    it('should return false for invalid key', () => {
      expect(isEntityAware([])).toBe(false);
      expect(isEntityAware(['kyc'])).toBe(false);
    });
  });

  describe('extractEntityIdFromKey', () => {
    it('should extract entityId from entity-aware key', () => {
      const key = ['kyc', 'entity', 'entity-123'];
      expect(extractEntityIdFromKey(key)).toBe('entity-123');
    });

    it('should extract entityId from key with extra segments', () => {
      const key = ['kyc', 'entity', 'entity-123', 'status'];
      expect(extractEntityIdFromKey(key)).toBe('entity-123');
    });

    it('should return null for non-entity-aware key', () => {
      const key = ['kyc', 'status'];
      expect(extractEntityIdFromKey(key)).toBeNull();
    });

    it('should return null for empty key', () => {
      expect(extractEntityIdFromKey([])).toBeNull();
    });
  });

  // ============================================================
  // ENTITY QUERY KEY VALIDATION TESTS
  // ============================================================

  describe('validateEntityQueryKey', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return key unchanged for valid entity-aware key', () => {
      const key = ['kyc', 'entity', 'entity-123'] as const;
      expect(validateEntityQueryKey(key)).toBe(key);
    });

    it('should log error for non-entity-aware sensitive key', () => {
      const key = ['kyc', 'status'] as const;
      validateEntityQueryKey(key, 'useKycStatus');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[QueryKey Validation]'),
      );
    });

    it('should not log for non-sensitive keys', () => {
      const key = queryKeys.currencies;
      validateEntityQueryKey(key, 'useCurrencies');

      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('getEntityQueryKeys', () => {
    it('should return all entity-specific query keys', () => {
      const keys = getEntityQueryKeys('entity-123');

      expect(keys.length).toBeGreaterThan(0);
      keys.forEach((key) => {
        expect(key[2]).toBe('entity-123');
      });
    });

    it('should include profile, KYC, and verification keys', () => {
      const keys = getEntityQueryKeys('entity-123');

      const types = keys.map((k) => k[0]);
      expect(types).toContain('profile');
      expect(types).toContain('kyc');
      expect(types).toContain('verification');
    });

    it('should return entity-aware keys', () => {
      const keys = getEntityQueryKeys('entity-123');

      keys.forEach((key) => {
        expect(key[1]).toBe('entity');
        expect(isEntityAware(key)).toBe(true);
      });
    });
  });

  // ============================================================
  // ENTITY QUERY DEBUG TESTS
  // ============================================================

  describe('entityQueryDebug', () => {
    describe('isMissingEntity', () => {
      it('should return true for sensitive keys without entity', () => {
        expect(entityQueryDebug.isMissingEntity(['kyc', 'status'])).toBe(true);
        expect(entityQueryDebug.isMissingEntity(['balances', 'all'])).toBe(true);
        expect(entityQueryDebug.isMissingEntity(['transactions', 'recent'])).toBe(true);
      });

      it('should return false for entity-aware keys', () => {
        const key = ['kyc', 'entity', 'entity-123'];
        expect(entityQueryDebug.isMissingEntity(key)).toBe(false);
      });

      it('should return false for non-sensitive keys', () => {
        expect(entityQueryDebug.isMissingEntity(['currencies'])).toBe(false);
        expect(entityQueryDebug.isMissingEntity(['countries'])).toBe(false);
        expect(entityQueryDebug.isMissingEntity(['exchange-rates'])).toBe(false);
      });

      it('should return false for empty array', () => {
        expect(entityQueryDebug.isMissingEntity([])).toBe(false);
      });
    });

    describe('analyze', () => {
      it('should return full analysis for entity-aware key', () => {
        const key = ['kyc', 'entity', 'entity-123'];
        const analysis = entityQueryDebug.analyze(key);

        expect(analysis.isEntityAware).toBe(true);
        expect(analysis.entityId).toBe('entity-123');
        expect(analysis.needsEntity).toBe(false);
        expect(analysis.recommendation).toBe('OK');
      });

      it('should flag missing entity for sensitive keys', () => {
        const key = ['kyc', 'status'];
        const analysis = entityQueryDebug.analyze(key);

        expect(analysis.isEntityAware).toBe(false);
        expect(analysis.needsEntity).toBe(true);
        expect(analysis.recommendation).toContain('CRITICAL');
      });

      it('should suggest consideration for non-standard keys', () => {
        const key = ['custom-feature', 'data'];
        const analysis = entityQueryDebug.analyze(key);

        expect(analysis.isEntityAware).toBe(false);
        expect(analysis.needsEntity).toBe(false);
        expect(analysis.recommendation).toContain('Consider');
      });

      it('should return OK for system/reference keys', () => {
        const key = ['currencies'];
        const analysis = entityQueryDebug.analyze(key);

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
