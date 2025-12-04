/**
 * InteractionRepository Tests
 *
 * Tests the interaction repository with profile isolation, CRUD operations,
 * member management, and local-first caching patterns.
 */

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({}));

// Mock logger
jest.mock('../../utils/logger');

// NOTE: EventCoordinator removed

// Mock DatabaseManager - will connect in beforeEach
jest.mock('../DatabaseManager', () => ({
  databaseManager: {
    initialize: jest.fn(),
    getDatabase: jest.fn(),
    isDatabaseReady: jest.fn(),
  },
}));

// Import after mocks
import { InteractionRepository, interactionRepository } from '../InteractionRepository';
import { databaseManager } from '../DatabaseManager';

// Get mock references
const mockDatabaseManager = databaseManager as jest.Mocked<typeof databaseManager>;

// Mock database objects
const mockPrepareAsync = jest.fn();
const mockExecuteAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockFinalizeAsync = jest.fn();
const mockRunAsync = jest.fn();

const mockStatement = {
  executeAsync: mockExecuteAsync,
  finalizeAsync: mockFinalizeAsync,
};

const mockResult = {
  getAllAsync: mockGetAllAsync,
  getFirstAsync: mockGetFirstAsync,
};

const mockDb = {
  prepareAsync: mockPrepareAsync,
  runAsync: mockRunAsync,
};

// Test data
const testProfileId = 'profile-123';
const testInteraction = {
  id: 'interaction-001',
  name: 'Test Chat',
  is_group: false,
  relationship_id: 'rel-123',
  created_by_entity_id: 'entity-456',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_message_snippet: 'Hello!',
  last_message_at: '2024-01-01T12:00:00Z',
  unread_count: 2,
  icon_url: null,
  metadata: JSON.stringify({ type: 'direct' }),
};

const testMember = {
  id: 'member-001',
  interaction_id: 'interaction-001',
  entity_id: 'entity-789',
  role: 'member',
  display_name: 'John Doe',
  avatar_url: 'https://example.com/avatar.jpg',
  entity_type: 'personal',
  joined_at: '2024-01-01T00:00:00Z',
  last_read_at: '2024-01-01T12:00:00Z',
};

