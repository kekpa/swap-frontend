// Created: SQLite schema for transaction data - 2025-05-22

import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../../utils/logger'; // Import logger

/**
 * Initialize transaction-related tables in SQLite database
 */
export async function initializeTransactionSchema(db: SQLiteDatabase): Promise<void> {
  try {
    // Drop table if it exists to ensure a fresh schema (for development)
    await db.runAsync(`DROP TABLE IF EXISTS transactions;`);
    logger.info('[Database] Dropped old transactions table (if it existed).');

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        interaction_id TEXT NOT NULL,
        from_account_id TEXT NOT NULL,
        to_account_id TEXT,
        amount REAL NOT NULL,
        currency_id TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        exchange_rate REAL,
        business_location_id TEXT,
        transaction_type TEXT NOT NULL,
        description TEXT,
        metadata TEXT,
        reversing_transaction_id TEXT,
        from_entity_id TEXT,
        to_entity_id TEXT,
        entry_type TEXT,
        is_synced INTEGER DEFAULT 0,
        client_generated_id TEXT,
        FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE CASCADE
      );
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_interaction_id 
      ON transactions(interaction_id);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at 
      ON transactions(created_at DESC);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_interaction_created 
      ON transactions(interaction_id, created_at DESC);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_sync 
      ON transactions(is_synced) 
      WHERE is_synced = 0;
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_status 
      ON transactions(status);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_client_generated_id 
      ON transactions(client_generated_id) 
      WHERE client_generated_id IS NOT NULL;
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_from_account 
      ON transactions(from_account_id);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_to_account 
      ON transactions(to_account_id);
    `);
    
    logger.info('[Database] Transaction schema initialized successfully');
  } catch (error) {
    logger.error('[Database] Failed to initialize transaction schema:', error);
    throw error;
  }
} 