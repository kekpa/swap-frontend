// Created: Rosca (Sol) schema for SQLite database - 2025-01-30
// Pool-based savings system local cache

import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../../utils/logger';

/**
 * Initialize Rosca-related tables in SQLite database
 * Used for local-first caching of pool and enrollment data
 */
export async function initializeRoscaSchema(db: SQLiteDatabase): Promise<void> {
  logger.debug('[RoscaSchema] Initializing rosca schema...');

  try {
    // Create rosca_pools table - caches available pools (not entity-specific)
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS rosca_pools (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        contribution_amount REAL NOT NULL,
        currency_code TEXT NOT NULL,
        currency_symbol TEXT NOT NULL,
        frequency TEXT NOT NULL,
        payout_multiplier INTEGER NOT NULL,
        expected_payout REAL NOT NULL,
        total_members INTEGER NOT NULL DEFAULT 0,
        available_slots INTEGER,
        min_members INTEGER NOT NULL,
        max_members INTEGER,
        grace_period_days INTEGER NOT NULL DEFAULT 3,
        status TEXT NOT NULL DEFAULT 'active',
        visibility TEXT NOT NULL DEFAULT 'public',
        created_at TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create rosca_enrollments table - caches user enrollments (entity-specific)
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS rosca_enrollments (
        id TEXT PRIMARY KEY NOT NULL,
        entity_id TEXT NOT NULL,
        pool_id TEXT NOT NULL,
        pool_name TEXT NOT NULL,
        contribution_amount REAL NOT NULL,
        currency_code TEXT NOT NULL,
        currency_symbol TEXT NOT NULL,
        frequency TEXT NOT NULL,
        queue_position INTEGER NOT NULL,
        total_members INTEGER NOT NULL,
        total_contributed REAL NOT NULL DEFAULT 0,
        expected_payout REAL NOT NULL,
        contributions_count INTEGER NOT NULL DEFAULT 0,
        prepaid_periods INTEGER NOT NULL DEFAULT 0,
        next_payment_due TEXT,
        days_until_next_payment INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        is_your_turn INTEGER NOT NULL DEFAULT 0,
        payout_received INTEGER NOT NULL DEFAULT 0,
        pending_late_fees REAL NOT NULL DEFAULT 0,
        joined_at TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create rosca_payments table - caches payment history
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS rosca_payments (
        id TEXT PRIMARY KEY NOT NULL,
        enrollment_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency_code TEXT NOT NULL,
        currency_symbol TEXT NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        periods_covered INTEGER NOT NULL DEFAULT 1,
        payment_method TEXT NOT NULL,
        due_date TEXT NOT NULL,
        paid_at TEXT,
        days_late INTEGER NOT NULL DEFAULT 0,
        late_fee_amount REAL NOT NULL DEFAULT 0,
        late_fee_waived INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (enrollment_id) REFERENCES rosca_enrollments(id) ON DELETE CASCADE
      );
    `);

    // Create indexes for rosca_pools
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_rosca_pools_status
      ON rosca_pools(status);
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_rosca_pools_frequency
      ON rosca_pools(frequency);
    `);

    // Create indexes for rosca_enrollments (entity-isolated queries)
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_rosca_enrollments_entity
      ON rosca_enrollments(entity_id);
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_rosca_enrollments_pool
      ON rosca_enrollments(pool_id);
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_rosca_enrollments_status
      ON rosca_enrollments(status);
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_rosca_enrollments_next_payment
      ON rosca_enrollments(next_payment_due);
    `);

    // Unique constraint: one enrollment per entity per pool
    await db.runAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_rosca_enrollments_unique
      ON rosca_enrollments(entity_id, pool_id);
    `);

    // Create indexes for rosca_payments
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_rosca_payments_enrollment
      ON rosca_payments(enrollment_id);
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_rosca_payments_status
      ON rosca_payments(status);
    `);

    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_rosca_payments_due_date
      ON rosca_payments(due_date);
    `);

    logger.info('[RoscaSchema] Rosca schema initialized successfully');
  } catch (error) {
    logger.error('[RoscaSchema] Failed to initialize rosca schema:', error);
    throw error;
  }
}