describe('InteractionRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default to database available
    mockDatabaseManager.initialize.mockResolvedValue(true);
    mockDatabaseManager.getDatabase.mockReturnValue(mockDb as any);
    mockDatabaseManager.isDatabaseReady.mockReturnValue(true);

    // Setup default mock chains
    mockPrepareAsync.mockResolvedValue(mockStatement);
    mockExecuteAsync.mockResolvedValue(mockResult);
    mockGetAllAsync.mockResolvedValue([]);
    mockGetFirstAsync.mockResolvedValue({ count: 0 });
    mockFinalizeAsync.mockResolvedValue(undefined);
    mockRunAsync.mockResolvedValue(undefined);
  });

  // ============================================================
  // SINGLETON TESTS
  // ============================================================

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = InteractionRepository.getInstance();
      const instance2 = InteractionRepository.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should export singleton instance', () => {
      expect(interactionRepository).toBeDefined();
      expect(interactionRepository).toBeInstanceOf(InteractionRepository);
    });
  });

  // ============================================================
  // DATABASE AVAILABILITY TESTS
  // ============================================================

  describe('isDatabaseAvailable', () => {
    it('should return true when database is ready', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(true);
      mockDatabaseManager.isDatabaseReady.mockReturnValue(true);

      const result = await interactionRepository.isDatabaseAvailable();

      expect(result).toBe(true);
    });

    it('should return false when initialization fails', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(false);

      const result = await interactionRepository.isDatabaseAvailable();

      expect(result).toBe(false);
    });

    it('should return false when database throws', async () => {
      mockDatabaseManager.initialize.mockRejectedValue(new Error('DB error'));

      const result = await interactionRepository.isDatabaseAvailable();

      expect(result).toBe(false);
    });
  });

  // ============================================================
  // SAVE INTERACTIONS TESTS
  // ============================================================

  describe('saveInteractions', () => {
    it('should save multiple interactions with profile isolation', async () => {
      const interactions = [testInteraction, { ...testInteraction, id: 'interaction-002' }];

      await interactionRepository.saveInteractions(interactions, testProfileId);

      expect(mockPrepareAsync).toHaveBeenCalled();
      expect(mockExecuteAsync).toHaveBeenCalledTimes(2);
    });

    it('should skip saving when array is empty', async () => {
      await interactionRepository.saveInteractions([], testProfileId);

      expect(mockPrepareAsync).not.toHaveBeenCalled();
    });

    it('should skip saving when array is null', async () => {
      await interactionRepository.saveInteractions(null as any, testProfileId);

      expect(mockPrepareAsync).not.toHaveBeenCalled();
    });

    it('should emit data updated event', async () => {
      await interactionRepository.saveInteractions([testInteraction], testProfileId);

        'user',
        testInteraction,
        expect.objectContaining({ profileId: testProfileId })
      );
    });

    it('should handle database unavailable gracefully', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(false);

      await expect(
        interactionRepository.saveInteractions([testInteraction], testProfileId)
      ).resolves.not.toThrow();

      expect(mockPrepareAsync).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // INSERT INTERACTION TESTS
  // ============================================================

  describe('insertInteraction', () => {
    it('should insert interaction with all fields', async () => {
      await interactionRepository.insertInteraction(testInteraction, testProfileId);

      expect(mockPrepareAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO interactions')
      );
      expect(mockExecuteAsync).toHaveBeenCalledWith(
        testInteraction.id,
        testInteraction.name,
        0, // is_group = false -> 0
        testInteraction.relationship_id,
        testInteraction.created_by_entity_id,
        1, // is_active = true -> 1
        testInteraction.created_at,
        testInteraction.updated_at,
        testInteraction.last_message_snippet,
        testInteraction.last_message_at,
        testInteraction.unread_count,
        testInteraction.icon_url,
        JSON.stringify(testInteraction.metadata),
        testProfileId
      );
    });

    it('should provide defaults for missing fields', async () => {
      const minimalInteraction = { id: 'interaction-minimal' };

      await interactionRepository.insertInteraction(minimalInteraction, testProfileId);

      expect(mockExecuteAsync).toHaveBeenCalledWith(
        'interaction-minimal',
        null, // name
        0, // is_group default
        null, // relationship_id
        'unknown', // default created_by_entity_id
        1, // is_active default
        expect.any(String), // created_at
        expect.any(String), // updated_at
        null, // last_message_snippet
        null, // last_message_at
        0, // unread_count default
        null, // icon_url
        null, // metadata
        testProfileId
      );
    });

    it('should skip invalid interaction without id', async () => {
      await interactionRepository.insertInteraction({ name: 'No ID' } as any, testProfileId);

      expect(mockPrepareAsync).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPrepareAsync.mockRejectedValue(new Error('DB error'));

      await expect(
        interactionRepository.insertInteraction(testInteraction, testProfileId)
      ).resolves.not.toThrow();
    });
  });

  // ============================================================
  // UPSERT INTERACTION TESTS
  // ============================================================

  describe('upsertInteraction', () => {
    it('should upsert interaction using runAsync', async () => {
      await interactionRepository.upsertInteraction(testInteraction, testProfileId);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO interactions'),
        expect.arrayContaining([testInteraction.id, testProfileId])
      );
    });

    it('should emit data updated event', async () => {
      await interactionRepository.upsertInteraction(testInteraction, testProfileId);

        'user',
        testInteraction,
        expect.objectContaining({ profileId: testProfileId })
      );
    });
  });

  // ============================================================
  // DELETE INTERACTION TESTS
  // ============================================================

  describe('deleteInteraction', () => {
    it('should delete interaction with profile isolation', async () => {
      await interactionRepository.deleteInteraction('interaction-001', testProfileId);

      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM interactions WHERE id = ? AND profile_id = ?',
        ['interaction-001', testProfileId]
      );
    });

    it('should emit data updated event with removed flag', async () => {
      await interactionRepository.deleteInteraction('interaction-001', testProfileId);

        'user',
        expect.objectContaining({ id: 'interaction-001', removed: true }),
        expect.anything()
      );
    });
  });

  describe('deleteInteractions', () => {
    it('should delete multiple interactions and their members', async () => {
      const ids = ['int-1', 'int-2', 'int-3'];

      await interactionRepository.deleteInteractions(ids, testProfileId);

      // Should delete members first, then interactions
      expect(mockRunAsync).toHaveBeenCalledTimes(6); // 3 member deletes + 3 interaction deletes
    });

    it('should skip when ids array is empty', async () => {
      await interactionRepository.deleteInteractions([], testProfileId);

      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('should emit data updated event with deleted IDs', async () => {
      const ids = ['int-1', 'int-2'];

      await interactionRepository.deleteInteractions(ids, testProfileId);

        'user',
        expect.objectContaining({ deletedIds: ids }),
        expect.anything()
      );
    });
  });

  // ============================================================
  // GET INTERACTIONS TESTS
  // ============================================================

  describe('getInteractions', () => {
    it('should get interactions with profile isolation', async () => {
      mockGetAllAsync.mockResolvedValue([testInteraction]);

      const result = await interactionRepository.getInteractions(testProfileId);

      expect(mockPrepareAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE profile_id = ?')
      );
      expect(mockExecuteAsync).toHaveBeenCalledWith(testProfileId, 100);
      expect(result).toEqual([testInteraction]);
    });

    it('should respect limit parameter', async () => {
      await interactionRepository.getInteractions(testProfileId, 50);

      expect(mockExecuteAsync).toHaveBeenCalledWith(testProfileId, 50);
    });

    it('should return empty array when database unavailable', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(false);

      const result = await interactionRepository.getInteractions(testProfileId);

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockPrepareAsync.mockRejectedValue(new Error('Query failed'));

      const result = await interactionRepository.getInteractions(testProfileId);

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // GET INTERACTION MEMBERS TESTS
  // ============================================================

  describe('getInteractionMembers', () => {
    it('should get members for specific interaction with profile isolation', async () => {
      mockGetAllAsync.mockResolvedValue([testMember]);

      const result = await interactionRepository.getInteractionMembers(
        'interaction-001',
        testProfileId
      );

      expect(mockPrepareAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE interaction_id = ? AND profile_id = ?')
      );
      expect(mockExecuteAsync).toHaveBeenCalledWith('interaction-001', testProfileId);
      expect(result).toEqual([testMember]);
    });

    it('should return empty array when database unavailable', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(false);

      const result = await interactionRepository.getInteractionMembers(
        'interaction-001',
        testProfileId
      );

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // GET INTERACTIONS WITH MEMBERS TESTS
  // ============================================================

  describe('getInteractionsWithMembers', () => {
    it('should return interactions with their members combined', async () => {
      // First call returns interactions
      mockGetAllAsync.mockResolvedValueOnce([testInteraction]);
      // Second call returns members
      mockGetAllAsync.mockResolvedValueOnce([testMember]);

      const result = await interactionRepository.getInteractionsWithMembers(testProfileId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(testInteraction.id);
      expect(result[0].members).toHaveLength(1);
      expect(result[0].members[0]).toEqual(testMember);
    });

    it('should return empty array when no interactions', async () => {
      mockGetAllAsync.mockResolvedValueOnce([]);

      const result = await interactionRepository.getInteractionsWithMembers(testProfileId);

      expect(result).toEqual([]);
    });

    it('should handle interactions with no members', async () => {
      mockGetAllAsync.mockResolvedValueOnce([testInteraction]);
      mockGetAllAsync.mockResolvedValueOnce([]); // No members

      const result = await interactionRepository.getInteractionsWithMembers(testProfileId);

      expect(result[0].members).toEqual([]);
    });

    it('should group members by interaction_id correctly', async () => {
      const interaction1 = { ...testInteraction, id: 'int-1' };
      const interaction2 = { ...testInteraction, id: 'int-2' };
      const member1 = { ...testMember, interaction_id: 'int-1' };
      const member2 = { ...testMember, id: 'member-2', interaction_id: 'int-2' };
      const member3 = { ...testMember, id: 'member-3', interaction_id: 'int-1' };

      mockGetAllAsync.mockResolvedValueOnce([interaction1, interaction2]);
      mockGetAllAsync.mockResolvedValueOnce([member1, member2, member3]);

      const result = await interactionRepository.getInteractionsWithMembers(testProfileId);

      expect(result[0].members).toHaveLength(2); // int-1 has 2 members
      expect(result[1].members).toHaveLength(1); // int-2 has 1 member
    });
  });

  // ============================================================
  // SAVE INTERACTION MEMBERS TESTS
  // ============================================================

  describe('saveInteractionMembers', () => {
    it('should save members with profile isolation', async () => {
      const members = [testMember, { ...testMember, id: 'member-002' }];

      await interactionRepository.saveInteractionMembers(members, testProfileId);

      expect(mockPrepareAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO interaction_members')
      );
      expect(mockExecuteAsync).toHaveBeenCalledTimes(2);
    });

    it('should generate UUID for members without id', async () => {
      const memberWithoutId = { ...testMember, id: undefined };

      await interactionRepository.saveInteractionMembers([memberWithoutId], testProfileId);

      // First argument should be a generated UUID (36 characters)
      const firstArg = mockExecuteAsync.mock.calls[0][0];
      expect(firstArg).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should skip saving when array is empty', async () => {
      await interactionRepository.saveInteractionMembers([], testProfileId);

      expect(mockPrepareAsync).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // HAS LOCAL INTERACTIONS TESTS
  // ============================================================

  describe('hasLocalInteractions', () => {
    it('should return true when interactions exist', async () => {
      mockGetFirstAsync.mockResolvedValue({ count: 5 });

      const result = await interactionRepository.hasLocalInteractions(testProfileId);

      expect(result).toBe(true);
    });

    it('should return false when no interactions', async () => {
      mockGetFirstAsync.mockResolvedValue({ count: 0 });

      const result = await interactionRepository.hasLocalInteractions(testProfileId);

      expect(result).toBe(false);
    });

    it('should use profile isolation in query', async () => {
      await interactionRepository.hasLocalInteractions(testProfileId);

      expect(mockPrepareAsync).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM interactions WHERE profile_id = ?'
      );
      expect(mockExecuteAsync).toHaveBeenCalledWith(testProfileId);
    });

    it('should return false when database unavailable', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(false);

      const result = await interactionRepository.hasLocalInteractions(testProfileId);

      expect(result).toBe(false);
    });
  });

  // ============================================================
  // UPDATE LAST MESSAGE TESTS
  // ============================================================

  describe('updateInteractionLastMessage', () => {
    it('should update last message fields with profile isolation', async () => {
      const messageSnippet = 'New message!';
      const messageTimestamp = '2024-01-02T00:00:00Z';

      await interactionRepository.updateInteractionLastMessage(
        'interaction-001',
        testProfileId,
        messageSnippet,
        messageTimestamp
      );

      expect(mockPrepareAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE interactions')
      );
      expect(mockExecuteAsync).toHaveBeenCalledWith(
        messageSnippet,
        messageTimestamp,
        expect.any(String), // updated_at
        'interaction-001',
        testProfileId
      );
    });

    it('should handle database unavailable gracefully', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(false);

      await expect(
        interactionRepository.updateInteractionLastMessage(
          'interaction-001',
          testProfileId,
          'message',
          '2024-01-01T00:00:00Z'
        )
      ).resolves.not.toThrow();
    });
  });

  // ============================================================
  // SYNC FROM REMOTE TESTS
  // ============================================================

  describe('syncInteractionsFromRemote', () => {
    it('should fetch from remote and upsert locally', async () => {
      const remoteInteractions = [testInteraction, { ...testInteraction, id: 'int-2' }];
      const fetchRemote = jest.fn().mockResolvedValue(remoteInteractions);

      await interactionRepository.syncInteractionsFromRemote(fetchRemote, testProfileId);

      expect(fetchRemote).toHaveBeenCalled();
      expect(mockRunAsync).toHaveBeenCalledTimes(2);
    });

    it('should emit sync event after completion', async () => {
      const remoteInteractions = [testInteraction];
      const fetchRemote = jest.fn().mockResolvedValue(remoteInteractions);

      await interactionRepository.syncInteractionsFromRemote(fetchRemote, testProfileId);

        'user',
        remoteInteractions,
        expect.objectContaining({ source: 'InteractionRepository.sync' })
      );
    });

    it('should handle fetch errors gracefully', async () => {
      const fetchRemote = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        interactionRepository.syncInteractionsFromRemote(fetchRemote, testProfileId)
      ).resolves.not.toThrow();
    });

    it('should skip when database unavailable', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(false);
      const fetchRemote = jest.fn();

      await interactionRepository.syncInteractionsFromRemote(fetchRemote, testProfileId);

      expect(fetchRemote).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // PROFILE ISOLATION SECURITY TESTS
  // ============================================================

  describe('profile isolation security', () => {
    it('should always include profile_id in insert queries', async () => {
      await interactionRepository.insertInteraction(testInteraction, testProfileId);

      const insertQuery = mockPrepareAsync.mock.calls[0][0];
      expect(insertQuery).toContain('profile_id');
    });

    it('should always include profile_id in select queries', async () => {
      await interactionRepository.getInteractions(testProfileId);

      const selectQuery = mockPrepareAsync.mock.calls[0][0];
      expect(selectQuery).toContain('WHERE profile_id = ?');
    });

    it('should always include profile_id in delete queries', async () => {
      await interactionRepository.deleteInteraction('int-1', testProfileId);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('AND profile_id = ?'),
        expect.arrayContaining([testProfileId])
      );
    });

    it('should prevent cross-profile data access', async () => {
      // This test verifies that different profile IDs get different results
      mockGetAllAsync.mockResolvedValue([testInteraction]);

      await interactionRepository.getInteractions('profile-A');
      await interactionRepository.getInteractions('profile-B');

      expect(mockExecuteAsync).toHaveBeenNthCalledWith(1, 'profile-A', 100);
      expect(mockExecuteAsync).toHaveBeenNthCalledWith(2, 'profile-B', 100);
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe('edge cases', () => {
    it('should handle null metadata gracefully', async () => {
      const interactionWithNullMetadata = { ...testInteraction, metadata: null };

      await interactionRepository.insertInteraction(interactionWithNullMetadata, testProfileId);

      // Should stringify null as null
      // Note: expect.anything() does NOT match null, so we use specific values where nulls are expected
      expect(mockExecuteAsync).toHaveBeenCalledWith(
        'interaction-001', // id
        'Test Chat', // name
        0, // is_group = false
        'rel-123', // relationship_id
        'entity-456', // created_by_entity_id
        1, // is_active = true
        '2024-01-01T00:00:00Z', // created_at
        '2024-01-01T00:00:00Z', // updated_at
        'Hello!', // last_message_snippet
        '2024-01-01T12:00:00Z', // last_message_at
        2, // unread_count
        null, // icon_url
        null, // metadata should be null
        'profile-123' // profileId
      );
    });

    it('should handle group interaction correctly', async () => {
      const groupInteraction = { ...testInteraction, is_group: true };

      await interactionRepository.insertInteraction(groupInteraction, testProfileId);

      // is_group should be 1 for true
      // Note: metadata gets double-stringified because testInteraction.metadata is already a JSON string
      expect(mockExecuteAsync).toHaveBeenCalledWith(
        'interaction-001', // id
        'Test Chat', // name
        1, // is_group = true -> 1
        'rel-123', // relationship_id
        'entity-456', // created_by_entity_id
        1, // is_active = true
        '2024-01-01T00:00:00Z', // created_at
        '2024-01-01T00:00:00Z', // updated_at
        'Hello!', // last_message_snippet
        '2024-01-01T12:00:00Z', // last_message_at
        2, // unread_count
        null, // icon_url
        JSON.stringify(testInteraction.metadata), // metadata (double-stringified)
        'profile-123' // profileId
      );
    });

    it('should handle inactive interaction correctly', async () => {
      const inactiveInteraction = { ...testInteraction, is_active: false };

      await interactionRepository.insertInteraction(inactiveInteraction, testProfileId);

      // is_active should be 0 for false
      // Note: metadata gets double-stringified because testInteraction.metadata is already a JSON string
      expect(mockExecuteAsync).toHaveBeenCalledWith(
        'interaction-001', // id
        'Test Chat', // name
        0, // is_group = false
        'rel-123', // relationship_id
        'entity-456', // created_by_entity_id
        0, // is_active = false -> 0
        '2024-01-01T00:00:00Z', // created_at
        '2024-01-01T00:00:00Z', // updated_at
        'Hello!', // last_message_snippet
        '2024-01-01T12:00:00Z', // last_message_at
        2, // unread_count
        null, // icon_url
        JSON.stringify(testInteraction.metadata), // metadata (double-stringified)
        'profile-123' // profileId
      );
    });
  });
});
