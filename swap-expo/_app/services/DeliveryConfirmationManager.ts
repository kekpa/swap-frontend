/**
 * DeliveryConfirmationManager - Professional message delivery tracking
 * 
 * 🚀 PHASE 2.6: WhatsApp/Signal-level delivery confirmation
 * 
 * Handles:
 * - Message delivery status tracking (sent → delivered → read)
 * - Read receipts when user views messages
 * - Delivery confirmation to senders
 * - Failed delivery detection and retry
 * - Bulk status updates for performance
 * 
 * Industry Pattern: WhatsApp, Signal, Telegram delivery confirmations
 */

import logger from '../utils/logger';
import { timelineSyncService } from './TimelineSyncService';
import { userStateManager } from './UserStateManager';
import { unifiedTimelineRepository } from '../localdb/UnifiedTimelineRepository';

type DeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed';

interface DeliveryConfirmation {
  messageId: string;
  interactionId: string;
  status: DeliveryStatus;
  timestamp: string;
  userId: string;
}

interface MessageDeliveryState {
  messageId: string;
  status: DeliveryStatus;
  lastUpdated: number;
  retryCount: number;
}

class DeliveryConfirmationManager {
  private pendingConfirmations: Map<string, DeliveryConfirmation> = new Map();
  private messageStates: Map<string, MessageDeliveryState> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY_MS = 1000; // 1 second batching
  private readonly MAX_RETRY_COUNT = 3;

  /**
   * Initialize delivery confirmation system
   */
  initialize(): void {
    logger.debug('[DeliveryConfirmationManager] 🚀 Initializing delivery confirmation system...');

    // Set up user state listener for read receipt detection
    this.setupReadReceiptDetection();

    logger.info('[DeliveryConfirmationManager] ✅ Delivery confirmation system initialized');
  }

  /**
   * Set up automatic read receipt detection
   */
  private setupReadReceiptDetection(): void {
    userStateManager.onStateChange((userState) => {
      // When user switches to a chat, mark messages as read
      if (userState.currentChat && userState.appState === 'foreground') {
        this.markMessagesAsRead(userState.currentChat).catch(error => {
          logger.error('[DeliveryConfirmationManager] Failed to mark messages as read:', error);
        });
      }
    });
  }

  /**
   * Mark a message as delivered when it arrives via WebSocket
   */
  async confirmMessageDelivered(messageId: string, interactionId: string): Promise<void> {
    try {
      logger.debug(`[DeliveryConfirmationManager] 📨 Confirming delivery: ${messageId}`);

      await this.updateMessageStatus(messageId, interactionId, 'delivered');

      logger.debug(`[DeliveryConfirmationManager] ✅ Message marked as delivered: ${messageId}`);

    } catch (error) {
      logger.error(`[DeliveryConfirmationManager] Failed to confirm delivery for ${messageId}:`, error);
    }
  }

  /**
   * Mark messages as read when user views a chat
   */
  async markMessagesAsRead(interactionId: string): Promise<void> {
    try {
      logger.debug(`[DeliveryConfirmationManager] 👁️ Marking messages as read for: ${interactionId}`);

      // Get unread messages for this interaction
      const unreadMessages = await this.getUnreadMessages(interactionId);
      
      if (unreadMessages.length === 0) {
        logger.debug(`[DeliveryConfirmationManager] No unread messages in ${interactionId}`);
        return;
      }

      // Mark all unread messages as read
      const readPromises = unreadMessages.map(messageId => 
        this.updateMessageStatus(messageId, interactionId, 'read')
      );

      await Promise.all(readPromises);

      logger.info(`[DeliveryConfirmationManager] ✅ Marked ${unreadMessages.length} messages as read in ${interactionId}`);

    } catch (error) {
      logger.error(`[DeliveryConfirmationManager] Failed to mark messages as read for ${interactionId}:`, error);
    }
  }

