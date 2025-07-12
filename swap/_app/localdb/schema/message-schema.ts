// Created: SQLite schema for message data - 2025-05-22
// Updated: Schema now matches Supabase exactly - 2025-01-10

import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../../utils/logger'; // Import logger

/**
 * Initialize message-related tables in SQLite database
 * Schema matches Supabase messages table exactly
 */
export async function initializeMessageSchema(db: SQLiteDatabase): Promise<void> {
  try {
    // Drop table if it exists to ensure a fresh schema (for development)
    await db.runAsync(`DROP TABLE IF EXISTS messages;`);
    logger.info('[Database] Dropped old messages table (if it existed).');

    // Create messages table - matches Supabase schema exactly
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY NOT NULL,
        topic TEXT NOT NULL,
        extension TEXT NOT NULL,
        interaction_id TEXT NOT NULL,
        related_transaction_id TEXT,
        payload TEXT,
        related_request_id TEXT,
        event TEXT,
        related_ext_payment_id TEXT,
        private INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        business_location_id TEXT,
        content TEXT,
        inserted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        media_url TEXT,
        media_type TEXT,
        message_type TEXT NOT NULL DEFAULT 'text',
        is_system_generated INTEGER DEFAULT 0,
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sender_entity_id TEXT NOT NULL,
        status TEXT,
        message_status TEXT DEFAULT 'sent',
        client_generated_id TEXT,
        is_synced INTEGER DEFAULT 0,
        FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE CASCADE
      );
    `);
    
    // Create indexes for better query performance
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

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_messages_sender_entity
      ON messages(sender_entity_id);
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_messages_topic
      ON messages(topic);
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_messages_message_type
      ON messages(message_type);
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_messages_status
      ON messages(status);
    `);

    logger.info('[Database] Message schema initialized successfully - matches Supabase exactly');
  } catch (error) {
    logger.error('[Database] Failed to initialize message schema:', error);
    throw error;
  }
} 