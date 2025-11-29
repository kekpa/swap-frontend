// Created: SQLite schema for notifications data - 2025-01-10
// Schema matches Supabase notifications table exactly

import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../../utils/logger';

/**
 * Initialize notifications table in SQLite database
 * Schema matches Supabase notifications table exactly
 */
export async function initializeNotificationsSchema(db: SQLiteDatabase): Promise<void> {
  try {
    // Create notifications table - matches Supabase schema exactly
    // Using CREATE IF NOT EXISTS for idempotency (safe for both first install and updates)
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        related_transaction_id TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT DEFAULT '{}',
        recipient_entity_id TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0
      );
    `);
    
    // Create indexes for better query performance
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_entity 
      ON notifications(recipient_entity_id);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_notifications_type 
      ON notifications(type);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read 
      ON notifications(is_read);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
      ON notifications(created_at DESC);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_notifications_related_transaction 
      ON notifications(related_transaction_id);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_notifications_sync
      ON notifications(is_synced)
      WHERE is_synced = 0;
    `);
    
    // Create compound index for unread notifications by recipient
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread 
      ON notifications(recipient_entity_id, is_read, created_at DESC);
    `);
    
    logger.info('[Database] Notifications schema initialized successfully - matches Supabase exactly');
  } catch (error) {
    logger.error('[Database] Failed to initialize notifications schema:', error);
    throw error;
  }
} 