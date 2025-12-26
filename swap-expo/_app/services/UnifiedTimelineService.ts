// Created: UnifiedTimelineService for WhatsApp-grade local-first architecture - 2025-12-22
// INSTANT: Writes to SQLite first, UI updates immediately
// RELIABLE: Background sync handles API calls

import logger from '../utils/logger';
import { unifiedTimelineRepository } from '../localdb/UnifiedTimelineRepository';
import { LocalTimelineItem } from '../localdb/schema/local-timeline-schema';

// Generate unique client-side ID
const generateClientId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Message send parameters
// Uses from_entity_id/to_entity_id for consistency with Supabase and transaction_ledger
export interface SendMessageParams {
  interactionId: string;
  profileId: string;
  fromEntityId: string;      // Who is sending the message
  toEntityId?: string;       // Who is receiving the message
  content: string;
  messageType?: 'text' | 'image' | 'file' | 'audio';
  metadata?: Record<string, any>;
}

// Transaction send parameters
// Uses from_entity_id/to_entity_id for consistency with Supabase and messages
export interface SendTransactionParams {
  interactionId: string;
  profileId: string;
  fromEntityId: string;       // Who is sending the money
  toEntityId: string;         // Who is receiving the money
  amount: number;
  currencyId: string;
  currencyCode: string;
  currencySymbol: string;
  description?: string;
  fromWalletId: string;
  toWalletId?: string;
  transactionType?: 'p2p' | 'transfer' | 'request' | 'refund';
  metadata?: Record<string, any>;
}

// Result of send operations
export interface SendResult {
  localId: string;
  success: boolean;
  error?: string;
}

/**
 * UnifiedTimelineService - Send messages and transactions with instant UI feedback
 *
 * KEY PRINCIPLES:
 * - Writes to SQLite FIRST (instant, <10ms)
 * - UI updates immediately via reactive hook
 * - Background sync handles API calls
 * - Failed items stay visible (tap to retry)
 *
 * @example
 * ```typescript
 * // Send message - instant UI update
 * const { localId } = await unifiedTimelineService.sendMessage({
 *   interactionId,
 *   profileId,
 *   fromEntityId: currentUser.entityId,
 *   content: 'Hello!',
 * });
 *
 * // UI already shows message with "sending" status
 * // Navigate immediately - don't wait for API!
 * navigation.navigate('Chat', { interactionId });
 * ```
 */
class UnifiedTimelineService {
  private static instance: UnifiedTimelineService;

  public static getInstance(): UnifiedTimelineService {
    if (!UnifiedTimelineService.instance) {
      UnifiedTimelineService.instance = new UnifiedTimelineService();
    }
    return UnifiedTimelineService.instance;
  }

  private constructor() {
    logger.info('[UnifiedTimelineService] Initialized');
  }

