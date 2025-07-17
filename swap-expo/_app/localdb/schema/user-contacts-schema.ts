// Created: SQLite schema for user contacts data - 2025-01-10
// Schema matches Supabase user_contacts table exactly

import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../../utils/logger';

/**
 * Initialize user_contacts table in SQLite database
 * Schema matches Supabase user_contacts table exactly
 */
export async function initializeUserContactsSchema(db: SQLiteDatabase): Promise<void> {
  try {
    // Drop table if it exists to ensure a fresh schema (for development)
    await db.runAsync(`DROP TABLE IF EXISTS user_contacts;`);
    logger.info('[Database] Dropped old user_contacts table (if it existed).');
    
    // Create user_contacts table - matches Supabase schema exactly
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS user_contacts (
        id TEXT PRIMARY KEY NOT NULL,
        phone_number TEXT NOT NULL,
        display_name TEXT,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        is_favorite INTEGER DEFAULT 0,
        contact_source TEXT DEFAULT 'phone',
        raw_phone_number TEXT,
        last_synced_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_deleted INTEGER DEFAULT 0,
        device_contact_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        entity_id TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0
      );
    `);
    
    // Create indexes for better query performance
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_user_contacts_entity_id 
      ON user_contacts(entity_id);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_user_contacts_phone_number 
      ON user_contacts(phone_number);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_user_contacts_is_favorite 
      ON user_contacts(is_favorite);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_user_contacts_is_deleted 
      ON user_contacts(is_deleted);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_user_contacts_contact_source 
      ON user_contacts(contact_source);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_user_contacts_device_contact_id 
      ON user_contacts(device_contact_id);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_user_contacts_last_synced 
      ON user_contacts(last_synced_at DESC);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_user_contacts_sync
      ON user_contacts(is_synced)
      WHERE is_synced = 0;
    `);
    
    // Create compound index for active contacts by entity
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_user_contacts_entity_active 
      ON user_contacts(entity_id, is_deleted, display_name);
    `);
    
    // Create unique constraint for entity_id + phone_number
    await db.runAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_contacts_entity_phone_unique 
      ON user_contacts(entity_id, phone_number);
    `);
    
    logger.info('[Database] User contacts schema initialized successfully - matches Supabase exactly');
  } catch (error) {
    logger.error('[Database] Failed to initialize user contacts schema:', error);
    throw error;
  }
} 