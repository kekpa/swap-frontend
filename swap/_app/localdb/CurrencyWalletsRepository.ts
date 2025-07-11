// Created: Currency wallets repository for local SQLite database - 2025-01-09

import * as SQLite from 'expo-sqlite';
import logger from '../utils/logger';
import { databaseManager } from './DatabaseManager';
import { eventEmitter } from '../utils/eventEmitter';
import { Platform } from 'react-native';

export interface CurrencyWallet {
  id: string;
  account_id: string;
  currency_id: string;
  currency_code: string;
  currency_symbol: string;
  currency_name: string;
  balance: number;
  reserved_balance: number;
  available_balance: number;
  balance_last_updated?: string;
  is_active: boolean;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
  is_synced?: boolean;
}

export class CurrencyWalletsRepository {
  private static instance: CurrencyWalletsRepository;

  public static getInstance(): CurrencyWalletsRepository {
    if (!CurrencyWalletsRepository.instance) {
      CurrencyWalletsRepository.instance = new CurrencyWalletsRepository();
    }
    return CurrencyWalletsRepository.instance;
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
      logger.debug(`[CurrencyWalletsRepository] Database ready: ${available}`);
      
      if (Platform.OS === 'web') {
        logger.debug('[CurrencyWalletsRepository] Platform is web, SQLite not supported');
        return false;
      }
      
      return available;
    } catch (error) {
      logger.debug('[CurrencyWalletsRepository] Database not available:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Insert or update a currency wallet with optimistic UI updates
   */
  public async insertCurrencyWallet(wallet: CurrencyWallet): Promise<void> {
    logger.debug(`[CurrencyWalletsRepository] Inserting currency wallet: ${wallet.id}`);
    
    if (!(await this.isSQLiteAvailable())) {
      logger.warn(`[CurrencyWalletsRepository] SQLite not available, aborting save for: ${wallet.id}`);
      return;
    }
    
    if (!wallet.id || !wallet.account_id || !wallet.currency_id) {
      logger.warn('[CurrencyWalletsRepository] Missing required fields (id, account_id, currency_id), aborting save');
      return;
    }
    
    try {
      const db = await this.getDatabase();
      const statement = await db.prepareAsync(`
        INSERT OR REPLACE INTO currency_wallets (
          id, account_id, currency_id, currency_code, currency_symbol, currency_name,
          balance, reserved_balance, available_balance, balance_last_updated,
          is_active, is_primary, created_at, updated_at, is_synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      await statement.executeAsync(
        wallet.id,
        wallet.account_id,
        wallet.currency_id,
        wallet.currency_code,
        wallet.currency_symbol,
        wallet.currency_name,
        wallet.balance,
        wallet.reserved_balance,
        wallet.available_balance,
        wallet.balance_last_updated || new Date().toISOString(),
        wallet.is_active ? 1 : 0,
        wallet.is_primary ? 1 : 0,
        wallet.created_at || new Date().toISOString(),
        wallet.updated_at || new Date().toISOString(),
        1 // Mark as synced since it came from API
      );
      
      await statement.finalizeAsync();
      logger.info(`[CurrencyWalletsRepository] Successfully saved currency wallet: ${wallet.id}`);
      
      // Emit event for real-time UI updates
      eventEmitter.emit('data_updated', { type: 'wallets', data: wallet });
      
    } catch (error) {
      logger.error(`[CurrencyWalletsRepository] Error saving currency wallet ${wallet.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all currency wallets from local database
   */
  public async getAllCurrencyWallets(): Promise<CurrencyWallet[]> {
    logger.debug('[CurrencyWalletsRepository] Getting all currency wallets from local database');
    
    if (!(await this.isSQLiteAvailable())) {
      logger.debug('[CurrencyWalletsRepository] SQLite not available, returning empty array');
      return [];
    }
    
    try {
      const db = await this.getDatabase();
      const result = await db.getAllAsync(`
        SELECT * FROM currency_wallets 
        WHERE is_active = 1 
        ORDER BY is_primary DESC, currency_code ASC
      `);
      
      const wallets = result.map((row: any) => ({
        id: row.id as string,
        account_id: row.account_id as string,
        currency_id: row.currency_id as string,
        currency_code: row.currency_code as string,
        currency_symbol: row.currency_symbol as string,
        currency_name: row.currency_name as string,
        balance: Number(row.balance),
        reserved_balance: Number(row.reserved_balance),
        available_balance: Number(row.available_balance),
        balance_last_updated: row.balance_last_updated as string,
        is_active: Boolean(row.is_active),
        is_primary: Boolean(row.is_primary),
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        is_synced: Boolean(row.is_synced),
      }));
      
      logger.debug(`[CurrencyWalletsRepository] Retrieved ${wallets.length} currency wallets from local database`);
      return wallets;
    } catch (error) {
      logger.error('[CurrencyWalletsRepository] Error getting currency wallets:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Save multiple currency wallets with deduplication and batch processing
   */
  public async saveCurrencyWallets(walletsToSave: CurrencyWallet[]): Promise<void> {
    logger.debug(`[CurrencyWalletsRepository] Saving ${walletsToSave?.length || 0} currency wallets`);
    
    if (!(await this.isSQLiteAvailable())) {
      logger.warn('[CurrencyWalletsRepository] SQLite not available, aborting save');
      return;
    }
    
    if (!walletsToSave || walletsToSave.length === 0) {
      logger.debug('[CurrencyWalletsRepository] No wallets to save');
      return;
    }
    
    // Deduplicate wallets by ID
    const uniqueWallets = new Map<string, CurrencyWallet>();
    walletsToSave.forEach(wallet => {
      if (wallet.id) {
        uniqueWallets.set(wallet.id, wallet);
      }
    });
    
    const deduplicatedWallets = Array.from(uniqueWallets.values());
    logger.info(`[CurrencyWalletsRepository] Deduplication removed ${walletsToSave.length - deduplicatedWallets.length} duplicates`);
    
    let successfulSaves = 0;
    let failedSaves = 0;
    
    // Process in batches for better performance
    const batchSize = 10;
    for (let i = 0; i < deduplicatedWallets.length; i += batchSize) {
      const batch = deduplicatedWallets.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (wallet) => {
        try {
          await this.insertCurrencyWallet(wallet);
          successfulSaves++;
        } catch (error) {
          failedSaves++;
          logger.warn(`[CurrencyWalletsRepository] Failed to save currency wallet ${wallet.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }));
    }
    
    logger.info(`[CurrencyWalletsRepository] Save batch complete. Successful: ${successfulSaves}, Failed: ${failedSaves}`);
  }

  /**
   * Alias for saveCurrencyWallets - for compatibility with BalanceManager
   */
  public async saveWalletBalances(walletsToSave: CurrencyWallet[]): Promise<void> {
    return this.saveCurrencyWallets(walletsToSave);
  }

  /**
   * Clear all currency wallets from local database
   */
  public async clearAllCurrencyWallets(): Promise<void> {
    logger.debug('[CurrencyWalletsRepository] Clearing all currency wallets');
    
    if (!(await this.isSQLiteAvailable())) {
      logger.warn('[CurrencyWalletsRepository] SQLite not available, aborting clear');
      return;
    }
    
    try {
      const db = await this.getDatabase();
      const statement = await db.prepareAsync('DELETE FROM currency_wallets');
      await statement.executeAsync();
      await statement.finalizeAsync();
      
      logger.info('[CurrencyWalletsRepository] Successfully cleared all currency wallets');
    } catch (error) {
      logger.error('[CurrencyWalletsRepository] Error clearing currency wallets:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Update primary wallet status
   */
  public async updatePrimaryWallet(walletId: string): Promise<void> {
    logger.debug(`[CurrencyWalletsRepository] Setting wallet ${walletId} as primary`);
    
    if (!(await this.isSQLiteAvailable())) {
      logger.warn('[CurrencyWalletsRepository] SQLite not available, aborting update');
      return;
    }
    
    try {
      const db = await this.getDatabase();
      
      // First, set all wallets to non-primary
      await db.runAsync('UPDATE currency_wallets SET is_primary = 0, updated_at = ?', [new Date().toISOString()]);
      
      // Then set the selected wallet as primary
      await db.runAsync('UPDATE currency_wallets SET is_primary = 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), walletId]);
      
      logger.info(`[CurrencyWalletsRepository] Successfully updated primary wallet to: ${walletId}`);
      
      // Emit event for real-time UI updates
      eventEmitter.emit('data_updated', { type: 'primary_wallet_changed', data: { walletId } });
      
    } catch (error) {
      logger.error(`[CurrencyWalletsRepository] Error updating primary wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get wallet by currency code
   */
  public async getWalletByCurrencyCode(currencyCode: string): Promise<CurrencyWallet | null> {
    logger.debug(`[CurrencyWalletsRepository] Getting wallet for currency: ${currencyCode}`);
    
    if (!(await this.isSQLiteAvailable())) {
      logger.debug('[CurrencyWalletsRepository] SQLite not available, returning null');
      return null;
    }
    
    try {
      const db = await this.getDatabase();
      const result = await db.getFirstAsync(`
        SELECT * FROM currency_wallets 
        WHERE currency_code = ? AND is_active = 1
      `, [currencyCode]);
      
      if (!result) {
        return null;
      }
      
      const row = result as any;
      return {
        id: row.id as string,
        account_id: row.account_id as string,
        currency_id: row.currency_id as string,
        currency_code: row.currency_code as string,
        currency_symbol: row.currency_symbol as string,
        currency_name: row.currency_name as string,
        balance: Number(row.balance),
        reserved_balance: Number(row.reserved_balance),
        available_balance: Number(row.available_balance),
        balance_last_updated: row.balance_last_updated as string,
        is_active: Boolean(row.is_active),
        is_primary: Boolean(row.is_primary),
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        is_synced: Boolean(row.is_synced),
      };
    } catch (error) {
      logger.error(`[CurrencyWalletsRepository] Error getting wallet for currency ${currencyCode}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Background sync: fetch from remote, update local, emit event
   */
  public async syncWalletsFromRemote(fetchRemote: () => Promise<any[]>): Promise<void> {
    try {
      const remoteWallets = await fetchRemote();
      for (const wallet of remoteWallets) {
        await this.insertCurrencyWallet(wallet);
      }
      eventEmitter.emit('data_updated', { type: 'wallets', data: remoteWallets });
    } catch (error) {
      logger.error('Background wallet sync failed', error);
      // Fail silently to not disrupt user experience
    }
  }
}

// Export singleton instance
export const currencyWalletsRepository = CurrencyWalletsRepository.getInstance(); 