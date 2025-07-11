// Created: SQLite schema for user data - 2025-01-09

import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Initialize user-related tables in SQLite database
 */
export async function initializeUserSchema(db: SQLiteDatabase): Promise<void> {
  try {
    // Create users table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create kyc_status table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS kyc_status (
        id TEXT PRIMARY KEY NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes for frequent query patterns
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_users_updated_at 
      ON users(updated_at DESC);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_kyc_status_updated_at 
      ON kyc_status(updated_at DESC);
    `);
    
    console.log('[Database] User schema initialized successfully');
  } catch (error) {
    console.error('[Database] Failed to initialize user schema:', error);
    throw error;
  }
} 