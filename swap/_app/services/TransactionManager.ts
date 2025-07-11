// Updated: Fixed duplicate transaction handling with proper deduplication - 2025-05-21
// Updated: Improved error handling and logging for better debugging - 2025-05-21
// Updated: Simplified for TanStack Query migration - 2025-01-10

import apiClient from '../_api/apiClient';
import { API_PATHS } from '../_api/apiPaths';
import { Transaction, CreateDirectTransactionDto, TransactionStatus } from '../types/transaction.types';
import { websocketService } from './websocketService';
import logger from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkService } from './NetworkService';
import { eventEmitter } from '../utils/eventEmitter';
import { transactionRepository } from '../localdb/TransactionRepository';

interface PendingTransaction {
  id: string;
  dto: CreateDirectTransactionDto;
  timestamp: number;
  retryCount: number;
  optimisticId: string;
    }
    
interface TransactionQueueItem {
  id: string;
  dto: CreateDirectTransactionDto;
  timestamp: number;
  retryCount: number;
}

class TransactionManager {
  private pendingTransactions: Map<string, PendingTransaction> = new Map();
  private outgoingQueue: Map<string, TransactionQueueItem> = new Map();
  private transactionStatusCache: Map<string, TransactionStatus> = new Map();
  private isProcessingQueue = false;
  private queueProcessingInterval: NodeJS.Timeout | null = null;
  private reconnectHandler: (() => void) | null = null;
  private readonly STORAGE_KEY = 'transaction_queue';
  private readonly QUEUE_PROCESSING_INTERVAL = 5000; // 5 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly DEDUPLICATION_WINDOW = 30000; // 30 seconds
  private lastRequestTime: Map<string, number> = new Map();
  private optimisticTransactionMap: Map<string, string> = new Map(); // optimisticId -> serverId

  constructor() {
    this.initialize();
  }
  
  // Initialize the transaction manager
  private initialize(): void {
    logger.info('[TransactionManager] Initializing TransactionManager service');
    
    // Start queue processing
    this.startQueueProcessing();
    
    // Load any pending transactions from storage
    this.loadQueueFromStorage();
    
    logger.info('[TransactionManager] Initialization complete');
  }
  
  /**
   * Get recent transactions from local repository
   */
  async getRecentTransactions(limit: number = 5): Promise<any[]> {
    try {
      logger.debug(`[TransactionManager] Getting ${limit} recent transactions from repository`);
      const transactions = await transactionRepository.getRecentTransactions(limit);
      return transactions;
    } catch (error) {
      logger.error('[TransactionManager] Failed to get recent transactions:', error);
      return [];
    }
  }

