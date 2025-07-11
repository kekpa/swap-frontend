// Updated: Added comprehensive message handling with proper deduplication - 2025-05-21
// Updated: Improved WebSocket integration for real-time messaging - 2025-05-21
// Updated: Simplified for TanStack Query migration - 2025-01-10

import apiClient from '../_api/apiClient';
import { API_PATHS } from '../_api/apiPaths';
import { Message, SendMessageRequest, MessageStatus } from '../types/message.types';
import { CreateDirectMessageDto } from '../../../../backend/infra/dto/message.dto';
import { websocketService } from './websocketService';
import logger from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkService } from './NetworkService';
import { eventEmitter } from '../utils/eventEmitter';

interface PendingMessage {
  id: string;
  request: SendMessageRequest;
  timestamp: number;
  retryCount: number;
  optimisticId: string;
    }
    
interface MessageQueueItem {
  id: string;
  request: SendMessageRequest;
  timestamp: number;
  retryCount: number;
}

class MessageManager {
  private pendingMessages: Map<string, PendingMessage> = new Map();
  private outgoingQueue: Map<string, MessageQueueItem> = new Map();
  private messageStatusCache: Map<string, MessageStatus> = new Map();
  private isProcessingQueue = false;
  private queueProcessingInterval: NodeJS.Timeout | null = null;
  private reconnectHandler: (() => void) | null = null;
  private readonly STORAGE_KEY = 'message_queue';
  private readonly QUEUE_PROCESSING_INTERVAL = 3000; // 3 seconds for messages
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly DEDUPLICATION_WINDOW = 10000; // 10 seconds for messages
  private lastRequestTime: Map<string, number> = new Map();
  private optimisticMessageMap: Map<string, string> = new Map(); // optimisticId -> serverId

  constructor() {
    this.initialize();
  }
  
  // Initialize the message manager
  private initialize(): void {
    logger.info('[MessageManager] Initializing MessageManager service');
    
    // Setup reconnect handler for network state changes
    this.reconnectHandler = () => this.processQueue();
    networkService.onNetworkStateChange((state) => {
      if (!state.isOfflineMode && this.reconnectHandler) {
        // When coming back online, process any queued messages
        setTimeout(this.reconnectHandler, 1000);
      }
    });
    
    // Start queue processing
    this.startQueueProcessing();
    
    // Load any pending messages from storage
    this.loadQueueFromStorage();
    
    logger.info('[MessageManager] Initialization complete');
  }

  /**
   * Send message with basic functionality
   */
  async sendMessage(request: SendMessageRequest): Promise<Message | null> {
    try {
      // Check for recent duplicate requests
      const duplicateKey = `${request.interaction_id}:${request.content}`;
      const lastRequestTime = this.lastRequestTime.get(duplicateKey);
      const now = Date.now();
      
      if (lastRequestTime && (now - lastRequestTime) < this.DEDUPLICATION_WINDOW) {
        logger.warn('[MessageManager] Duplicate message request blocked');
        return null;
      }
      
      // Update last request time
      this.lastRequestTime.set(duplicateKey, now);
      
      // Generate optimistic message ID
      const optimisticId = `opt_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
      logger.info('[MessageManager] Sending message', { optimisticId });
      
      // Check if offline
      const isOffline = networkService.getNetworkState().isOfflineMode;
      if (isOffline) {
        logger.debug('[MessageManager] Offline mode - queuing message for later');
    
        // Add to queue for processing when online
        const queueItem: MessageQueueItem = {
      id: optimisticId,
          request,
          timestamp: Date.now(),
          retryCount: 0
    };
    
    this.outgoingQueue.set(optimisticId, queueItem);
        await this.saveQueueToStorage();
        
        // Return optimistic message
        const optimisticMessage: Message = {
        id: optimisticId,
          interaction_id: request.interaction_id,
          content: request.content,
          message_type: request.message_type || 'text',
          sender_entity_id: request.sender_entity_id,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: { isOptimistic: true }
        };
    
        // Emit optimistic message event
        eventEmitter.emit('message:new', optimisticMessage);
        
        return optimisticMessage;
      }
      
      // Online - send to server immediately
      const dto: CreateDirectMessageDto = {
        interaction_id: request.interaction_id,
        content: request.content,
        message_type: request.message_type || 'text',
        metadata: { optimisticId }
      };
      
      const response = await apiClient.post(API_PATHS.MESSAGE.SEND, dto);
      
      if (response.status === 201 || response.status === 200) {
        const message = response.data.data || response.data;
      
        // Map optimistic ID to server ID
        if (message.id) {
          this.optimisticMessageMap.set(optimisticId, message.id);
      }
      
        logger.info('[MessageManager] Message sent successfully', {
          optimisticId,
          serverId: message.id,
          status: message.status
        });
      
        // Cache message status
        this.messageStatusCache.set(message.id, message.status);
      
        // Emit message sent event
        eventEmitter.emit('message:new', message);
        
        return message;
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
      
    } catch (error) {
      logger.error('[MessageManager] Message sending failed', error);
      
      // Add to retry queue if not a client error
      if (error instanceof Error && !error.message.includes('400')) {
        const queueItem: MessageQueueItem = {
          id: `retry_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          request,
          timestamp: Date.now(),
          retryCount: 0
        };
        
        this.outgoingQueue.set(queueItem.id, queueItem);
        await this.saveQueueToStorage();
      }
      
