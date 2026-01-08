/**
 * Database Migration: Add entity_id columns for profile isolation
 * Created: 2025-01-18
 * Updated: 2025-12-27 - Renamed from profile_id to entity_id for backend consistency
 *
 * PURPOSE: Add entity_id column to ALL user/entity-scoped tables to prevent
 * data bleeding between personal and business profiles.
 *
 * CRITICAL SECURITY FIX: Ensures complete data isolation at database level.
 *
 * NOTE: entity_id = entities.id from backend (universal identifier)
 */

import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../../utils/logger';

export const MIGRATION_VERSION = 3; // Increment for entity_id migration with data copy
export const MIGRATION_NAME = 'add_entity_id_columns';

/**
 * Helper function to check if a column exists in a table
 */
async function columnExists(db: SQLiteDatabase, tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await db.getAllAsync(`PRAGMA table_info(${tableName});`);
    return result.some((col: any) => col.name === columnName);
  } catch (error) {
    logger.warn('[Migration] Could not check column existence', 'data', { tableName, columnName });
    return false;
  }
}

/**
 * Helper function to safely add a column if it doesn't exist
 */
async function addColumnIfNotExists(db: SQLiteDatabase, tableName: string, columnName: string, columnType: string): Promise<void> {
  const exists = await columnExists(db, tableName, columnName);
  if (exists) {
    logger.debug('[Migration] Column already exists, skipping', 'data', { tableName, columnName });
    return;
  }

  await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType};`);
  logger.debug('[Migration] Added column to table', 'data', { tableName, columnName });
}

/**
 * Run the migration to add entity_id columns
 */
export async function runMigration(db: SQLiteDatabase): Promise<void> {
  logger.info('[Migration] Starting migration', 'data', { name: MIGRATION_NAME, version: MIGRATION_VERSION });

  try {
    // Start transaction for atomic migration
    await db.execAsync('BEGIN TRANSACTION;');

    // ============================================================================
    // STEP 1: Add entity_id columns to ALL user/entity-scoped tables
    // ============================================================================

    logger.info('[Migration] Step 1: Adding entity_id columns...', 'data');

    // 1.1 Users table
    await addColumnIfNotExists(db, 'users', 'entity_id', 'TEXT');

    // 1.2 KYC Status table
    await addColumnIfNotExists(db, 'kyc_status', 'entity_id', 'TEXT');

    // 1.3 Transactions table
    await addColumnIfNotExists(db, 'transactions', 'entity_id', 'TEXT');

    // 1.4 Messages table (if exists)
    try {
      await addColumnIfNotExists(db, 'messages', 'entity_id', 'TEXT');
    } catch (error) {
      logger.warn('[Migration] Messages table may not exist, skipping', 'data');
    }

    // 1.5 Interactions table
    await addColumnIfNotExists(db, 'interactions', 'entity_id', 'TEXT');

    // 1.6 Interaction Members table (if exists)
    try {
      await addColumnIfNotExists(db, 'interaction_members', 'entity_id', 'TEXT');
    } catch (error) {
      logger.warn('[Migration] interaction_members table may not exist, skipping', 'data');
    }

    // 1.7 Currency Wallets table
    await addColumnIfNotExists(db, 'currency_wallets', 'entity_id', 'TEXT');

    // 1.8 Timeline table (if exists)
    try {
      await addColumnIfNotExists(db, 'timeline', 'entity_id', 'TEXT');
    } catch (error) {
      logger.warn('[Migration] Timeline table may not exist, skipping', 'data');
    }

    // 1.9 Notifications table (if exists)
    try {
      await addColumnIfNotExists(db, 'notifications', 'entity_id', 'TEXT');
    } catch (error) {
      logger.warn('[Migration] Notifications table may not exist, skipping', 'data');
    }

    // 1.10 User Contacts table (if exists)
    try {
      await addColumnIfNotExists(db, 'user_contacts', 'entity_id', 'TEXT');
    } catch (error) {
      logger.warn('[Migration] user_contacts table may not exist, skipping', 'data');
    }

    // ============================================================================
    // STEP 2: Copy data from profile_id to entity_id (for existing rows)
    // ============================================================================

    logger.info('[Migration] Step 2: Copying data from profile_id to entity_id...', 'data');

    // 2.1 Users table - copy profile_id to entity_id where entity_id is null
    try {
      await db.execAsync(`UPDATE users SET entity_id = profile_id WHERE entity_id IS NULL AND profile_id IS NOT NULL;`);
      logger.debug('[Migration] Copied profile_id to entity_id in users table', 'data');
    } catch (error) {
      logger.warn('[Migration] Could not copy users.profile_id to entity_id', 'data', { error: String(error) });
    }

    // 2.2 KYC Status table
    try {
      await db.execAsync(`UPDATE kyc_status SET entity_id = profile_id WHERE entity_id IS NULL AND profile_id IS NOT NULL;`);
      logger.debug('[Migration] Copied profile_id to entity_id in kyc_status table', 'data');
    } catch (error) {
      logger.warn('[Migration] Could not copy kyc_status.profile_id to entity_id', 'data', { error: String(error) });
    }

    // 2.3 Transactions table
    try {
      await db.execAsync(`UPDATE transactions SET entity_id = profile_id WHERE entity_id IS NULL AND profile_id IS NOT NULL;`);
      logger.debug('[Migration] Copied profile_id to entity_id in transactions table', 'data');
    } catch (error) {
      logger.warn('[Migration] Could not copy transactions.profile_id to entity_id', 'data', { error: String(error) });
    }

    // 2.4 Interactions table
    try {
      await db.execAsync(`UPDATE interactions SET entity_id = profile_id WHERE entity_id IS NULL AND profile_id IS NOT NULL;`);
      logger.debug('[Migration] Copied profile_id to entity_id in interactions table', 'data');
    } catch (error) {
      logger.warn('[Migration] Could not copy interactions.profile_id to entity_id', 'data', { error: String(error) });
    }

    // 2.5 Interaction Members table
    try {
      await db.execAsync(`UPDATE interaction_members SET entity_id = profile_id WHERE entity_id IS NULL AND profile_id IS NOT NULL;`);
      logger.debug('[Migration] Copied profile_id to entity_id in interaction_members table', 'data');
    } catch (error) {
      logger.warn('[Migration] Could not copy interaction_members.profile_id to entity_id', 'data', { error: String(error) });
    }

    // 2.6 Currency Wallets table
    try {
      await db.execAsync(`UPDATE currency_wallets SET entity_id = profile_id WHERE entity_id IS NULL AND profile_id IS NOT NULL;`);
      logger.debug('[Migration] Copied profile_id to entity_id in currency_wallets table', 'data');
    } catch (error) {
      logger.warn('[Migration] Could not copy currency_wallets.profile_id to entity_id', 'data', { error: String(error) });
    }

    // ============================================================================
    // STEP 3: Create indexes for performance
    // ============================================================================

    logger.info('[Migration] Step 3: Creating indexes...', 'data');

    // 2.1 Users entity_id index
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_users_entity_id
      ON users(entity_id);
    `);
    logger.debug('[Migration] Created index on users.entity_id', 'data');

    // 2.2 KYC Status entity_id index
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_kyc_status_entity_id
      ON kyc_status(entity_id);
    `);
    logger.debug('[Migration] Created index on kyc_status.entity_id', 'data');

    // 2.3 Transactions entity_id index
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_entity_id
      ON transactions(entity_id);
    `);
    logger.debug('[Migration] Created index on transactions.entity_id', 'data');

    // 2.4 Messages entity_id index
    try {
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_messages_entity_id
        ON messages(entity_id);
      `);
      logger.debug('[Migration] Created index on messages.entity_id', 'data');
    } catch (error) {
      logger.warn('[Migration] Could not create index on messages.entity_id', 'data');
    }

    // 2.5 Interactions entity_id index
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_interactions_entity_id
      ON interactions(entity_id);
    `);
    logger.debug('[Migration] Created index on interactions.entity_id', 'data');

    // 2.6 Currency Wallets entity_id index
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_currency_wallets_entity_id
      ON currency_wallets(entity_id);
    `);
    logger.debug('[Migration] Created index on currency_wallets.entity_id', 'data');

    // 2.7 Timeline entity_id index
    try {
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_timeline_entity_id
        ON timeline(entity_id);
      `);
      logger.debug('[Migration] Created index on timeline.entity_id', 'data');
    } catch (error) {
      logger.warn('[Migration] Could not create index on timeline.entity_id', 'data');
    }

    // ============================================================================
    // STEP 4: Record migration in migrations table
    // ============================================================================

    logger.info('[Migration] Step 4: Recording migration...', 'data');

    // Create migrations table if it doesn't exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Record this migration
    await db.execAsync(`
      INSERT INTO migrations (version, name)
      VALUES (${MIGRATION_VERSION}, '${MIGRATION_NAME}');
    `);

    // Commit transaction
    await db.execAsync('COMMIT;');

    logger.info('[Migration] Migration completed successfully', 'data', { name: MIGRATION_NAME });

  } catch (error) {
    // Rollback on any error
    try {
      await db.execAsync('ROLLBACK;');
      logger.error('[Migration] Migration rolled back due to error', error, 'data');
    } catch (rollbackError) {
      logger.error('[Migration] Failed to rollback migration', rollbackError, 'data');
    }

    logger.error('[Migration] Migration failed', error, 'data', { name: MIGRATION_NAME });
    throw error;
  }
}

