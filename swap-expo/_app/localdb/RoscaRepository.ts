// Created: Rosca repository for local SQLite database - 2025-01-30
// Pool-based savings system local cache with entity isolation

import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';
import { databaseManager } from './DatabaseManager';
import { eventEmitter } from '../utils/eventEmitter';
import { Platform } from 'react-native';
import type { RoscaPool, RoscaEnrollment, RoscaPayment } from '../types/rosca.types';

// Cache timestamp keys
const POOLS_CACHE_TIMESTAMP_KEY = 'rosca_pools_last_sync';
const ENROLLMENTS_CACHE_TIMESTAMP_PREFIX = 'rosca_enrollments_last_sync_'; // per-entity

export class RoscaRepository {
  private static instance: RoscaRepository;

  public static getInstance(): RoscaRepository {
    if (!RoscaRepository.instance) {
      RoscaRepository.instance = new RoscaRepository();
    }
    return RoscaRepository.instance;
  }

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get database instance with proper error handling
   */
  private async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    const isReady = await databaseManager.initialize();
    if (!isReady) {
      throw new Error('Database initialization failed');
    }

    const db = databaseManager.getDatabase();
    if (!db) {
      throw new Error('Database instance not available');
    }

    return db;
  }

  /**
   * Check if SQLite is available in the current environment
   */
  public async isSQLiteAvailable(): Promise<boolean> {
    try {
      await this.getDatabase();
      const available = databaseManager.isDatabaseReady();
      logger.debug('[RoscaRepository] Database ready check', 'data', { available });

      if (Platform.OS === 'web') {
        logger.debug('[RoscaRepository] Platform is web, SQLite not supported', 'data');
        return false;
      }

      return available;
    } catch (error) {
      logger.debug('[RoscaRepository] Database not available', 'data', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  // ==================== Pool Methods (Not Entity-Specific) ====================

  /**
   * Get all cached pools
   */
  public async getPools(): Promise<RoscaPool[]> {
    logger.debug('[RoscaRepository] Getting all pools from local database', 'rosca');

    if (!(await this.isSQLiteAvailable())) {
      logger.debug('[RoscaRepository] SQLite not available, returning empty array', 'rosca');
      return [];
    }

    try {
      const db = await this.getDatabase();
      const result = await db.getAllAsync(`
        SELECT * FROM rosca_pools
        WHERE status = 'active'
        ORDER BY contribution_amount ASC
      `);

      const pools = result.map((row: any) => this.mapRowToPool(row));
      logger.debug('[RoscaRepository] Retrieved pools from local database', 'rosca', { count: pools.length });
      return pools;
    } catch (error) {
      logger.error('[RoscaRepository] Error getting pools', error, 'rosca');
      return [];
    }
  }

  /**
   * Get the timestamp when pools cache was last updated
   */
  public async getPoolsCacheTimestamp(): Promise<number | null> {
    try {
      const result = await AsyncStorage.getItem(POOLS_CACHE_TIMESTAMP_KEY);
      return result ? parseInt(result, 10) : null;
    } catch (error) {
      logger.debug('[RoscaRepository] Error getting pools cache timestamp', 'rosca', { error: String(error) });
      return null;
    }
  }

  /**
   * Set the pools cache timestamp to now
   */
  private async setPoolsCacheTimestamp(): Promise<void> {
    try {
      await AsyncStorage.setItem(POOLS_CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      logger.debug('[RoscaRepository] Error setting pools cache timestamp', 'rosca', { error: String(error) });
    }
  }

  /**
   * Clear the pools cache timestamp (forces fresh fetch)
   */
  public async clearPoolsCacheTimestamp(): Promise<void> {
    try {
      await AsyncStorage.removeItem(POOLS_CACHE_TIMESTAMP_KEY);
      logger.debug('[RoscaRepository] Cleared pools cache timestamp', 'rosca');
    } catch (error) {
      logger.debug('[RoscaRepository] Error clearing pools cache timestamp', 'rosca', { error: String(error) });
    }
  }

  // ==================== Enrollment Cache Timestamps (Entity-Specific) ====================

  /**
   * Get the timestamp when enrollments cache was last updated for an entity
   */
  public async getEnrollmentsCacheTimestamp(entityId: string): Promise<number | null> {
    try {
      const key = `${ENROLLMENTS_CACHE_TIMESTAMP_PREFIX}${entityId}`;
      const result = await AsyncStorage.getItem(key);
      return result ? parseInt(result, 10) : null;
    } catch (error) {
      logger.debug('[RoscaRepository] Error getting enrollments cache timestamp', 'rosca', { error: String(error) });
      return null;
    }
  }

  /**
   * Set the enrollments cache timestamp to now for an entity
   */
  private async setEnrollmentsCacheTimestamp(entityId: string): Promise<void> {
    try {
      const key = `${ENROLLMENTS_CACHE_TIMESTAMP_PREFIX}${entityId}`;
      await AsyncStorage.setItem(key, Date.now().toString());
    } catch (error) {
      logger.debug('[RoscaRepository] Error setting enrollments cache timestamp', 'rosca', { error: String(error) });
    }
  }

  /**
   * Clear the enrollments cache timestamp for an entity (forces fresh fetch)
   */
  public async clearEnrollmentsCacheTimestamp(entityId: string): Promise<void> {
    try {
      const key = `${ENROLLMENTS_CACHE_TIMESTAMP_PREFIX}${entityId}`;
      await AsyncStorage.removeItem(key);
      logger.debug('[RoscaRepository] Cleared enrollments cache timestamp for entity', 'rosca', { entityId });
    } catch (error) {
      logger.debug('[RoscaRepository] Error clearing enrollments cache timestamp', 'rosca', { error: String(error) });
    }
  }

  /**
   * Save pools to local cache (REPLACES all existing pools)
   * Uses DELETE + INSERT to ensure deleted pools are removed from cache
   */
  public async savePools(pools: RoscaPool[]): Promise<void> {
    logger.debug('[RoscaRepository] Replacing cache with fresh pools', 'rosca', { count: pools?.length || 0 });

    if (!(await this.isSQLiteAvailable())) {
      logger.warn('[RoscaRepository] SQLite not available, aborting save', 'rosca');
      return;
    }

    if (!pools || pools.length === 0) {
      logger.debug('[RoscaRepository] No pools to save, clearing cache', 'rosca');
      // If API returns empty, clear the cache too
      try {
        const db = await this.getDatabase();
        await db.runAsync('DELETE FROM rosca_pools');
        await this.setPoolsCacheTimestamp();
      } catch (error) {
        logger.error('[RoscaRepository] Error clearing pools', error, 'rosca');
      }
      return;
    }

    try {
      const db = await this.getDatabase();

      // STEP 1: Delete ALL existing pools (removes stale/deleted pools)
      await db.runAsync('DELETE FROM rosca_pools');

      // STEP 2: Insert fresh pools from API
      for (const pool of pools) {
        const statement = await db.prepareAsync(`
          INSERT INTO rosca_pools (
            id, name, description, contribution_amount, currency_code, currency_symbol,
            frequency, payout_multiplier, expected_payout, total_members, available_slots,
            min_members, max_members, grace_period_days, status, visibility, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        await statement.executeAsync(
          pool.id,
          pool.name,
          pool.description || null,
          pool.contributionAmount,
          pool.currencyCode,
          pool.currencySymbol,
          pool.frequency,
          pool.payoutMultiplier,
          pool.expectedPayout,
          pool.totalMembers ?? (pool as any).memberCount ?? 0,
          pool.availableSlots ?? null,
          pool.minMembers ?? null,
          pool.maxMembers ?? null,
          pool.gracePeriodDays ?? null,
          pool.status,
          (pool as any).visibility || 'public',
          (pool as any).createdAt || new Date().toISOString(),
          new Date().toISOString()
        );

        await statement.finalizeAsync();
      }

      // STEP 3: Update cache timestamp
      await this.setPoolsCacheTimestamp();

      logger.info('[RoscaRepository] Replaced cache with fresh pools', 'rosca', { count: pools.length });
      eventEmitter.emit('data_updated', { type: 'rosca_pools', data: pools });
    } catch (error) {
      logger.error('[RoscaRepository] Error saving pools', error, 'rosca');
    }
  }

  /**
   * Get pool by ID
   */
  public async getPoolById(poolId: string): Promise<RoscaPool | null> {
    logger.debug('[RoscaRepository] Getting pool', 'rosca', { poolId });

    if (!(await this.isSQLiteAvailable())) {
      return null;
    }

    try {
      const db = await this.getDatabase();
      const result = await db.getFirstAsync(`SELECT * FROM rosca_pools WHERE id = ?`, [poolId]);

      if (!result) {
        return null;
      }

      return this.mapRowToPool(result as any);
    } catch (error) {
      logger.error('[RoscaRepository] Error getting pool', error, 'rosca', { poolId });
      return null;
    }
  }

  // ==================== Enrollment Methods (Entity-Isolated) ====================

  /**
   * Get enrollments for an entity (ENTITY-ISOLATED)
   */
  public async getEnrollments(entityId: string): Promise<RoscaEnrollment[]> {
    logger.debug('[RoscaRepository] Getting enrollments for entity', 'rosca', { entityId });

    if (!(await this.isSQLiteAvailable())) {
      logger.debug('[RoscaRepository] SQLite not available, returning empty array', 'rosca');
      return [];
    }

    try {
      const db = await this.getDatabase();
      const result = await db.getAllAsync(`
        SELECT * FROM rosca_enrollments
        WHERE entity_id = ?
        ORDER BY joined_at DESC
      `, [entityId]);

      const enrollments = result.map((row: any) => this.mapRowToEnrollment(row));
      logger.debug('[RoscaRepository] Retrieved enrollments for entity', 'rosca', { entityId, count: enrollments.length });
      return enrollments;
    } catch (error) {
      logger.error('[RoscaRepository] Error getting enrollments', error, 'rosca');
      return [];
    }
  }

  /**
   * Save enrollments to local cache (ENTITY-ISOLATED)
   */
  public async saveEnrollments(enrollments: RoscaEnrollment[], entityId: string): Promise<void> {
    logger.debug('[RoscaRepository] Saving enrollments for entity', 'rosca', { entityId, count: enrollments?.length || 0 });

    if (!(await this.isSQLiteAvailable())) {
      logger.warn('[RoscaRepository] SQLite not available, aborting save', 'rosca');
      return;
    }

    if (!enrollments || enrollments.length === 0) {
      logger.debug('[RoscaRepository] No enrollments to save', 'rosca');
      return;
    }

    try {
      const db = await this.getDatabase();

      for (const enrollment of enrollments) {
        const statement = await db.prepareAsync(`
          INSERT OR REPLACE INTO rosca_enrollments (
            id, entity_id, pool_id, pool_name, contribution_amount, currency_code, currency_symbol,
            frequency, queue_position, total_members, total_contributed, expected_payout,
            contributions_count, prepaid_periods, next_payment_due, days_until_next_payment,
            status, is_your_turn, payout_received, pending_late_fees, payout_date, joined_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        await statement.executeAsync(
          enrollment.id,
          entityId,
          enrollment.poolId,
          enrollment.poolName,
          enrollment.contributionAmount,
          enrollment.currencyCode,
          enrollment.currencySymbol,
          enrollment.frequency,
          enrollment.queuePosition,
          enrollment.totalMembers,
          enrollment.totalContributed,
          enrollment.expectedPayout,
          enrollment.contributionsCount,
          enrollment.prepaidPeriods,
          enrollment.nextPaymentDue,
          enrollment.daysUntilNextPayment,
          enrollment.status,
          enrollment.isYourTurn ? 1 : 0,
          enrollment.payoutReceived ? 1 : 0,
          enrollment.pendingLateFees,
          enrollment.payoutDate || null,
          enrollment.joinedAt,
          new Date().toISOString()
        );

        await statement.finalizeAsync();
      }

      // Update cache timestamp
      await this.setEnrollmentsCacheTimestamp(entityId);

      logger.info('[RoscaRepository] Successfully saved enrollments for entity', 'rosca', { entityId, count: enrollments.length });
      eventEmitter.emit('data_updated', { type: 'rosca_enrollments', data: enrollments, entityId });
    } catch (error) {
      logger.error('[RoscaRepository] Error saving enrollments', error, 'rosca');
    }
  }

  /**
   * Get enrollment by ID
   */
  public async getEnrollmentById(enrollmentId: string): Promise<RoscaEnrollment | null> {
    logger.debug('[RoscaRepository] Getting enrollment', 'rosca', { enrollmentId });

    if (!(await this.isSQLiteAvailable())) {
      return null;
    }

    try {
      const db = await this.getDatabase();
      const result = await db.getFirstAsync(`SELECT * FROM rosca_enrollments WHERE id = ?`, [enrollmentId]);

      if (!result) {
        return null;
      }

      return this.mapRowToEnrollment(result as any);
    } catch (error) {
      logger.error('[RoscaRepository] Error getting enrollment', error, 'rosca', { enrollmentId });
      return null;
    }
  }

  /**
   * Clear all enrollments for an entity (ENTITY-ISOLATED)
   */
  public async clearEnrollments(entityId: string): Promise<void> {
    logger.debug('[RoscaRepository] Clearing enrollments for entity', 'rosca', { entityId });

    if (!(await this.isSQLiteAvailable())) {
      return;
    }

    try {
      const db = await this.getDatabase();
      await db.runAsync('DELETE FROM rosca_enrollments WHERE entity_id = ?', [entityId]);
      logger.info('[RoscaRepository] Cleared enrollments for entity', 'rosca', { entityId });
    } catch (error) {
      logger.error('[RoscaRepository] Error clearing enrollments', error, 'rosca');
    }
  }

  // ==================== Payment Methods ====================

  /**
   * Get payments for an enrollment
   */
  public async getPayments(enrollmentId: string): Promise<RoscaPayment[]> {
    logger.debug('[RoscaRepository] Getting payments for enrollment', 'rosca', { enrollmentId });

    if (!(await this.isSQLiteAvailable())) {
      return [];
    }

    try {
      const db = await this.getDatabase();
      const result = await db.getAllAsync(`
        SELECT * FROM rosca_payments
        WHERE enrollment_id = ?
        ORDER BY created_at DESC
      `, [enrollmentId]);

      const payments = result.map((row: any) => this.mapRowToPayment(row));
      logger.debug('[RoscaRepository] Retrieved payments for enrollment', 'rosca', { enrollmentId, count: payments.length });
      return payments;
    } catch (error) {
      logger.error('[RoscaRepository] Error getting payments', error, 'rosca');
      return [];
    }
  }

  /**
   * Save payments to local cache
   */
  public async savePayments(payments: RoscaPayment[]): Promise<void> {
    logger.debug('[RoscaRepository] Saving payments', 'rosca', { count: payments?.length || 0 });

    if (!(await this.isSQLiteAvailable())) {
      return;
    }

    if (!payments || payments.length === 0) {
      return;
    }

    try {
      const db = await this.getDatabase();

      for (const payment of payments) {
        const statement = await db.prepareAsync(`
          INSERT OR REPLACE INTO rosca_payments (
            id, enrollment_id, amount, currency_code, currency_symbol,
            period_start, period_end, periods_covered, payment_method,
            due_date, paid_at, days_late, late_fee_amount, late_fee_waived,
            status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        await statement.executeAsync(
          payment.id,
          payment.enrollmentId,
          payment.amount,
          payment.currencyCode,
          payment.currencySymbol,
          payment.periodStart,
          payment.periodEnd,
          payment.periodsCovered,
          payment.paymentMethod,
          payment.dueDate,
          payment.paidAt,
          payment.daysLate,
          payment.lateFeeAmount,
          payment.lateFeeWaived ? 1 : 0,
          payment.status,
          payment.createdAt,
          new Date().toISOString()
        );

        await statement.finalizeAsync();
      }

      logger.info('[RoscaRepository] Successfully saved payments', 'rosca', { count: payments.length });
    } catch (error) {
      logger.error('[RoscaRepository] Error saving payments', error, 'rosca');
    }
  }

  // ==================== Row Mappers ====================

  private mapRowToPool(row: any): RoscaPool {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      contributionAmount: Number(row.contribution_amount),
      currencyCode: row.currency_code,
      currencySymbol: row.currency_symbol,
      frequency: row.frequency,
      payoutMultiplier: Number(row.payout_multiplier),
      expectedPayout: Number(row.expected_payout),
      memberCount: Number(row.member_count || row.total_members || 0),
      totalMembers: Number(row.total_members),
      availableSlots: row.available_slots ? Number(row.available_slots) : null,
      minMembers: Number(row.min_members),
      maxMembers: row.max_members ? Number(row.max_members) : null,
      gracePeriodDays: Number(row.grace_period_days),
      status: row.status,
      // Cohort model fields
      startDate: row.start_date || null,
      endDate: row.end_date || null,
      registrationOpens: row.registration_opens || null,
      registrationDeadline: row.registration_deadline || null,
      durationPeriods: row.duration_periods ? Number(row.duration_periods) : null,
      cohortNumber: Number(row.cohort_number || 0),
    };
  }

  private mapRowToEnrollment(row: any): RoscaEnrollment {
    return {
      id: row.id,
      poolId: row.pool_id,
      poolName: row.pool_name,
      contributionAmount: Number(row.contribution_amount),
      currencyCode: row.currency_code,
      currencySymbol: row.currency_symbol,
      frequency: row.frequency,
      queuePosition: Number(row.queue_position),
      totalMembers: Number(row.total_members),
      totalContributed: Number(row.total_contributed),
      expectedPayout: Number(row.expected_payout),
      contributionsCount: Number(row.contributions_count),
      prepaidPeriods: Number(row.prepaid_periods),
      nextPaymentDue: row.next_payment_due,
      daysUntilNextPayment: Number(row.days_until_next_payment),
      status: row.status,
      isYourTurn: Boolean(row.is_your_turn),
      payoutReceived: Boolean(row.payout_received),
      pendingLateFees: Number(row.pending_late_fees),
      payoutDate: row.payout_date || null,
      joinedAt: row.joined_at,
    };
  }

  private mapRowToPayment(row: any): RoscaPayment {
    return {
      id: row.id,
      enrollmentId: row.enrollment_id,
      amount: Number(row.amount),
      currencyCode: row.currency_code,
      currencySymbol: row.currency_symbol,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      periodsCovered: Number(row.periods_covered),
      paymentMethod: row.payment_method,
      dueDate: row.due_date,
      paidAt: row.paid_at,
      daysLate: Number(row.days_late),
      lateFeeAmount: Number(row.late_fee_amount),
      lateFeeWaived: Boolean(row.late_fee_waived),
      status: row.status,
      createdAt: row.created_at,
    };
  }
}

// Export singleton instance
export const roscaRepository = RoscaRepository.getInstance();
