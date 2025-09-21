// KYC offline queue service for WhatsApp-style offline reliability - 2025-01-25
// Handles KYC operation queueing when offline with automatic retry when online
// Extends the proven OfflineTransactionQueue pattern for KYC operations

import { MMKV } from 'react-native-mmkv';
import { networkService } from './NetworkService';
import apiClient from '../_api/apiClient';
import logger from '../utils/logger';
import { KycStepType } from '../hooks-actions/useKycCompletion';

// Storage instance for KYC offline queue
const kycQueueStorage = new MMKV({
  id: 'offline-kyc-queue',
  encryptionKey: 'swap-kyc-offline-queue-2025'
});

interface QueuedKycOperation {
  id: string;
  stepType: KycStepType;
  data: any;
  entityId: string;
  apiEndpoint: string;
  createdAt: string;
  retryCount: number;
  lastRetryAt?: string;
  status: 'pending' | 'retrying' | 'failed' | 'completed';
}

class KycOfflineQueue {
  private readonly QUEUE_KEY = 'queued_kyc_operations';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private isProcessing = false;
  private listeners: ((queue: QueuedKycOperation[]) => void)[] = [];

  constructor() {
    // Listen for network state changes to auto-retry
    networkService.onNetworkStateChange((state) => {
      if (state.isConnected && !this.isProcessing) {
        logger.debug('[KycOfflineQueue] 🌐 ONLINE: Auto-processing queued KYC operations');
        this.processQueue();
      }
    });
  }

