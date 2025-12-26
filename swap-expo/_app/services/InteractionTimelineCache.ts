// InteractionTimelineCache - In-memory cache for timeline items per interaction
// Renamed from TimelineManager for clarity (2025-12-23)

import EventEmitter from 'eventemitter3';
import { TimelineItem, MessageTimelineItem, TransactionTimelineItem, DateSeparatorTimelineItem } from '../types/timeline.types';
import { MessageType as APIMessageType, MessageStatus } from '../types/message.types';
import logger from '../utils/logger';

export interface InteractionTimelineCacheOptions {
  maxItems?: number;
  enableOptimisticUpdates?: boolean;
  enableDateSeparators?: boolean;
}

export class InteractionTimelineCache extends EventEmitter {
  private static instances = new Map<string, InteractionTimelineCache>();
  private timelineItems = new Map<string, TimelineItem>();
  private interactionId: string;
  private options: InteractionTimelineCacheOptions;

  private constructor(interactionId: string, options: InteractionTimelineCacheOptions = {}) {
    super();
    this.interactionId = interactionId;
    this.options = {
      maxItems: 1000,
      enableOptimisticUpdates: true,
      enableDateSeparators: true,
      ...options,
    };
  }

  /**
   * Get or create an InteractionTimelineCache instance for an interaction
   */
  static getInstance(interactionId: string, options?: InteractionTimelineCacheOptions): InteractionTimelineCache {
    if (!this.instances.has(interactionId)) {
      this.instances.set(interactionId, new InteractionTimelineCache(interactionId, options));
    }
    return this.instances.get(interactionId)!;
  }

  /**
   * Set timeline items from API or local storage
   */
  setTimelineItems(items: TimelineItem[]): void {
    logger.debug(`[InteractionTimelineCache] Setting ${items.length} timeline items for interaction ${this.interactionId}`, 'timeline_manager');
    
    // Clear existing items
    this.timelineItems.clear();
    
    // Add new items
    items.forEach(item => {
      if (item.id && item.type !== 'date') {
        this.timelineItems.set(item.id, item);
      }
    });
    
    // Apply size limit
    this.enforceMaxItems();
    
    // Emit update event
    this.emit('timeline:updated', this.getTimelineItems());
  }

  /**
   * Add a message to the timeline with optimistic update handling
   */
  addMessage(messageData: Partial<MessageTimelineItem> & {
    interaction_id: string;
    id: string;
    content: string;
    from_entity_id: string;
    created_at?: string;
  }): void {
    const isOptimistic = messageData.metadata?.isOptimistic === true;
    const messageId = messageData.id;
    const optimisticId = messageData.metadata?.optimisticId;
    const idempotencyKey = messageData.metadata?.idempotency_key;
    
    logger.debug(`[InteractionTimelineCache] Adding ${isOptimistic ? 'optimistic' : 'authoritative'} message ${messageId}`, 'timeline_manager');

    // Handle optimistic message replacement
    if (!isOptimistic && this.options.enableOptimisticUpdates) {
      // Replace optimistic message if this is its authoritative version
      if (optimisticId && this.timelineItems.has(optimisticId)) {
        const optimisticMsg = this.timelineItems.get(optimisticId);
        if (optimisticMsg?.metadata?.isOptimistic) {
          logger.debug(`[InteractionTimelineCache] Replacing optimistic message ${optimisticId} with authoritative ${messageId}`, 'timeline_manager');
          this.timelineItems.delete(optimisticId);
        }
      }
      
      // Fallback: match by idempotency_key
      if (!optimisticId && idempotencyKey) {
        const optimisticMatch = Array.from(this.timelineItems.values()).find(item => 
          item.metadata?.isOptimistic === true && 
          item.metadata?.idempotency_key === idempotencyKey
        );
        if (optimisticMatch) {
          logger.debug(`[InteractionTimelineCache] Replacing optimistic message by idempotency_key ${idempotencyKey}`, 'timeline_manager');
          this.timelineItems.delete(optimisticMatch.id);
        }
      }
    }

    // Create the timeline item
    const timelineItem: MessageTimelineItem = {
      id: messageId,
      interaction_id: this.interactionId,
      type: 'message',
      itemType: 'message',
      createdAt: messageData.createdAt || messageData.created_at || new Date().toISOString(),
      timestamp: messageData.timestamp || messageData.created_at || new Date().toISOString(),
      content: messageData.content,
      from_entity_id: messageData.from_entity_id,
      message_type: messageData.message_type || APIMessageType.TEXT,
      metadata: {
        ...messageData.metadata,
        isOptimistic: isOptimistic,
      },
      status: messageData.status || (isOptimistic ? 'sending' : 'sent') as MessageTimelineItem['status'],
    };

    // Add to timeline
    this.timelineItems.set(messageId, timelineItem);
    this.enforceMaxItems();
    
    // Emit events
    this.emit('message:added', timelineItem);
    this.emit('timeline:updated', this.getTimelineItems());
  }

