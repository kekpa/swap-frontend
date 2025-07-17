// Created: SQLite schema for currencies data - 2025-01-10
// Schema matches Supabase currencies table exactly

import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../../utils/logger';

/**
 * Initialize currencies table in SQLite database
 * Schema matches Supabase currencies table exactly
 */
export async function initializeCurrencySchema(db: SQLiteDatabase): Promise<void> {
  try {
    // Drop table if it exists to ensure a fresh schema (for development)
    await db.runAsync(`DROP TABLE IF EXISTS currencies;`);
    logger.info('[Database] Dropped old currencies table (if it existed).');
    
    // Create currencies table - matches Supabase schema exactly
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS currencies (
        id TEXT PRIMARY KEY NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        symbol TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1,
        is_synced INTEGER DEFAULT 0
      );
    `);
    
    // Create indexes for better query performance
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_currencies_code 
      ON currencies(code);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_currencies_is_active 
      ON currencies(is_active);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_currencies_sync
      ON currencies(is_synced)
      WHERE is_synced = 0;
    `);
    
    // Create unique constraint for currency code
    await db.runAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_currencies_code_unique 
      ON currencies(code);
    `);
    
    logger.info('[Database] Currency schema initialized successfully - matches Supabase exactly');
  } catch (error) {
    logger.error('[Database] Failed to initialize currency schema:', error);
    throw error;
  }
} 