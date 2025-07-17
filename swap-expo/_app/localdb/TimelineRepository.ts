// Created: Unified timeline repository for messages and transactions - 2025-05-22
// Updated: Completely refactored to use centralized DatabaseManager - 2025-05-29
import { Platform } from 'react-native';
import logger from '../utils/logger';
import { TimelineItem, TransactionTimelineItem, MessageTimelineItem } from '../types/timeline.types';
import { messageRepository } from './MessageRepository';
import { transactionRepository } from './TransactionRepository';
import { databaseManager } from './DatabaseManager';

/**
 * Professional timeline repository using centralized database management
 */
export class TimelineRepository {
  private static instance: TimelineRepository;

  public static getInstance(): TimelineRepository {
    if (!TimelineRepository.instance) {
      TimelineRepository.instance = new TimelineRepository();
    }
    return TimelineRepository.instance;
  }

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Check if SQLite is available in the current environment
   */
  public async isSQLiteAvailable(): Promise<boolean> {
    try {
      const available = databaseManager.isDatabaseReady();
      logger.debug(`[TimelineRepository] Database ready: ${available}`);
      
      if (Platform.OS === 'web') {
        logger.debug('[TimelineRepository] Platform is web, SQLite not supported');
        return false;
      }
      
      return available;
    } catch (error) {
      logger.debug('[TimelineRepository] Database not available:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Get unified timeline items for an interaction, combining messages and transactions
   */
  public async getTimelineForInteraction(
    interactionId: string,
    limit = 100,
    options: {
      includeMessages?: boolean;
      includeTransactions?: boolean;
      filter?: 'all' | 'messages' | 'transactions';
      currentUserEntityId?: string;
    } = { includeMessages: true, includeTransactions: true, filter: 'all' }
  ): Promise<TimelineItem[]> {
    logger.debug(`[TimelineRepository] Getting timeline for interaction: ${interactionId}, limit: ${limit}, filter: ${options.filter}, userEntityId: ${options.currentUserEntityId || 'none'}`);
    
    if (!(await this.isSQLiteAvailable())) {
      logger.warn(`[TimelineRepository] SQLite not available, returning empty array for: ${interactionId}`);
      return [];
    }
    
    try {
      // Determine what to include based on options
      const includeMessages = options.includeMessages !== false && (options.filter === 'all' || options.filter === 'messages');
      const includeTransactions = options.includeTransactions !== false && (options.filter === 'all' || options.filter === 'transactions');
      
      // Get messages and transactions in parallel for efficiency
      const [messages, transactions] = await Promise.all([
        includeMessages ? messageRepository.getMessagesForInteraction(interactionId, limit) : Promise.resolve<MessageTimelineItem[]>([]),
        includeTransactions ? transactionRepository.getTransactionsForInteraction(interactionId, limit, options.currentUserEntityId) : Promise.resolve<TransactionTimelineItem[]>([])
      ]);
      
      logger.debug(`[TimelineRepository] Retrieved ${messages.length} messages and ${transactions.length} transactions for timeline${options.currentUserEntityId ? ` (user-filtered)` : ''}`);
      
      // Combine and sort by timestamp (descending - newest first)
      const combinedTimeline: TimelineItem[] = [
        ...messages,
        ...transactions
      ].sort((a, b) => {
        const dateA = new Date(a.timestamp || a.createdAt || '');
        const dateB = new Date(b.timestamp || b.createdAt || '');
        return dateB.getTime() - dateA.getTime(); // Sort descending (newest first)
      });
      
      // Apply limit after combining and sorting
      const limitedTimeline = combinedTimeline.slice(0, limit);
      
      logger.info(`[TimelineRepository] Combined timeline for interaction ${interactionId} has ${limitedTimeline.length} items (${messages.length} messages, ${transactions.length} transactions)${options.currentUserEntityId ? ` - user-filtered for ${options.currentUserEntityId}` : ''}`);
      return limitedTimeline;
      
    } catch (error) {
      logger.error(`[TimelineRepository] Error getting timeline for interaction ${interactionId}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Check if an interaction has any local timeline items
   */
  public async hasLocalTimelineItems(
    interactionId: string,
    options: {
      checkMessages?: boolean;
      checkTransactions?: boolean;
    } = { checkMessages: true, checkTransactions: true }
  ): Promise<boolean> {
    logger.debug(`[TimelineRepository] Checking for local timeline items: ${interactionId}`);
    
    if (!(await this.isSQLiteAvailable())) {
      logger.warn(`[TimelineRepository] SQLite not available for hasLocalTimelineItems: ${interactionId}`);
      return false;
    }
    
    try {
      // Check for at least one item of any type
      const timeline = await this.getTimelineForInteraction(interactionId, 1, {
        includeMessages: options.checkMessages !== false,
        includeTransactions: options.checkTransactions !== false,
        filter: 'all'
      });
      
      const hasItems = timeline.length > 0;
      logger.info(`[TimelineRepository] Local timeline items for ${interactionId}: ${hasItems ? 'FOUND' : 'NOT FOUND'}`);
      return hasItems;
      
    } catch (error) {
      logger.error(`[TimelineRepository] Error checking for local timeline items for ${interactionId}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Add date separators to a timeline to group items by day
   */
  public addDateSeparators(timeline: TimelineItem[]): TimelineItem[] {
    if (!timeline || timeline.length === 0) {
      return [];
    }
    
    const timelineWithDates: TimelineItem[] = [];
    let currentDate: string | null = null;
    
    // Sort by timestamp (oldest first) to ensure proper date grouping
    const sortedTimeline = [...timeline].sort((a, b) => {
      const dateA = new Date(a.timestamp || a.createdAt || '');
      const dateB = new Date(b.timestamp || b.createdAt || '');
      return dateA.getTime() - dateB.getTime(); // Sort ascending (oldest first)
    });
    
    logger.debug(`[TimelineRepository] Adding date separators to ${sortedTimeline.length} timeline items`);
    
    for (const item of sortedTimeline) {
      const itemDate = new Date(item.timestamp || item.createdAt || '');
      
      // Use local date components to avoid timezone issues
      const year = itemDate.getFullYear();
      const month = String(itemDate.getMonth() + 1).padStart(2, '0');
      const day = String(itemDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`; // YYYY-MM-DD in local time
      
      // If we're on a new day, add a date separator
      if (dateString !== currentDate) {
        currentDate = dateString;
        
        // Format for display: Today, Yesterday, or date
        let displayDate: string;
        const now = new Date();
        const todayYear = now.getFullYear();
        const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
        const todayDay = String(now.getDate()).padStart(2, '0');
        const todayString = `${todayYear}-${todayMonth}-${todayDay}`;
        
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayYear = yesterday.getFullYear();
        const yesterdayMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
        const yesterdayDay = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayString = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`;
        
        if (dateString === todayString) {
          displayDate = 'Today';
        } else if (dateString === yesterdayString) {
          displayDate = 'Yesterday';
        } else {
          // Format as "May 22, 2025"
          displayDate = itemDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          });
        }
        
        // Add the date separator
        timelineWithDates.push({
          id: `date-${dateString}`,
          itemType: 'date',
          type: 'date',
          timestamp: itemDate.toISOString(),
          createdAt: itemDate.toISOString(),
          date_string: displayDate
        });
        
        logger.debug(`[TimelineRepository] Added date separator: ${displayDate} for ${dateString}`);
      }
      
      // Add the original item
      timelineWithDates.push(item);
    }
    
    logger.debug(`[TimelineRepository] Final timeline has ${timelineWithDates.length} items (including date separators)`);
    return timelineWithDates;
  }

  /**
   * Get the last timeline item for an interaction (message or transaction)
   * This is used for generating proper interaction previews in the chat list
   */
  public async getLastTimelineItemForInteraction(
    interactionId: string, 
    currentUserEntityId?: string
  ): Promise<TimelineItem | null> {
    logger.debug(`[TimelineRepository] Getting last timeline item for: ${interactionId}, userEntityId: ${currentUserEntityId || 'none'}`);
    
    try {
      // Use existing function with limit of 1 to get the most recent item
      const timeline = await this.getTimelineForInteraction(interactionId, 1, {
        includeMessages: true,
        includeTransactions: true,
        currentUserEntityId // Pass user perspective filtering
      });
      
      logger.debug(`[TimelineRepository] Retrieved ${timeline.length} timeline items`);
      
      if (timeline.length === 0) {
        logger.debug(`[TimelineRepository] No timeline items found for: ${interactionId}`);
        return null;
      }
      
      // Filter out any date separators (just in case)
      const actualItems = timeline.filter(item => item.type !== 'date');
      logger.debug(`[TimelineRepository] After filtering date separators: ${actualItems.length} items`);
      
      if (actualItems.length === 0) {
        logger.debug(`[TimelineRepository] No actual timeline items (only date separators) for: ${interactionId}`);
        return null;
      }
      
      // Sort by timestamp to get the most recent (should already be sorted by getTimelineForInteraction)
      const sortedItems = actualItems.sort((a, b) => 
        new Date(b.timestamp || b.createdAt || 0).getTime() - 
        new Date(a.timestamp || a.createdAt || 0).getTime()
      );
      
      const mostRecent = sortedItems[0];
      logger.debug(`[TimelineRepository] Most recent item: type=${mostRecent.itemType}, id=${mostRecent.id}, time=${mostRecent.timestamp || mostRecent.createdAt}`);
      
      if (mostRecent.itemType === 'transaction') {
        const txItem = mostRecent as TransactionTimelineItem;
        logger.debug(`[TimelineRepository] Transaction: amount=${txItem.amount}, description="${txItem.description}"`);
      } else if (mostRecent.itemType === 'message') {
        const msgItem = mostRecent as MessageTimelineItem;
        logger.debug(`[TimelineRepository] Message: content="${msgItem.content}"`);
      }
      
      return mostRecent;
      
    } catch (error) {
      logger.error(`[TimelineRepository] Error getting last timeline item for ${interactionId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}

// Export singleton instance
export const timelineRepository = TimelineRepository.getInstance();
export default timelineRepository; 