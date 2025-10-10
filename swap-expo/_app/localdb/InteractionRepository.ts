// Updated: InteractionRepository with proper schema support - 2025-01-12

import * as SQLite from 'expo-sqlite';
import { databaseManager } from './DatabaseManager';
import { eventCoordinator } from '../utils/EventCoordinator';
import logger from '../utils/logger';

/**
 * Local interaction interface - matches Supabase schema
 */
export interface LocalInteraction {
  id: string;
  name?: string | null;
  is_group?: boolean;
  relationship_id?: string | null;
  created_by_entity_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  last_message_snippet?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
  icon_url?: string | null;
  metadata?: any;
}

/**
 * Local interaction member interface - matches Supabase schema
 */
export interface LocalInteractionMember {
  id?: string;
  interaction_id: string;
  entity_id: string;
  role: string;
  display_name?: string | null;
  avatar_url?: string | null;
  entity_type: string;
  joined_at?: string;
  last_read_at?: string;
}

/**
 * Repository for managing interactions in local SQLite database
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
   * Check if database is available
   */
  public async isDatabaseAvailable(): Promise<boolean> {
    try {
      await this.getDatabase();
      const available = databaseManager.isDatabaseReady();
      logger.debug(`[InteractionRepository] Database ready: ${available}`);
      return available;
    } catch (error) {
      logger.debug('[InteractionRepository] Database not available:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Generate a UUID for interaction members
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
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
          id, name, is_group, relationship_id, created_by_entity_id, is_active,
          created_at, updated_at, last_message_snippet, last_message_at, 
          unread_count, icon_url, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      await statement.executeAsync(
        interaction.id,
        interaction.name || null,
        interaction.is_group ? 1 : 0,
        interaction.relationship_id || null,
        interaction.created_by_entity_id || 'unknown', // Provide default to avoid NOT NULL constraint
        interaction.is_active !== undefined ? (interaction.is_active ? 1 : 0) : 1,
        interaction.created_at || new Date().toISOString(),
        interaction.updated_at || new Date().toISOString(),
        interaction.last_message_snippet || null,
        interaction.last_message_at || null,
        interaction.unread_count || 0,
        interaction.icon_url || null,
        interaction.metadata ? JSON.stringify(interaction.metadata) : null
      );
      
      await statement.finalizeAsync();
      logger.debug(`[InteractionRepository] Saved interaction: ${interaction.id}`);
      await eventCoordinator.emitDataUpdated('user', interaction, { source: 'InteractionRepository' });
      
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
        `INSERT OR REPLACE INTO interactions (
          id, name, is_group, relationship_id, created_by_entity_id, is_active,
          created_at, updated_at, last_message_snippet, last_message_at, 
          unread_count, icon_url, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          interaction.id,
          interaction.name ?? null,
          interaction.is_group ? 1 : 0,
          interaction.relationship_id ?? null,
          interaction.created_by_entity_id ?? 'unknown', // Provide default to avoid NOT NULL constraint
          interaction.is_active !== undefined ? (interaction.is_active ? 1 : 0) : 1,
          interaction.created_at ?? new Date().toISOString(),
          interaction.updated_at ?? new Date().toISOString(),
          interaction.last_message_snippet ?? null,
          interaction.last_message_at ?? null,
          interaction.unread_count ?? 0,
          interaction.icon_url ?? null,
          JSON.stringify(interaction.metadata ?? {})
        ]
      );
      await eventCoordinator.emitDataUpdated('user', interaction, { source: 'InteractionRepository' });
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
      await eventCoordinator.emitDataUpdated('user', { id, removed: true }, { source: 'InteractionRepository.delete' });
    } catch (error) {
      logger.error('[InteractionRepository] Error deleting interaction:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Delete multiple interactions by IDs (for sync reconciliation - Option B pattern)
   * Called when backend indicates interactions were deleted
   *
   * @param ids - Array of interaction IDs to delete
   */
  public async deleteInteractions(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) {
      logger.debug('[InteractionRepository] No interaction IDs to delete');
      return;
    }

    logger.debug(`[InteractionRepository] Deleting ${ids.length} interactions from sync`);

    if (!(await this.isDatabaseAvailable())) {
      logger.warn('[InteractionRepository] Database not available for deleteInteractions');
      return;
    }

    try {
      const db = await this.getDatabase();

      for (const id of ids) {
        // Delete members first (foreign key constraint)
        await db.runAsync('DELETE FROM interaction_members WHERE interaction_id = ?', [id]);
        logger.debug(`[InteractionRepository] Deleted members for interaction: ${id}`);

        // Delete interaction
        await db.runAsync('DELETE FROM interactions WHERE id = ?', [id]);
        logger.debug(`[InteractionRepository] Deleted interaction: ${id}`);
      }

      logger.info(`[InteractionRepository] ✅ Deleted ${ids.length} interactions from sync reconciliation`);
      await eventCoordinator.emitDataUpdated('user', { deletedIds: ids }, { source: 'InteractionRepository.deleteInteractions' });

    } catch (error) {
      logger.error('[InteractionRepository] Error deleting interactions:', error instanceof Error ? error.message : String(error));
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
      await eventCoordinator.emitDataUpdated('user', remoteInteractions, { source: 'InteractionRepository.sync' });
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
            id, interaction_id, entity_id, role, display_name, 
            avatar_url, entity_type, joined_at, last_read_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        await statement.executeAsync(
          member.id || this.generateUUID(), // Generate ID if not provided
          member.interaction_id,
          member.entity_id,
          member.role,
          member.display_name || null,
          member.avatar_url || null,
          member.entity_type,
          member.joined_at || new Date().toISOString(),
          member.last_read_at || new Date().toISOString()
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
      
      logger.info(`[InteractionRepository] Retrieved ${result.length} interactions with members`);
      return result;
      
    } catch (error) {
      logger.error('[InteractionRepository] Error getting interactions with members:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Check if we have any local interactions
   */
  public async hasLocalInteractions(): Promise<boolean> {
    logger.debug('[InteractionRepository] Checking for local interactions');
    
    if (!(await this.isDatabaseAvailable())) {
      logger.warn('[InteractionRepository] Database not available for hasLocalInteractions');
      return false;
    }
    
    try {
      const db = await this.getDatabase();
      const statement = await db.prepareAsync('SELECT COUNT(*) as count FROM interactions');
      const result = await statement.executeAsync();
      const row = await result.getFirstAsync() as { count: number };
      await statement.finalizeAsync();
      
      const hasInteractions = row.count > 0;
      logger.debug(`[InteractionRepository] Has local interactions: ${hasInteractions} (count: ${row.count})`);
      return hasInteractions;
      
    } catch (error) {
      logger.error('[InteractionRepository] Error checking for local interactions:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Update interaction's last message info
   */
  public async updateInteractionLastMessage(
    interactionId: string, 
    messageSnippet: string, 
    messageTimestamp: string
  ): Promise<void> {
    logger.debug(`[InteractionRepository] Updating last message for interaction: ${interactionId}`);
    
    if (!(await this.isDatabaseAvailable())) {
      logger.warn('[InteractionRepository] Database not available for updateInteractionLastMessage');
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