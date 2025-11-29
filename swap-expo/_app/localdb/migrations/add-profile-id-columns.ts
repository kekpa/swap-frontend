/**
 * Database Migration: Add profile_id columns for profile isolation
 * Created: 2025-01-18
 *
 * PURPOSE: Add profile_id column to ALL user/entity-scoped tables to prevent
 * data bleeding between personal and business profiles.
 *
 * CRITICAL SECURITY FIX: Ensures complete data isolation at database level.
 */

import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../../utils/logger';

export const MIGRATION_VERSION = 2; // Increment from current version
export const MIGRATION_NAME = 'add_profile_id_columns';

/**
 * Helper function to check if a column exists in a table
 */
async function columnExists(db: SQLiteDatabase, tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await db.getAllAsync(`PRAGMA table_info(${tableName});`);
    return result.some((col: any) => col.name === columnName);
  } catch (error) {
    logger.warn(`[Migration] Could not check column existence for ${tableName}.${columnName}`);
    return false;
  }
}

/**
 * Helper function to safely add a column if it doesn't exist
 */
async function addColumnIfNotExists(db: SQLiteDatabase, tableName: string, columnName: string, columnType: string): Promise<void> {
  const exists = await columnExists(db, tableName, columnName);
  if (exists) {
    logger.debug(`[Migration] Column ${tableName}.${columnName} already exists, skipping`);
    return;
  }

  await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType};`);
  logger.debug(`[Migration] ✅ Added ${columnName} to ${tableName} table`);
}

/**
 * Run the migration to add profile_id columns
 */
export async function runMigration(db: SQLiteDatabase): Promise<void> {
  logger.info(`[Migration] Starting migration: ${MIGRATION_NAME} (v${MIGRATION_VERSION})`);

  try {
    // Start transaction for atomic migration
    await db.execAsync('BEGIN TRANSACTION;');

    // ============================================================================
    // STEP 1: Add profile_id columns to ALL user/entity-scoped tables
    // ============================================================================

    logger.info('[Migration] Step 1: Adding profile_id columns...');

    // 1.1 Users table
    await addColumnIfNotExists(db, 'users', 'profile_id', 'TEXT');

    // 1.2 KYC Status table
    await addColumnIfNotExists(db, 'kyc_status', 'profile_id', 'TEXT');

    // 1.3 Transactions table
    await addColumnIfNotExists(db, 'transactions', 'profile_id', 'TEXT');

    // 1.4 Messages table (if exists)
    try {
      await addColumnIfNotExists(db, 'messages', 'profile_id', 'TEXT');
    } catch (error) {
      logger.warn('[Migration] ⚠️ Messages table may not exist, skipping');
    }

    // 1.5 Interactions table
    await addColumnIfNotExists(db, 'interactions', 'profile_id', 'TEXT');

    // 1.6 Interaction Members table (if exists)
    try {
      await addColumnIfNotExists(db, 'interaction_members', 'profile_id', 'TEXT');
    } catch (error) {
      logger.warn('[Migration] ⚠️ interaction_members table may not exist, skipping');
    }

    // 1.7 Currency Wallets table
    await addColumnIfNotExists(db, 'currency_wallets', 'profile_id', 'TEXT');

    // 1.8 Timeline table (if exists)
    try {
      await addColumnIfNotExists(db, 'timeline', 'profile_id', 'TEXT');
    } catch (error) {
      logger.warn('[Migration] ⚠️ Timeline table may not exist, skipping');
    }

    // 1.9 Notifications table (if exists)
    try {
      await addColumnIfNotExists(db, 'notifications', 'profile_id', 'TEXT');
    } catch (error) {
      logger.warn('[Migration] ⚠️ Notifications table may not exist, skipping');
    }

    // 1.10 User Contacts table (if exists)
    try {
      await addColumnIfNotExists(db, 'user_contacts', 'profile_id', 'TEXT');
    } catch (error) {
      logger.warn('[Migration] ⚠️ user_contacts table may not exist, skipping');
    }

    // ============================================================================
    // STEP 2: Create indexes for performance
    // ============================================================================

    logger.info('[Migration] Step 2: Creating indexes...');

    // 2.1 Users profile_id index
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_users_profile_id
      ON users(profile_id);
    `);
    logger.debug('[Migration] ✅ Created index on users.profile_id');

    // 2.2 KYC Status profile_id index
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_kyc_status_profile_id
      ON kyc_status(profile_id);
    `);
    logger.debug('[Migration] ✅ Created index on kyc_status.profile_id');

    // 2.3 Transactions profile_id index
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_profile_id
      ON transactions(profile_id);
    `);
    logger.debug('[Migration] ✅ Created index on transactions.profile_id');

    // 2.4 Messages profile_id index
    try {
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_messages_profile_id
        ON messages(profile_id);
      `);
      logger.debug('[Migration] ✅ Created index on messages.profile_id');
    } catch (error) {
      logger.warn('[Migration] ⚠️ Could not create index on messages.profile_id');
    }

    // 2.5 Interactions profile_id index
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_interactions_profile_id
      ON interactions(profile_id);
    `);
    logger.debug('[Migration] ✅ Created index on interactions.profile_id');

    // 2.6 Currency Wallets profile_id index
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_currency_wallets_profile_id
      ON currency_wallets(profile_id);
    `);
    logger.debug('[Migration] ✅ Created index on currency_wallets.profile_id');

    // 2.7 Timeline profile_id index
    try {
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_timeline_profile_id
        ON timeline(profile_id);
      `);
      logger.debug('[Migration] ✅ Created index on timeline.profile_id');
    } catch (error) {
      logger.warn('[Migration] ⚠️ Could not create index on timeline.profile_id');
    }

    // ============================================================================
    // STEP 3: Record migration in migrations table
    // ============================================================================

    logger.info('[Migration] Step 3: Recording migration...');

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

    logger.info(`[Migration] ✅ Migration ${MIGRATION_NAME} completed successfully`);

  } catch (error) {
    // Rollback on any error
    try {
      await db.execAsync('ROLLBACK;');
      logger.error('[Migration] ⚠️ Migration rolled back due to error');
    } catch (rollbackError) {
      logger.error('[Migration] ❌ Failed to rollback migration:', rollbackError);
    }

    logger.error(`[Migration] ❌ Migration ${MIGRATION_NAME} failed:`, error);
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
      logger.debug('[Migration] Migrations table does not exist, migration not applied');
      return false;
    }

    // Check if this specific migration has been applied
    const migrationCheck = await db.getAllAsync(`
      SELECT * FROM migrations
      WHERE version = ${MIGRATION_VERSION} AND name = '${MIGRATION_NAME}';
    `);

    const applied = migrationCheck.length > 0;
    logger.debug(`[Migration] Migration ${MIGRATION_NAME} applied: ${applied}`);

    return applied;

  } catch (error) {
    logger.error('[Migration] Error checking migration status:', error);
    return false;
  }
}

/**
 * Get current migration version
 */
export async function getCurrentMigrationVersion(db: SQLiteDatabase): Promise<number> {
  try {
    const result = await db.getAllAsync(`
      SELECT MAX(version) as current_version FROM migrations;
    `);

    const version = result[0]?.current_version || 0;
    logger.debug(`[Migration] Current migration version: ${version}`);

    return version;

  } catch (error) {
    logger.warn('[Migration] Could not get current version, returning 0');
    return 0;
  }
}