/**
 * Check if migration has already been applied
 */
export async function isMigrationApplied(db: SQLiteDatabase): Promise<boolean> {
  try {
    // Check if migrations table exists
    const tableCheck = await db.getAllAsync(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='migrations';
    `);

    if (tableCheck.length === 0) {
      logger.debug('[Migration] Migrations table does not exist, migration not applied', 'data');
      return false;
    }

    // Check if this specific migration has been applied
    const migrationCheck = await db.getAllAsync(`
      SELECT * FROM migrations
      WHERE version = ${MIGRATION_VERSION} AND name = '${MIGRATION_NAME}';
    `);

    const applied = migrationCheck.length > 0;
    logger.debug('[Migration] Migration applied check', 'data', { name: MIGRATION_NAME, applied });

    return applied;

  } catch (error) {
    logger.error('[Migration] Error checking migration status', error, 'data');
    return false;
  }
}

/**
 * Get current migration version
 */
export async function getCurrentMigrationVersion(db: SQLiteDatabase): Promise<number> {
  try {
    const result = await db.getAllAsync<{ current_version: number | null }>(`
      SELECT MAX(version) as current_version FROM migrations;
    `);

    const version = result[0]?.current_version || 0;
    logger.debug('[Migration] Current migration version', 'data', { version });

    return version;

  } catch (error) {
    logger.warn('[Migration] Could not get current version, returning 0', 'data');
    return 0;
  }
}