  /**
   * Get transactions for a specific account (PROFESSIONAL WALLET FILTERING)
   * 
   * This method calls the dedicated backend endpoint for account-specific transaction filtering.
   * When a user selects a wallet card, this provides efficient backend filtering.
   * 
   * @param accountId - The account ID to get transactions for
   * @param limit - Number of transactions to return (default: 20)
   * @param offset - Number of transactions to skip (default: 0)
   * @returns Paginated list of transactions for the specific account
   */
  async getTransactionsForAccount(accountId: string, limit: number = 20, offset: number = 0): Promise<any> {
    try {
      logger.debug(`[TransactionManager] Getting transactions for account: ${accountId} (limit: ${limit}, offset: ${offset})`);
      
      // Check if offline
      const isOffline = networkService.getNetworkState().isOfflineMode;
      if (isOffline) {
        logger.debug('[TransactionManager] Offline mode - cannot fetch account-specific transactions');
        return {
          data: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false
          }
        };
  }
  
      // Call the dedicated backend endpoint
      const response = await apiClient.get(`${API_PATHS.TRANSACTION.LIST}/account/${accountId}`, {
        params: {
          limit,
          offset
        }
      });
      
      if (response.status === 200) {
        const result = response.data.data || response.data;
        
        logger.info(`[TransactionManager] Retrieved ${result.data?.length || 0} transactions for account ${accountId}`);
        
        return result;
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
      
    } catch (error) {
      logger.error(`[TransactionManager] Failed to get transactions for account ${accountId}:`, error);
      
      // Return empty result on error
      return {
        data: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false
        }
      };
    }
  }

  /**
   * Create transaction with basic functionality
   */
  async createTransaction(dto: CreateDirectTransactionDto): Promise<Transaction | null> {
    try {
      // Check for recent duplicate requests
      const duplicateKey = `${dto.to_entity_id}:${dto.amount}`;
      const lastRequestTime = this.lastRequestTime.get(duplicateKey);
      const now = Date.now();
      
      if (lastRequestTime && (now - lastRequestTime) < this.DEDUPLICATION_WINDOW) {
        logger.warn('[TransactionManager] Duplicate transaction request blocked');
        return null;
      }
      
      // Update last request time
      this.lastRequestTime.set(duplicateKey, now);
      
      // Generate optimistic transaction ID
      const optimisticId = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info('[TransactionManager] Creating transaction', { optimisticId });
      
      // Check if offline
      const isOffline = networkService.getNetworkState().isOfflineMode;
      if (isOffline) {
        logger.debug('[TransactionManager] Offline mode - queuing transaction for later');
        
        // Add to queue for processing when online
        const queueItem: TransactionQueueItem = {
          id: optimisticId,
          dto,
          timestamp: Date.now(),
          retryCount: 0
        };
        
        this.outgoingQueue.set(optimisticId, queueItem);
        await this.saveQueueToStorage();
        
        // Return optimistic transaction
        const optimisticTransaction: Transaction = {
          id: optimisticId,
          ...dto,
          status: 'pending' as TransactionStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        return optimisticTransaction;
      }
      
      // Online - send to server immediately
      const response = await apiClient.post(API_PATHS.TRANSACTION.CREATE, dto);
      
      if (response.status === 201 || response.status === 200) {
        const transaction = response.data.data || response.data;
      
      // Map optimistic ID to server ID
        if (transaction.id) {
          this.optimisticTransactionMap.set(optimisticId, transaction.id);
        }
        
        logger.info('[TransactionManager] Transaction sent successfully', {
          optimisticId,
          serverId: transaction.id,
          status: transaction.status
        });
        
        // Cache transaction status
        this.transactionStatusCache.set(transaction.id, transaction.status);
        
        return transaction;
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
      
    } catch (error) {
      logger.error('[TransactionManager] Transaction creation failed', error);
      return null;
    }
  }
  
  // Get cached transaction status
  getTransactionStatus(transactionId: string): TransactionStatus | null {
    return this.transactionStatusCache.get(transactionId) || null;
  }
  
  private startQueueProcessing(): void {
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
    }
    
    this.queueProcessingInterval = setInterval(() => {
      this.processQueue();
    }, this.QUEUE_PROCESSING_INTERVAL);
      }
      
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.outgoingQueue.size === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      const queueItems = Array.from(this.outgoingQueue.values());
      
      for (const item of queueItems) {
        try {
          const response = await apiClient.post(API_PATHS.TRANSACTION.CREATE, item.dto);
          
          if (response.status === 201 || response.status === 200) {
            // Remove from queue on success
            this.outgoingQueue.delete(item.id);
            logger.debug('[TransactionManager] Queued transaction sent successfully', { id: item.id });
          } else {
            throw new Error(`Unexpected status: ${response.status}`);
          }
        } catch (error) {
          // Increment retry count
          item.retryCount++;
          
          if (item.retryCount >= this.MAX_RETRY_ATTEMPTS) {
            // Remove from queue after max retries
            this.outgoingQueue.delete(item.id);
            logger.warn('[TransactionManager] Transaction removed from queue after max retries', { id: item.id });
          } else {
            logger.debug('[TransactionManager] Transaction retry scheduled', { 
              id: item.id, 
              retryCount: item.retryCount 
          });
        }
      }
      }
      
      // Save updated queue
      await this.saveQueueToStorage();
      
    } catch (error) {
      logger.error('[TransactionManager] Error processing transaction queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }
  
  private async saveQueueToStorage(): Promise<void> {
      try {
      const queueArray = Array.from(this.outgoingQueue.entries());
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(queueArray));
      } catch (error) {
      logger.error('[TransactionManager] Failed to save queue to storage:', error);
      }
    }

  private async loadQueueFromStorage(): Promise<void> {
      try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const queueArray = JSON.parse(stored);
        this.outgoingQueue = new Map(queueArray);
        logger.debug(`[TransactionManager] Loaded ${this.outgoingQueue.size} items from queue storage`);
        }
      } catch (error) {
      logger.error('[TransactionManager] Failed to load queue from storage:', error);
      }
    }

  async clearQueue(): Promise<void> {
    this.outgoingQueue.clear();
    await this.saveQueueToStorage();
    logger.debug('[TransactionManager] Transaction queue cleared');
  }

  getQueueSize(): number {
    return this.outgoingQueue.size;
  }
  
  getPendingTransactions(): TransactionQueueItem[] {
    return Array.from(this.outgoingQueue.values());
  }

  cleanup(): void {
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
      this.queueProcessingInterval = null;
    }
    
    if (this.reconnectHandler) {
      this.reconnectHandler = null;
    }
    
    logger.debug('[TransactionManager] Cleanup completed');
  }
}

export const transactionManager = new TransactionManager(); 