// Created: Currency wallets schema for SQLite database - 2025-01-09

import * as SQLite from 'expo-sqlite';
import logger from '../../utils/logger';

/**
 * Initialize currency wallets schema in SQLite database
 * This matches the backend currency_wallets table structure
 */
export const initializeCurrencyWalletsSchema = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  logger.debug('[CurrencyWalletsSchema] Initializing currency wallets schema...');
  
  try {
    // Create currency_wallets table (matches backend structure)
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
        balance_last_updated TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_primary INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
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
    
    // Create unique constraint for account_id + currency_id
    await database.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_currency_wallets_unique 
      ON currency_wallets(account_id, currency_id);
    `);
    
    logger.info('[CurrencyWalletsSchema] ✅ Currency wallets schema initialized successfully');
  } catch (error) {
    logger.error('[CurrencyWalletsSchema] ❌ Failed to initialize currency wallets schema:', error);
    throw error;
  }
}; 