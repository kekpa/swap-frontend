// Created: WebSocketHandler for consistent message processing with idempotency - 2025-05-21
// Updated: Migrated to use centralized repository instances - 2025-05-29
// Updated: Professional architecture with direct cache updates - 2025-11-04
// Updated: Removed legacy MessageManager - uses local-first architecture - 2025-12-22

import { websocketService } from './websocketService';
import { unifiedTimelineRepository } from '../localdb/UnifiedTimelineRepository';
import { LocalTimelineItem } from '../localdb/schema/local-timeline-schema';
import logger from '../utils/logger';
import { MessageTimelineItem } from '../types/timeline.types';
import { eventEmitter } from '../utils/eventEmitter';
import { smartNotificationHandler } from './SmartNotificationHandler';
import { deliveryConfirmationManager } from './DeliveryConfirmationManager';
// NOTE: LocalDataManager removed - BackgroundSyncService handles local-first updates via SQLite
import { QueryClient } from '@tanstack/react-query';

// Track processed message IDs to prevent duplicates
const processedMessageIds = new Set<string>();
const MESSAGE_HISTORY_MAX_SIZE = 1000; // Limit memory usage

/**
 * WebSocketHandler - Manages WebSocket event handling and message processing
 * 
 * This class acts as a bridge between the WebSocket service and the application's
 * message handling system. It ensures messages are processed only once and
 * properly stored in the local database.
 */
class WebSocketHandler {
  private isInitialized = false;
  private messageIdTtl = 60 * 60 * 1000; // 1 hour TTL for processed message IDs
  private queryClient: QueryClient | null = null;
  
  // Store cleanup functions for WebSocket event listeners
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private messageCleanup: (() => void) | null = null;
  private transactionCleanup: (() => void) | null = null;
  private reconnectCleanup: (() => void) | null = null;
  
  /**
   * Initialize WebSocket event handlers with QueryClient
   * @param queryClient - TanStack Query client for direct cache updates
   * @param entityId - Entity ID for proper cache key scoping
   */
  initialize(queryClient?: QueryClient, entityId?: string): void {
    if (this.isInitialized) {
      console.log('🔥 [WebSocketHandler] ⚠️ Already initialized, skipping...');
      return;
    }

    console.log('🔥 [WebSocketHandler] 🚀 INITIALIZING WebSocketHandler...');

    // Store QueryClient for cache invalidation on reconnect
    if (queryClient) {
      this.queryClient = queryClient;
      // NOTE: Local-first updates now handled by BackgroundSyncService via SQLite
      console.log('🔥 [WebSocketHandler] ✅ Local-first architecture enabled');
    }
    
    // Check WebSocket connection status
    const isConnected = websocketService.isSocketConnected();
    const isAuthenticated = websocketService.isSocketAuthenticated();
    
    console.log('🔥 [WebSocketHandler] WebSocket connection status:', {
      isConnected,
      isAuthenticated
    });
    
    if (!isConnected) {
      console.warn('🔥 [WebSocketHandler] ⚠️ WebSocket not connected, handlers may not work until connection is established');
    }
    
    // Set up message handlers using the correct WebSocket service methods
    this.setupMessageHandlers();
    
    // Set up cleanup interval for processed message IDs
    this.setupCleanupInterval();
    
    this.isInitialized = true;
    console.log('🔥 [WebSocketHandler] ✅ INITIALIZATION COMPLETE');
    logger.info('[WebSocketHandler] Initialized successfully');
  }
  
  /**
   * Clean up WebSocket handlers and intervals
   */
  cleanup(): void {
    console.log('🔥 [WebSocketHandler] 🧹 CLEANING UP...');
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Remove WebSocket event listeners using cleanup functions
    if (this.messageCleanup) {
      this.messageCleanup();
      this.messageCleanup = null;
    }

    if (this.transactionCleanup) {
      this.transactionCleanup();
      this.transactionCleanup = null;
    }

    if (this.reconnectCleanup) {
      this.reconnectCleanup();
      this.reconnectCleanup = null;
    }

    this.isInitialized = false;
    console.log('🔥 [WebSocketHandler] ✅ CLEANUP COMPLETE');
    logger.info('[WebSocketHandler] Cleaned up successfully');
  }
  
