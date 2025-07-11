// Created: SQLite schema for message data - 2025-05-22

import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../../utils/logger'; // Import logger

/**
 * Initialize message-related tables in SQLite database
 */
export async function initializeMessageSchema(db: SQLiteDatabase): Promise<void> {
  try {
    // Drop table if it exists to ensure a fresh schema (for development)
    await db.runAsync(`DROP TABLE IF EXISTS messages;`);
    logger.info('[Database] Dropped old messages table (if it existed).');

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY NOT NULL,
        interaction_id TEXT NOT NULL,
        sender_entity_id TEXT,
        content TEXT,
        message_type TEXT,
        created_at TEXT NOT NULL,
        metadata TEXT,
        is_synced INTEGER DEFAULT 0,
        client_generated_id TEXT,
        FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE CASCADE
      );
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_messages_interaction_id 
      ON messages(interaction_id);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_messages_created_at 
      ON messages(created_at DESC);
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_messages_interaction_created 
      ON messages(interaction_id, created_at DESC);
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_messages_sync
      ON messages(is_synced)
      WHERE is_synced = 0;
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_messages_client_generated_id
      ON messages(client_generated_id)
      WHERE client_generated_id IS NOT NULL;
    `);

    logger.info('[Database] Message schema initialized successfully');
  } catch (error) {
    logger.error('[Database] Failed to initialize message schema:', error);
    throw error;
  }
} 