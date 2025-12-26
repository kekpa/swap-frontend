// Created: UnifiedTimelineRepository for WhatsApp-grade local-first architecture - 2025-12-22
// ALIGNED WITH SUPABASE: messages, transaction_ledger, interaction_timeline, currencies
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import logger from '../utils/logger';
import { databaseManager } from './DatabaseManager';
import { eventEmitter } from '../utils/eventEmitter';
import {
  LocalTimelineItem,
  SyncStatus,
  MessageLocalStatus,
  TransactionLocalStatus,
} from './schema/local-timeline-schema';

// Event types for reactive updates
export type TimelineUpdateEvent = {
  interactionId: string;
  itemId: string;
  action: 'add' | 'update' | 'delete';
  profileId: string;
};

// Timeline event name
export const TIMELINE_UPDATED_EVENT = 'local_timeline:updated';

/**
 * UnifiedTimelineRepository - WhatsApp-grade local-first timeline
 *
 * KEY PRINCIPLES:
 * - SQLite is the SINGLE source of truth for UI
 * - All writes are INSTANT (no network wait)
 * - Emits events for reactive UI updates
 * - Background sync handles API calls
 * - Failed items stay visible (tap to retry)
 */
export class UnifiedTimelineRepository {
  private static instance: UnifiedTimelineRepository;

