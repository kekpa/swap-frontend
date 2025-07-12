// Created: SQLite schema for user data - 2025-01-09
// Updated: Schema now matches Supabase profiles table exactly - 2025-01-10

import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../../utils/logger';

/**
 * Initialize user-related tables in SQLite database
 * Schema matches Supabase profiles table exactly
 */
export async function initializeUserSchema(db: SQLiteDatabase): Promise<void> {
  try {
    // Drop tables if they exist to ensure a fresh schema (for development)
    await db.runAsync(`DROP TABLE IF EXISTS profiles;`);
    await db.runAsync(`DROP TABLE IF EXISTS users;`);
    await db.runAsync(`DROP TABLE IF EXISTS kyc_status;`);
    logger.info('[Database] Dropped old user tables (if they existed).');
    
    // Create profiles table - matches Supabase schema exactly
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        national_id TEXT,
        kyc_status TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deactivated_at TEXT,
        username TEXT NOT NULL,
        avatar_url TEXT,
        p2p_display_preferences TEXT DEFAULT '{"show_avatar": "public", "show_full_name": "contacts_only"}',
        discovery_settings TEXT DEFAULT '{"searchable_by": "public", "auto_accept_from": "none", "connection_requests": "transacted", "appear_in_suggestions": false}',
        status TEXT NOT NULL DEFAULT 'active',
        deactivation_reason TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        country_code TEXT,
        birth_date TEXT,
        country_of_residence TEXT,
        is_synced INTEGER DEFAULT 0
      );
    `);
    
    // Create users table for basic user data
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_synced INTEGER DEFAULT 0
      );
    `);
    
    // Create kyc_status table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS kyc_status (
        id TEXT PRIMARY KEY NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_synced INTEGER DEFAULT 0
      );
    `);
    
    // Create indexes for frequent query patterns
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
      ON profiles(user_id);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_profiles_username 
      ON profiles(username);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status 
      ON profiles(kyc_status);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_profiles_status 
      ON profiles(status);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_profiles_updated_at 
      ON profiles(updated_at DESC);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_profiles_sync
      ON profiles(is_synced)
      WHERE is_synced = 0;
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_users_updated_at 
      ON users(updated_at DESC);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_users_sync
      ON users(is_synced)
      WHERE is_synced = 0;
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_kyc_status_updated_at 
      ON kyc_status(updated_at DESC);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_kyc_status_sync
      ON kyc_status(is_synced)
      WHERE is_synced = 0;
    `);
    
    logger.info('[Database] User schema initialized successfully - matches Supabase exactly');
  } catch (error) {
    logger.error('[Database] Failed to initialize user schema:', error);
    throw error;
  }
} 