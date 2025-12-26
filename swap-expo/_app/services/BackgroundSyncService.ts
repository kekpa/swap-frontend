// Created: BackgroundSyncService for WhatsApp-grade local-first architecture - 2025-12-22
// BACKGROUND: Processes pending items without blocking UI
// RELIABLE: Handles retries, failures, and network changes

import logger from '../utils/logger';
import { unifiedTimelineRepository } from '../localdb/UnifiedTimelineRepository';
import { LocalTimelineItem } from '../localdb/schema/local-timeline-schema';
import apiClient from '../_api/apiClient';
import { API_PATHS } from '../_api/apiPaths';
import { MessagesApiService } from '../_api/messages.api';
import { networkService } from './NetworkService';
import { eventEmitter } from '../utils/eventEmitter';
import { websocketService } from './websocketService';
import { profileContextManager, ProfileSwitchStartData, ProfileSwitchCompleteData } from './ProfileContextManager';

// Constants
const SYNC_INTERVAL_MS = 3000; // Process queue every 3 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// WebSocket event types from backend
const WS_TRANSACTION_COMPLETED = 'transaction.completed';
const WS_TRANSACTION_FAILED = 'transaction.failed';
const WS_MESSAGE_DELIVERED = 'message.delivered';
const WS_MESSAGE_RECEIVED = 'message.received';

/**
 * BackgroundSyncService - Handles API calls in the background
 *
 * KEY PRINCIPLES:
 * - Does NOT block UI (all async, background processing)
 * - Updates SQLite status which triggers UI updates
 * - Handles network changes (retry when back online)
 * - Subscribes to WebSocket for real-time status updates
 *
 * @example
 * ```typescript
 * // Start the service on app launch
 * backgroundSyncService.start(profileId);
 *
 * // Service automatically:
 * // - Processes pending messages/transactions
 * // - Retries failed items
 * // - Listens for WebSocket status updates
 * // - Updates SQLite (which updates UI)
 * ```
 */
