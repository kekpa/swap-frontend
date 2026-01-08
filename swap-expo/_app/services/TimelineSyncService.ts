/**
 * TimelineSyncService - Inbound timeline sync (polling)
 *
 * Purpose: Fetch missed messages and transactions from backend API.
 * Direction: INBOUND (pulls data from server to local SQLite)
 * Trigger: Every 30 seconds + on network reconnect
 *
 * This is the PULL counterpart to BackgroundSyncService (PUSH).
 *
 * @author Swap Engineering Team
 * @date 2025-12-23 (Refactored from MessageSyncManager)
 */

import logger from '../utils/logger';
import { interactionRepository } from '../localdb/InteractionRepository';
import { unifiedTimelineRepository } from '../localdb/UnifiedTimelineRepository';
import { LocalTimelineItem } from '../localdb/schema/local-timeline-schema';
import { userStateManager } from './UserStateManager';
import { networkService } from './NetworkService';
import { profileContextManager, ProfileSwitchStartData, ProfileSwitchCompleteData } from './ProfileContextManager';
import apiClient from '../_api/apiClient';
import { INTERACTION_PATHS } from '../_api/apiPaths';
import { MessageTimelineItem } from '../types/timeline.types';

interface SyncStats {
  messagesReceived: number;
  messagesSent: number;
  syncDuration: number;
  lastSyncTime: number;
}

interface MissedMessageCheck {
  interactionId: string;
  lastKnownMessageTime: string;
  checkResult: {
    hasMissedMessages: boolean;
    missedCount: number;
    newMessages: MessageTimelineItem[];
  };
}

class TimelineSyncService {
  private isSyncing = false;
  private lastSyncTime = 0;
  private syncInterval: NodeJS.Timeout | null = null;
  private networkListener: (() => void) | null = null;
  private currentEntityId: string | null = null; // Track current entity for sync operations (backend's universal ID)
  private readonly SYNC_INTERVAL_MS = 30000; // 30 seconds
  private readonly MAX_SYNC_RETRIES = 3;

  // Profile switch safety - pause sync during switch
  private isPausedForProfileSwitch = false;
  private unsubscribeSwitchStart: (() => void) | null = null;
  private unsubscribeSwitchComplete: (() => void) | null = null;

  /**
   * Initialize message sync manager
   */
  initialize(): void {
    logger.debug('[TimelineSyncService] 🚀 Initializing message sync manager...');

    // Set up network state listener for automatic sync
    this.setupNetworkListener();

    // Set up periodic background sync
    this.setupPeriodicSync();

    // Subscribe to profile switch events for safety
    this.subscribeToProfileSwitch();

    logger.info('[TimelineSyncService] ✅ Message sync manager initialized');
  }

  /**
   * Subscribe to profile switch events to prevent stale data operations
   *
   * CRITICAL: This prevents the "stale closure" bug where sync continues
   * with old profile's message context after a switch.
   */
  private subscribeToProfileSwitch(): void {
    // On profile switch START: Pause sync and cancel any in-progress operations
    this.unsubscribeSwitchStart = profileContextManager.onSwitchStart((data: ProfileSwitchStartData) => {
      logger.info('[TimelineSyncService] 🔄 Profile switch starting - pausing sync');
      this.isPausedForProfileSwitch = true;
      this.isSyncing = false; // Cancel any in-progress sync

      // Clear old profile's sync state
      this.lastSyncTime = 0;

      logger.debug('[TimelineSyncService] ✅ Sync paused for profile switch');
    });

    // On profile switch COMPLETE: Resume with new profile context
    this.unsubscribeSwitchComplete = profileContextManager.onSwitchComplete((data: ProfileSwitchCompleteData) => {
      logger.info(`[TimelineSyncService] ✅ Profile switch complete - resuming sync (${data.profileType})`);
      this.isPausedForProfileSwitch = false;

      // Update to new entity ID (backend's universal identifier)
      this.currentEntityId = data.entityId;

      // Trigger immediate sync with new profile context
      this.syncMessages().catch(error => {
        logger.error('[TimelineSyncService] Post-switch sync failed:', error);
      });
    });

    // On profile switch FAILED: Resume with old context
    profileContextManager.onSwitchFailed(() => {
      logger.warn('[TimelineSyncService] ⚠️ Profile switch failed - resuming with old context');
      this.isPausedForProfileSwitch = false;
    });
  }