  /**
   * Send message with instant UI feedback
   *
   * FLOW:
   * 1. Generate client ID
   * 2. Write to SQLite (INSTANT)
   * 3. UI updates via reactive hook
   * 4. Return localId for tracking
   * 5. BackgroundSyncService will handle API call
   */
  public async sendMessage(params: SendMessageParams): Promise<SendResult> {
    const {
      interactionId,
      profileId,
      fromEntityId,
      toEntityId,
      content,
      messageType = 'text',
      metadata = {},
    } = params;

    // Validate required fields
    if (!interactionId || !profileId || !fromEntityId) {
      logger.error('[UnifiedTimelineService] Missing required fields for sendMessage');
      return { localId: '', success: false, error: 'Missing required fields' };
    }

    if (!content?.trim()) {
      logger.error('[UnifiedTimelineService] Empty message content');
      return { localId: '', success: false, error: 'Message content is empty' };
    }

    // Generate client-side ID
    const localId = generateClientId('msg');

    logger.info(`[UnifiedTimelineService] 📤 Sending message: ${localId}`);

    try {
      // STEP 1: Create timeline item
      // Uses from_entity_id/to_entity_id for consistency with Supabase
      const item: LocalTimelineItem = {
        id: localId,
        server_id: null, // Will be set after API sync
        interaction_id: interactionId,
        profile_id: profileId,
        item_type: 'message',
        created_at: new Date().toISOString(),
        // Entity direction (consistent with Supabase)
        from_entity_id: fromEntityId,   // Who is sending
        to_entity_id: toEntityId || null, // Who is receiving
        sync_status: 'pending',
        local_status: 'pending', // Will change to 'sent' after sync
        retry_count: 0,
        last_error: null,
        // Message fields
        content: content.trim(),
        message_type: messageType,
        // Transaction fields (null for messages)
        amount: null,
        currency_id: null,
        currency_code: null,
        currency_symbol: null,
        transaction_type: null,
        description: null,
        from_wallet_id: null,
        to_wallet_id: null,
        timeline_metadata: JSON.stringify({ ...metadata, client_generated_id: localId }),
      };

      // STEP 2: Write to SQLite (INSTANT - triggers UI update)
      await unifiedTimelineRepository.addItem(item);

      logger.info(`[UnifiedTimelineService] ✅ Message ${localId} written to SQLite - UI updated!`);

      // STEP 3: Return immediately (background sync will handle API)
      return { localId, success: true };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[UnifiedTimelineService] ❌ Failed to send message: ${errorMsg}`);
      return { localId: '', success: false, error: errorMsg };
    }
  }

  /**
   * Send transaction with instant UI feedback
   *
   * FLOW:
   * 1. Generate client ID
   * 2. Write to SQLite (INSTANT)
   * 3. UI updates via reactive hook
   * 4. Return localId for tracking
   * 5. BackgroundSyncService will handle API call
   */
  public async sendTransaction(params: SendTransactionParams): Promise<SendResult> {
    const {
      interactionId,
      profileId,
      fromEntityId,
      toEntityId,
      amount,
      currencyId,
      currencyCode,
      currencySymbol,
      description,
      fromWalletId,
      toWalletId,
      transactionType = 'p2p',
      metadata = {},
    } = params;

    // Validate required fields
    if (!interactionId || !profileId || !fromEntityId || !toEntityId) {
      logger.error('[UnifiedTimelineService] Missing required fields for sendTransaction');
      return { localId: '', success: false, error: 'Missing required fields' };
    }

    if (!amount || amount <= 0) {
      logger.error('[UnifiedTimelineService] Invalid transaction amount');
      return { localId: '', success: false, error: 'Amount must be positive' };
    }

    if (!fromWalletId) {
      logger.error('[UnifiedTimelineService] Missing wallet ID');
      return { localId: '', success: false, error: 'From wallet ID is required' };
    }

    // Generate client-side ID
    const localId = generateClientId('txn');

    logger.info(`[UnifiedTimelineService] 💰 Sending transaction: ${localId} (${currencySymbol}${amount})`);

    try {
      // STEP 1: Create timeline item
      // Uses from_entity_id/to_entity_id for consistency with Supabase
      const item: LocalTimelineItem = {
        id: localId,
        server_id: null, // Will be set after API sync
        interaction_id: interactionId,
        profile_id: profileId,
        item_type: 'transaction',
        created_at: new Date().toISOString(),
        // Entity direction (consistent with Supabase)
        from_entity_id: fromEntityId,   // Who is sending money
        to_entity_id: toEntityId,       // Who is receiving money
        sync_status: 'pending',
        local_status: 'pending', // Will progress through saga states
        retry_count: 0,
        last_error: null,
        // Message fields (null for transactions)
        content: description || null,
        message_type: null,
        // Transaction fields
        amount: amount,
        currency_id: currencyId,
        currency_code: currencyCode,
        currency_symbol: currencySymbol,
        transaction_type: transactionType,
        description: description || null,
        from_wallet_id: fromWalletId,
        to_wallet_id: toWalletId || null,
        timeline_metadata: JSON.stringify({ ...metadata, client_generated_id: localId }),
      };

      // STEP 2: Write to SQLite (INSTANT - triggers UI update)
      await unifiedTimelineRepository.addItem(item);

      logger.info(`[UnifiedTimelineService] ✅ Transaction ${localId} written to SQLite - UI updated!`);

      // STEP 3: Return immediately (background sync will handle API)
      return { localId, success: true };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[UnifiedTimelineService] ❌ Failed to send transaction: ${errorMsg}`);
      return { localId: '', success: false, error: errorMsg };
    }
  }

  /**
   * Retry a failed item
   * Resets retry count and sets status to pending for re-sync
   */
  public async retryItem(localId: string): Promise<boolean> {
    logger.info(`[UnifiedTimelineService] 🔄 Retrying item: ${localId}`);

    try {
      // Reset to pending status
      await unifiedTimelineRepository.updateSyncStatus(localId, 'pending', 'pending');

      logger.info(`[UnifiedTimelineService] ✅ Item ${localId} queued for retry`);
      return true;

    } catch (error) {
      logger.error(`[UnifiedTimelineService] ❌ Failed to retry item: ${error}`);
      return false;
    }
  }

  /**
   * Cancel a pending item (before it's synced)
   */
  public async cancelItem(localId: string, profileId: string): Promise<boolean> {
    logger.info(`[UnifiedTimelineService] 🚫 Cancelling item: ${localId}`);

    try {
      const item = await unifiedTimelineRepository.getItemById(localId);

      if (!item) {
        logger.warn(`[UnifiedTimelineService] Item ${localId} not found`);
        return false;
      }

      // Can only cancel pending items that haven't synced yet
      if (item.sync_status !== 'pending') {
        logger.warn(`[UnifiedTimelineService] Cannot cancel item ${localId} - already ${item.sync_status}`);
        return false;
      }

      // Update to cancelled status
      await unifiedTimelineRepository.updateSyncStatus(localId, 'synced', 'cancelled');

      logger.info(`[UnifiedTimelineService] ✅ Item ${localId} cancelled`);
      return true;

    } catch (error) {
      logger.error(`[UnifiedTimelineService] ❌ Failed to cancel item: ${error}`);
      return false;
    }
  }

  /**
   * Get pending items count (for UI indicators)
   */
  public async getPendingCount(profileId: string): Promise<number> {
    try {
      const pending = await unifiedTimelineRepository.getPendingItems(profileId);
      return pending.length;
    } catch (error) {
      logger.error(`[UnifiedTimelineService] ❌ Failed to get pending count: ${error}`);
      return 0;
    }
  }

  /**
   * Get failed items count (for UI indicators)
   */
  public async getFailedCount(profileId: string): Promise<number> {
    try {
      const failed = await unifiedTimelineRepository.getFailedItems(profileId);
      return failed.length;
    } catch (error) {
      logger.error(`[UnifiedTimelineService] ❌ Failed to get failed count: ${error}`);
      return 0;
    }
  }
}

// Export singleton instance
export const unifiedTimelineService = UnifiedTimelineService.getInstance();
export default unifiedTimelineService;