  /**
   * Add a transaction to the timeline
   */
  addTransaction(transactionData: any): void {
    logger.debug(`[InteractionTimelineCache] Adding transaction ${transactionData.id}`, 'timeline_manager');
    
    const createdAtDate = transactionData.created_at instanceof Date 
      ? transactionData.created_at 
      : new Date(transactionData.created_at || Date.now());
    
    const timelineItem: TransactionTimelineItem = {
      id: transactionData.id,
      interaction_id: this.interactionId,
      type: 'transaction',
      itemType: 'transaction',
      createdAt: createdAtDate.toISOString(),
      timestamp: createdAtDate.toISOString(),
      amount: parseFloat(transactionData.amount),
      currency_code: transactionData.currency_code || transactionData.currency_id || transactionData.currency,
      status: transactionData.status || 'pending',
      description: transactionData.description,
      from_entity_id: transactionData.from_account_id || transactionData.from_entity_id,
      to_entity_id: transactionData.to_account_id || transactionData.to_entity_id,
      transaction_type: transactionData.transaction_type,
      metadata: {
        ...transactionData.metadata,
        entry_type: transactionData.entry_type,
      }
    };

    this.timelineItems.set(transactionData.id, timelineItem);
    this.enforceMaxItems();
    
    // Emit events
    this.emit('transaction:added', timelineItem);
    this.emit('timeline:updated', this.getTimelineItems());
  }

  /**
   * Get timeline items sorted by timestamp with optional date separators
   * Items are sorted newest first (descending order) for proper display in inverted FlatList
   */
  getTimelineItems(): TimelineItem[] {
    const items = Array.from(this.timelineItems.values());
    
    // Sort newest first (descending order) for inverted FlatList
    // This ensures newest items appear at the bottom when list is inverted
    const sortedItems = items.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    if (this.options.enableDateSeparators) {
      return this.addDateSeparators(sortedItems);
    }

    return sortedItems;
  }

  /**
   * Filter timeline items by type
   */
  getFilteredItems(filter: 'all' | 'message' | 'transaction'): TimelineItem[] {
    if (filter === 'all') {
      return this.getTimelineItems(); // Include all items with date separators
    }
    
    // For specific filters, get only the items of that type and rebuild date separators
    const items = Array.from(this.timelineItems.values());
    
    // Filter to only items of the specified type
    const filteredItems = items.filter(item => item.itemType === filter);
    
    // Sort filtered items newest first (same as getTimelineItems)
    const sortedFilteredItems = filteredItems.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    
    // If no items of this type, return empty array (no date separators)
    if (sortedFilteredItems.length === 0) {
      return [];
    }

    // Add date separators only for the filtered items
    if (this.options.enableDateSeparators) {
      return this.addDateSeparators(sortedFilteredItems);
    }

    return sortedFilteredItems;
  }

  /**
   * Get the last timeline item (excluding date separators)
   */
  getLastItem(): TimelineItem | null {
    const items = Array.from(this.timelineItems.values())
      .filter(item => item.type !== 'date')
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    
    return items[0] || null;
  }

  /**
   * Clear all timeline items
   */
  clear(): void {
    this.timelineItems.clear();
    this.emit('timeline:cleared');
    this.emit('timeline:updated', []);
  }

  /**
   * Get optimistic messages count
   */
  getOptimisticCount(): number {
    return Array.from(this.timelineItems.values())
      .filter(item => item.metadata?.isOptimistic === true)
      .length;
  }