  public static getInstance(): UnifiedTimelineRepository {
    if (!UnifiedTimelineRepository.instance) {
      UnifiedTimelineRepository.instance = new UnifiedTimelineRepository();
    }
    return UnifiedTimelineRepository.instance;
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
   * Check if SQLite is available
   */
  public async isSQLiteAvailable(): Promise<boolean> {
    try {
      await this.getDatabase();
      const available = databaseManager.isDatabaseReady();

      if (Platform.OS === 'web') {
        logger.debug('[UnifiedTimelineRepository] Platform is web, SQLite not supported');
        return false;
      }

      return available;
    } catch (error) {
      logger.debug(
        '[UnifiedTimelineRepository] Database not available:',
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }

  // ============================================================================
  // WRITE OPERATIONS (INSTANT - for optimistic UI)
  // ============================================================================

  /**
   * Add item to local timeline - INSTANT
   * UI updates immediately via reactive query
   */
  public async addItem(item: LocalTimelineItem): Promise<void> {
    logger.debug(`[UnifiedTimelineRepository] Adding ${item.item_type} item: ${item.id}`);

    if (!(await this.isSQLiteAvailable())) {
      logger.warn('[UnifiedTimelineRepository] SQLite not available, cannot add item');
      throw new Error('SQLite not available');
    }

    try {
      const db = await this.getDatabase();

      await db.runAsync(
        `INSERT INTO local_timeline (
          id, server_id, interaction_id, profile_id, item_type, from_entity_id, to_entity_id, created_at,
          sync_status, local_status, retry_count, last_error,
          content, message_type,
          amount, currency_id, currency_code, currency_symbol, transaction_type,
          description, from_wallet_id, to_wallet_id,
          timeline_metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.server_id,
          item.interaction_id,
          item.profile_id,
          item.item_type,
          item.from_entity_id,
          item.to_entity_id,
          item.created_at,
          item.sync_status,
          item.local_status,
          item.retry_count || 0,
          item.last_error,
          item.content,
          item.message_type,
          item.amount,
          item.currency_id,
          item.currency_code,
          item.currency_symbol,
          item.transaction_type,
          item.description,
          item.from_wallet_id,
          item.to_wallet_id,
          item.timeline_metadata ? (typeof item.timeline_metadata === 'string' ? item.timeline_metadata : JSON.stringify(item.timeline_metadata)) : null,
        ]
      );

      logger.info(`[UnifiedTimelineRepository] ✅ Added ${item.item_type}: ${item.id}`);

      // Emit event for reactive updates
      eventEmitter.emit(TIMELINE_UPDATED_EVENT, {
        interactionId: item.interaction_id,
        itemId: item.id,
        action: 'add',
        profileId: item.profile_id,
      } as TimelineUpdateEvent);

    } catch (error) {
      logger.error(
        `[UnifiedTimelineRepository] ❌ Failed to add item ${item.id}:`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Update item sync status (called by background sync)
   */
  public async updateSyncStatus(
    itemId: string,
    syncStatus: SyncStatus,
    localStatus: string,
    serverId?: string,
    lastError?: string
  ): Promise<void> {
    logger.debug(`[UnifiedTimelineRepository] Updating status for ${itemId}: ${syncStatus}/${localStatus}`);

    if (!(await this.isSQLiteAvailable())) {
      logger.warn('[UnifiedTimelineRepository] SQLite not available, cannot update status');
      return;
    }

    try {
      const db = await this.getDatabase();

      await db.runAsync(
        `UPDATE local_timeline
         SET sync_status = ?, local_status = ?, server_id = COALESCE(?, server_id), last_error = ?
         WHERE id = ?`,
        [syncStatus, localStatus, serverId, lastError, itemId]
      );

      // Get the item to emit the correct event
      const item = await this.getItemById(itemId);

      if (item) {
        logger.info(`[UnifiedTimelineRepository] ✅ Updated ${itemId}: ${syncStatus}/${localStatus}`);

        eventEmitter.emit(TIMELINE_UPDATED_EVENT, {
          interactionId: item.interaction_id,
          itemId: item.id,
          action: 'update',
          profileId: item.profile_id,
        } as TimelineUpdateEvent);
      }

    } catch (error) {
      logger.error(
        `[UnifiedTimelineRepository] ❌ Failed to update status for ${itemId}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Increment retry count for failed item
   */
  public async incrementRetryCount(itemId: string): Promise<void> {
    logger.debug(`[UnifiedTimelineRepository] Incrementing retry count for ${itemId}`);

    if (!(await this.isSQLiteAvailable())) {
      return;
    }

    try {
      const db = await this.getDatabase();

      await db.runAsync(
        `UPDATE local_timeline SET retry_count = retry_count + 1 WHERE id = ?`,
        [itemId]
      );

    } catch (error) {
      logger.error(
        `[UnifiedTimelineRepository] ❌ Failed to increment retry count for ${itemId}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Delete item from timeline
   */
  public async deleteItem(itemId: string, profileId: string): Promise<void> {
    logger.debug(`[UnifiedTimelineRepository] Deleting item: ${itemId}`);

    if (!(await this.isSQLiteAvailable())) {
      return;
    }

    try {
      const db = await this.getDatabase();

      // Get the item first to emit the correct event
      const item = await this.getItemById(itemId);

      await db.runAsync(
        `DELETE FROM local_timeline WHERE id = ? AND profile_id = ?`,
        [itemId, profileId]
      );

      if (item) {
        eventEmitter.emit(TIMELINE_UPDATED_EVENT, {
          interactionId: item.interaction_id,
          itemId: itemId,
          action: 'delete',
          profileId: profileId,
        } as TimelineUpdateEvent);
      }

      logger.info(`[UnifiedTimelineRepository] ✅ Deleted item: ${itemId}`);

    } catch (error) {
      logger.error(
        `[UnifiedTimelineRepository] ❌ Failed to delete item ${itemId}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // ============================================================================
  // READ OPERATIONS (for reactive hooks)
  // ============================================================================

  /**
   * Get timeline for interaction - primary read method for UI
   */
  public async getTimeline(
    interactionId: string,
    profileId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<LocalTimelineItem[]> {
    logger.debug(
      `[UnifiedTimelineRepository] Getting timeline for interaction: ${interactionId}, limit: ${limit}, offset: ${offset}`
    );

    if (!(await this.isSQLiteAvailable())) {
      logger.warn('[UnifiedTimelineRepository] SQLite not available, returning empty array');
      return [];
    }

    try {
      const db = await this.getDatabase();

      const rows = await db.getAllAsync<Record<string, any>>(
        `SELECT * FROM local_timeline
         WHERE interaction_id = ? AND profile_id = ?
         ORDER BY created_at ASC
         LIMIT ? OFFSET ?`,
        [interactionId, profileId, limit, offset]
      );

      const items = this.mapRowsToItems(rows);
      logger.debug(`[UnifiedTimelineRepository] Found ${items.length} items for interaction: ${interactionId}`);

      return items;

    } catch (error) {
      logger.error(
        `[UnifiedTimelineRepository] ❌ Failed to get timeline for ${interactionId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Get single item by ID
   */
  public async getItemById(itemId: string): Promise<LocalTimelineItem | null> {
    if (!(await this.isSQLiteAvailable())) {
      return null;
    }

    try {
      const db = await this.getDatabase();

      const row = await db.getFirstAsync<Record<string, any>>(
        `SELECT * FROM local_timeline WHERE id = ?`,
        [itemId]
      );

      if (!row) {
        return null;
      }

      return this.mapRowToItem(row);

    } catch (error) {
      logger.error(
        `[UnifiedTimelineRepository] ❌ Failed to get item ${itemId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  /**
   * Get item by server ID (for matching API responses)
   */
  public async getItemByServerId(serverId: string): Promise<LocalTimelineItem | null> {
    if (!(await this.isSQLiteAvailable())) {
      return null;
    }

    try {
      const db = await this.getDatabase();

      const row = await db.getFirstAsync<Record<string, any>>(
        `SELECT * FROM local_timeline WHERE server_id = ?`,
        [serverId]
      );

      if (!row) {
        return null;
      }

      return this.mapRowToItem(row);

    } catch (error) {
      logger.error(
        `[UnifiedTimelineRepository] ❌ Failed to get item by server_id ${serverId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  // ============================================================================
  // SYNC OPERATIONS (for background sync service)
  // ============================================================================

  /**
   * Get pending items for sync (not yet sent to API)
   */
  public async getPendingItems(profileId: string): Promise<LocalTimelineItem[]> {
    logger.debug(`[UnifiedTimelineRepository] Getting pending items for profileId: ${profileId}`);

    if (!(await this.isSQLiteAvailable())) {
      return [];
    }

    try {
      const db = await this.getDatabase();

      const rows = await db.getAllAsync<Record<string, any>>(
        `SELECT * FROM local_timeline
         WHERE sync_status = 'pending' AND profile_id = ?
         ORDER BY created_at ASC`,
        [profileId]
      );

      const items = this.mapRowsToItems(rows);
      logger.debug(`[UnifiedTimelineRepository] Found ${items.length} pending items`);

      return items;

    } catch (error) {
      logger.error(
        '[UnifiedTimelineRepository] ❌ Failed to get pending items:',
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Get failed items for retry (with retry_count < 3)
   */
  public async getFailedItems(profileId: string, maxRetries: number = 3): Promise<LocalTimelineItem[]> {
    logger.debug(`[UnifiedTimelineRepository] Getting failed items for retry (profileId: ${profileId})`);

    if (!(await this.isSQLiteAvailable())) {
      return [];
    }

    try {
      const db = await this.getDatabase();

      const rows = await db.getAllAsync<Record<string, any>>(
        `SELECT * FROM local_timeline
         WHERE sync_status = 'failed' AND profile_id = ? AND retry_count < ?
         ORDER BY created_at ASC`,
        [profileId, maxRetries]
      );

      const items = this.mapRowsToItems(rows);
      logger.debug(`[UnifiedTimelineRepository] Found ${items.length} failed items for retry`);

      return items;

    } catch (error) {
      logger.error(
        '[UnifiedTimelineRepository] ❌ Failed to get failed items:',
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Get all items needing sync (pending or failed with retries left)
   */
  public async getItemsNeedingSync(profileId: string, maxRetries: number = 3): Promise<LocalTimelineItem[]> {
    logger.debug(`[UnifiedTimelineRepository] Getting items needing sync (profileId: ${profileId})`);

    if (!(await this.isSQLiteAvailable())) {
      return [];
    }

    try {
      const db = await this.getDatabase();

      const rows = await db.getAllAsync<Record<string, any>>(
        `SELECT * FROM local_timeline
         WHERE profile_id = ? AND (
           sync_status = 'pending'
           OR (sync_status = 'failed' AND retry_count < ?)
         )
         ORDER BY created_at ASC`,
        [profileId, maxRetries]
      );

      const items = this.mapRowsToItems(rows);
      logger.debug(`[UnifiedTimelineRepository] Found ${items.length} items needing sync`);

      return items;

    } catch (error) {
      logger.error(
        '[UnifiedTimelineRepository] ❌ Failed to get items needing sync:',
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  // ============================================================================
  // SYNC FROM SERVER (for merging API responses)
  // ============================================================================

  /**
   * Upsert item from server response (for incoming messages/transactions)
   */
  public async upsertFromServer(item: Partial<LocalTimelineItem> & { id: string }): Promise<void> {
    logger.debug(`[UnifiedTimelineRepository] Upserting from server: ${item.id}`);

    if (!(await this.isSQLiteAvailable())) {
      return;
    }

    try {
      const db = await this.getDatabase();

      // Check if we already have this item by server_id
      const existingByServerId = item.id ? await this.getItemByServerId(item.id) : null;

      // DUPLICATE PREVENTION: For transactions, also check by interaction_id + created_at
      // This catches duplicates when backend ID changed (e.g., DEBIT→CREDIT ID migration)
      let existingByTimestamp: LocalTimelineItem | null = null;
      if (!existingByServerId && item.item_type === 'transaction' && item.interaction_id && item.created_at) {
        // Normalize timestamp: extract just the date+time part (first 19 chars: YYYY-MM-DDTHH:MM:SS)
        const normalizedTimestamp = item.created_at.substring(0, 19);

        const rows = await db.getAllAsync<Record<string, any>>(
          `SELECT * FROM local_timeline
           WHERE interaction_id = ?
             AND item_type = 'transaction'
             AND created_at LIKE ?
           LIMIT 1`,
          [item.interaction_id, `${normalizedTimestamp}%`]
        );
        if (rows && rows.length > 0) {
          existingByTimestamp = this.mapRowToItem(rows[0]);
          logger.info(`[UnifiedTimelineRepository] 🔄 DUPLICATE PREVENTION: Found existing transaction by timestamp, merging: ${existingByTimestamp.id} → ${item.id}`);
        }
      }

      const existingItem = existingByServerId || existingByTimestamp;

      if (existingItem) {
        // Update existing item with ALL fields including wallet_ids
        // When merging duplicates (timestamp match), also update id and server_id to new values
        const shouldUpdateId = existingByTimestamp && !existingByServerId;

        await db.runAsync(
          `UPDATE local_timeline
           SET ${shouldUpdateId ? 'id = ?, server_id = ?,' : ''}
               sync_status = 'synced',
               item_type = COALESCE(?, item_type),
               local_status = COALESCE(?, local_status),
               content = COALESCE(?, content),
               amount = COALESCE(?, amount),
               currency_code = COALESCE(?, currency_code),
               currency_id = COALESCE(?, currency_id),
               currency_symbol = COALESCE(?, currency_symbol),
               from_entity_id = COALESCE(?, from_entity_id),
               to_entity_id = COALESCE(?, to_entity_id),
               from_wallet_id = COALESCE(?, from_wallet_id),
               to_wallet_id = COALESCE(?, to_wallet_id),
               transaction_type = COALESCE(?, transaction_type),
               description = COALESCE(?, description),
               timeline_metadata = COALESCE(?, timeline_metadata)
           WHERE id = ?`,
          shouldUpdateId ? [
            item.id,
            item.id,
            item.item_type,
            item.local_status,
            item.content,
            item.amount,
            item.currency_code,
            item.currency_id,
            item.currency_symbol,
            item.from_entity_id,
            item.to_entity_id,
            item.from_wallet_id,
            item.to_wallet_id,
            item.transaction_type,
            item.description,
            item.timeline_metadata ? JSON.stringify(item.timeline_metadata) : null,
            existingItem.id,
          ] : [
            item.item_type,
            item.local_status,
            item.content,
            item.amount,
            item.currency_code,
            item.currency_id,
            item.currency_symbol,
            item.from_entity_id,
            item.to_entity_id,
            item.from_wallet_id,
            item.to_wallet_id,
            item.transaction_type,
            item.description,
            item.timeline_metadata ? JSON.stringify(item.timeline_metadata) : null,
            existingItem.id,
          ]
        );

        eventEmitter.emit(TIMELINE_UPDATED_EVENT, {
          interactionId: existingItem.interaction_id,
          itemId: shouldUpdateId ? item.id : existingItem.id,
          action: 'update',
          profileId: existingItem.profile_id,
        } as TimelineUpdateEvent);

      } else {
        // Insert new item from server (e.g., incoming message from other user)
        const newItem: LocalTimelineItem = {
          id: item.id,
          server_id: item.id,
          interaction_id: item.interaction_id || '',
          profile_id: item.profile_id || '',
          item_type: item.item_type || 'message',
          created_at: item.created_at || new Date().toISOString(),
          from_entity_id: item.from_entity_id || '',
          to_entity_id: item.to_entity_id || null,
          sync_status: 'synced',
          local_status: item.local_status || 'delivered',
          retry_count: 0,
          last_error: null,
          content: item.content || null,
          message_type: item.message_type || null,
          amount: item.amount || null,
          currency_id: item.currency_id || null,
          currency_code: item.currency_code || null,
          currency_symbol: item.currency_symbol || null,
          transaction_type: item.transaction_type || null,
          description: item.description || null,
          from_wallet_id: item.from_wallet_id || null,
          to_wallet_id: item.to_wallet_id || null,
          timeline_metadata: item.timeline_metadata || null,
        };

        await this.addItem(newItem);
      }

      logger.info(`[UnifiedTimelineRepository] ✅ Upserted from server: ${item.id}`);

    } catch (error) {
      logger.error(
        `[UnifiedTimelineRepository] ❌ Failed to upsert from server ${item.id}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Upsert item from server WITHOUT emitting event (for batch operations)
   * Same logic as upsertFromServer but silent - no eventEmitter.emit()
   */
  public async upsertFromServerSilent(item: Partial<LocalTimelineItem> & { id: string }): Promise<void> {
    if (!(await this.isSQLiteAvailable())) {
      return;
    }

    try {
      const db = await this.getDatabase();

      // Check if we already have this item by server_id
      const existingByServerId = item.id ? await this.getItemByServerId(item.id) : null;

      // DUPLICATE PREVENTION: For transactions, also check by interaction_id + created_at
      // This catches duplicates when backend ID changed (e.g., DEBIT→CREDIT ID migration)
      // Without this, the same transaction could appear twice with different IDs
      let existingByTimestamp: LocalTimelineItem | null = null;
      if (!existingByServerId && item.item_type === 'transaction' && item.interaction_id && item.created_at) {
        // Normalize timestamp: extract just the date+time part (first 19 chars: YYYY-MM-DDTHH:MM:SS)
        // This handles format differences like +00:00 vs Z vs no timezone
        const normalizedTimestamp = item.created_at.substring(0, 19);

        logger.debug(`[UnifiedTimelineRepository] 🔍 DEDUP CHECK: Looking for transaction with interaction=${item.interaction_id}, timestamp LIKE ${normalizedTimestamp}%`);

        const rows = await db.getAllAsync<Record<string, any>>(
          `SELECT * FROM local_timeline
           WHERE interaction_id = ?
             AND item_type = 'transaction'
             AND created_at LIKE ?
           LIMIT 1`,
          [item.interaction_id, `${normalizedTimestamp}%`]
        );

        logger.debug(`[UnifiedTimelineRepository] 🔍 DEDUP CHECK: Found ${rows?.length || 0} matching rows`);

        if (rows && rows.length > 0) {
          existingByTimestamp = this.mapRowToItem(rows[0]);
          logger.info(`[UnifiedTimelineRepository] 🔄 DUPLICATE PREVENTION: Found existing transaction by timestamp, merging: ${existingByTimestamp.id} → ${item.id}`);
        }
      }

      const existingItem = existingByServerId || existingByTimestamp;

      if (existingItem) {
        // Update existing item with ALL fields including wallet_ids
        // When merging duplicates (timestamp match), also update id and server_id to new values
        const shouldUpdateId = existingByTimestamp && !existingByServerId;

        await db.runAsync(
          `UPDATE local_timeline
           SET ${shouldUpdateId ? 'id = ?, server_id = ?,' : ''}
               sync_status = 'synced',
               item_type = COALESCE(?, item_type),
               local_status = COALESCE(?, local_status),
               content = COALESCE(?, content),
               amount = COALESCE(?, amount),
               currency_code = COALESCE(?, currency_code),
               currency_id = COALESCE(?, currency_id),
               currency_symbol = COALESCE(?, currency_symbol),
               from_entity_id = COALESCE(?, from_entity_id),
               to_entity_id = COALESCE(?, to_entity_id),
               from_wallet_id = COALESCE(?, from_wallet_id),
               to_wallet_id = COALESCE(?, to_wallet_id),
               transaction_type = COALESCE(?, transaction_type),
               description = COALESCE(?, description),
               timeline_metadata = COALESCE(?, timeline_metadata)
           WHERE id = ?`,
          shouldUpdateId ? [
            item.id,
            item.id,
            item.item_type,
            item.local_status,
            item.content,
            item.amount,
            item.currency_code,
            item.currency_id,
            item.currency_symbol,
            item.from_entity_id,
            item.to_entity_id,
            item.from_wallet_id,
            item.to_wallet_id,
            item.transaction_type,
            item.description,
            item.timeline_metadata ? JSON.stringify(item.timeline_metadata) : null,
            existingItem.id,
          ] : [
            item.item_type,
            item.local_status,
            item.content,
            item.amount,
            item.currency_code,
            item.currency_id,
            item.currency_symbol,
            item.from_entity_id,
            item.to_entity_id,
            item.from_wallet_id,
            item.to_wallet_id,
            item.transaction_type,
            item.description,
            item.timeline_metadata ? JSON.stringify(item.timeline_metadata) : null,
            existingItem.id,
          ]
        );
        // NO eventEmitter.emit() - silent!
      } else {
        // Insert new item (SILENT - use direct insert, not addItem which emits event)
        await db.runAsync(
          `INSERT INTO local_timeline (
            id, server_id, interaction_id, profile_id, item_type, from_entity_id, to_entity_id, created_at,
            sync_status, local_status, retry_count, last_error,
            content, message_type,
            amount, currency_id, currency_code, currency_symbol, transaction_type,
            description, from_wallet_id, to_wallet_id,
            timeline_metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.id, // server_id = id for server-originated items
            item.interaction_id || '',
            item.profile_id || '',
            item.item_type || 'message',
            item.from_entity_id || '',
            item.to_entity_id || null,
            item.created_at || new Date().toISOString(),
            'synced',
            item.local_status || 'delivered',
            0, // retry_count
            null, // last_error
            item.content || null,
            item.message_type || null,
            item.amount || null,
            item.currency_id || null,
            item.currency_code || null,
            item.currency_symbol || null,
            item.transaction_type || null,
            item.description || null,
            item.from_wallet_id || null,
            item.to_wallet_id || null,
            item.timeline_metadata ? (typeof item.timeline_metadata === 'string' ? item.timeline_metadata : JSON.stringify(item.timeline_metadata)) : null,
          ]
        );
        // NO eventEmitter.emit() - silent!
      }
    } catch (error) {
      logger.error(
        `[UnifiedTimelineRepository] ❌ Silent upsert failed for ${item.id}:`,
        error instanceof Error ? error.message : String(error)
      );
      throw error; // Re-throw for batch error handling
    }
  }

  /**
   * BATCH upsert with SINGLE event at end
   * N items = 1 database transaction, 1 event, 1 re-render
   *
   * @param items - Array of items to upsert
   * @param interactionId - The interaction these items belong to
   * @param profileId - The profile these items belong to
   */
  public async batchUpsertFromServer(
    items: Array<Partial<LocalTimelineItem> & { id: string }>,
    interactionId: string,
    profileId: string
  ): Promise<void> {
    if (items.length === 0) {
      logger.debug('[UnifiedTimelineRepository] batchUpsertFromServer: No items to upsert');
      return;
    }

    if (!(await this.isSQLiteAvailable())) {
      logger.warn('[UnifiedTimelineRepository] batchUpsertFromServer: SQLite not available');
      return;
    }

    logger.debug(`[UnifiedTimelineRepository] 🔄 Batch upserting ${items.length} items for ${interactionId}`);

    try {
      // Sequential upserts without transaction wrapper to avoid nested transaction errors
      // Each upsert is idempotent (uses UPSERT/ON CONFLICT), so no need for atomicity
      for (const item of items) {
        await this.upsertFromServerSilent(item);
      }

      // ONE event for entire batch (instead of N events)
      eventEmitter.emit(TIMELINE_UPDATED_EVENT, {
        interactionId,
        itemId: 'batch', // Special marker for batch operations
        action: 'batch_sync',
        profileId,
      } as TimelineUpdateEvent);

      logger.info(`[UnifiedTimelineRepository] ✅ Batch upserted ${items.length} items for ${interactionId}`);

    } catch (error) {
      logger.error(
        `[UnifiedTimelineRepository] ❌ Batch upsert failed for ${interactionId}:`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  // ============================================================================
  // WALLET QUERIES (for wallet page transactions)
  // ============================================================================

  /**
   * Get transactions for a specific wallet ID - used by wallet page
   * Queries local_timeline for item_type='transaction' and matches from/to wallet
   */
  public async getTransactionsByWallet(
    walletId: string,
    profileId: string,
    limit: number = 20
  ): Promise<LocalTimelineItem[]> {
    logger.debug(`[UnifiedTimelineRepository] Getting transactions for wallet: ${walletId}`);

    if (!(await this.isSQLiteAvailable())) {
      logger.warn('[UnifiedTimelineRepository] SQLite not available, returning empty array');
      return [];
    }

    try {
      const db = await this.getDatabase();

      // DEBUG: First check ALL transactions to see wallet_id values
      const allTxDebug = await db.getAllAsync<Record<string, any>>(
        `SELECT id, from_wallet_id, to_wallet_id, amount FROM local_timeline
         WHERE profile_id = ? AND item_type = 'transaction' LIMIT 5`,
        [profileId]
      );
      logger.info(`[WALLET DEBUG] All transactions in SQLite:`,
        JSON.stringify(allTxDebug.map(t => ({
          id: t.id?.substring(0,8),
          from: t.from_wallet_id?.substring(0,8) || 'NULL',
          to: t.to_wallet_id?.substring(0,8) || 'NULL',
          amount: t.amount
        })))
      );
      logger.info(`[WALLET DEBUG] Looking for walletId: ${walletId?.substring(0,8)}`);

      // DEDUPLICATION FIX: Double-entry bookkeeping creates DEBIT+CREDIT entries
      // with same timestamp, amount, and wallet IDs. Pick one per unique transaction.
      const rows = await db.getAllAsync<Record<string, any>>(
        `SELECT t1.* FROM local_timeline t1
         INNER JOIN (
           SELECT MIN(id) as min_id
           FROM local_timeline
           WHERE profile_id = ?
             AND item_type = 'transaction'
             AND (from_wallet_id = ? OR to_wallet_id = ?)
           GROUP BY created_at, amount, from_wallet_id, to_wallet_id
         ) t2 ON t1.id = t2.min_id
         ORDER BY t1.created_at DESC
         LIMIT ?`,
        [profileId, walletId, walletId, limit]
      );

      const items = this.mapRowsToItems(rows);
      logger.info(`[WALLET DEBUG] Found ${items.length} transactions matching walletId: ${walletId?.substring(0,8)}`);

      return items;

    } catch (error) {
      logger.error(
        `[UnifiedTimelineRepository] ❌ Failed to get transactions for wallet ${walletId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Get all transactions for a profile (all wallets) - used by transaction list page
   */
  public async getAllTransactions(
    profileId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<LocalTimelineItem[]> {
    logger.debug(`[UnifiedTimelineRepository] Getting all transactions for profile: ${profileId}`);

    if (!(await this.isSQLiteAvailable())) {
      return [];
    }

    try {
      const db = await this.getDatabase();

      // DEDUPLICATION FIX: Double-entry bookkeeping creates DEBIT+CREDIT entries
      // with same timestamp, amount, and wallet IDs. Pick one per unique transaction.
      const rows = await db.getAllAsync<Record<string, any>>(
        `SELECT t1.* FROM local_timeline t1
         INNER JOIN (
           SELECT MIN(id) as min_id
           FROM local_timeline
           WHERE profile_id = ?
             AND item_type = 'transaction'
           GROUP BY created_at, amount, from_wallet_id, to_wallet_id
         ) t2 ON t1.id = t2.min_id
         ORDER BY t1.created_at DESC
         LIMIT ? OFFSET ?`,
        [profileId, limit, offset]
      );

      const items = this.mapRowsToItems(rows);
      logger.debug(`[UnifiedTimelineRepository] Found ${items.length} total transactions for profile`);

      return items;

    } catch (error) {
      logger.error(
        `[UnifiedTimelineRepository] ❌ Failed to get all transactions:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Count transactions for a wallet
   */
  public async getTransactionCountByWallet(walletId: string, profileId: string): Promise<number> {
    if (!(await this.isSQLiteAvailable())) {
      return 0;
    }

    try {
      const db = await this.getDatabase();

      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM local_timeline
         WHERE profile_id = ?
           AND item_type = 'transaction'
           AND (from_wallet_id = ? OR to_wallet_id = ?)`,
        [profileId, walletId, walletId]
      );

      return result?.count || 0;

    } catch (error) {
      logger.error(
        `[UnifiedTimelineRepository] ❌ Failed to get transaction count:`,
        error instanceof Error ? error.message : String(error)
      );
      return 0;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Count items in timeline for an interaction
   */
  public async getTimelineCount(interactionId: string, profileId: string): Promise<number> {
    if (!(await this.isSQLiteAvailable())) {
      return 0;
    }

    try {
      const db = await this.getDatabase();

      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM local_timeline
         WHERE interaction_id = ? AND profile_id = ?`,
        [interactionId, profileId]
      );

      return result?.count || 0;

    } catch (error) {
      logger.error(
        `[UnifiedTimelineRepository] ❌ Failed to get count for ${interactionId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return 0;
    }
  }

  /**
   * Clear all timeline data for a profile (for logout/profile switch)
   */
  public async clearAllData(profileId: string): Promise<void> {
    logger.warn(`[UnifiedTimelineRepository] Clearing all timeline data for profileId: ${profileId}`);

    if (!(await this.isSQLiteAvailable())) {
      return;
    }

    try {
      const db = await this.getDatabase();

      await db.runAsync(`DELETE FROM local_timeline WHERE profile_id = ?`, [profileId]);

      logger.info(`[UnifiedTimelineRepository] ✅ Cleared all timeline data for profileId: ${profileId}`);

    } catch (error) {
      logger.error(
        '[UnifiedTimelineRepository] ❌ Failed to clear timeline data:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Map database row to LocalTimelineItem
   */
  private mapRowToItem(row: Record<string, any>): LocalTimelineItem {
    return {
      id: String(row.id),
      server_id: row.server_id ? String(row.server_id) : null,
      interaction_id: String(row.interaction_id),
      profile_id: String(row.profile_id),
      item_type: row.item_type as 'message' | 'transaction',
      created_at: String(row.created_at),
      from_entity_id: String(row.from_entity_id || ''),
      to_entity_id: row.to_entity_id ? String(row.to_entity_id) : null,
      sync_status: row.sync_status as SyncStatus,
      local_status: String(row.local_status),
      retry_count: Number(row.retry_count) || 0,
      last_error: row.last_error ? String(row.last_error) : null,
      content: row.content ? String(row.content) : null,
      message_type: row.message_type ? String(row.message_type) : null,
      amount: row.amount !== null ? Number(row.amount) : null,
      currency_id: row.currency_id ? String(row.currency_id) : null,
      currency_code: row.currency_code ? String(row.currency_code) : null,
      currency_symbol: row.currency_symbol ? String(row.currency_symbol) : null,
      transaction_type: row.transaction_type ? String(row.transaction_type) : null,
      description: row.description ? String(row.description) : null,
      from_wallet_id: row.from_wallet_id ? String(row.from_wallet_id) : null,
      to_wallet_id: row.to_wallet_id ? String(row.to_wallet_id) : null,
      timeline_metadata: row.timeline_metadata ? String(row.timeline_metadata) : null,
    };
  }

  /**
   * Map array of database rows to LocalTimelineItems
   */
  private mapRowsToItems(rows: Record<string, any>[]): LocalTimelineItem[] {
    if (!Array.isArray(rows)) {
      return [];
    }
    return rows.map((row) => this.mapRowToItem(row));
  }
}

// Export singleton instance
export const unifiedTimelineRepository = UnifiedTimelineRepository.getInstance();
export default unifiedTimelineRepository;
