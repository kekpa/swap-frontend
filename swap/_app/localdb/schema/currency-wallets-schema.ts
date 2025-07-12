// Created: Currency wallets schema for SQLite database - 2025-01-09
// Updated: Schema now matches Supabase exactly - 2025-01-10

import * as SQLite from 'expo-sqlite';
import logger from '../../utils/logger';

/**
 * Initialize currency wallets schema in SQLite database
 * Schema matches Supabase currency_wallets table exactly
 */
export const initializeCurrencyWalletsSchema = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  logger.debug('[CurrencyWalletsSchema] Initializing currency wallets schema...');
  
  try {
    // Drop table if it exists to ensure a fresh schema (for development)
    await database.runAsync(`DROP TABLE IF EXISTS currency_wallets;`);
    logger.info('[Database] Dropped old currency_wallets table (if it existed).');

    // Create currency_wallets table - matches Supabase schema exactly
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS currency_wallets (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        currency_id TEXT NOT NULL,
        currency_code TEXT NOT NULL,
        currency_symbol TEXT NOT NULL,
        currency_name TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 0,
        reserved_balance REAL NOT NULL DEFAULT 0,
        available_balance REAL NOT NULL DEFAULT 0,
        balance_last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_primary INTEGER DEFAULT 0,
        is_synced INTEGER NOT NULL DEFAULT 0
      );
    `);
    
    // Create indexes for better query performance
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_currency_wallets_account 
      ON currency_wallets(account_id);
    `);
    
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_currency_wallets_currency 
      ON currency_wallets(currency_id);
    `);
    
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_currency_wallets_currency_code 
      ON currency_wallets(currency_code);
    `);
    
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_currency_wallets_active 
      ON currency_wallets(is_active);
    `);
    
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_currency_wallets_primary 
      ON currency_wallets(is_primary);
    `);
    
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_currency_wallets_updated 
      ON currency_wallets(balance_last_updated);
    `);
    
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_currency_wallets_sync
      ON currency_wallets(is_synced)
      WHERE is_synced = 0;
    `);
    
    // Create unique constraint for account_id + currency_id
    await database.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_currency_wallets_unique 
      ON currency_wallets(account_id, currency_id);
    `);
    
    logger.info('[CurrencyWalletsSchema] ✅ Currency wallets schema initialized successfully - matches Supabase exactly');
  } catch (error) {
    logger.error('[CurrencyWalletsSchema] ❌ Failed to initialize currency wallets schema:', error);
    throw error;
  }
}; 