// Created: Local SQLite interaction storage for offline capability - 2025-05-22
// Updated: Completely refactored to use centralized DatabaseManager - 2025-05-29
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import logger from '../utils/logger';
import { databaseManager } from './DatabaseManager';
import { eventEmitter } from '../utils/eventEmitter';

/**
 * Interaction object for SQLite storage
 */
export interface LocalInteraction {
  id: string;
  name?: string | null;
  is_group?: boolean;
  updated_at?: string;
  last_message_snippet?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
  icon_url?: string | null;
  metadata?: any;
}

/**
 * Interaction member object for SQLite storage
 */
export interface LocalInteractionMember {
  interaction_id: string;
  entity_id: string;
  role: string;
  display_name?: string | null;
  avatar_url?: string | null;
  entity_type: string;
  joined_at?: string;
}

/**
 * Professional interaction repository using centralized database management
 */
export class InteractionRepository {
  private static instance: InteractionRepository;

  public static getInstance(): InteractionRepository {
    if (!InteractionRepository.instance) {
      InteractionRepository.instance = new InteractionRepository();
    }
    return InteractionRepository.instance;
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
  public async isDatabaseAvailable(): Promise<boolean> {
    try {
      await this.getDatabase();
      const available = databaseManager.isDatabaseReady();
      logger.debug(`[InteractionRepository] Database ready: ${available}`);
      
      if (Platform.OS === 'web') {
        logger.debug('[InteractionRepository] Platform is web, SQLite not supported');
        return false;
      }
      
      return available;
    } catch (error) {
      logger.debug('[InteractionRepository] Database not available:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Save multiple interactions to local database
   */
  public async saveInteractions(interactions: LocalInteraction[]): Promise<void> {
    if (!interactions || interactions.length === 0) {
      logger.debug('[InteractionRepository] No interactions to save');
      return;
    }
    
    logger.debug(`[InteractionRepository] Saving ${interactions.length} interactions`);
    
    if (!(await this.isDatabaseAvailable())) {
      logger.warn('[InteractionRepository] Database not available for saveInteractions');
      return;
    }
    
    try {
      for (const interaction of interactions) {
        await this.insertInteraction(interaction);
      }
      logger.info(`[InteractionRepository] Successfully saved ${interactions.length} interactions`);
    } catch (error) {
      logger.error('[InteractionRepository] Error saving interactions:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Insert or update a single interaction
   */
  public async insertInteraction(interaction: LocalInteraction): Promise<void> {
    if (!(await this.isDatabaseAvailable())) {
      logger.warn('[InteractionRepository] Database not available for insertInteraction');
      return;
    }
    
    if (!interaction || !interaction.id) {
      logger.warn('[InteractionRepository] Invalid interaction object:', JSON.stringify(interaction));
      return;
    }
    
    try {
      const db = await this.getDatabase();
      const statement = await db.prepareAsync(`
        INSERT OR REPLACE INTO interactions (
          id, name, is_group, updated_at, last_message_snippet, 
          last_message_at, unread_count, icon_url, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      await statement.executeAsync(
        interaction.id,
        interaction.name || null,
        interaction.is_group ? 1 : 0,
        interaction.updated_at || new Date().toISOString(),
        interaction.last_message_snippet || null,
        interaction.last_message_at || null,
        interaction.unread_count || 0,
        interaction.icon_url || null,
        interaction.metadata ? JSON.stringify(interaction.metadata) : null
      );
      
      await statement.finalizeAsync();
      logger.debug(`[InteractionRepository] Saved interaction: ${interaction.id}`);
      eventEmitter.emit('data_updated', { type: 'interactions', data: interaction });
      
    } catch (error) {
      logger.error(`[InteractionRepository] Error inserting interaction ${interaction.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add or update an interaction in local database
   */
  public async upsertInteraction(interaction: LocalInteraction): Promise<void> {
    if (!(await this.isDatabaseAvailable())) return;
    try {
      const db = await this.getDatabase();
      await db.runAsync(
        `INSERT OR REPLACE INTO interactions (id, name, is_group, updated_at, last_message_snippet, last_message_at, unread_count, icon_url, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          interaction.id,
          interaction.name ?? '',
          interaction.is_group ?? false,
          interaction.updated_at ?? '',
          interaction.last_message_snippet ?? '',
          interaction.last_message_at ?? '',
          interaction.unread_count ?? 0,
          interaction.icon_url ?? '',
          JSON.stringify(interaction.metadata ?? {})
        ]
      );
      eventEmitter.emit('data_updated', { type: 'interactions', data: interaction });
    } catch (error) {
      logger.error('[InteractionRepository] Error upserting interaction:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Delete an interaction from local database
   */
  public async deleteInteraction(id: string): Promise<void> {
    if (!(await this.isDatabaseAvailable())) return;
    try {
      const db = await this.getDatabase();
      await db.runAsync('DELETE FROM interactions WHERE id = ?', [id]);
      eventEmitter.emit('data_updated', { type: 'interactions', data: { id, removed: true } });
    } catch (error) {
      logger.error('[InteractionRepository] Error deleting interaction:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Background sync: fetch from remote, update local, emit event
   */
  public async syncInteractionsFromRemote(fetchRemote: () => Promise<LocalInteraction[]>): Promise<void> {
    if (!(await this.isDatabaseAvailable())) return;
    try {
      const remoteInteractions = await fetchRemote();
      for (const interaction of remoteInteractions) {
        await this.upsertInteraction(interaction);
      }
      eventEmitter.emit('data_updated', { type: 'interactions', data: remoteInteractions });
    } catch (error) {
      logger.error('[InteractionRepository] Error syncing interactions from remote:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Save interaction members to local database
   */
  public async saveInteractionMembers(members: LocalInteractionMember[]): Promise<void> {
    if (!members || members.length === 0) {
      logger.debug('[InteractionRepository] No interaction members to save');
      return;
    }
    
    logger.debug(`[InteractionRepository] Saving ${members.length} interaction members`);
    
    if (!(await this.isDatabaseAvailable())) {
      logger.warn('[InteractionRepository] Database not available for saveInteractionMembers');
      return;
    }
    
    try {
      const db = await this.getDatabase();
      
      for (const member of members) {
        const statement = await db.prepareAsync(`
          INSERT OR REPLACE INTO interaction_members (
            interaction_id, entity_id, role, display_name, 
            avatar_url, entity_type, joined_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        await statement.executeAsync(
          member.interaction_id,
          member.entity_id,
          member.role,
          member.display_name || null,
          member.avatar_url || null,
          member.entity_type,
          member.joined_at || new Date().toISOString()
        );
        
        await statement.finalizeAsync();
      }
      
      logger.info(`[InteractionRepository] Successfully saved ${members.length} interaction members`);
      
    } catch (error) {
      logger.error('[InteractionRepository] Error saving interaction members:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Get interactions from local database
   */
  public async getInteractions(limit = 100): Promise<LocalInteraction[]> {
    logger.debug(`[InteractionRepository] Getting interactions, limit: ${limit}`);
    
    if (!(await this.isDatabaseAvailable())) {
      logger.warn('[InteractionRepository] Database not available for getInteractions');
      return [];
    }
    
    try {
      const db = await this.getDatabase();
      const statement = await db.prepareAsync(`
        SELECT * FROM interactions
        ORDER BY datetime(last_message_at) DESC, datetime(updated_at) DESC
        LIMIT ?
      `);
      
      const result = await statement.executeAsync(limit);
      const results = await result.getAllAsync() as LocalInteraction[];
      await statement.finalizeAsync();
      
      logger.info(`[InteractionRepository] Retrieved ${results.length} interactions`);
      return results || [];
      
    } catch (error) {
      logger.error('[InteractionRepository] Error getting interactions:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Get interaction members for a specific interaction
   */
  public async getInteractionMembers(interactionId: string): Promise<LocalInteractionMember[]> {
    logger.debug(`[InteractionRepository] Getting members for interaction: ${interactionId}`);
    
    if (!(await this.isDatabaseAvailable())) {
      logger.warn('[InteractionRepository] Database not available for getInteractionMembers');
      return [];
    }
    
    try {
      const db = await this.getDatabase();
      const statement = await db.prepareAsync(`
        SELECT * FROM interaction_members
        WHERE interaction_id = ?
      `);
      
      const result = await statement.executeAsync(interactionId);
      const results = await result.getAllAsync() as LocalInteractionMember[];
      await statement.finalizeAsync();
      
      logger.info(`[InteractionRepository] Retrieved ${results.length} members for interaction: ${interactionId}`);
      return results || [];
      
    } catch (error) {
      logger.error(`[InteractionRepository] Error getting members for interaction ${interactionId}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * OPTIMIZED: Get interactions with their members in a single query to prevent visual glitches
   * This prevents the "magazine sliding" effect by loading all data at once
   */
  public async getInteractionsWithMembers(limit = 100): Promise<Array<LocalInteraction & { members: LocalInteractionMember[] }>> {
    logger.debug(`[InteractionRepository] Getting interactions with members, limit: ${limit}`);
    
    if (!(await this.isDatabaseAvailable())) {
      logger.warn('[InteractionRepository] Database not available for getInteractionsWithMembers');
      return [];
    }
    
    try {
      const db = await this.getDatabase();
      
      // First, get all interactions
      const interactionsStatement = await db.prepareAsync(`
        SELECT * FROM interactions
        ORDER BY datetime(last_message_at) DESC, datetime(updated_at) DESC
        LIMIT ?
      `);
      
      const interactionsResult = await interactionsStatement.executeAsync(limit);
      const interactions = await interactionsResult.getAllAsync() as LocalInteraction[];
      await interactionsStatement.finalizeAsync();
      
      if (interactions.length === 0) {
        logger.info('[InteractionRepository] No interactions found');
        return [];
      }
      
      // Get all interaction IDs for member lookup
      const interactionIds = interactions.map(i => i.id);
      const placeholders = interactionIds.map(() => '?').join(',');
      
      // Get all members for these interactions in a single query
      const membersStatement = await db.prepareAsync(`
        SELECT * FROM interaction_members
        WHERE interaction_id IN (${placeholders})
        ORDER BY interaction_id, entity_id
      `);
      
      const membersResult = await membersStatement.executeAsync(...interactionIds);
      const allMembers = await membersResult.getAllAsync() as LocalInteractionMember[];
      await membersStatement.finalizeAsync();
      
      // Group members by interaction_id
      const membersByInteraction = new Map<string, LocalInteractionMember[]>();
      allMembers.forEach(member => {
        if (!membersByInteraction.has(member.interaction_id)) {
          membersByInteraction.set(member.interaction_id, []);
        }
        membersByInteraction.get(member.interaction_id)!.push(member);
      });
      
      // Combine interactions with their members
      const result = interactions.map(interaction => ({
        ...interaction,
        members: membersByInteraction.get(interaction.id) || []
      }));
      
      logger.info(`[InteractionRepository] Retrieved ${result.length} interactions with members in single query`);
      return result;
      
    } catch (error) {
      logger.error('[InteractionRepository] Error getting interactions with members:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Check if interaction data exists locally
   */
  public async hasLocalInteractions(): Promise<boolean> {
    if (!(await this.isDatabaseAvailable())) {
      return false;
    }
    
    try {
      const db = await this.getDatabase();
      const statement = await db.prepareAsync('SELECT COUNT(*) as count FROM interactions');
      const result = await statement.executeAsync();
      const row = await result.getFirstAsync() as { count: number } | null;
      await statement.finalizeAsync();
      
      const count = row?.count ?? 0;
      logger.debug(`[InteractionRepository] Local interaction count: ${count}`);
      return count > 0;
      
    } catch (error) {
      logger.error('[InteractionRepository] Error checking for local interactions:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Update interaction's last message and timestamp
   */
  public async updateInteractionLastMessage(
    interactionId: string, 
    messageSnippet: string, 
    messageTimestamp: string
  ): Promise<void> {
    if (!(await this.isDatabaseAvailable()) || !interactionId) {
      logger.warn('[InteractionRepository] Database not available or missing interaction ID for updateInteractionLastMessage');
      return;
    }
    
    try {
      const db = await this.getDatabase();
      const statement = await db.prepareAsync(`
        UPDATE interactions
        SET last_message_snippet = ?, last_message_at = ?, updated_at = ?
        WHERE id = ?
      `);
      
      await statement.executeAsync(
        messageSnippet,
        messageTimestamp,
        new Date().toISOString(),
        interactionId
      );
      
      await statement.finalizeAsync();
      logger.debug(`[InteractionRepository] Updated last message for interaction: ${interactionId}`);
      
    } catch (error) {
      logger.error(`[InteractionRepository] Error updating last message for interaction ${interactionId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export singleton instance
export const interactionRepository = InteractionRepository.getInstance();
export default interactionRepository; 