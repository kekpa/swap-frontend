/**
 * MessageRepository Tests
 *
 * Tests the message repository with profile isolation, deduplication,
 * status management, and sync patterns.
 */

// Reset modules before importing to ensure clean singleton state
jest.resetModules();

// Mock dependencies BEFORE importing the repository
jest.mock('expo-sqlite', () => ({
  SQLiteDatabase: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('../DatabaseManager', () => ({
  databaseManager: {
    initialize: jest.fn(),
    getDatabase: jest.fn(),
    isDatabaseReady: jest.fn(),
  },
}));

jest.mock('../../utils/eventEmitter');

jest.mock('../../utils/logger');

// Import after mocking
import { MessageRepository, messageRepository } from '../MessageRepository';
import { databaseManager } from '../DatabaseManager';
import { eventEmitter } from '../../utils/eventEmitter';

const mockDatabaseManager = databaseManager as jest.Mocked<typeof databaseManager>;
const mockEventEmitter = eventEmitter as jest.Mocked<typeof eventEmitter>;

// Test data
const mockMessage = {
  id: 'msg-123',
  interaction_id: 'interaction-1',
  sender_entity_id: 'entity-123',
  content: 'Hello World!',
  message_type: 'text',
  timestamp: '2024-01-01T10:00:00Z',
  createdAt: '2024-01-01T10:00:00Z',
  itemType: 'message' as const,
  type: 'message' as const,
  metadata: { isOptimistic: false },
};

const mockMessage2 = {
  id: 'msg-456',
  interaction_id: 'interaction-1',
  sender_entity_id: 'entity-456',
  content: 'Reply!',
  message_type: 'text',
  timestamp: '2024-01-01T11:00:00Z',
  createdAt: '2024-01-01T11:00:00Z',
  itemType: 'message' as const,
  type: 'message' as const,
  metadata: {},
};

describe('MessageRepository', () => {
  let mockDb: any;
  let mockStatement: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock statement
    mockStatement = {
      executeAsync: jest.fn(),
      finalizeAsync: jest.fn(),
    };

    // Setup mock database
    mockDb = {
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      runAsync: jest.fn(),
      prepareAsync: jest.fn().mockResolvedValue(mockStatement),
    };

    mockDatabaseManager.initialize.mockResolvedValue(true);
    mockDatabaseManager.getDatabase.mockReturnValue(mockDb);
    mockDatabaseManager.isDatabaseReady.mockReturnValue(true);
  });

  // ============================================================
  // SINGLETON PATTERN TESTS
  // ============================================================

  describe('singleton pattern', () => {
    it('should return singleton instance', () => {
      const instance1 = MessageRepository.getInstance();
      const instance2 = MessageRepository.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should export messageRepository as singleton', () => {
      expect(messageRepository).toBeDefined();
      expect(messageRepository).toBe(MessageRepository.getInstance());
    });
  });

  // ============================================================
  // SQLite AVAILABILITY TESTS
  // ============================================================

  describe('isSQLiteAvailable', () => {
    it('should return true when database is ready', async () => {
      const result = await messageRepository.isSQLiteAvailable();
      expect(result).toBe(true);
    });

    it('should return false when database initialization fails', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(false);

      const result = await messageRepository.isSQLiteAvailable();
      expect(result).toBe(false);
    });

    it('should return false on web platform', async () => {
      jest.resetModules();
      jest.doMock('react-native', () => ({
        Platform: { OS: 'web' },
      }));

      // Re-import with web platform
      const { messageRepository: webRepo } = require('../MessageRepository');
      mockDatabaseManager.isDatabaseReady.mockReturnValue(true);

      const result = await webRepo.isSQLiteAvailable();
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // GET MESSAGES TESTS (PROFILE-ISOLATED)
  // ============================================================

  describe('getMessagesForInteraction', () => {
    it('should get messages with profileId isolation', async () => {
      const mockRows = [
        { id: 'msg-1', interaction_id: 'int-1', sender_entity_id: 'ent-1', content: 'Hi', created_at: '2024-01-01', metadata: '{}' },
      ];
      mockStatement.executeAsync.mockResolvedValue({ getAllAsync: jest.fn().mockResolvedValue(mockRows) });

      const result = await messageRepository.getMessagesForInteraction('int-1', 'profile-123', 100);

      expect(mockDb.prepareAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE interaction_id = ? AND profile_id = ?'),
      );
      expect(mockStatement.executeAsync).toHaveBeenCalledWith('int-1', 'profile-123', 100);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when SQLite not available', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(false);

      const result = await messageRepository.getMessagesForInteraction('int-1', 'profile-123');

      expect(result).toEqual([]);
    });

    it('should transform database rows to MessageTimelineItem', async () => {
      const mockRows = [{
        id: 'msg-1',
        interaction_id: 'int-1',
        sender_entity_id: 'ent-1',
        content: 'Test content',
        message_type: 'image',
        created_at: '2024-01-01T10:00:00Z',
        metadata: JSON.stringify({ key: 'value' }),
      }];
      mockStatement.executeAsync.mockResolvedValue({ getAllAsync: jest.fn().mockResolvedValue(mockRows) });

      const result = await messageRepository.getMessagesForInteraction('int-1', 'profile-123');

      expect(result[0]).toMatchObject({
        id: 'msg-1',
        interaction_id: 'int-1',
        itemType: 'message',
        type: 'message',
        sender_entity_id: 'ent-1',
        content: 'Test content',
        message_type: 'image',
        metadata: { key: 'value' },
      });
    });

    it('should handle missing sender_entity_id', async () => {
      const mockRows = [{ id: 'msg-1', interaction_id: 'int-1', content: 'Hi', created_at: '2024-01-01' }];
      mockStatement.executeAsync.mockResolvedValue({ getAllAsync: jest.fn().mockResolvedValue(mockRows) });

      const result = await messageRepository.getMessagesForInteraction('int-1', 'profile-123');

      expect(result[0].sender_entity_id).toBe('system_or_unknown');
    });

    it('should respect limit parameter', async () => {
      mockStatement.executeAsync.mockResolvedValue({ getAllAsync: jest.fn().mockResolvedValue([]) });

      await messageRepository.getMessagesForInteraction('int-1', 'profile-123', 50);

      expect(mockStatement.executeAsync).toHaveBeenCalledWith('int-1', 'profile-123', 50);
    });

    it('should return empty array on database error', async () => {
      mockStatement.executeAsync.mockRejectedValue(new Error('DB Error'));

      const result = await messageRepository.getMessagesForInteraction('int-1', 'profile-123');

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // SAVE MESSAGES TESTS (WITH DEDUPLICATION)
  // ============================================================

  describe('saveMessages', () => {
    it('should save messages with profileId', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ id: 'interaction-1' });
      mockDb.runAsync.mockResolvedValue(undefined);

      await messageRepository.saveMessages([mockMessage], 'profile-123');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO messages'),
        expect.arrayContaining(['profile-123']),
      );
    });

    it('should deduplicate messages by ID', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ id: 'interaction-1' });
      mockDb.runAsync.mockResolvedValue(undefined);

      const duplicateMessages = [
        mockMessage,
        { ...mockMessage }, // Same ID
        mockMessage2,
      ];

      await messageRepository.saveMessages(duplicateMessages, 'profile-123');

      // Should only save 2 unique messages
      expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
    });

    it('should skip messages without id', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ id: 'interaction-1' });
      mockDb.runAsync.mockResolvedValue(undefined);

      const messagesWithMissingId = [
        { ...mockMessage, id: undefined as any },
        mockMessage2,
      ];

      await messageRepository.saveMessages(messagesWithMissingId, 'profile-123');

      // Should only save 1 message with valid ID
      expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
    });

    it('should skip messages without interaction_id', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ id: 'interaction-1' });
      mockDb.runAsync.mockResolvedValue(undefined);

      const messagesWithMissingInteraction = [
        { ...mockMessage, interaction_id: undefined as any },
        mockMessage2,
      ];

      await messageRepository.saveMessages(messagesWithMissingInteraction, 'profile-123');

      expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
    });

    it('should handle empty messages array', async () => {
      await messageRepository.saveMessages([], 'profile-123');

      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });

    it('should handle null messages', async () => {
      await messageRepository.saveMessages(null as any, 'profile-123');

      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });

    it('should ensure interaction exists before saving', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null); // No existing interaction
      mockDb.runAsync.mockResolvedValue(undefined);

      await messageRepository.saveMessages([mockMessage], 'profile-123');

      // Should create interaction first
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO interactions'),
        expect.any(Array),
      );
    });

    it('should not fail when SQLite not available', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(false);

      await expect(messageRepository.saveMessages([mockMessage], 'profile-123')).resolves.not.toThrow();
    });
  });

  // ============================================================
  // HAS LOCAL MESSAGES TESTS
  // ============================================================

  describe('hasLocalMessages', () => {
    it('should return true when messages exist', async () => {
      mockStatement.executeAsync.mockResolvedValue({
        getAllAsync: jest.fn().mockResolvedValue([{ id: 'msg-1' }]),
      });

      const result = await messageRepository.hasLocalMessages('int-1', 'profile-123');

      expect(result).toBe(true);
    });

    it('should return false when no messages exist', async () => {
      mockStatement.executeAsync.mockResolvedValue({
        getAllAsync: jest.fn().mockResolvedValue([]),
      });

      const result = await messageRepository.hasLocalMessages('int-1', 'profile-123');

      expect(result).toBe(false);
    });

    it('should return false when SQLite not available', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(false);

      const result = await messageRepository.hasLocalMessages('int-1', 'profile-123');

      expect(result).toBe(false);
    });
  });

  // ============================================================
  // UPSERT MESSAGE TESTS
  // ============================================================

  describe('upsertMessage', () => {
    it('should insert or replace message with profileId', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await messageRepository.upsertMessage(
        {
          id: 'msg-1',
          interaction_id: 'int-1',
          sender_entity_id: 'ent-1',
          content: 'Test',
          created_at: '2024-01-01',
        },
        'profile-123',
      );

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO messages'),
        expect.arrayContaining(['msg-1', 'profile-123']),
      );
    });

    it('should emit data_updated event', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await messageRepository.upsertMessage(
        {
          id: 'msg-1',
          interaction_id: 'int-1',
          sender_entity_id: 'ent-1',
          content: 'Test',
          created_at: '2024-01-01',
        },
        'profile-123',
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('data_updated', {
        type: 'messages',
        data: expect.any(Object),
        profileId: 'profile-123',
      });
    });

    it('should handle missing fields gracefully', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await messageRepository.upsertMessage(
        { id: 'msg-1' } as any,
        'profile-123',
      );

      expect(mockDb.runAsync).toHaveBeenCalled();
    });
  });

  // ============================================================
  // DELETE MESSAGE TESTS
  // ============================================================

  describe('deleteMessage', () => {
    it('should delete message with profileId isolation', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await messageRepository.deleteMessage('msg-123', 'profile-123');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM messages WHERE id = ? AND profile_id = ?',
        ['msg-123', 'profile-123'],
      );
    });

    it('should emit data_updated event with removed flag', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await messageRepository.deleteMessage('msg-123', 'profile-123');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('data_updated', {
        type: 'messages',
        data: { id: 'msg-123', removed: true, profileId: 'profile-123' },
      });
    });
  });

  // ============================================================
  // GET LATEST MESSAGE TESTS
  // ============================================================

  describe('getLatestMessageForInteraction', () => {
    it('should get latest message with profileId isolation', async () => {
      mockDb.getFirstAsync.mockResolvedValue({
        id: 'msg-1',
        interaction_id: 'int-1',
        content: 'Latest',
        created_at: '2024-01-01',
        sender_entity_id: 'ent-1',
      });

      const result = await messageRepository.getLatestMessageForInteraction('int-1', 'profile-123');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE interaction_id = ? AND profile_id = ?'),
        ['int-1', 'profile-123'],
      );
      expect(result?.id).toBe('msg-1');
    });

    it('should return null when no messages found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await messageRepository.getLatestMessageForInteraction('int-1', 'profile-123');

      expect(result).toBeNull();
    });

    it('should order by created_at DESC', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      await messageRepository.getLatestMessageForInteraction('int-1', 'profile-123');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array),
      );
    });
  });

  // ============================================================
  // UPDATE MESSAGE STATUS TESTS
  // ============================================================

  describe('updateMessageStatus', () => {
    it('should update status with profileId isolation', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await messageRepository.updateMessageStatus('msg-123', 'profile-123', 'delivered');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE messages'),
        ['delivered', 'msg-123', 'profile-123'],
      );
    });

    it('should accept sent status', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await messageRepository.updateMessageStatus('msg-123', 'profile-123', 'sent');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['sent']),
      );
    });

    it('should accept read status', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await messageRepository.updateMessageStatus('msg-123', 'profile-123', 'read');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['read']),
      );
    });

    it('should throw on database error', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('Update failed'));

      await expect(
        messageRepository.updateMessageStatus('msg-123', 'profile-123', 'delivered'),
      ).rejects.toThrow('Update failed');
    });
  });

  // ============================================================
  // GET FAILED MESSAGES TESTS
  // ============================================================

  describe('getFailedMessages', () => {
    it('should get failed messages with profileId isolation', async () => {
      const failedMessages = [
        { id: 'msg-1', interaction_id: 'int-1', content: 'Failed 1', created_at: '2024-01-01', status: 'failed' },
        { id: 'msg-2', interaction_id: 'int-1', content: 'Failed 2', created_at: '2024-01-02', status: 'failed' },
      ];
      mockDb.getAllAsync.mockResolvedValue(failedMessages);

      const result = await messageRepository.getFailedMessages('profile-123');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("WHERE status = 'failed' AND profile_id = ?"),
        ['profile-123'],
      );
      expect(result).toHaveLength(2);
    });

    it('should limit to 50 messages', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await messageRepository.getFailedMessages('profile-123');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 50'),
        expect.any(Array),
      );
    });

    it('should return empty array on error', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('DB Error'));

      const result = await messageRepository.getFailedMessages('profile-123');

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // CLEANUP DUPLICATE MESSAGES TESTS
  // ============================================================

  describe('cleanupDuplicateMessages', () => {
    it('should return 0 when SQLite not available', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(false);

      const result = await messageRepository.cleanupDuplicateMessages('int-1', 'profile-123');

      expect(result).toBe(0);
    });

    it('should return 0 when no duplicates found', async () => {
      mockStatement.executeAsync.mockResolvedValue({
        getAllAsync: jest.fn().mockResolvedValue([
          { id: 'msg-1', interaction_id: 'int-1', created_at: '2024-01-01' },
          { id: 'msg-2', interaction_id: 'int-1', created_at: '2024-01-02' },
        ]),
      });

      const result = await messageRepository.cleanupDuplicateMessages('int-1', 'profile-123');

      expect(result).toBe(0);
    });

    it('should prefer non-optimistic messages when cleaning duplicates', async () => {
      const duplicates = [
        { id: 'msg-1', interaction_id: 'int-1', created_at: '2024-01-01', metadata: JSON.stringify({ isOptimistic: true }) },
        { id: 'msg-1', interaction_id: 'int-1', created_at: '2024-01-02', metadata: JSON.stringify({ isOptimistic: false }) },
      ];
      mockStatement.executeAsync.mockResolvedValue({
        getAllAsync: jest.fn().mockResolvedValue(duplicates),
      });
      mockDb.getFirstAsync.mockResolvedValue({ id: 'int-1' });
      mockDb.runAsync.mockResolvedValue(undefined);

      const result = await messageRepository.cleanupDuplicateMessages('int-1', 'profile-123');

      expect(result).toBe(1); // Cleaned 1 duplicate
    });
  });

  // ============================================================
  // SYNC MESSAGES FROM REMOTE TESTS
  // ============================================================

  describe('syncMessagesFromRemote', () => {
    it('should fetch and upsert remote messages', async () => {
      const remoteMessages = [
        { id: 'msg-1', interaction_id: 'int-1', sender_entity_id: 'ent-1', content: 'Remote', created_at: '2024-01-01' },
      ];
      const fetchRemote = jest.fn().mockResolvedValue(remoteMessages);
      mockDb.runAsync.mockResolvedValue(undefined);

      await messageRepository.syncMessagesFromRemote(fetchRemote, 'profile-123');

      expect(fetchRemote).toHaveBeenCalled();
      expect(mockDb.runAsync).toHaveBeenCalled();
    });

    it('should emit data_updated event after sync', async () => {
      const remoteMessages = [
        { id: 'msg-1', interaction_id: 'int-1', sender_entity_id: 'ent-1', content: 'Remote', created_at: '2024-01-01' },
      ];
      const fetchRemote = jest.fn().mockResolvedValue(remoteMessages);
      mockDb.runAsync.mockResolvedValue(undefined);

      await messageRepository.syncMessagesFromRemote(fetchRemote, 'profile-123');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('data_updated', {
        type: 'messages',
        data: remoteMessages,
        profileId: 'profile-123',
      });
    });

    it('should handle empty remote messages', async () => {
      const fetchRemote = jest.fn().mockResolvedValue([]);

      await messageRepository.syncMessagesFromRemote(fetchRemote, 'profile-123');

      // Should still emit event with empty array
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      const fetchRemote = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(messageRepository.syncMessagesFromRemote(fetchRemote, 'profile-123')).resolves.not.toThrow();
    });
  });

  // ============================================================
  // PROFILE ISOLATION TESTS
  // ============================================================

  describe('profile isolation', () => {
    it('should include profileId in all read operations', async () => {
      mockStatement.executeAsync.mockResolvedValue({ getAllAsync: jest.fn().mockResolvedValue([]) });
      mockDb.getFirstAsync.mockResolvedValue(null);
      mockDb.getAllAsync.mockResolvedValue([]);

      await messageRepository.getMessagesForInteraction('int-1', 'profile-A');
      await messageRepository.hasLocalMessages('int-1', 'profile-B');
      await messageRepository.getLatestMessageForInteraction('int-1', 'profile-C');
      await messageRepository.getFailedMessages('profile-D');

      // All operations should use their respective profileIds
      expect(mockStatement.executeAsync).toHaveBeenCalledWith('int-1', 'profile-A', expect.any(Number));
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(['profile-C']));
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(expect.any(String), ['profile-D']);
    });

    it('should include profileId in all write operations', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue({ id: 'int-1' });

      await messageRepository.upsertMessage(
        { id: 'msg-1', interaction_id: 'int-1', sender_entity_id: 'ent-1', content: 'Test', created_at: '2024-01-01' },
        'profile-A',
      );
      await messageRepository.deleteMessage('msg-2', 'profile-B');
      await messageRepository.updateMessageStatus('msg-3', 'profile-C', 'read');

      expect(mockDb.runAsync).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(['profile-A']));
      expect(mockDb.runAsync).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(['profile-B']));
      expect(mockDb.runAsync).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(['profile-C']));
    });
  });
});
