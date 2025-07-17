// Updated: Refactored to contain only the unified timeline view - 2025-05-22

import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../../utils/logger'; // Import logger

/**
 * Initialize timeline-related views in SQLite database
 */
export async function initializeTimelineSchema(db: SQLiteDatabase): Promise<void> {
  try {
    // Drop view if it exists to ensure a fresh schema (for development)
    await db.runAsync(`DROP VIEW IF EXISTS timeline_items;`);
    logger.info('[Database] Dropped old timeline_items view (if it existed).');

    await db.runAsync(`
      CREATE VIEW IF NOT EXISTS timeline_items AS
      SELECT 
        id,
        interaction_id,
        created_at,
        'message' as item_type, -- Literal string for type
        content,
        sender_entity_id,
        message_type,
        metadata,
        status,
        NULL as from_account_id, -- Transaction specific fields, NULL for messages
        NULL as to_account_id,
        NULL as amount,
        NULL as currency_id,
        NULL as transaction_type,
        NULL as description
      FROM messages
      UNION ALL
      SELECT 
        id,
        interaction_id,
        created_at,
        'transaction' as item_type, -- Literal string for type
        NULL as content, -- Message specific fields, NULL for transactions
        NULL as sender_entity_id,
        NULL as message_type,
        metadata,
        status,
        from_account_id,
        to_account_id,
        amount,
        currency_id,
        transaction_type,
        description
      FROM transactions;
    `);

    logger.info('[Database] Timeline schema (view) initialized successfully');
  } catch (error) {
    logger.error('[Database] Failed to initialize timeline schema:', error);
    throw error;
  }
} 