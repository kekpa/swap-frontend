// Offline transaction queue service for WhatsApp-style offline reliability - 2025-01-25
// Handles transaction queueing when offline with automatic retry when online

import { MMKV } from 'react-native-mmkv';
import { CreateDirectTransactionDto } from '../types/transaction.types';
import { networkService } from './NetworkService';
import { transactionManager } from './TransactionManager';
import logger from '../utils/logger';

// Storage instance for offline queue
const queueStorage = new MMKV({
  id: 'offline-transaction-queue',
  encryptionKey: 'swap-offline-queue-2025'
});

interface QueuedTransaction {
  id: string;
  transaction: CreateDirectTransactionDto & {
    senderAccountId: string;
    senderEntityId: string;
    recipientName: string;
    recipientInitials: string;
  };
  createdAt: string;
  retryCount: number;
  lastRetryAt?: string;
  status: 'pending' | 'retrying' | 'failed' | 'completed';
}

class OfflineTransactionQueue {
  private readonly QUEUE_KEY = 'queued_transactions';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private isProcessing = false;
  private listeners: ((queue: QueuedTransaction[]) => void)[] = [];

  constructor() {
    // Listen for network state changes to auto-retry
    networkService.onNetworkStateChange((state) => {
      if (state.isOnline && !this.isProcessing) {
        logger.debug('[OfflineQueue] 🌐 ONLINE: Auto-processing queued transactions');
        this.processQueue();
      }
    });
  }

  /**
   * Add transaction to offline queue
   */
  async queueTransaction(transaction: QueuedTransaction['transaction']): Promise<string> {
    const queuedTransaction: QueuedTransaction = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transaction,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };

    try {
      const queue = this.getQueue();
      queue.push(queuedTransaction);
      this.saveQueue(queue);

      logger.info(`[OfflineQueue] ➕ QUEUED: Transaction ${queuedTransaction.id} added to offline queue`);
      this.notifyListeners(queue);

      // Auto-process if we're online
      if (networkService.isOnline()) {
        setTimeout(() => this.processQueue(), 1000);
      }

      return queuedTransaction.id;
    } catch (error) {
      logger.error('[OfflineQueue] ❌ QUEUE ERROR: Failed to queue transaction:', error);
      throw new Error('Failed to queue transaction for offline processing');
    }
  }

  /**
   * Get all queued transactions
   */
  getQueue(): QueuedTransaction[] {
    try {
      const queueData = queueStorage.getString(this.QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      logger.error('[OfflineQueue] ❌ READ ERROR: Failed to read queue:', error);
      return [];
    }
  }

  /**
   * Get pending transactions count
   */
  getPendingCount(): number {
    const queue = this.getQueue();
    return queue.filter(tx => tx.status === 'pending' || tx.status === 'retrying').length;
  }

  /**
   * Process all queued transactions
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      logger.debug('[OfflineQueue] ⏳ BUSY: Queue processing already in progress');
      return;
    }

    if (!networkService.isOnline()) {
      logger.debug('[OfflineQueue] 📱 OFFLINE: Skipping queue processing - no network');
      return;
    }

    this.isProcessing = true;
    const queue = this.getQueue();
    const pendingTransactions = queue.filter(tx => 
      tx.status === 'pending' || tx.status === 'retrying'
    );

    if (pendingTransactions.length === 0) {
      logger.debug('[OfflineQueue] ✅ EMPTY: No transactions to process');
      this.isProcessing = false;
      return;
    }

    logger.info(`[OfflineQueue] 🔄 PROCESSING: Starting to process ${pendingTransactions.length} queued transactions`);

    for (const queuedTx of pendingTransactions) {
      try {
        await this.processTransaction(queuedTx);
      } catch (error) {
        logger.warn(`[OfflineQueue] ⚠️ PROCESS ERROR: Failed to process transaction ${queuedTx.id}:`, error);
      }
    }

    this.isProcessing = false;
    logger.info('[OfflineQueue] ✅ COMPLETED: Finished processing queue');
  }

  /**
   * Process a single transaction
   */
  private async processTransaction(queuedTx: QueuedTransaction): Promise<void> {
    logger.debug(`[OfflineQueue] 🎯 PROCESSING: Transaction ${queuedTx.id} (attempt ${queuedTx.retryCount + 1})`);

    // Update status to retrying
    this.updateTransactionStatus(queuedTx.id, 'retrying');

    try {
      // Execute the transaction
      const result = await transactionManager.createDirectTransaction(queuedTx.transaction);
      
      // Success! Remove from queue
      this.removeTransaction(queuedTx.id);
      logger.info(`[OfflineQueue] ✅ SUCCESS: Transaction ${queuedTx.id} completed successfully`);

    } catch (error: any) {
      logger.warn(`[OfflineQueue] ❌ RETRY: Transaction ${queuedTx.id} failed:`, error.message);

      const queue = this.getQueue();
      const txIndex = queue.findIndex(tx => tx.id === queuedTx.id);
      
      if (txIndex >= 0) {
        queue[txIndex].retryCount++;
        queue[txIndex].lastRetryAt = new Date().toISOString();

        if (queue[txIndex].retryCount >= this.MAX_RETRIES) {
          // Max retries reached - mark as failed
          queue[txIndex].status = 'failed';
          logger.error(`[OfflineQueue] 💀 FAILED: Transaction ${queuedTx.id} failed after ${this.MAX_RETRIES} attempts`);
        } else {
          // Schedule retry
          queue[txIndex].status = 'pending';
          logger.debug(`[OfflineQueue] 🔁 RETRY: Will retry transaction ${queuedTx.id} in ${this.RETRY_DELAY}ms`);
        }

        this.saveQueue(queue);
        this.notifyListeners(queue);
      }
    }
  }

  /**
   * Update transaction status
   */
  private updateTransactionStatus(id: string, status: QueuedTransaction['status']): void {
    const queue = this.getQueue();
    const txIndex = queue.findIndex(tx => tx.id === id);
    
    if (txIndex >= 0) {
      queue[txIndex].status = status;
      this.saveQueue(queue);
      this.notifyListeners(queue);
    }
  }

  /**
   * Remove transaction from queue
   */
  removeTransaction(id: string): void {
    const queue = this.getQueue();
    const filteredQueue = queue.filter(tx => tx.id !== id);
    this.saveQueue(filteredQueue);
    this.notifyListeners(filteredQueue);
    logger.debug(`[OfflineQueue] 🗑️ REMOVED: Transaction ${id} removed from queue`);
  }

  /**
   * Clear all transactions (including failed ones)
   */
  clearQueue(): void {
    queueStorage.delete(this.QUEUE_KEY);
    this.notifyListeners([]);
    logger.info('[OfflineQueue] 🧹 CLEARED: All transactions removed from queue');
  }

  /**
   * Clear only failed transactions
   */
  clearFailedTransactions(): void {
    const queue = this.getQueue();
    const activeQueue = queue.filter(tx => tx.status !== 'failed');
    this.saveQueue(activeQueue);
    this.notifyListeners(activeQueue);
    logger.info('[OfflineQueue] 🧹 CLEARED: Failed transactions removed from queue');
  }

  /**
   * Retry all failed transactions
   */
  retryFailedTransactions(): void {
    const queue = this.getQueue();
    let hasChanges = false;

    for (const tx of queue) {
      if (tx.status === 'failed') {
        tx.status = 'pending';
        tx.retryCount = 0;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.saveQueue(queue);
      this.notifyListeners(queue);
      logger.info('[OfflineQueue] 🔄 RETRY: All failed transactions reset for retry');

      // Auto-process if online
      if (networkService.isOnline()) {
        setTimeout(() => this.processQueue(), 1000);
      }
    }
  }

  /**
   * Save queue to storage
   */
  private saveQueue(queue: QueuedTransaction[]): void {
    try {
      queueStorage.set(this.QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      logger.error('[OfflineQueue] ❌ SAVE ERROR: Failed to save queue:', error);
    }
  }

  /**
   * Subscribe to queue changes
   */
  onQueueChange(listener: (queue: QueuedTransaction[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of queue changes
   */
  private notifyListeners(queue: QueuedTransaction[]): void {
    for (const listener of this.listeners) {
      try {
        listener(queue);
      } catch (error) {
        logger.warn('[OfflineQueue] ⚠️ LISTENER ERROR: Queue listener failed:', error);
      }
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    total: number;
    pending: number;
    retrying: number;
    failed: number;
    oldest?: string;
  } {
    const queue = this.getQueue();
    const stats = {
      total: queue.length,
      pending: queue.filter(tx => tx.status === 'pending').length,
      retrying: queue.filter(tx => tx.status === 'retrying').length,
      failed: queue.filter(tx => tx.status === 'failed').length,
      oldest: queue.length > 0 ? queue[0].createdAt : undefined,
    };

    return stats;
  }

  /**
   * Reset all internal state - primarily for testing
   * @internal
   */
  reset(): void {
    this.isProcessing = false;
    this.listeners = [];
    logger.debug('[OfflineQueue] Reset completed');
  }
}

// Export singleton instance
export const offlineTransactionQueue = new OfflineTransactionQueue();

export default offlineTransactionQueue;