  /**
   * Setup message handlers for different WebSocket events
   */
  private setupMessageHandlers(): void {
    console.log('🔥 [WebSocketHandler] 📡 SETTING UP MESSAGE HANDLERS...');
    
    // Handle new messages from WebSocket using the correct onMessage method
    console.log('🔥 [WebSocketHandler] Registering new_message handler...');
    this.messageCleanup = websocketService.onMessage((data) => {
      console.log('🔥 [WebSocketHandler] 🎯 HANDLER CALLED for new_message:', {
        messageId: data?.id,
        interactionId: data?.interaction_id,
        content: data?.content?.substring(0, 30),
        timestamp: new Date().toISOString()
      });
      this.handleNewMessage(data);
    });
    
    // Handle transaction updates from WebSocket
    console.log('🔥 [WebSocketHandler] Registering transaction_update handler...');
    this.transactionCleanup = websocketService.onTransactionUpdate((data) => {
      console.log('🔥 [WebSocketHandler] 🎯 HANDLER CALLED for transaction_update:', data);
      this.handleTransactionUpdate(data);
    });

    // Handle reconnection events - invalidate transaction cache on reconnect
    console.log('🔥 [WebSocketHandler] Registering reconnect handler...');
    this.reconnectCleanup = websocketService.onReconnect(() => {
      console.log('🔥 [WebSocketHandler] 🔄 RECONNECTED - Invalidating transaction cache');
      if (this.queryClient) {
        this.queryClient.invalidateQueries({ queryKey: ['transactions'] });
        logger.info('[WebSocketHandler] ✅ Transaction cache invalidated on reconnect');
      }
    });

    console.log('🔥 [WebSocketHandler] ✅ ALL MESSAGE HANDLERS REGISTERED');
    console.log('🔥 [WebSocketHandler] Handler registration verification:', {
      messageCleanupExists: !!this.messageCleanup,
      transactionCleanupExists: !!this.transactionCleanup,
      reconnectCleanupExists: !!this.reconnectCleanup,
      socketConnected: websocketService.isSocketConnected(),
      socketAuthenticated: websocketService.isSocketAuthenticated(),
      timestamp: new Date().toISOString()
    });
    logger.debug('[WebSocketHandler] Message handlers set up successfully');
  }
  