  /**
   * Add KYC operation to offline queue
   */
  async queueKycOperation(
    stepType: KycStepType,
    data: any,
    entityId: string,
    apiEndpoint: string
  ): Promise<string> {
    const queuedOperation: QueuedKycOperation = {
      id: `kyc_offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      stepType,
      data,
      entityId,
      apiEndpoint,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };

    try {
      const queue = this.getQueue();
      queue.push(queuedOperation);
      this.saveQueue(queue);

      logger.info(`[KycOfflineQueue] ➕ QUEUED: KYC operation ${stepType} (${queuedOperation.id}) added to offline queue`);
      this.notifyListeners(queue);

      // Auto-process if we're online
      if (networkService.isOnline()) {
        setTimeout(() => this.processQueue(), 1000);
      }

      return queuedOperation.id;
    } catch (error) {
      logger.error('[KycOfflineQueue] ❌ QUEUE ERROR: Failed to queue KYC operation:', error);
      throw new Error('Failed to queue KYC operation for offline processing');
    }
  }

  /**
   * Get all queued KYC operations
   */
  getQueue(): QueuedKycOperation[] {
    try {
      const queueData = kycQueueStorage.getString(this.QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      logger.error('[KycOfflineQueue] ❌ READ ERROR: Failed to read queue:', error);
      return [];
    }
  }

  /**
   * Get pending KYC operations count
   */
  getPendingCount(): number {
    const queue = this.getQueue();
    return queue.filter(op => op.status === 'pending' || op.status === 'retrying').length;
  }

  /**
   * Process all queued KYC operations
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      logger.debug('[KycOfflineQueue] ⏳ BUSY: KYC queue processing already in progress');
      return;
    }

    if (!networkService.isOnline()) {
      logger.debug('[KycOfflineQueue] 📱 OFFLINE: Skipping KYC queue processing - no network');
      return;
    }

    this.isProcessing = true;
    const queue = this.getQueue();
    const pendingOperations = queue.filter(op =>
      op.status === 'pending' || op.status === 'retrying'
    );

    if (pendingOperations.length === 0) {
      logger.debug('[KycOfflineQueue] ✅ EMPTY: No KYC operations to process');
      this.isProcessing = false;
      return;
    }

    logger.info(`[KycOfflineQueue] 🔄 PROCESSING: Starting to process ${pendingOperations.length} queued KYC operations`);

    for (const queuedOp of pendingOperations) {
      try {
        await this.processKycOperation(queuedOp);
      } catch (error) {
        logger.warn(`[KycOfflineQueue] ⚠️ PROCESS ERROR: Failed to process KYC operation ${queuedOp.id}:`, error);
      }
    }

    this.isProcessing = false;
    logger.info('[KycOfflineQueue] ✅ COMPLETED: Finished processing KYC queue');
  }

  /**
   * Process a single KYC operation
   */
  private async processKycOperation(queuedOp: QueuedKycOperation): Promise<void> {
    logger.debug(`[KycOfflineQueue] 🎯 PROCESSING: KYC operation ${queuedOp.stepType} (${queuedOp.id}) (attempt ${queuedOp.retryCount + 1})`);

    // Update status to retrying
    this.updateOperationStatus(queuedOp.id, 'retrying');

    try {
      // Execute the KYC API call
      const response = await apiClient.post(queuedOp.apiEndpoint, queuedOp.data, {
        timeout: 30000, // 30 second timeout for KYC operations
      });

      // Success! Remove from queue
      this.removeOperation(queuedOp.id);
      logger.info(`[KycOfflineQueue] ✅ SUCCESS: KYC operation ${queuedOp.stepType} (${queuedOp.id}) completed successfully`);

    } catch (error: any) {
      logger.warn(`[KycOfflineQueue] ❌ RETRY: KYC operation ${queuedOp.stepType} (${queuedOp.id}) failed:`, error.message);

      const queue = this.getQueue();
      const opIndex = queue.findIndex(op => op.id === queuedOp.id);

      if (opIndex >= 0) {
        queue[opIndex].retryCount++;
        queue[opIndex].lastRetryAt = new Date().toISOString();

        if (queue[opIndex].retryCount >= this.MAX_RETRIES) {
          // Max retries reached - mark as failed
          queue[opIndex].status = 'failed';
          logger.error(`[KycOfflineQueue] 💀 FAILED: KYC operation ${queuedOp.stepType} (${queuedOp.id}) failed after ${this.MAX_RETRIES} attempts`);
        } else {
          // Schedule retry
          queue[opIndex].status = 'pending';
          logger.debug(`[KycOfflineQueue] 🔁 RETRY: Will retry KYC operation ${queuedOp.stepType} (${queuedOp.id}) in ${this.RETRY_DELAY}ms`);
        }

        this.saveQueue(queue);
        this.notifyListeners(queue);
      }
    }
  }

  /**
   * Update KYC operation status
   */
  private updateOperationStatus(id: string, status: QueuedKycOperation['status']): void {
    const queue = this.getQueue();
    const opIndex = queue.findIndex(op => op.id === id);

    if (opIndex >= 0) {
      queue[opIndex].status = status;
      this.saveQueue(queue);
      this.notifyListeners(queue);
    }
  }

  /**
   * Remove KYC operation from queue
   */
  removeOperation(id: string): void {
    const queue = this.getQueue();
    const filteredQueue = queue.filter(op => op.id !== id);
    this.saveQueue(filteredQueue);
    this.notifyListeners(filteredQueue);
    logger.debug(`[KycOfflineQueue] 🗑️ REMOVED: KYC operation ${id} removed from queue`);
  }

  /**
   * Clear all KYC operations (including failed ones)
   */
  clearQueue(): void {
    kycQueueStorage.delete(this.QUEUE_KEY);
    this.notifyListeners([]);
    logger.info('[KycOfflineQueue] 🧹 CLEARED: All KYC operations removed from queue');
  }

  /**
   * Clear only failed KYC operations
   */
  clearFailedOperations(): void {
    const queue = this.getQueue();
    const activeQueue = queue.filter(op => op.status !== 'failed');
    this.saveQueue(activeQueue);
    this.notifyListeners(activeQueue);
    logger.info('[KycOfflineQueue] 🧹 CLEARED: Failed KYC operations removed from queue');
  }

  /**
   * Retry all failed KYC operations
   */
  retryFailedOperations(): void {
    const queue = this.getQueue();
    let hasChanges = false;

    for (const op of queue) {
      if (op.status === 'failed') {
        op.status = 'pending';
        op.retryCount = 0;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.saveQueue(queue);
      this.notifyListeners(queue);
      logger.info('[KycOfflineQueue] 🔄 RETRY: All failed KYC operations reset for retry');

      // Auto-process if online
      if (networkService.isOnline()) {
        setTimeout(() => this.processQueue(), 1000);
      }
    }
  }

  /**
   * Get KYC operations for a specific step type
   */
  getOperationsForStep(stepType: KycStepType): QueuedKycOperation[] {
    const queue = this.getQueue();
    return queue.filter(op => op.stepType === stepType);
  }

  /**
   * Check if a specific KYC step is queued for processing
   */
  isStepQueued(stepType: KycStepType, entityId: string): boolean {
    const queue = this.getQueue();
    return queue.some(op =>
      op.stepType === stepType &&
      op.entityId === entityId &&
      (op.status === 'pending' || op.status === 'retrying')
    );
  }

  /**
   * Save queue to storage
   */
  private saveQueue(queue: QueuedKycOperation[]): void {
    try {
      kycQueueStorage.set(this.QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      logger.error('[KycOfflineQueue] ❌ SAVE ERROR: Failed to save KYC queue:', error);
    }
  }

  /**
   * Subscribe to KYC queue changes
   */
  onQueueChange(listener: (queue: QueuedKycOperation[]) => void): () => void {
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
   * Notify all listeners of KYC queue changes
   */
  private notifyListeners(queue: QueuedKycOperation[]): void {
    for (const listener of this.listeners) {
      try {
        listener(queue);
      } catch (error) {
        logger.warn('[KycOfflineQueue] ⚠️ LISTENER ERROR: KYC queue listener failed:', error);
      }
    }
  }

  /**
   * Get KYC queue statistics
   */
  getQueueStats(): {
    total: number;
    pending: number;
    retrying: number;
    failed: number;
    byStepType: Record<KycStepType, number>;
    oldest?: string;
  } {
    const queue = this.getQueue();
    const byStepType = {} as Record<KycStepType, number>;

    // Count operations by step type
    queue.forEach(op => {
      byStepType[op.stepType] = (byStepType[op.stepType] || 0) + 1;
    });

    const stats = {
      total: queue.length,
      pending: queue.filter(op => op.status === 'pending').length,
      retrying: queue.filter(op => op.status === 'retrying').length,
      failed: queue.filter(op => op.status === 'failed').length,
      byStepType,
      oldest: queue.length > 0 ? queue[0].createdAt : undefined,
    };

    return stats;
  }
}

// Export singleton instance
export const kycOfflineQueue = new KycOfflineQueue();

export default kycOfflineQueue;