  /**
   * Private: Enforce maximum items limit
   */
  private enforceMaxItems(): void {
    if (!this.options.maxItems) return;
    
    const items = Array.from(this.timelineItems.values())
      .filter(item => item.type !== 'date')
      .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    
    if (items.length > this.options.maxItems) {
      const itemsToRemove = items.slice(0, items.length - this.options.maxItems);
      itemsToRemove.forEach(item => this.timelineItems.delete(item.id));
      
      logger.debug(`[InteractionTimelineCache] Removed ${itemsToRemove.length} old items to enforce limit`, 'timeline_manager');
    }
  }

  /**
   * Private: Add date separators to timeline items
   * Works with newest-first sorting for inverted FlatList display
   */
  private addDateSeparators(items: TimelineItem[]): TimelineItem[] {
    if (items.length === 0) return [];
    
    // Group items by date for proper separator placement
    const groupedByDate = new Map<string, TimelineItem[]>();
    
    // Group non-date items by their date
    items.forEach(item => {
      if (item.type === 'date') return; // Skip existing date separators
      
      const itemDate = new Date(item.createdAt || 0);
      const dateString = this.formatDateForDisplay(itemDate);
      
      if (!groupedByDate.has(dateString)) {
        groupedByDate.set(dateString, []);
      }
      groupedByDate.get(dateString)!.push(item);
    });
    
    // Convert grouped data to properly ordered array for inverted FlatList
    const result: TimelineItem[] = [];
    
    // Sort date groups newest to oldest (since we want newest dates at bottom of inverted list)
    const sortedDateEntries = Array.from(groupedByDate.entries()).sort((a, b) => {
      // Parse dates for comparison
      const dateA = this.parseDateForSorting(a[0]);
      const dateB = this.parseDateForSorting(b[0]);
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
    
    // For each date group, add items first, then date header
    // This ensures date headers appear ABOVE messages visually in inverted list
    sortedDateEntries.forEach(([dateString, dateItems], groupIndex) => {
      // Only add date group if it has messages
      if (dateItems.length === 0) return;
      
      // Sort items within this date group (newest first)
      const sortedItems = dateItems.sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      
      // Add the messages for this date
      sortedItems.forEach(item => result.push(item));
      
      // Add date header AFTER messages in array so it appears ABOVE them visually when inverted
      const dateHeader: DateSeparatorTimelineItem = {
        id: `date-${dateString.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}-${groupIndex}`,
        type: 'date',
        itemType: 'date',
        date_string: dateString,
        timestamp: sortedItems[0]?.createdAt || new Date().toISOString(),
        createdAt: sortedItems[0]?.createdAt || new Date().toISOString(),
      };
      
      result.push(dateHeader);
    });
    
    return result;
  }

  /**
   * Private: Parse date string for sorting
   */
  private parseDateForSorting(dateString: string): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateString === 'Today') return today;
    if (dateString === 'Yesterday') return yesterday;
    
    // Parse full date format like "Thursday, May 15, 2025"
    return new Date(dateString);
  }

  /**
   * Private: Format date for display
   */
  private formatDateForDisplay(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const inputDate = new Date(date);
    inputDate.setHours(0, 0, 0, 0);

    if (inputDate.getTime() === today.getTime()) return 'Today';
    if (inputDate.getTime() === yesterday.getTime()) return 'Yesterday';
    return date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  /**
   * Cleanup when interaction is no longer needed
   */
  static destroyInstance(interactionId: string): void {
    const instance = this.instances.get(interactionId);
    if (instance) {
      instance.removeAllListeners();
      instance.clear();
      this.instances.delete(interactionId);
      logger.debug(`[InteractionTimelineCache] Destroyed instance for interaction ${interactionId}`, 'timeline_manager');
    }
  }

  /**
   * Clear all TimelineManager instances (called on logout)
   */
  static clearAllInstances(): void {
    logger.debug(`[InteractionTimelineCache] Clearing all ${this.instances.size} timeline instances`, 'timeline_manager');
    
    this.instances.forEach((instance, interactionId) => {
      instance.removeAllListeners();
      instance.clear();
    });
    
    this.instances.clear();
    logger.debug('[InteractionTimelineCache] All timeline instances cleared', 'timeline_manager');
  }
}

// Export singleton getter for easy access
export const getInteractionTimelineCache = (interactionId: string, options?: InteractionTimelineCacheOptions) =>
  InteractionTimelineCache.getInstance(interactionId, options);

// Backwards compatibility alias (deprecated)
export const TimelineManager = InteractionTimelineCache;
export const getTimelineManager = getInteractionTimelineCache; 