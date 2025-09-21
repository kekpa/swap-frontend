/**
 * useRecentConversations Hook
 * 
 * TanStack Query hook for recent conversations management.
 * Provides optimized conversation list with real-time updates and SQLite caching.
 */

import { useQuery } from '@tanstack/react-query';
import logger from '../utils/logger';
import { queryKeys } from '../tanstack-query/queryKeys';
import apiClient from '../_api/apiClient';
import { getStaleTimeForQuery } from '../tanstack-query/config/staleTimeConfig';
import { interactionRepository } from '../localdb/InteractionRepository';

// Recent conversation interface
export interface RecentConversation {
  id: string;
  interactionId: string;
  otherEntityId: string;
  otherEntityInfo: {
    displayName: string;
    profilePictureUrl?: string;
    entityType: 'individual' | 'business';
    isVerified: boolean;
  };
  lastMessage: {
    id: string;
    content: string;
    timestamp: string;
    senderId: string;
    messageType: 'text' | 'image' | 'payment' | 'system';
    status: 'sent' | 'delivered' | 'read';
  };
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    totalMessages: number;
    isActive: boolean;
    category?: 'personal' | 'business' | 'support';
    tags?: string[];
  };
}

// Query options interface
interface UseRecentConversationsOptions {
  limit?: number;
  includeArchived?: boolean;
  sortBy?: 'lastActivity' | 'unreadCount' | 'created';
  filterBy?: {
    entityType?: 'individual' | 'business';
    hasUnread?: boolean;
    category?: 'personal' | 'business' | 'support';
  };
}

/**
 * Fetch recent conversations from API with local fallback
 */
const fetchRecentConversations = async (
  entityId: string, 
  options: UseRecentConversationsOptions = {}
): Promise<RecentConversation[]> => {
  logger.debug('[useRecentConversations] Fetching conversations for entity:', entityId);
  
  const {
    limit = 50,
    includeArchived = false,
    sortBy = 'lastActivity',
    filterBy = {},
  } = options;
  
  try {
    // Try to get from local SQLite first (local-first approach)
    const cachedConversations = await interactionRepository.getRecentConversations(entityId, {
      limit,
      includeArchived,
    });
    
    // If we have cached data, return it immediately and fetch fresh data in background
    if (cachedConversations && cachedConversations.length > 0) {
      logger.debug(`[useRecentConversations] ✅ Using cached conversations: ${cachedConversations.length}`);
      
      // Start background fetch (don't await)
      fetchAndCacheConversations(entityId, options).catch(error => {
        logger.warn('[useRecentConversations] Background fetch failed:', error);
      });
      
      return cachedConversations;
    }
    
    // No cached data, fetch from API
    return await fetchAndCacheConversations(entityId, options);
    
  } catch (error) {
    logger.error('[useRecentConversations] ❌ Failed to fetch conversations:', error);
    
    // Try to return cached data as fallback
    try {
      const fallbackConversations = await interactionRepository.getRecentConversations(entityId, {
        limit,
        includeArchived: true, // Include archived as fallback
      });
      
      if (fallbackConversations && fallbackConversations.length > 0) {
        logger.info('[useRecentConversations] Using fallback cached conversations:', fallbackConversations.length);
        return fallbackConversations;
      }
    } catch (fallbackError) {
      logger.error('[useRecentConversations] Fallback cache also failed:', fallbackError);
    }
    
    throw error;
  }
};

/**
 * Fetch conversations from API and cache them
 */
