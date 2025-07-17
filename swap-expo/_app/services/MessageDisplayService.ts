// Created: MessageDisplayService for consistent message display with entity resolution - 2025-05-21

import { Message } from '../types/message.types';
import { EntityType } from '../types/entity.types';
import { entityResolver, ResolvedEntity } from './EntityResolver';
import { format } from 'date-fns';

/**
 * Message display format for UI rendering
 */
export interface DisplayMessage {
  id: string;
  content: string;
  contentType: string;
  timestamp: string;
  formattedTime: string;
  sender: ResolvedEntity;
  status: string;
  isOutgoing: boolean;
  metadata?: Record<string, any>;
  mediaUrl?: string;
  mediaType?: string;
}

/**
 * MessageDisplayService handles formatting messages for display
 * with proper entity resolution and consistent formatting
 */
export class MessageDisplayService {
  private currentUserId: string;
  
  /**
   * Initialize with current user ID
   */
  constructor(currentUserId: string) {
    this.currentUserId = currentUserId;
  }
  
  /**
   * Update current user ID
   */
  setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }
  
  /**
   * Format message timestamp for display
   */
  private formatMessageTime(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Today: show time only
      if (date.toDateString() === now.toDateString()) {
        return format(date, 'h:mm a');
      }
      
      // Yesterday: show "Yesterday"
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      
      // Within last 7 days: show day name
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      if (date > oneWeekAgo) {
        return format(date, 'EEEE'); // Day name (Monday, Tuesday, etc.)
      }
      
      // Within current year: show month and day
      if (date.getFullYear() === now.getFullYear()) {
        return format(date, 'MMM d'); // May 21
      }
      
      // Other: show month, day, year
      return format(date, 'MMM d, yyyy'); // May 21, 2025
    } catch (error) {
      console.error('Error formatting message time:', error);
      return 'Unknown time';
    }
  }
  
  /**
   * Format a single message for display with resolved entity
   */
  async formatMessageForDisplay(message: Message): Promise<DisplayMessage> {
    try {
      // Determine if message is outgoing (from current user)
      const isOutgoing = message.sender_entity_id === this.currentUserId;
      
      // Resolve the sender entity
      const sender = await entityResolver.resolveEntity(
        message.sender_entity_id,
        message.sender_entity_type as EntityType || EntityType.PROFILE
      );
      
      // Format the timestamp
      const timestamp = message.created_at || message.inserted_at || new Date().toISOString();
      const formattedTime = this.formatMessageTime(timestamp);
      
      return {
        id: message.id,
        content: message.content || '',
        contentType: message.message_type || 'text',
        timestamp,
        formattedTime,
        sender,
        status: message.message_status || message.status || 'sent',
        isOutgoing,
        metadata: message.metadata,
        mediaUrl: message.media_url,
        mediaType: message.media_type
      };
    } catch (error) {
      console.error('Error formatting message:', error);
      
      // Return fallback message with default values
      return {
        id: message.id,
        content: message.content || '',
        contentType: message.message_type || 'text',
        timestamp: message.created_at || message.inserted_at || new Date().toISOString(),
        formattedTime: 'Unknown',
        sender: {
          id: message.sender_entity_id,
          entityType: EntityType.PROFILE,
          displayName: 'Unknown User',
          avatarText: 'UU',
          avatarColor: '#0077b6',
          type: 'friend'
        },
        status: message.message_status || message.status || 'sent',
        isOutgoing: message.sender_entity_id === this.currentUserId
      };
    }
  }
  
  /**
   * Format multiple messages for display in batch
   */
  async formatMessagesForDisplay(messages: Message[]): Promise<DisplayMessage[]> {
    if (!messages || messages.length === 0) return [];
    
    // Collect all unique entity IDs for pre-fetching
    const entityIds = new Set<string>();
    messages.forEach(message => {
      if (message.sender_entity_id) {
        entityIds.add(message.sender_entity_id);
      }
    });
    
    // Prefetch all unique entities for better performance
    const entityPrefetchRequests = Array.from(entityIds).map(id => ({
      id,
      entityType: EntityType.PROFILE // Default to profile, will be corrected during resolution
    }));
    
    await entityResolver.prefetchEntities(entityPrefetchRequests);
    
    // Format each message
    const formattedMessages = await Promise.all(
      messages.map(message => this.formatMessageForDisplay(message))
    );
    
    return formattedMessages;
  }
  
  /**
   * Group messages by date for display with date separators
   */
  groupMessagesByDate(messages: DisplayMessage[]): Record<string, DisplayMessage[]> {
    const groupedMessages: Record<string, DisplayMessage[]> = {};
    
    messages.forEach(message => {
      try {
        const date = new Date(message.timestamp);
        const dateString = format(date, 'yyyy-MM-dd');
        
        if (!groupedMessages[dateString]) {
          groupedMessages[dateString] = [];
        }
        
        groupedMessages[dateString].push(message);
      } catch (error) {
        console.error('Error grouping message by date:', error);
        const fallbackGroup = 'unknown-date';
        if (!groupedMessages[fallbackGroup]) {
          groupedMessages[fallbackGroup] = [];
        }
        groupedMessages[fallbackGroup].push(message);
      }
    });
    
    return groupedMessages;
  }
  
  /**
   * Group messages by sender for consecutive messages from same sender
   */
  groupMessagesBySender(messages: DisplayMessage[]): DisplayMessage[][] {
    if (!messages || messages.length === 0) return [];
    
    const groupedMessages: DisplayMessage[][] = [];
    let currentGroup: DisplayMessage[] = [messages[0]];
    
    for (let i = 1; i < messages.length; i++) {
      const currentMessage = messages[i];
      const previousMessage = messages[i - 1];
      
      // Check if same sender and within 5 minutes
      const sameEntity = currentMessage.sender.id === previousMessage.sender.id;
      
      // Calculate time difference in minutes
      const currentTimestamp = new Date(currentMessage.timestamp).getTime();
      const previousTimestamp = new Date(previousMessage.timestamp).getTime();
      const timeDifferenceMinutes = (currentTimestamp - previousTimestamp) / (1000 * 60);
      
      if (sameEntity && timeDifferenceMinutes < 5) {
        // Add to current group if same sender and within 5 minutes
        currentGroup.push(currentMessage);
      } else {
        // Start a new group
        groupedMessages.push(currentGroup);
        currentGroup = [currentMessage];
      }
    }
    
    // Add the last group
    if (currentGroup.length > 0) {
      groupedMessages.push(currentGroup);
    }
    
    return groupedMessages;
  }
}

// Create a singleton instance that can be configured with the current user
export const messageDisplayService = new MessageDisplayService('');

/**
 * Set the current user ID for the message display service
 */
export function configureMessageDisplayService(userId: string): void {
  messageDisplayService.setCurrentUserId(userId);
} 