  /**
   * Set up automatic cleanup of processed message IDs
   */
  private setupCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupProcessedMessageIds();
    }, 5 * 60 * 1000); // Run every 5 minutes
  }
  
  /**
   * Clean up old processed message IDs to prevent memory leaks
   */
  private cleanupProcessedMessageIds(): void {
    // If we have more than max size, remove the oldest entries
    if (processedMessageIds.size > MESSAGE_HISTORY_MAX_SIZE) {
      const idsToRemove = processedMessageIds.size - MESSAGE_HISTORY_MAX_SIZE;
      const idsArray = Array.from(processedMessageIds);
      
      for (let i = 0; i < idsToRemove; i++) {
        processedMessageIds.delete(idsArray[i]);
      }
      
      logger.debug(`[WebSocketHandler] Cleaned up ${idsToRemove} old message IDs`);
    }
  }
  
  /**
   * Process new message from WebSocket with idempotency check
   */
  private handleNewMessage(data: any): void {
    try {
      console.log(`🔥 [WebSocketHandler] ✅ RECEIVED new_message event:`, {
        messageId: data?.id,
        interactionId: data?.interaction_id,
        content: data?.content?.substring(0, 30),
        fromEntityId: data?.from_entity_id
      });
      
      if (!data || !data.id) {
        logger.warn('[WebSocketHandler] Received invalid message data from WebSocket', data);
        return;
      }
      
      const messageId = data.id;
      
      // Check if we've already processed this message
      if (processedMessageIds.has(messageId)) {
        logger.debug(`[WebSocketHandler] Skipping already processed message: ${messageId}`);
        return;
      }
      
      // Mark message as processed EARLY to prevent duplicate events
      processedMessageIds.add(messageId);
      logger.debug(`[WebSocketHandler] Processing new WebSocket message: ${messageId}`);
      
      // Process the message for storage and UI updates
      // 1. Save to unified local_timeline for offline access
      if (data.id && data.interaction_id) {
        // Map WebSocket message to LocalTimelineItem format
        // ALIGNED WITH SUPABASE: from_entity_id = who sent, to_entity_id = who received
        const localItem: Partial<LocalTimelineItem> & { id: string } = {
          id: data.id,
          server_id: data.id, // WebSocket message = from server
          interaction_id: data.interaction_id,
          entity_id: data.entity_id || data.from_entity_id || '', // Use entity_id for data isolation
          item_type: 'message',
          created_at: data.created_at || data.createdAt || new Date().toISOString(),
          content: data.content || '',
          message_type: data.message_type || 'text',
          sync_status: 'synced', // Came from server via WebSocket
          local_status: data.status || 'delivered',
          from_entity_id: data.from_entity_id || '',
          to_entity_id: data.to_entity_id || null,
          timeline_metadata: JSON.stringify({ ...data.timeline_metadata, isOptimistic: false }),
        };

        unifiedTimelineRepository.upsertFromServer(localItem)
          .catch(err => logger.warn(
            `[WebSocketHandler] Failed to save message ${data.id} to local_timeline: ${String(err)}`
          ));
      }
      
      // 2. 🚀 PHASE 2.2: Smart notification handling based on user state
      smartNotificationHandler.handleMessageNotification(data);
      
      // 3. 🚀 PHASE 2.6: Confirm message delivery via WebSocket
      if (data.id && data.interaction_id) {
        deliveryConfirmationManager.confirmMessageDelivered(data.id, data.interaction_id);
      }
      
      // 4. Professional Real-time Update (WhatsApp/Slack pattern)
      console.log(`🔥 [WebSocketHandler] ✅ Processing real-time update`);
      
      // Create properly typed timeline item for cache update
      const timelineItem: MessageTimelineItem = {
        id: data.id,
        interaction_id: data.interaction_id,
        type: 'message',
        itemType: 'message',
        content: data.content || '',
        message_type: data.message_type || 'text',
        from_entity_id: data.from_entity_id || 'unknown',
        createdAt: data.created_at || data.createdAt || new Date().toISOString(),
        timestamp: data.timestamp || data.created_at || new Date().toISOString(),
        metadata: { ...data.timeline_metadata, isOptimistic: false },
        status: data.status || 'delivered'
      };
      
      // Emit for direct cache update (professional pattern)
      eventEmitter.emit('message:new', timelineItem);
      
      logger.info(`[WebSocketHandler] ✅ Real-time message processed: ${messageId}`);
      
    } catch (error) {
      logger.error('[WebSocketHandler] Error handling new message', 
        error instanceof Error ? error.message : String(error));
    }
  }
  
  /**
   * Handle transaction updates from WebSocket
   */
  private handleTransactionUpdate(data: any): void {
    try {
      if (!data || !data.transaction_id) {
        logger.warn('[WebSocketHandler] Received invalid transaction update from WebSocket', data);
        return;
      }
      
      const transactionId = data.transaction_id;
      const status = data.status;
      
      // Emit transaction update event through the EventEmitter mechanism
      console.log(`🔥 [WebSocketHandler] ✅ EMITTING transaction:update event`);
      eventEmitter.emit('transaction:update', {
        id: transactionId,
        status: status,
        timestamp: data.timestamp || new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('[WebSocketHandler] Error handling transaction update', 
        error instanceof Error ? error.message : String(error));
    }
  }
}

// Singleton instance
export const webSocketHandler = new WebSocketHandler();

// NOTE: Do not auto-initialize here - let DataContext handle initialization
// after WebSocket is properly connected and authenticated 