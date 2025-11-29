// Updated: Align with db.ts using new async API, fixed logger calls - 2025-05-19
// Updated: Add deduplication mechanism to prevent duplicate message insertions - 2025-05-20
// Updated: Completely refactored to use centralized DatabaseManager - 2025-05-29
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import logger from '../utils/logger';
import { TimelineItem, MessageTimelineItem } from '../types/timeline.types';
import { databaseManager } from './DatabaseManager';
import { eventEmitter } from '../utils/eventEmitter';

// Message repository interface for database operations
interface DatabaseMessage {
  id: string;
  interaction_id: string;
  sender_entity_id: string;
  content: string;
  message_type?: string;
  created_at: string;
  metadata?: any;
}

/**
 * Professional message repository using centralized database management
 */
export class MessageRepository {
  private static instance: MessageRepository;

  public static getInstance(): MessageRepository {
    if (!MessageRepository.instance) {
      MessageRepository.instance = new MessageRepository();
    }
    return MessageRepository.instance;
  }

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get database instance with proper error handling
   */
  private async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    const isReady = await databaseManager.initialize();
    if (!isReady) {
      throw new Error('Database initialization failed');
    }
    
    const db = databaseManager.getDatabase();
    if (!db) {
      throw new Error('Database instance not available');
    }
    