const fetchAndCacheConversations = async (
  entityId: string,
  options: UseRecentConversationsOptions
): Promise<RecentConversation[]> => {
  const queryParams = new URLSearchParams({
    limit: options.limit?.toString() || '50',
    includeArchived: options.includeArchived?.toString() || 'false',
    sortBy: options.sortBy || 'lastActivity',
  });
  
  // Add filter parameters
  if (options.filterBy?.entityType) {
    queryParams.append('entityType', options.filterBy.entityType);
  }
  if (options.filterBy?.hasUnread !== undefined) {
    queryParams.append('hasUnread', options.filterBy.hasUnread.toString());
  }
  if (options.filterBy?.category) {
    queryParams.append('category', options.filterBy.category);
  }
  
  const response = await apiClient.get(`/conversations/${entityId}/recent?${queryParams}`);
  
  if (response.data) {
    const conversations: RecentConversation[] = response.data;
    
    // Cache the fresh data
    await interactionRepository.saveRecentConversations(entityId, conversations);
    
    logger.debug(`[useRecentConversations] ✅ Fresh conversations fetched and cached: ${conversations.length}`);
    return conversations;
  } else {
    throw new Error('No conversation data received');
  }
};

/**
 * useRecentConversations Hook
 */
export const useRecentConversations = (
  entityId?: string,
  options: UseRecentConversationsOptions = {}
) => {
  return useQuery({
    queryKey: queryKeys.recentConversations(entityId || '', options),
    queryFn: () => fetchRecentConversations(entityId!, options),
    enabled: !!entityId,
    staleTime: getStaleTimeForQuery('interaction'), // Use interaction stale time
    networkMode: 'offlineFirst',
    retry: (failureCount, error: any) => {
      // Don't retry on 403 (access denied)
      if (error?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
    meta: {
      errorMessage: 'Failed to load recent conversations',
    },
  });
};

/**
 * Hook for getting unread conversation count
 */
export const useUnreadConversationCount = (entityId?: string) => {
  const { data: conversations } = useRecentConversations(entityId);
  
  if (!conversations) return 0;
  
  return conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
};

/**
 * Hook for getting conversations with unread messages
 */
export const useUnreadConversations = (entityId?: string) => {
  const { data: conversations, ...rest } = useRecentConversations(entityId, {
    filterBy: { hasUnread: true },
  });
  
  return {
    data: conversations || [],
    unreadCount: conversations?.length || 0,
    ...rest,
  };
};

/**
 * Hook for getting pinned conversations
 */
export const usePinnedConversations = (entityId?: string) => {
  const { data: conversations } = useRecentConversations(entityId);
  
  if (!conversations) return [];
  
  return conversations.filter(conversation => conversation.isPinned);
};

/**
 * Hook for searching conversations
 */
export const useSearchConversations = (entityId?: string, searchQuery?: string) => {
  const { data: conversations } = useRecentConversations(entityId);
  
  if (!conversations || !searchQuery || searchQuery.trim().length === 0) {
    return conversations || [];
  }
  
  const query = searchQuery.toLowerCase().trim();
  
  return conversations.filter(conversation => 
    conversation.otherEntityInfo.displayName.toLowerCase().includes(query) ||
    conversation.lastMessage.content.toLowerCase().includes(query)
  );
};

/**
 * Hook for getting conversation by interaction ID
 */
export const useConversationByInteractionId = (entityId?: string, interactionId?: string) => {
  const { data: conversations } = useRecentConversations(entityId);
  
  if (!conversations || !interactionId) return null;
  
  return conversations.find(conversation => conversation.interactionId === interactionId) || null;
};

/**
 * Hook for getting conversation analytics
 */
export const useConversationAnalytics = (entityId?: string) => {
  const { data: conversations } = useRecentConversations(entityId);
  
  if (!conversations) {
    return {
      totalConversations: 0,
      totalUnreadMessages: 0,
      activeConversations: 0,
      businessConversations: 0,
      personalConversations: 0,
    };
  }
  
  return {
    totalConversations: conversations.length,
    totalUnreadMessages: conversations.reduce((sum, conv) => sum + conv.unreadCount, 0),
    activeConversations: conversations.filter(conv => conv.metadata?.isActive).length,
    businessConversations: conversations.filter(conv => conv.otherEntityInfo.entityType === 'business').length,
    personalConversations: conversations.filter(conv => conv.otherEntityInfo.entityType === 'individual').length,
    pinnedConversations: conversations.filter(conv => conv.isPinned).length,
    mutedConversations: conversations.filter(conv => conv.isMuted).length,
  };
};

export default useRecentConversations;