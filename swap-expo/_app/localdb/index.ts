// Created: Export all localdb functionality from a central index - 2025-05-21
// Updated: Using renamed files (db-service.ts and db-interfaces.ts) - 2025-05-22
// Updated: Fixed clearAllCachedData to handle missing tables gracefully - 2025-01-26

// Re-export db-service.ts functions (DEPRECATED - use DatabaseManager instead)
// These are kept for backward compatibility but should not be used in new code
export { 
  initDb,
  isDatabaseAvailable,
  insertMessage,
  pruneOldMessages,
  getMessagesForInteraction,
  getDatabase
} from './db-service';

// Clear all cached data function
export const clearAllCachedData = async (): Promise<void> => {
  const logger = require('../utils/logger').default;
  const { databaseManager } = require('./DatabaseManager');

  try {
    logger.debug('[LocalDB] Starting clearAllCachedData - clearing all local database tables', 'localdb');

    // Ensure database is initialized and get instance
    const initialized = await databaseManager.initialize();
    if (!initialized) {
      logger.warn('[LocalDB] Database not available for clearing', 'localdb');
      return;
    }

    const db = databaseManager.getDatabase();
    if (!db) {
      logger.warn('[LocalDB] Database instance not available for clearing', 'localdb');
      return;
    }

    // Clear all tables safely - handle missing tables gracefully
    const tablesToClear = [
      'messages',
      'transactions',
      'interactions',
      'interaction_members',
      'account_balances',
      'currency_wallets'
    ];

    for (const table of tablesToClear) {
      try {
        // Use DELETE FROM with IF EXISTS check to avoid errors if table doesn't exist
        await db.execAsync(`DELETE FROM ${table} WHERE 1=1`);
        logger.debug(`[LocalDB] Successfully cleared table: ${table}`, 'localdb');
      } catch (tableError: any) {
        // Check if it's a "no such table" error
        if (tableError.message && tableError.message.includes('no such table')) {
          logger.debug(`[LocalDB] Table ${table} doesn't exist, skipping`, 'localdb');
        } else {
          logger.warn(`[LocalDB] Error clearing table ${table}:`, tableError, 'localdb');
          // Don't throw, continue with other tables
        }
      }
    }

    logger.debug('[LocalDB] Successfully completed clearing all available local database tables', 'localdb');
  } catch (error) {
    logger.error('[LocalDB] Error clearing local database tables', error, 'localdb');
    // Don't re-throw the error to prevent auth flow interruption
    logger.warn('[LocalDB] Continuing with auth flow despite cache clearing error', 'localdb');
  }
};

/**
 * Clear all cached data for a specific entity (ENTITY-ISOLATED)
 * Used during profile switching for privacy and data isolation
 * Updated: 2025-12-28 - Migrated from profileId to entityId (entity-first architecture)
 */
export const clearEntityLocalDB = async (entityId: string): Promise<void> => {
  const logger = require('../utils/logger').default;
  const { databaseManager } = require('./DatabaseManager');

  try {
    logger.info(`[LocalDB] Clearing all local data for entity: ${entityId}`, 'localdb');

    // Ensure database is initialized and get instance
    const initialized = await databaseManager.initialize();
    if (!initialized) {
      logger.warn('[LocalDB] Database not available for clearing', 'localdb');
      return;
    }

    const db = databaseManager.getDatabase();
    if (!db) {
      logger.warn('[LocalDB] Database instance not available for clearing', 'localdb');
      return;
    }

    // Clear all entity-scoped tables (ENTITY-ISOLATED DELETE)
    const tablesToClear = [
      'users',
      'kyc_status',
      'messages',
      'transactions',
      'interactions',
      'interaction_members',
      'currency_wallets',
      'timeline',
      'local_timeline',
      'notifications',
      'user_contacts'
    ];

    let clearedCount = 0;
    for (const table of tablesToClear) {
      try {
        // Delete only rows for this entity
        const result = await db.runAsync(`DELETE FROM ${table} WHERE entity_id = ?`, [entityId]);
        logger.debug(`[LocalDB] Cleared ${result.changes || 0} rows from ${table} for entity ${entityId}`, 'localdb');
        clearedCount++;
      } catch (tableError: any) {
        // Check if it's a "no such table" error
        if (tableError.message && tableError.message.includes('no such table')) {
          logger.debug(`[LocalDB] Table ${table} doesn't exist, skipping`, 'localdb');
        } else if (tableError.message && tableError.message.includes('no such column')) {
          logger.debug(`[LocalDB] Table ${table} doesn't have entity_id column, skipping`, 'localdb');
        } else {
          logger.warn(`[LocalDB] Error clearing table ${table} for entity ${entityId}:`, tableError, 'localdb');
          // Don't throw, continue with other tables
        }
      }
    }

    logger.info(`[LocalDB] Successfully cleared ${clearedCount} tables for entity ${entityId}`, 'localdb');
  } catch (error) {
    logger.error(`[LocalDB] Error clearing entity ${entityId} from local database`, error, 'localdb');
    // Don't re-throw the error to prevent profile switch flow interruption
    logger.warn('[LocalDB] Continuing with profile switch despite cache clearing error', 'localdb');
  }
};

// Legacy alias for backward compatibility during migration
export const clearProfileLocalDB = clearEntityLocalDB;

// Re-export database types from db-interfaces
export type { Database, Transaction } from './db-interfaces';

// Re-export Repository classes (they use singleton pattern)
// NOTE: MessageRepository deleted - use unifiedTimelineRepository for interaction timeline
export { TransactionRepository } from './TransactionRepository';
export { CurrencyWalletsRepository } from './CurrencyWalletsRepository';
export { unifiedTimelineRepository, TIMELINE_UPDATED_EVENT } from './UnifiedTimelineRepository'; // LOCAL-FIRST: Replaces TimelineRepository
export { InteractionRepository } from './InteractionRepository';
export { UserRepository } from './UserRepository';
export { SearchHistoryRepository } from './SearchHistoryRepository';
export { LocationRepository } from './LocationRepository';

// Re-export types from InteractionRepository
export type { LocalInteraction, LocalInteractionMember } from './InteractionRepository'; 