    return db;
  }

  /**
   * Check if SQLite is available in the current environment
   */
  public async isSQLiteAvailable(): Promise<boolean> {
    try {
      await this.getDatabase();
      const available = databaseManager.isDatabaseReady();
      logger.debug(`[MessageRepository] Database ready: ${available}`);
      
      if (Platform.OS === 'web') {
        logger.debug('[MessageRepository] Platform is web, SQLite not supported');
        return false;
      }
      
      return available;
    } catch (error) {
      logger.debug('[MessageRepository] Database not available:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Get messages for an interaction (PROFILE-ISOLATED)
   */
  public async getMessagesForInteraction(interactionId: string, profileId: string, limit = 100): Promise<MessageTimelineItem[]> {
    logger.debug(`[MessageRepository] Getting messages for interaction: ${interactionId}, profileId: ${profileId}, limit: ${limit}`);

    if (!(await this.isSQLiteAvailable())) {
      logger.warn(`[MessageRepository] SQLite not available, returning empty array for: ${interactionId}`);
      return [];
    }

    try {
      const db = await this.getDatabase();
      const statement = await db.prepareAsync(
        'SELECT * FROM messages WHERE interaction_id = ? AND profile_id = ? ORDER BY created_at DESC LIMIT ?'
      );

      const result = await statement.executeAsync(interactionId, profileId, limit);
      const rows = await result.getAllAsync() as Record<string, any>[];
      await statement.finalizeAsync();
      
      if (!Array.isArray(rows)) {
        logger.error(`[MessageRepository] Invalid database response: ${typeof rows}`);
        return [];
      }
      
      const messages: MessageTimelineItem[] = rows.map((row: Record<string, any>) => ({
        id: String(row.id),
        interaction_id: String(row.interaction_id),
        itemType: 'message',
        type: 'message',
        sender_entity_id: row.sender_entity_id ? String(row.sender_entity_id) : 'system_or_unknown',
        content: row.content || '',
        message_type: row.message_type || 'text',
        timestamp: typeof row.created_at === 'number' ? new Date(row.created_at).toISOString() : String(row.created_at),
        createdAt: typeof row.created_at === 'number' ? new Date(row.created_at).toISOString() : String(row.created_at),
        metadata: typeof row.metadata === 'string' && row.metadata ? JSON.parse(row.metadata) : (row.metadata || {})
      }));
      
      logger.info(`[MessageRepository] Successfully retrieved ${messages.length} messages for: ${interactionId}`);
      return messages;
      
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[MessageRepository] Error getting messages for ${interactionId}: ${errMessage}`);
      return [];
    }
  }

  /**
   * Save a batch of messages with deduplication (PROFILE-ISOLATED)
   */
  public async saveMessages(messagesToSave: MessageTimelineItem[], profileId: string): Promise<void> {
    logger.debug(`[MessageRepository] Saving ${messagesToSave?.length || 0} messages (profileId: ${profileId})`);

    if (!(await this.isSQLiteAvailable())) {
      logger.warn('[MessageRepository] SQLite not available, aborting save');
      return;
    }

    if (!messagesToSave || messagesToSave.length === 0) {
      logger.debug('[MessageRepository] No messages to save');
      return;
    }

    // Deduplicate messages by ID
    const uniqueMessages = new Map<string, MessageTimelineItem>();
    messagesToSave.forEach(msg => {
      if (msg.id && msg.interaction_id) {
        if (!uniqueMessages.has(msg.id)) {
          uniqueMessages.set(msg.id, msg);
        } else {
          logger.debug(`[MessageRepository] Skipping duplicate message: ${msg.id}`);
        }
      }
    });

    const deduplicatedMessages = Array.from(uniqueMessages.values());
    logger.info(`[MessageRepository] Deduplication removed ${messagesToSave.length - deduplicatedMessages.length} duplicates`);

    let successfulSaves = 0;
    let failedSaves = 0;

    try {
      const db = await this.getDatabase();

      for (const msg of deduplicatedMessages) {
        if (!msg.id || !msg.interaction_id) {
          logger.warn(`[MessageRepository] Skipping message with missing ID or interaction_id: ${msg.id || 'N/A'}`);
          failedSaves++;
          continue;
        }

        try {
          await this.insertMessage(db, {
            id: msg.id,
            interaction_id: msg.interaction_id,
            sender_entity_id: msg.sender_entity_id || 'system_or_unknown',
            content: msg.content || '',
            message_type: msg.message_type,
            created_at: typeof msg.timestamp === 'string' ? msg.timestamp : (msg.createdAt ? String(msg.createdAt) : new Date().toISOString()),
            metadata: msg.metadata
          }, profileId);
          successfulSaves++;
        } catch (insertError) {
          logger.warn(`[MessageRepository] Failed to save message ${msg.id}: ${insertError instanceof Error ? insertError.message : String(insertError)}`);
          failedSaves++;
        }
      }

      logger.info(`[MessageRepository] Save complete (profileId: ${profileId}). Successful: ${successfulSaves}, Failed: ${failedSaves}`);

    } catch (error) {
      logger.error(`[MessageRepository] Error during batch save: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if we have local messages for an interaction (PROFILE-ISOLATED)
   */
  public async hasLocalMessages(interactionId: string, profileId: string): Promise<boolean> {
    logger.debug(`[MessageRepository] Checking for local messages: ${interactionId} (profileId: ${profileId})`);

    if (!(await this.isSQLiteAvailable())) {
      logger.warn(`[MessageRepository] SQLite not available for hasLocalMessages: ${interactionId}`);
      return false;
    }

    try {
      const messages = await this.getMessagesForInteraction(interactionId, profileId, 1);
      const found = messages.length > 0;
      logger.info(`[MessageRepository] Local messages for ${interactionId} (profileId: ${profileId}): ${found ? 'FOUND' : 'NOT FOUND'}`);
      return found;
    } catch (error) {
      logger.error(`[MessageRepository] Error checking local messages for ${interactionId}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Clean up duplicate messages for an interaction (PROFILE-ISOLATED)
   */
  public async cleanupDuplicateMessages(interactionId: string, profileId: string): Promise<number> {
    logger.debug(`[MessageRepository] Cleaning up duplicates for: ${interactionId} (profileId: ${profileId})`);

    if (!(await this.isSQLiteAvailable())) {
      logger.warn(`[MessageRepository] SQLite not available for cleanup: ${interactionId}`);
      return 0;
    }

    try {
      const messages = await this.getMessagesForInteraction(interactionId, profileId, 1000);
      logger.debug(`[MessageRepository] Found ${messages.length} messages to check for duplicates`);
      
      if (messages.length <= 1) {
        logger.debug(`[MessageRepository] No duplicates to clean (${messages.length} messages)`);
        return 0;
      }
      
      // Group messages by ID to find duplicates
      const messagesById = new Map<string, MessageTimelineItem[]>();
      messages.forEach(msg => {
        if (!messagesById.has(msg.id)) {
          messagesById.set(msg.id, []);
        }
        messagesById.get(msg.id)!.push(msg);
      });
      
      // Find duplicate IDs
      const duplicateIds = Array.from(messagesById.entries())
        .filter(([_, msgs]) => msgs.length > 1)
        .map(([id, _]) => id);
      
      logger.debug(`[MessageRepository] Found ${duplicateIds.length} message IDs with duplicates`);
      
      if (duplicateIds.length === 0) {
        return 0;
      }
      
      let deletedCount = 0;
      const db = await this.getDatabase();
      
      for (const msgId of duplicateIds) {
        const duplicates = messagesById.get(msgId)!;
        
        // Find the best message (non-optimistic, most recent)
        let bestMessage = duplicates[0];
        for (const msg of duplicates) {
          if (!msg.metadata?.isOptimistic && bestMessage.metadata?.isOptimistic) {
            bestMessage = msg;
          } else if (
            (!msg.metadata?.isOptimistic && !bestMessage.metadata?.isOptimistic) ||
            (msg.metadata?.isOptimistic && bestMessage.metadata?.isOptimistic)
          ) {
            const msgCreatedAt = new Date(msg.createdAt || 0).getTime();
            const bestCreatedAt = new Date(bestMessage.createdAt || 0).getTime();
            if (msgCreatedAt > bestCreatedAt) {
              bestMessage = msg;
            }
          }
        }
        
        try {
          // Re-insert the best message (replaces all duplicates)
          await this.insertMessage(db, {
            id: bestMessage.id,
            interaction_id: bestMessage.interaction_id,
            sender_entity_id: bestMessage.sender_entity_id || 'system_or_unknown',
            content: bestMessage.content || '',
            message_type: bestMessage.message_type,
            created_at: typeof bestMessage.timestamp === 'string' ? bestMessage.timestamp :
              (bestMessage.createdAt ? String(bestMessage.createdAt) : new Date().toISOString()),
            metadata: bestMessage.metadata
          }, profileId);

          deletedCount += duplicates.length - 1;
        } catch (error) {
          logger.warn(`[MessageRepository] Error cleaning duplicate ${msgId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      logger.info(`[MessageRepository] Cleaned up ${deletedCount} duplicate messages for: ${interactionId}`);
      return deletedCount;
      
    } catch (error) {
      logger.error(`[MessageRepository] Error during cleanup for ${interactionId}: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  /**
   * Ensure interaction exists in local database before saving messages
   */
  private async ensureInteractionExists(db: SQLite.SQLiteDatabase, interactionId: string): Promise<void> {
    try {
      // Check if interaction already exists
      const existingInteraction = await db.getFirstAsync(
        'SELECT id FROM interactions WHERE id = ?',
        [interactionId]
      );

      if (!existingInteraction) {
        // Create a minimal interaction record with required fields
        await db.runAsync(
          `INSERT OR IGNORE INTO interactions (
            id, name, is_group, created_by_entity_id, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            interactionId,
            'Unknown Interaction', // Default name
            0, // Not a group by default
            'system', // Default created_by_entity_id (required field)
            1, // Active by default
            new Date().toISOString(),
            new Date().toISOString()
          ]
        );
        
        logger.debug(`[MessageRepository] Created minimal interaction record: ${interactionId}`);
      }
    } catch (error) {
      logger.error(`[MessageRepository] Error ensuring interaction exists: ${error}`, 'message_repository');
      throw error;
    }
  }

  /**
   * Insert a single message into the database (PROFILE-ISOLATED)
   */
  private async insertMessage(db: SQLite.SQLiteDatabase, message: DatabaseMessage, profileId: string): Promise<void> {
    // Ensure the interaction exists first
    await this.ensureInteractionExists(db, message.interaction_id);

    await db.runAsync(
      `INSERT OR REPLACE INTO messages (
        id, topic, extension, interaction_id, sender_entity_id, content, message_type, created_at, metadata, profile_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        'chat', // CRITICAL FIX: Provide default topic value
        'text', // CRITICAL FIX: Provide default extension value
        message.interaction_id,
        message.sender_entity_id,
        message.content,
        message.message_type || 'text',
        message.created_at,
        message.metadata ? JSON.stringify(message.metadata) : null,
        profileId
      ]
    );
  }

  /**
   * Add or update a message in local database (PROFILE-ISOLATED)
   */
  public async upsertMessage(message: DatabaseMessage, profileId: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db.runAsync(
        `INSERT OR REPLACE INTO messages (id, topic, extension, interaction_id, sender_entity_id, content, message_type, created_at, metadata, profile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          message.id,
          'chat', // CRITICAL FIX: Provide default topic value
          'text', // CRITICAL FIX: Provide default extension value
          message.interaction_id ?? '',
          message.sender_entity_id ?? '',
          message.content ?? '',
          message.message_type ?? '',
          message.created_at ?? '',
          JSON.stringify(message.metadata ?? {}),
          profileId
        ]
      );
      eventEmitter.emit('data_updated', { type: 'messages', data: message, profileId });
    } catch (error) {
      logger.error('[MessageRepository] Error upserting message:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Delete a message from local database (PROFILE-ISOLATED)
   */
  public async deleteMessage(id: string, profileId: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db.runAsync('DELETE FROM messages WHERE id = ? AND profile_id = ?', [id, profileId]);
      eventEmitter.emit('data_updated', { type: 'messages', data: { id, removed: true, profileId } });
    } catch (error) {
      logger.error('[MessageRepository] Error deleting message:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Background sync: fetch from remote, update local, emit event
   */
  /**
   * Get the latest message for a specific interaction (PROFILE-ISOLATED)
   * 🚀 PHASE 2.5: Message sync support
   */
  public async getLatestMessageForInteraction(interactionId: string, profileId: string): Promise<MessageTimelineItem | null> {
    try {
      const db = await this.getDatabase();
      logger.debug(`[MessageRepository] Getting latest message for interaction: ${interactionId} (profileId: ${profileId})`);

      const result = await db.getFirstAsync<any>(
        `SELECT * FROM messages
         WHERE interaction_id = ? AND profile_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [interactionId, profileId]
      );

      if (result) {
        const message: MessageTimelineItem = {
          id: result.id,
          interaction_id: result.interaction_id,
          type: 'message',
          itemType: 'message',
          content: result.content,
          message_type: result.message_type || 'text',
          sender_entity_id: result.sender_entity_id,
          createdAt: result.created_at,
          timestamp: result.created_at,
          metadata: result.metadata ? JSON.parse(result.metadata) : {},
          status: result.status || 'delivered'
        };

        logger.debug(`[MessageRepository] Latest message found: ${message.id}`);
        return message;
      }

      logger.debug(`[MessageRepository] No messages found for interaction: ${interactionId}`);
      return null;

    } catch (error) {
      logger.error(`[MessageRepository] Failed to get latest message for ${interactionId}:`, error);
      return null;
    }
  }

  /**
   * Update message delivery status (PROFILE-ISOLATED)
   * 🚀 PHASE 2.6: Delivery confirmation support
   */
  public async updateMessageStatus(messageId: string, profileId: string, status: 'sent' | 'delivered' | 'read'): Promise<void> {
    try {
      const db = await this.getDatabase();
      logger.debug(`[MessageRepository] Updating message status: ${messageId} -> ${status} (profileId: ${profileId})`);

      await db.runAsync(
        `UPDATE messages
         SET status = ?,
             updated_at = datetime('now')
         WHERE id = ? AND profile_id = ?`,
        [status, messageId, profileId]
      );

      logger.debug(`[MessageRepository] ✅ Message status updated: ${messageId} (profileId: ${profileId})`);

    } catch (error) {
      logger.error(`[MessageRepository] Failed to update message status for ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Get failed messages that need retry (PROFILE-ISOLATED)
   * 🚀 PHASE 2.5: Message reliability support
   */
  public async getFailedMessages(profileId: string): Promise<MessageTimelineItem[]> {
    try {
      const db = await this.getDatabase();
      logger.debug(`[MessageRepository] Getting failed messages for retry (profileId: ${profileId})`);

      const results = await db.getAllAsync<any>(
        `SELECT * FROM messages
         WHERE status = 'failed' AND profile_id = ?
         ORDER BY created_at DESC
         LIMIT 50`,
        [profileId]
      );

      const messages: MessageTimelineItem[] = results.map(result => ({
        id: result.id,
        interaction_id: result.interaction_id,
        type: 'message',
        itemType: 'message',
        content: result.content,
        message_type: result.message_type || 'text',
        sender_entity_id: result.sender_entity_id,
        createdAt: result.created_at,
        timestamp: result.created_at,
        metadata: result.metadata ? JSON.parse(result.metadata) : {},
        status: result.status || 'failed'
      }));

      logger.debug(`[MessageRepository] Found ${messages.length} failed messages`);
      return messages;

    } catch (error) {
      logger.error('[MessageRepository] Failed to get failed messages:', error);
      return [];
    }
  }

  public async syncMessagesFromRemote(fetchRemote: () => Promise<DatabaseMessage[]>, profileId: string): Promise<void> {
    try {
      const remoteMessages = await fetchRemote();
      for (const message of remoteMessages) {
        await this.upsertMessage(message, profileId);
      }
      eventEmitter.emit('data_updated', { type: 'messages', data: remoteMessages, profileId });
    } catch (error) {
      logger.error('[MessageRepository] Error syncing messages from remote:', error instanceof Error ? error.message : String(error));
    }
  }
}

// Export singleton instance
export const messageRepository = MessageRepository.getInstance();
export default messageRepository; 