      return null;
    }
  }
  
  // Get cached message status
  getMessageStatus(messageId: string): MessageStatus | null {
    return this.messageStatusCache.get(messageId) || null;
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
          const dto: CreateDirectMessageDto = {
            interaction_id: item.request.interaction_id,
            content: item.request.content,
            message_type: item.request.message_type || 'text'
          };
          
          const response = await apiClient.post(API_PATHS.MESSAGE.SEND, dto);
          
          if (response.status === 201 || response.status === 200) {
            // Remove from queue on success
            this.outgoingQueue.delete(item.id);
            logger.debug('[MessageManager] Queued message sent successfully', { id: item.id });
          } else {
            throw new Error(`Unexpected status: ${response.status}`);
          }
        } catch (error) {
          // Increment retry count
          item.retryCount++;
          
          if (item.retryCount >= this.MAX_RETRY_ATTEMPTS) {
            // Remove from queue after max retries
            this.outgoingQueue.delete(item.id);
            logger.warn('[MessageManager] Message removed from queue after max retries', { id: item.id });
          } else {
            logger.debug('[MessageManager] Message retry scheduled', { 
              id: item.id, 
              retryCount: item.retryCount 
          });
        }
      }
      }
      
      // Save updated queue
      await this.saveQueueToStorage();
      
    } catch (error) {
      logger.error('[MessageManager] Error processing message queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }
  
  private async saveQueueToStorage(): Promise<void> {
      try {
      const queueArray = Array.from(this.outgoingQueue.entries());
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(queueArray));
      } catch (error) {
      logger.error('[MessageManager] Failed to save queue to storage:', error);
      }
    }

  private async loadQueueFromStorage(): Promise<void> {
      try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const queueArray = JSON.parse(stored);
        this.outgoingQueue = new Map(queueArray);
        logger.debug(`[MessageManager] Loaded ${this.outgoingQueue.size} items from queue storage`);
        }
      } catch (error) {
      logger.error('[MessageManager] Failed to load queue from storage:', error);
      }
    }

  async clearQueue(): Promise<void> {
    this.outgoingQueue.clear();
    await this.saveQueueToStorage();
    logger.debug('[MessageManager] Message queue cleared');
  }

  getQueueSize(): number {
    return this.outgoingQueue.size;
  }
  
  getPendingMessages(): MessageQueueItem[] {
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
    
    logger.debug('[MessageManager] Cleanup completed');
  }
}

export const messageManager = new MessageManager(); 