  /**
   * Update the current entity ID for sync operations
   * Should be called when user switches profiles
   */
  setCurrentEntityId(entityId: string | null): void {
    this.currentEntityId = entityId;
    logger.debug(`[TimelineSyncService] Entity ID updated: ${entityId || 'null'}`);
  }

  /**
   * Set up network state monitoring for sync triggers
   */
  private setupNetworkListener(): void {
    this.networkListener = networkService.onNetworkStateChange((state) => {
      if (!state.isOfflineMode && state.isConnected) {
        logger.info('[TimelineSyncService] 🌐 Network back online - triggering sync');
        this.syncMessages().catch(error => {
          logger.error('[TimelineSyncService] Auto-sync failed:', error);
        });
      }
    });
  }

  /**
   * Set up periodic background sync
   */
  private setupPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      const networkState = networkService.getNetworkState();
      if (!networkState.isOfflineMode && networkState.isConnected) {
        logger.debug('[TimelineSyncService] 🔄 Periodic sync triggered');
        this.syncMessages().catch(error => {
          logger.error('[TimelineSyncService] Periodic sync failed:', error);
        });
      }
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * Sync all messages - main synchronization method
   */
  async syncMessages(forceSync = false): Promise<SyncStats> {
    // Skip sync if paused for profile switch
    if (this.isPausedForProfileSwitch) {
      logger.debug('[TimelineSyncService] Sync paused for profile switch, skipping');
      return this.getLastSyncStats();
    }

    if (this.isSyncing && !forceSync) {
      logger.debug('[TimelineSyncService] Sync already in progress, skipping');
      return this.getLastSyncStats();
    }

    const syncStartTime = Date.now();
    this.isSyncing = true;

    try {
      logger.info('[TimelineSyncService] 🔄 Starting message synchronization...');

      // 1. Get all active interactions
      const interactions = await interactionRepository.getInteractionsWithMembers(this.currentEntityId || '');
      logger.debug(`[TimelineSyncService] Found ${interactions.length} interactions to sync`);

      // 2. Check for missed messages in each interaction
      const missedMessageChecks = await Promise.all(
        interactions.map(interaction => this.checkMissedMessages(interaction.id))
      );

      // 3. Sync missed messages
      const syncResults = await Promise.all(
        missedMessageChecks
          .filter(check => check.checkResult.hasMissedMessages)
          .map(check => this.syncMissedMessages(check))
      );

      // 4. Calculate sync statistics
      const totalReceived = syncResults.reduce((sum, result) => sum + result.messagesReceived, 0);
      const syncDuration = Date.now() - syncStartTime;
      
      const stats: SyncStats = {
        messagesReceived: totalReceived,
        messagesSent: 0, // TODO: Implement outbound message sync
        syncDuration,
        lastSyncTime: Date.now(),
      };

      this.lastSyncTime = stats.lastSyncTime;

      logger.info(`[TimelineSyncService] ✅ Sync completed: ${stats.messagesReceived} messages, ${stats.syncDuration}ms, ${interactions.length} interactions`);

      return stats;

    } catch (error) {
      logger.error('[TimelineSyncService] ❌ Sync failed:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Check for missed messages in a specific interaction
   * Fetches timeline data from backend API and returns items to sync to local SQLite
   */
  private async checkMissedMessages(interactionId: string): Promise<MissedMessageCheck> {
    try {
      // Get the latest item time from local_timeline (sorted by created_at DESC, so first is latest)
      const latestItems = await unifiedTimelineRepository.getTimeline(interactionId, this.currentEntityId || '', 1, 0);
      const lastKnownTime = latestItems.length > 0 ? latestItems[0].created_at : new Date(0).toISOString();

      logger.debug(`[TimelineSyncService] Fetching timeline for ${interactionId} since ${lastKnownTime}`);

      // Fetch timeline from backend API
      // Backend accepts: startDate (not 'since'), limit, cursor, types, endDate
      const response = await apiClient.get(INTERACTION_PATHS.TIMELINE(interactionId), {
        params: { startDate: lastKnownTime, limit: 100 }
      });

      // Handle response - could be { items: [...] } or direct array
      const apiMessages: MessageTimelineItem[] = response.data?.items || response.data || [];

      logger.debug(`[TimelineSyncService] Received ${apiMessages.length} items from API for ${interactionId}`);

      const checkResult = {
        hasMissedMessages: apiMessages.length > 0,
        missedCount: apiMessages.length,
        newMessages: apiMessages,
      };

      if (checkResult.hasMissedMessages) {
        logger.info(`[TimelineSyncService] 📩 Found ${checkResult.missedCount} missed messages in ${interactionId}`);
      }

      return {
        interactionId,
        lastKnownMessageTime: lastKnownTime,
        checkResult,
      };

    } catch (error) {
      logger.error(`[TimelineSyncService] Failed to fetch timeline for ${interactionId}:`, error);
      return {
        interactionId,
        lastKnownMessageTime: new Date(0).toISOString(),
        checkResult: {
          hasMissedMessages: false,
          missedCount: 0,
          newMessages: [],
        },
      };
    }
  }

  /**
   * Sync timeline items (messages AND transactions) for a specific interaction
   * Uses unified local_timeline table with BATCH upserts for performance
   *
   * PERFORMANCE: Uses batchUpsertFromServer to insert N items with 1 event (not N events)
   * Result: 7 items = 1 database transaction, 1 event, 1 re-render
   */
  private async syncMissedMessages(missedCheck: MissedMessageCheck): Promise<{ messagesReceived: number }> {
    try {
      const { interactionId, checkResult } = missedCheck;
      const { newMessages } = checkResult;

      logger.debug(`[TimelineSyncService] Syncing ${newMessages.length} timeline items for ${interactionId}`);

      // DEBUG: Log first item to verify field names from API response (FLAT structure)
      if (newMessages.length > 0) {
        const firstItem = newMessages[0] as any;
        logger.debug(`[TimelineSyncService] 🔍 API item: type=${firstItem.type}, amount=${firstItem.amount}, currency=${firstItem.currency}, createdAt=${firstItem.createdAt}`);
      }

      // Store timeline items in unified local_timeline table
      // This handles BOTH messages AND transactions from the backend
      // DEBUG: Log entity ID for troubleshooting empty timeline issues
      logger.debug(`[TimelineSyncService] 📝 Storing ${newMessages.length} items with entity_id: ${this.currentEntityId} for interaction: ${interactionId}`);

      if (newMessages.length > 0 && this.currentEntityId) {
        // Map ALL items first (no awaits in loop)
        const localItems = newMessages.map((item) => {
          // Map backend interaction_timeline item to LocalTimelineItem format
          // FIXED: Backend returns FLAT structure (fields at root level, not nested in 'data')
          // API response: { id, type, createdAt, amount, currency, status, from_entity_id, to_entity_id }
          const localItem: Partial<LocalTimelineItem> & { id: string } = {
            id: item.id,
            server_id: item.id,
            interaction_id: interactionId,
            entity_id: this.currentEntityId!,
            // Determine item type from backend 'type' field
            item_type: (item as any).type === 'transaction' ? 'transaction' : 'message',
            created_at: (item as any).createdAt || (item as any).created_at || new Date().toISOString(),
            // Entity IDs - aligned with Supabase (who sent / who received)
            from_entity_id: (item as any).from_entity_id || '',
            to_entity_id: (item as any).to_entity_id || null,
            // Transaction fields - direct from root (API returns flat structure)
            amount: (item as any).amount || null,
            currency_code: (item as any).currency || null,  // API uses 'currency' not 'currency_code'
            currency_id: (item as any).currency_id || null,
            // Wallet IDs for wallet page filtering (which currency wallet sent/received)
            from_wallet_id: (item as any).from_wallet_id || null,
            to_wallet_id: (item as any).to_wallet_id || null,
            transaction_type: (item as any).transaction_type || null,
            // Message fields
            content: (item as any).content || null,
            message_type: (item as any).message_type || 'text',
            // Sync status - already synced since it came from server
            sync_status: 'synced',
            local_status: (item as any).type === 'transaction'
              ? ((item as any).status || 'completed')
              : 'delivered',
            // Store full item as timeline_metadata for debugging
            timeline_metadata: JSON.stringify(item),
          };
          return localItem;
        });

        // BATCH UPSERT: 1 transaction, 1 event, 1 re-render (not N)
        await unifiedTimelineRepository.batchUpsertFromServer(
          localItems,
          interactionId,
          this.currentEntityId
        );

        logger.info(`[TimelineSyncService] ✅ Batch stored ${newMessages.length} timeline items for ${interactionId}`);
      }

      return { messagesReceived: newMessages.length };

    } catch (error) {
      logger.error(`[TimelineSyncService] Failed to sync timeline items for ${missedCheck.interactionId}:`, error);
      return { messagesReceived: 0 };
    }
  }

  /**
   * Sync specific interaction (for focused sync)
   */
  async syncInteraction(interactionId: string): Promise<void> {
    try {
      logger.debug(`[TimelineSyncService] 🎯 Syncing specific interaction: ${interactionId}`);

      const missedCheck = await this.checkMissedMessages(interactionId);
      
      if (missedCheck.checkResult.hasMissedMessages) {
        await this.syncMissedMessages(missedCheck);
        logger.info(`[TimelineSyncService] ✅ Interaction ${interactionId} sync completed`);
      } else {
        logger.debug(`[TimelineSyncService] ✅ Interaction ${interactionId} up to date`);
      }

    } catch (error) {
      logger.error(`[TimelineSyncService] Failed to sync interaction ${interactionId}:`, error);
      throw error;
    }
  }

  /**
   * Handle message delivery confirmation
   * Uses unified local_timeline - no legacy messageRepository
   */
  async confirmMessageDelivery(messageId: string, deliveryStatus: 'delivered' | 'read'): Promise<void> {
    try {
      logger.debug(`[TimelineSyncService] 📨 Confirming message delivery: ${messageId} -> ${deliveryStatus}`);

      // Update local_status in unified local_timeline table
      // sync_status stays 'synced' (item came from server), local_status updates to delivery status
      await unifiedTimelineRepository.updateSyncStatus(messageId, 'synced', deliveryStatus);

      // TODO: Send delivery confirmation to backend
      // await api.post(`/messages/${messageId}/delivery`, { status: deliveryStatus });

      logger.debug(`[TimelineSyncService] ✅ Message delivery confirmed: ${messageId}`);

    } catch (error) {
      logger.error(`[TimelineSyncService] Failed to confirm delivery for ${messageId}:`, error);
    }
  }

  /**
   * Handle failed message retry
   */
  async retryFailedMessages(): Promise<void> {
    try {
      logger.debug('[TimelineSyncService] 🔄 Retrying failed messages...');

      // TODO: Get failed messages from local storage
      // const failedMessages = await messageRepository.getFailedMessages();
      
      // TODO: Retry sending failed messages
      // for (const message of failedMessages) {
      //   await this.retrySendMessage(message);
      // }

      logger.info('[TimelineSyncService] ✅ Failed message retry completed');

    } catch (error) {
      logger.error('[TimelineSyncService] Failed message retry failed:', error);
    }
  }

  /**
   * Get last sync statistics
   */
  getLastSyncStats(): SyncStats {
    return {
      messagesReceived: 0,
      messagesSent: 0,
      syncDuration: 0,
      lastSyncTime: this.lastSyncTime,
    };
  }

  /**
   * Check if sync is currently running
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get sync health status
   */
  getSyncHealthStatus(): {
    isHealthy: boolean;
    lastSyncAge: number;
    networkStatus: string;
  } {
    const now = Date.now();
    const lastSyncAge = now - this.lastSyncTime;
    const networkState = networkService.getNetworkState();
    
    // Consider sync healthy if last sync was within 5 minutes and network is available
    const isHealthy = lastSyncAge < 5 * 60 * 1000 && !networkState.isOfflineMode;

    return {
      isHealthy,
      lastSyncAge,
      networkStatus: networkState.isOfflineMode ? 'offline' : 'online',
    };
  }

  /**
   * Cleanup sync manager
   */
  cleanup(): void {
    logger.debug('[TimelineSyncService] 🧹 Cleaning up...');

    // Clear periodic sync
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Remove network listener
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }

    // Unsubscribe from profile switch events
    if (this.unsubscribeSwitchStart) {
      this.unsubscribeSwitchStart();
      this.unsubscribeSwitchStart = null;
    }
    if (this.unsubscribeSwitchComplete) {
      this.unsubscribeSwitchComplete();
      this.unsubscribeSwitchComplete = null;
    }

    this.isSyncing = false;
    this.lastSyncTime = 0;

    logger.info('[TimelineSyncService] ✅ Cleanup complete');
  }

  /**
   * Reset all internal state - primarily for testing
   * @internal
   */
  reset(): void {
    this.cleanup();
    this.currentEntityId = null;
    logger.debug('[TimelineSyncService] Reset completed');
  }
}

// Export singleton instance
export const timelineSyncService = new TimelineSyncService();

// Backward compatibility alias
export const messageSyncManager = timelineSyncService;

export default timelineSyncService;