class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private isRunning = false;
  private isProcessing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private currentProfileId: string | null = null;

  // Profile switch safety - pause sync during switch
  private isPausedForProfileSwitch = false;
  private unsubscribeSwitchStart: (() => void) | null = null;
  private unsubscribeSwitchComplete: (() => void) | null = null;

  // WebSocket cleanup function (React useEffect pattern)
  private cleanupWebSocketListeners: (() => void) | null = null;

  public static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  private constructor() {
    logger.info('[BackgroundSyncService] Created');
  }

  /**
   * Subscribe to profile switch events to prevent stale data operations
   *
   * CRITICAL: This prevents the "stale closure" bug where sync continues
   * with old profile's context after a switch.
   */
  private subscribeToProfileSwitch(): void {
    // On profile switch START: Pause sync
    this.unsubscribeSwitchStart = profileContextManager.onSwitchStart((data: ProfileSwitchStartData) => {
      logger.info('[BackgroundSyncService] 🔄 Profile switch starting - pausing sync');
      this.isPausedForProfileSwitch = true;
      this.isProcessing = false; // Cancel any in-progress processing
    });

    // On profile switch COMPLETE: Resume with new profile context
    this.unsubscribeSwitchComplete = profileContextManager.onSwitchComplete((data: ProfileSwitchCompleteData) => {
      logger.info(`[BackgroundSyncService] ✅ Profile switch complete - resuming (${data.profileType})`);
      this.isPausedForProfileSwitch = false;
      this.currentProfileId = data.profileId;

      // Process queue with new profile context
      setTimeout(() => this.processQueue(), 500);
    });

    // On profile switch FAILED: Resume with old context
    profileContextManager.onSwitchFailed(() => {
      logger.warn('[BackgroundSyncService] ⚠️ Profile switch failed - resuming with old context');
      this.isPausedForProfileSwitch = false;
    });
  }

  /**
   * Start the background sync service
   */
  public start(profileId: string): void {
    if (this.isRunning && this.currentProfileId === profileId) {
      logger.debug('[BackgroundSyncService] Already running for this profile');
      return;
    }

    // Stop existing service if running for different profile
    if (this.isRunning) {
      this.stop();
    }

    this.currentProfileId = profileId;
    this.isRunning = true;

    logger.info(`[BackgroundSyncService] 🚀 Starting for profile: ${profileId}`);

    // Subscribe to profile switch events
    this.subscribeToProfileSwitch();

    // Setup WebSocket listeners
    this.setupWebSocketListeners();

    // Setup network change listener
    this.setupNetworkListener();

    // Start processing interval
    this.syncInterval = setInterval(() => {
      this.processQueue();
    }, SYNC_INTERVAL_MS);

    // Process immediately on start
    this.processQueue();
  }

  /**
   * Stop the background sync service
   */
  public stop(): void {
    logger.info('[BackgroundSyncService] 🛑 Stopping');

    this.isRunning = false;
    this.currentProfileId = null;
    this.isPausedForProfileSwitch = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
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

    // Cleanup WebSocket listeners (prevents memory leak)
    this.cleanupWebSocketListeners?.();
    this.cleanupWebSocketListeners = null;
  }

  /**
   * Force process queue now (e.g., when user sends a message)
   */
  public async triggerSync(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('[BackgroundSyncService] Not running, cannot trigger sync');
      return;
    }
    await this.processQueue();
  }

  /**
   * Process pending items in the queue
   */
  private async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing || !this.currentProfileId) {
      return;
    }

    // Skip if paused for profile switch
    if (this.isPausedForProfileSwitch) {
      logger.debug('[BackgroundSyncService] Paused for profile switch - skipping sync');
      return;
    }

    // Check network state
    const networkState = networkService.getNetworkState();
    if (networkState.isOfflineMode) {
      logger.debug('[BackgroundSyncService] Offline mode - skipping sync');
      return;
    }

    this.isProcessing = true;

    try {
      // Get items needing sync
      const pendingItems = await unifiedTimelineRepository.getItemsNeedingSync(
        this.currentProfileId,
        MAX_RETRIES
      );

      if (pendingItems.length === 0) {
        return;
      }

      logger.debug(`[BackgroundSyncService] Processing ${pendingItems.length} pending items`);

      // Process items sequentially to avoid race conditions
      for (const item of pendingItems) {
        await this.syncItem(item);
        // Small delay between items to avoid overwhelming API
        await this.delay(100);
      }

    } catch (error) {
      logger.error('[BackgroundSyncService] Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sync a single item to the API
   */
  private async syncItem(item: LocalTimelineItem): Promise<void> {
    logger.debug(`[BackgroundSyncService] Syncing item: ${item.id} (${item.item_type})`);

    // Update status to syncing
    await unifiedTimelineRepository.updateSyncStatus(item.id, 'syncing', item.local_status);

    try {
      if (item.item_type === 'message') {
        await this.syncMessage(item);
      } else if (item.item_type === 'transaction') {
        await this.syncTransaction(item);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[BackgroundSyncService] ❌ Failed to sync ${item.id}: ${errorMsg}`);

      // Update to failed status
      await unifiedTimelineRepository.updateSyncStatus(
        item.id,
        'failed',
        'failed',
        undefined,
        errorMsg
      );

      // Increment retry count
      await unifiedTimelineRepository.incrementRetryCount(item.id);
    }
  }

  /**
   * Sync a message to the API
   * Uses to_entity_id for consistency with Supabase and transaction_ledger
   */
  private async syncMessage(item: LocalTimelineItem): Promise<void> {
    logger.debug(`[BackgroundSyncService] 📤 Sending message: ${item.id}`);

    // Parse metadata to get any additional info
    let metadata: Record<string, any> = {};
    try {
      if (item.timeline_metadata) {
        metadata = JSON.parse(item.timeline_metadata);
      }
    } catch {
      // Ignore parse errors
    }

    // Call the messages API with aligned field names
    const response = await MessagesApiService.sendDirectMessage({
      to_entity_id: item.to_entity_id!,  // Aligned with Supabase from_entity_id/to_entity_id
      content: item.content || '',
      message_type: (item.message_type || 'text') as 'text' | 'image' | 'file' | 'audio',
      idempotency_key: item.id, // Use local ID as idempotency key
      metadata: {
        ...metadata,
        client_generated_id: item.id,
      },
    });

    // Update SQLite with server ID and status
    await unifiedTimelineRepository.updateSyncStatus(
      item.id,
      'synced',
      'sent',
      response.message.id
    );

    logger.info(`[BackgroundSyncService] ✅ Message synced: ${item.id} → ${response.message.id}`);
  }

  /**
   * Sync a transaction to the API
   * Uses to_entity_id for consistency with Supabase and messages
   */
  private async syncTransaction(item: LocalTimelineItem): Promise<void> {
    logger.debug(`[BackgroundSyncService] 💰 Sending transaction: ${item.id}`);

    // Parse metadata to get any additional info
    let metadata: Record<string, any> = {};
    try {
      if (item.timeline_metadata) {
        metadata = JSON.parse(item.timeline_metadata);
      }
    } catch {
      // Ignore parse errors
    }

    // Call the transactions API with aligned field names
    const response = await apiClient.post(API_PATHS.TRANSACTION.DIRECT, {
      to_entity_id: item.to_entity_id,  // Aligned with Supabase from_entity_id/to_entity_id
      amount: item.amount,
      currency_id: item.currency_id,
      description: item.description || item.content,
      from_wallet_id: item.from_wallet_id,
      to_wallet_id: item.to_wallet_id,
      idempotency_key: item.id, // Use local ID as idempotency key
      metadata: {
        ...metadata,
        client_generated_id: item.id,
      },
    });

    const serverId = response.data?.id || response.data?.transaction?.id;

    // Update SQLite - transaction will progress through saga states via WebSocket
    await unifiedTimelineRepository.updateSyncStatus(
      item.id,
      'synced',
      'processing_queued', // Backend will emit status updates
      serverId
    );

    logger.info(`[BackgroundSyncService] ✅ Transaction synced: ${item.id} → ${serverId}`);
  }

  /**
   * Setup WebSocket listeners for real-time status updates
   * Uses cleanup function pattern (React useEffect best practice)
   */
  private setupWebSocketListeners(): void {
    logger.debug('[BackgroundSyncService] Setting up WebSocket listeners');

    // Define handlers as named functions for proper cleanup
    const handleTransactionCompleted = async (data: any) => {
      logger.debug('[BackgroundSyncService] Received transaction.completed:', data);
      await this.handleTransactionStatus(data.transaction_id || data.id, 'completed');
    };

    const handleTransactionFailed = async (data: any) => {
      logger.debug('[BackgroundSyncService] Received transaction.failed:', data);
      await this.handleTransactionStatus(
        data.transaction_id || data.id,
        'failed',
        data.failure_reason || data.error
      );
    };

    const handleMessageDelivered = async (data: any) => {
      logger.debug('[BackgroundSyncService] Received message.delivered:', data);
      await this.handleMessageStatus(data.message_id || data.id, 'delivered');
    };

    const handleMessageReceived = async (data: any) => {
      logger.debug('[BackgroundSyncService] Received incoming message:', data);
      await this.handleIncomingMessage(data);
    };

    // Attach listeners
    websocketService.on(WS_TRANSACTION_COMPLETED, handleTransactionCompleted);
    websocketService.on(WS_TRANSACTION_FAILED, handleTransactionFailed);
    websocketService.on(WS_MESSAGE_DELIVERED, handleMessageDelivered);
    websocketService.on(WS_MESSAGE_RECEIVED, handleMessageReceived);

    // Store cleanup function (React useEffect pattern)
    this.cleanupWebSocketListeners = () => {
      websocketService.off(WS_TRANSACTION_COMPLETED, handleTransactionCompleted);
      websocketService.off(WS_TRANSACTION_FAILED, handleTransactionFailed);
      websocketService.off(WS_MESSAGE_DELIVERED, handleMessageDelivered);
      websocketService.off(WS_MESSAGE_RECEIVED, handleMessageReceived);
      logger.debug('[BackgroundSyncService] WebSocket listeners cleaned up');
    };
  }

  /**
   * Handle transaction status update from WebSocket
   */
  private async handleTransactionStatus(
    serverId: string,
    status: 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    if (!serverId) {
      logger.warn('[BackgroundSyncService] Received transaction status without ID');
      return;
    }

    try {
      // Find the local item by server ID
      const item = await unifiedTimelineRepository.getItemByServerId(serverId);

      if (!item) {
        logger.debug(`[BackgroundSyncService] No local item found for server ID: ${serverId}`);
        return;
      }

      // Update status
      await unifiedTimelineRepository.updateSyncStatus(
        item.id,
        'synced',
        status,
        undefined,
        error
      );

      logger.info(`[BackgroundSyncService] 📊 Transaction ${item.id} status updated: ${status}`);

    } catch (err) {
      logger.error('[BackgroundSyncService] Error handling transaction status:', err);
    }
  }

  /**
   * Handle message status update from WebSocket
   */
  private async handleMessageStatus(serverId: string, status: 'delivered' | 'read'): Promise<void> {
    if (!serverId) {
      return;
    }

    try {
      const item = await unifiedTimelineRepository.getItemByServerId(serverId);

      if (!item) {
        return;
      }

      await unifiedTimelineRepository.updateSyncStatus(
        item.id,
        'synced',
        status
      );

      logger.debug(`[BackgroundSyncService] Message ${item.id} status: ${status}`);

    } catch (err) {
      logger.error('[BackgroundSyncService] Error handling message status:', err);
    }
  }

  /**
   * Handle incoming message from another user via WebSocket
   * Uses from_entity_id/to_entity_id for consistency with Supabase
   */
  private async handleIncomingMessage(data: any): Promise<void> {
    if (!this.currentProfileId || !data) {
      return;
    }

    try {
      // Check if we already have this message
      const existing = await unifiedTimelineRepository.getItemByServerId(data.id);
      if (existing) {
        logger.debug(`[BackgroundSyncService] Message ${data.id} already exists locally`);
        return;
      }

      // Add to local timeline with Supabase-aligned field names
      await unifiedTimelineRepository.upsertFromServer({
        id: data.id,
        interaction_id: data.interaction_id,
        profile_id: this.currentProfileId,
        item_type: 'message',
        from_entity_id: data.from_entity_id || '',
        to_entity_id: data.to_entity_id || null,
        created_at: data.created_at || new Date().toISOString(),
        sync_status: 'synced',
        local_status: 'delivered',
        content: data.content,
        message_type: data.message_type || 'text',
        timeline_metadata: data.timeline_metadata ? JSON.stringify(data.timeline_metadata) : null,
      });

      logger.info(`[BackgroundSyncService] 📥 Incoming message added: ${data.id}`);

    } catch (err) {
      logger.error('[BackgroundSyncService] Error handling incoming message:', err);
    }
  }

  /**
   * Setup network state change listener
   */
  private setupNetworkListener(): void {
    networkService.onNetworkStateChange((state) => {
      if (!state.isOfflineMode && this.isRunning) {
        // Coming back online - process queue
        logger.info('[BackgroundSyncService] 📶 Back online - processing queue');
        setTimeout(() => this.processQueue(), 1000);
      }
    });
  }

  /**
   * Utility: delay for ms
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get sync status for debugging
   */
  public getStatus(): { isRunning: boolean; profileId: string | null; isProcessing: boolean } {
    return {
      isRunning: this.isRunning,
      profileId: this.currentProfileId,
      isProcessing: this.isProcessing,
    };
  }
}

// Export singleton instance
export const backgroundSyncService = BackgroundSyncService.getInstance();
export default backgroundSyncService;