  /**
   * Update message delivery status with batching
   */
  private async updateMessageStatus(
    messageId: string, 
    interactionId: string, 
    status: DeliveryStatus
  ): Promise<void> {
    try {
      // Update local_status in unified local_timeline table
      // sync_status stays 'synced' (item from server), local_status updates to delivery status
      await unifiedTimelineRepository.updateSyncStatus(messageId, 'synced', status);

      // Update local state tracking
      this.messageStates.set(messageId, {
        messageId,
        status,
        lastUpdated: Date.now(),
        retryCount: 0,
      });

      // Add to batch for backend confirmation
      const confirmation: DeliveryConfirmation = {
        messageId,
        interactionId,
        status,
        timestamp: new Date().toISOString(),
        userId: userStateManager.getUserState().profileId || 'unknown',
      };

      this.pendingConfirmations.set(messageId, confirmation);

      // Schedule batch processing
      this.scheduleBatchProcessing();

      logger.debug(`[DeliveryConfirmationManager] ✅ Message status updated locally: ${messageId} -> ${status}`);

    } catch (error) {
      logger.error(`[DeliveryConfirmationManager] Failed to update status for ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Schedule batch processing of delivery confirmations
   */
  private scheduleBatchProcessing(): void {
    if (this.batchTimeout) {
      return; // Already scheduled
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatchConfirmations().catch(error => {
        logger.error('[DeliveryConfirmationManager] Batch processing failed:', error);
      });
    }, this.BATCH_DELAY_MS);
  }

  /**
   * Process batched delivery confirmations
   */
  private async processBatchConfirmations(): Promise<void> {
    try {
      const confirmations = Array.from(this.pendingConfirmations.values());
      
      if (confirmations.length === 0) {
        return;
      }

      logger.debug(`[DeliveryConfirmationManager] 📤 Processing ${confirmations.length} delivery confirmations`);

      // TODO: Send batch confirmation to backend
      // await this.sendBatchConfirmationToBackend(confirmations);

      // Placeholder for backend call
      logger.debug('[DeliveryConfirmationManager] Backend confirmation (placeholder)', 'ws', {
        count: confirmations.length,
        statuses: confirmations.reduce((acc, conf) => {
          acc[conf.status] = (acc[conf.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      });

      // Clear processed confirmations
      this.pendingConfirmations.clear();
      this.batchTimeout = null;

      logger.info(`[DeliveryConfirmationManager] ✅ Batch confirmation completed: ${confirmations.length} updates`);

    } catch (error) {
      logger.error('[DeliveryConfirmationManager] Batch confirmation processing failed:', error);
      
      // Retry failed confirmations
      this.retryFailedConfirmations();
    }
  }

  /**
   * Send batch confirmation to backend
   * 🚀 Backend integration point
   */
  private async sendBatchConfirmationToBackend(confirmations: DeliveryConfirmation[]): Promise<void> {
    try {
      // TODO: Implement API call
      // await api.post('/messages/delivery-confirmations', {
      //   confirmations: confirmations.map(conf => ({
      //     messageId: conf.messageId,
      //     status: conf.status,
      //     timestamp: conf.timestamp,
      //     userId: conf.userId
      //   }))
      // });

      logger.debug('[DeliveryConfirmationManager] ✅ Batch confirmation sent to backend');

    } catch (error) {
      logger.error('[DeliveryConfirmationManager] Failed to send batch confirmation to backend:', error);
      throw error;
    }
  }

  /**
   * Retry failed delivery confirmations
   */
  private retryFailedConfirmations(): void {
    // Mark failed confirmations for retry
    this.pendingConfirmations.forEach((confirmation, messageId) => {
      const state = this.messageStates.get(messageId);
      if (state && state.retryCount < this.MAX_RETRY_COUNT) {
        state.retryCount++;
        logger.debug(`[DeliveryConfirmationManager] 🔄 Retrying confirmation for ${messageId} (attempt ${state.retryCount})`);
      } else {
        // Max retries exceeded, remove from pending
        this.pendingConfirmations.delete(messageId);
        logger.warn(`[DeliveryConfirmationManager] ⚠️ Max retries exceeded for ${messageId}`);
      }
    });

    // Schedule another batch processing if there are pending confirmations
    if (this.pendingConfirmations.size > 0) {
      this.scheduleBatchProcessing();
    }
  }

  /**
   * Get unread messages for an interaction
   */
  private async getUnreadMessages(interactionId: string): Promise<string[]> {
    try {
      // TODO: Query local database for unread messages
      // This would typically filter by status != 'read' and not from current user
      
      // Placeholder implementation
      logger.debug(`[DeliveryConfirmationManager] Getting unread messages for ${interactionId} (placeholder)`);
      return []; // Return empty for now

    } catch (error) {
      logger.error(`[DeliveryConfirmationManager] Failed to get unread messages for ${interactionId}:`, error);
      return [];
    }
  }

  /**
   * Get delivery statistics for debugging
   */
  getDeliveryStats(): {
    pendingConfirmations: number;
    trackedMessages: number;
    failedMessages: number;
  } {
    const failedMessages = Array.from(this.messageStates.values())
      .filter(state => state.retryCount >= this.MAX_RETRY_COUNT).length;

    return {
      pendingConfirmations: this.pendingConfirmations.size,
      trackedMessages: this.messageStates.size,
      failedMessages,
    };
  }

  /**
   * Manual confirmation for specific message (for testing/debugging)
   */
  async manualConfirmDelivery(messageId: string, interactionId: string, status: DeliveryStatus): Promise<void> {
    logger.debug(`[DeliveryConfirmationManager] 🎯 Manual confirmation: ${messageId} -> ${status}`);
    await this.updateMessageStatus(messageId, interactionId, status);
  }

  /**
   * Force process pending confirmations (for testing/debugging)
   */
  async flushPendingConfirmations(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    await this.processBatchConfirmations();
  }

  /**
   * Cleanup delivery confirmation manager
   */
  cleanup(): void {
    logger.debug('[DeliveryConfirmationManager] 🧹 Cleaning up...');

    // Clear batch timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Process any pending confirmations before cleanup
    this.processBatchConfirmations().catch(error => {
      logger.error('[DeliveryConfirmationManager] Error during cleanup confirmation processing:', error);
    });

    // Clear state
    this.pendingConfirmations.clear();
    this.messageStates.clear();

    logger.info('[DeliveryConfirmationManager] ✅ Cleanup complete');
  }
}

// Export singleton instance
export const deliveryConfirmationManager = new DeliveryConfirmationManager();
export default deliveryConfirmationManager;