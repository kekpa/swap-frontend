// Created: Local SQLite transaction storage for offline capability - 2025-05-22
// Updated: Completely refactored to use centralized DatabaseManager - 2025-05-29
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import logger from '../utils/logger';
import { TimelineItem, TransactionTimelineItem } from '../types/timeline.types';
import { Transaction } from '../types/transaction.types';
import { databaseManager } from './DatabaseManager';
import { eventEmitter } from '../utils/eventEmitter';

// Transaction repository interface for database operations
interface DatabaseTransaction {
  id: string;
  interaction_id: string;
  from_account_id?: string;
  to_account_id?: string;
  amount: number;
  currency_id: string;
  status?: string;
  created_at: string;
  exchange_rate?: number;
  business_location_id?: string;
  transaction_type: string;
  description?: string;
  metadata?: any;
  reversing_transaction_id?: string;
  from_entity_id?: string;
  to_entity_id?: string;
  entry_type?: string;
}

/**
 * Professional transaction repository using centralized database management
 */
export class TransactionRepository {
  private static instance: TransactionRepository;

  public static getInstance(): TransactionRepository {
    if (!TransactionRepository.instance) {
      TransactionRepository.instance = new TransactionRepository();
    }
    return TransactionRepository.instance;
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
      logger.debug(`[TransactionRepository] Database ready: ${available}`);
      
      if (Platform.OS === 'web') {
        logger.debug('[TransactionRepository] Platform is web, SQLite not supported');
        return false;
      }
      
      return available;
    } catch (error) {
      logger.debug('[TransactionRepository] Database not available:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Ensure interaction exists in local database before saving transactions
   */
  private async ensureInteractionExists(db: SQLite.SQLiteDatabase, interactionId: string): Promise<void> {
    try {
      // Check if interaction already exists
      const existingInteraction = await db.getFirstAsync(
        'SELECT id FROM interactions WHERE id = ?',
        [interactionId]
      );

      if (!existingInteraction) {
        // Create a minimal interaction record
        await db.runAsync(
          `INSERT OR IGNORE INTO interactions (
            id, name, is_group, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            interactionId,
            'Unknown Interaction', // Default name
            0, // Not a group by default
            new Date().toISOString(),
            new Date().toISOString()
          ]
        );
        
        logger.debug(`[TransactionRepository] Created minimal interaction record: ${interactionId}`);
      }
    } catch (error) {
      logger.error(`[TransactionRepository] Error ensuring interaction exists: ${error}`, 'transaction_repository');
      throw error;
    }
  }

  /**
   * Insert a single transaction into the database
   */
  private async insertTransaction(db: SQLite.SQLiteDatabase, transaction: DatabaseTransaction): Promise<void> {
    // Ensure the interaction exists first
    await this.ensureInteractionExists(db, transaction.interaction_id);
    
    logger.debug(`[TransactionRepository] Inserting transaction: ${transaction.id}`);
    
    await db.runAsync(
      `INSERT OR REPLACE INTO transactions (
        id, interaction_id, from_account_id, to_account_id, amount, currency_id, 
        status, created_at, exchange_rate, business_location_id, transaction_type, 
        description, metadata, reversing_transaction_id, from_entity_id, to_entity_id, 
        entry_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
      transaction.id,
      transaction.interaction_id,
        transaction.from_account_id || null,
      transaction.to_account_id || null,
      transaction.amount,
        transaction.currency_id,
      transaction.status || 'pending',
        transaction.created_at,
      transaction.exchange_rate || null,
      transaction.business_location_id || null,
        transaction.transaction_type || 'transfer',
      transaction.description || null,
        transaction.metadata ? JSON.stringify(transaction.metadata) : null,
      transaction.reversing_transaction_id || null,
        transaction.from_entity_id || null,
        transaction.to_entity_id || null,
        transaction.entry_type || null
      ]
    );
    
    logger.info(`[TransactionRepository] Successfully saved transaction: ${transaction.id}`);
  }

/**
 * Get transactions for an interaction with optional user perspective filtering
   */
  public async getTransactionsForInteraction(
  interactionId: string,
  limit = 100,
    currentUserEntityId?: string
  ): Promise<TransactionTimelineItem[]> {
    logger.debug(`[TransactionRepository] Getting transactions for interaction: ${interactionId}, limit: ${limit}, userEntityId: ${currentUserEntityId || 'none'}`);
    
    if (!(await this.isSQLiteAvailable())) {
      logger.warn(`[TransactionRepository] SQLite not available, returning empty array for: ${interactionId}`);
    return [];
  }
  
  try {
      const db = await this.getDatabase();
      
    let sql = `
      SELECT * FROM transactions 
      WHERE interaction_id = ? 
    `;
    let params: any[] = [interactionId];
    
      // Apply user perspective filtering for double-entry transactions
    if (currentUserEntityId) {
        logger.debug(`[TransactionRepository] Applying user perspective filtering for entity: ${currentUserEntityId}`);
      
      sql += ` AND (
          from_entity_id = ? OR 
          to_entity_id = ? OR
        entry_type IS NULL OR
          entry_type = ''
      )`;
        params.push(currentUserEntityId, currentUserEntityId);
    }
    
    sql += ` ORDER BY datetime(created_at) DESC LIMIT ?`;
    params.push(limit);
    
      const statement = await db.prepareAsync(sql);
      const result = await statement.executeAsync(...params);
      const rows = await result.getAllAsync() as Record<string, any>[];
      await statement.finalizeAsync();
      
      logger.debug(`[TransactionRepository] Retrieved ${rows.length} transactions from DB for interaction: ${interactionId}`);
    
    // Convert to TransactionTimelineItem format
    const transactions: TransactionTimelineItem[] = rows.map((row: any) => ({
      id: String(row.id),
      interaction_id: String(row.interaction_id),
      itemType: 'transaction',
      type: 'transaction',
      from_account_id: String(row.from_account_id),
      to_account_id: row.to_account_id ? String(row.to_account_id) : undefined,
      amount: Number(row.amount),
      currency_id: String(row.currency_id),
      timestamp: String(row.created_at),
      createdAt: String(row.created_at),
        status: String(row.status) as any,
      from_entity_id: row.from_entity_id ? String(row.from_entity_id) : undefined,
      to_entity_id: row.to_entity_id ? String(row.to_entity_id) : undefined,
        transaction_type: String(row.transaction_type) as any,
      description: row.description,
      metadata: typeof row.metadata === 'string' && row.metadata 
        ? { 
            ...JSON.parse(row.metadata), 
              entry_type: row.entry_type
          }
        : { 
              entry_type: row.entry_type
          }
    }));
    
    logger.info(`[TransactionRepository] Successfully parsed ${transactions.length} transactions for interaction: ${interactionId}${currentUserEntityId ? ` (filtered for user: ${currentUserEntityId})` : ''}`);
    return transactions;
      
  } catch (error) {
      logger.error(`[TransactionRepository] Error getting transactions for interaction ${interactionId}: ${error instanceof Error ? error.message : String(error)}`);
    return [];
    }
  }

  /**
   * Save multiple transactions with deduplication
   */
  public async saveTransactions(transactionsToSave: Transaction[]): Promise<void> {
    logger.debug(`[TransactionRepository] Saving ${transactionsToSave?.length || 0} transactions`);
    
    if (!(await this.isSQLiteAvailable())) {
      logger.warn('[TransactionRepository] SQLite not available, aborting save');
    return;
  }
  
  if (!transactionsToSave || transactionsToSave.length === 0) {
      logger.debug('[TransactionRepository] No transactions to save');
    return;
  }
  
    // Deduplicate transactions by ID
  const uniqueTransactions = new Map<string, Transaction>();
  transactionsToSave.forEach(tx => {
    if (tx.id && tx.interaction_id) {
      if (!uniqueTransactions.has(tx.id)) {
        uniqueTransactions.set(tx.id, tx);
      } else {
          logger.debug(`[TransactionRepository] Skipping duplicate transaction: ${tx.id}`);
        }
    }
  });
  
  const deduplicatedTransactions = Array.from(uniqueTransactions.values());
    logger.info(`[TransactionRepository] Deduplication removed ${transactionsToSave.length - deduplicatedTransactions.length} duplicates`);
  
  let successfulSaves = 0;
  let failedSaves = 0;
  
  for (const tx of deduplicatedTransactions) {
    try {
        // Convert Transaction to DatabaseTransaction format
        const dbTransaction: DatabaseTransaction = {
          id: tx.id,
          interaction_id: tx.interaction_id || 'unknown_interaction',
          from_account_id: tx.from_account_id,
          to_account_id: tx.to_account_id,
          amount: tx.amount,
          currency_id: (tx.currency_id as any) || (tx as any).currency || (tx as any).currency_code || 'USD',
          status: tx.status || 'pending',
          created_at: tx.created_at || (tx as any).createdAt || (tx as any).timestamp || new Date().toISOString(),
          exchange_rate: tx.exchange_rate,
          business_location_id: tx.business_location_id,
          transaction_type: tx.transaction_type,
          description: tx.description,
          metadata: tx.metadata,
          reversing_transaction_id: tx.reversing_transaction_id,
          from_entity_id: (tx as any).from_entity_id,
          to_entity_id: (tx as any).to_entity_id,
          entry_type: (tx as any).entry_type
        };
        
        const db = await this.getDatabase();
        await this.insertTransaction(db, dbTransaction);
      successfulSaves++;
    } catch (error) {
      failedSaves++;
        logger.warn(`[TransactionRepository] Failed to save transaction ${tx.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  logger.info(`[TransactionRepository] Save batch complete. Successful: ${successfulSaves}, Failed: ${failedSaves}`);
  }

/**
 * Update transaction status
 */
  public async updateTransactionStatus(transactionId: string, status: string): Promise<void> {
    logger.debug(`[TransactionRepository] Updating status for transaction: ${transactionId} to ${status}`);
    
    if (!(await this.isSQLiteAvailable())) {
      logger.warn(`[TransactionRepository] SQLite not available for status update: ${transactionId}`);
    return;
  }
  
  try {
      const db = await this.getDatabase();
      const statement = await db.prepareAsync('UPDATE transactions SET status = ? WHERE id = ?');
      const result = await statement.executeAsync(status, transactionId);
      await statement.finalizeAsync();
      
      logger.info(`[TransactionRepository] Updated status for transaction ${transactionId} to ${status}. Changes: ${result.changes}`);
      
    } catch (error) {
      logger.error(`[TransactionRepository] Error updating status for transaction ${transactionId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if we have local transactions for an interaction
   */
  public async hasLocalTransactions(interactionId: string): Promise<boolean> {
    logger.debug(`[TransactionRepository] Checking for local transactions: ${interactionId}`);
    
    if (!(await this.isSQLiteAvailable())) {
      logger.warn(`[TransactionRepository] SQLite not available for hasLocalTransactions: ${interactionId}`);
    return false;
  }
  
  try {
      const transactions = await this.getTransactionsForInteraction(interactionId, 1);
    const found = transactions.length > 0;
      logger.info(`[TransactionRepository] Local transactions for ${interactionId}: ${found ? 'FOUND' : 'NOT FOUND'}`);
    return found;
  } catch (error) {
      logger.error(`[TransactionRepository] Error checking local transactions for ${interactionId}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
    }
  }

  /**
   * Add or update a transaction in local database
   */
  public async upsertTransaction(transaction: any): Promise<void> { // TODO: type
    try {
      const db = await this.getDatabase();
      await db.runAsync(
        `INSERT OR REPLACE INTO transactions (id, from_account_id, to_account_id, amount, currency_id, status, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transaction.id,
          transaction.from_account_id ?? '',
          transaction.to_account_id ?? '',
          transaction.amount ?? 0,
          transaction.currency_id ?? '',
          transaction.status ?? '',
          transaction.created_at ?? '',
          JSON.stringify(transaction.metadata ?? {})
        ]
      );
      eventEmitter.emit('data_updated', { type: 'transactions', data: transaction });
    } catch (error) {
      // handle error
    }
  }

  /**
   * Delete a transaction from local database
   */
  public async deleteTransaction(id: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
      eventEmitter.emit('data_updated', { type: 'transactions', data: { id, removed: true } });
    } catch (error) {
      // handle error
    }
  }

  /**
   * Get recent transactions across all interactions
   */
  public async getRecentTransactions(limit = 5): Promise<TransactionTimelineItem[]> {
    logger.debug(`[TransactionRepository] Getting ${limit} recent transactions`);
    
    if (!(await this.isSQLiteAvailable())) {
      logger.warn('[TransactionRepository] SQLite not available, returning empty array for recent transactions');
      return [];
    }
    
    try {
      const db = await this.getDatabase();
      
      const sql = `
        SELECT * FROM transactions 
        ORDER BY datetime(created_at) DESC 
        LIMIT ?
      `;
      
      const rows = await db.getAllAsync(sql, [limit]);
      
      if (!rows || rows.length === 0) {
        logger.debug('[TransactionRepository] No recent transactions found in local database');
        return [];
      }
      
      logger.debug(`[TransactionRepository] Found ${rows.length} recent transactions in local database`);
      
      // Transform to TransactionTimelineItem format
      const transactions: TransactionTimelineItem[] = rows.map((row: any) => ({
        id: String(row.id),
        type: 'transaction' as const,
        interaction_id: String(row.interaction_id),
        from_account_id: row.from_account_id ? String(row.from_account_id) : undefined,
        to_account_id: row.to_account_id ? String(row.to_account_id) : undefined,
        amount: Number(row.amount),
        currency_id: String(row.currency_id),
        timestamp: String(row.created_at),
        createdAt: String(row.created_at),
        status: String(row.status) as any,
        from_entity_id: row.from_entity_id ? String(row.from_entity_id) : undefined,
        to_entity_id: row.to_entity_id ? String(row.to_entity_id) : undefined,
        transaction_type: String(row.transaction_type) as any,
        description: row.description,
        metadata: typeof row.metadata === 'string' && row.metadata 
          ? { 
              ...JSON.parse(row.metadata), 
              entry_type: row.entry_type
            }
          : { 
              entry_type: row.entry_type
            }
      }));
      
      logger.info(`[TransactionRepository] Successfully parsed ${transactions.length} recent transactions`);
      return transactions;
      
    } catch (error) {
      logger.error(`[TransactionRepository] Error getting recent transactions: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Background sync: fetch from remote, update local, emit event
   */
  public async syncTransactionsFromRemote(fetchRemote: () => Promise<any[]>): Promise<void> { // TODO: type
    try {
      const remoteTransactions = await fetchRemote();
      for (const transaction of remoteTransactions) {
        await this.upsertTransaction(transaction);
      }
      eventEmitter.emit('data_updated', { type: 'transactions', data: remoteTransactions });
    } catch (error) {
      // handle error
    }
  }
}

// Export singleton instance
export const transactionRepository = TransactionRepository.getInstance();
export default transactionRepository; 