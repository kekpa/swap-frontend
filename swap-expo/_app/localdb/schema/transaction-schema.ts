// Created: SQLite schema for transaction data - 2025-05-22
// Updated: Schema now matches Supabase transaction_ledger exactly - 2025-01-10

import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../../utils/logger'; // Import logger

/**
 * Initialize transaction-related tables in SQLite database
 * Schema matches Supabase transaction_ledger table exactly
 */
export async function initializeTransactionSchema(db: SQLiteDatabase): Promise<void> {
  try {
    // Create transactions table - matches Supabase transaction_ledger schema exactly
    // Using CREATE IF NOT EXISTS for idempotency (safe for both first install and updates)
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        from_account_id TEXT NOT NULL,
        to_account_id TEXT,
        from_entity_id TEXT NOT NULL, -- CRITICAL FIX: Add missing from_entity_id
        to_entity_id TEXT, -- CRITICAL FIX: Add missing to_entity_id
        amount REAL NOT NULL,
        currency_id TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        interaction_id TEXT,
        exchange_rate REAL,
        business_location_id TEXT,
        transaction_type TEXT NOT NULL DEFAULT 'p2p',
        description TEXT,
        metadata TEXT,
        reversing_transaction_id TEXT,
        offer_id TEXT,
        entry_type TEXT,
        from_wallet_id TEXT,
        to_wallet_id TEXT,
        status TEXT DEFAULT 'COMPLETED',
        profile_id TEXT,
        is_synced INTEGER DEFAULT 0,
        client_generated_id TEXT,
        FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE CASCADE
      );
    `);
    
    // Create indexes for better query performance
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
      CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type 
      ON transactions(transaction_type);
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

    // CRITICAL FIX: Add indexes for entity IDs
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_from_entity
      ON transactions(from_entity_id);
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_to_entity
      ON transactions(to_entity_id);
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_currency
      ON transactions(currency_id);
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_from_wallet
      ON transactions(from_wallet_id);
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_to_wallet
      ON transactions(to_wallet_id);
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_offer
      ON transactions(offer_id);
    `);
    
    logger.info('[Database] Transaction schema initialized successfully - matches Supabase exactly');
  } catch (error) {
    logger.error('[Database] Failed to initialize transaction schema:', error);
    throw error;
  }
} 