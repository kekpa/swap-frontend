/**
 * useSendMessage Hook
 * 
 * TanStack Query mutation hook for sending messages with optimistic updates.
 * Implements proper message handling with rollback on failure.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '../../utils/logger';
import { queryKeys } from '../queryKeys';
import { Message } from '../../types/message.types';
import { networkService } from '../../services/NetworkService';

// Message send request interface
export interface SendMessageRequest {
  interactionId: string;
  recipientEntityId: string;
  content: string;
  messageType: 'text' | 'payment' | 'request' | 'image' | 'file';
  metadata?: {
    amount?: number;
    currency?: string;
    imageUrl?: string;
    fileName?: string;
    fileSize?: number;
  };
}

// Message send response interface
export interface SendMessageResponse {
  messageId: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'failed';
  tempId?: string; // For matching with optimistic message
}

/**
 * Mock send message function - replace with actual API call
 */
const sendMessageAPI = async (request: SendMessageRequest): Promise<SendMessageResponse> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Simulate occasional failures for testing
  if (Math.random() < 0.05) {
    throw new Error('Message failed to send');
  }
  
  return {
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    status: 'sent',
  };
};

/**
 * useSendMessage Hook
 * 
 * Provides message sending functionality with optimistic updates.
 */
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessageAPI,
    
    // Optimistic update - add message immediately for instant UX
    onMutate: async (request: SendMessageRequest) => {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.debug('[useSendMessage] 🔄 Starting optimistic message update:', {
        interactionId: request.interactionId,
        messageType: request.messageType,
        tempId,
      });

      // Cancel any outgoing refetches for timeline/messages
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.timeline() 
      });
      
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.interactions() 
      });

      // Get current timeline data for the interaction
      const timelineQueryKey = queryKeys.timelineByInteraction(request.interactionId);
      const previousTimeline = queryClient.getQueryData<Message[]>(timelineQueryKey);

      // Create optimistic message
      const optimisticMessage: Message = {
        id: tempId,
        interaction_id: request.interactionId,
        sender_entity_id: 'current_user_entity_id', // Replace with actual current user ID
        recipient_entity_id: request.recipientEntityId,
        content: request.content,
        message_type: request.messageType,
        metadata: request.metadata || null,
        timestamp: new Date().toISOString(),
        status: 'sending', // Temporary status
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add optimistic message to timeline
      if (previousTimeline) {
        const updatedTimeline = [...previousTimeline, optimisticMessage];
        queryClient.setQueryData(timelineQueryKey, updatedTimeline);
        logger.debug('[useSendMessage] ✅ Optimistic message added to timeline');
      }

      // Update interactions list to show latest message
      const interactionsQueryKey = queryKeys.interactionsByEntity('current_user_entity_id');
      const previousInteractions = queryClient.getQueryData(interactionsQueryKey);
      
      if (previousInteractions && Array.isArray(previousInteractions)) {
        const updatedInteractions = previousInteractions.map((interaction: any) => {
          if (interaction.id === request.interactionId) {
            return {
              ...interaction,
              last_message: request.content,
              last_message_timestamp: optimisticMessage.timestamp,
              unread_count: interaction.unread_count || 0, // Don't increment for own messages
            };
          }
          return interaction;
        });
        
        queryClient.setQueryData(interactionsQueryKey, updatedInteractions);
        logger.debug('[useSendMessage] ✅ Optimistic interaction update applied');
      }

      // Return context for rollback and success handling
      return { 
        previousTimeline, 
        previousInteractions,
        tempId, 
        optimisticMessage,
        request 
      };
    },

    // Handle successful message send
    onSuccess: (data, variables, context) => {
      logger.info('[useSendMessage] ✅ Message sent successfully:', {
        messageId: data.messageId,
        tempId: context?.tempId,
        interactionId: variables.interactionId,
        messageType: variables.messageType,
      });

      // Replace optimistic message with real message data
      if (context?.tempId && context?.optimisticMessage) {
        const timelineQueryKey = queryKeys.timelineByInteraction(variables.interactionId);
        const currentTimeline = queryClient.getQueryData<Message[]>(timelineQueryKey);
        
        if (currentTimeline) {
          const updatedTimeline = currentTimeline.map(message => {
            if (message.id === context.tempId) {
              return {
                ...message,
                id: data.messageId,
                timestamp: data.timestamp,
                status: 'sent',
              };
            }
            return message;
          });
          
          queryClient.setQueryData(timelineQueryKey, updatedTimeline);
          logger.debug('[useSendMessage] ✅ Optimistic message replaced with real data');
        }
      }

      // Invalidate related queries to ensure fresh data
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.interactions(),
        refetchType: 'none', // Don't refetch immediately
      });
    },

    // Handle message send failure - rollback optimistic update
    onError: (error, variables, context) => {
      logger.error('[useSendMessage] ❌ Message send failed:', {
        error: error.message,
        interactionId: variables.interactionId,
        messageType: variables.messageType,
        tempId: context?.tempId,
      });

      // Rollback timeline if we have previous data
      if (context?.previousTimeline) {
        const timelineQueryKey = queryKeys.timelineByInteraction(variables.interactionId);
        queryClient.setQueryData(timelineQueryKey, context.previousTimeline);
        logger.debug('[useSendMessage] 🔄 Timeline optimistic update rolled back');
      }

      // Rollback interactions list if we have previous data
      if (context?.previousInteractions) {
        const interactionsQueryKey = queryKeys.interactionsByEntity('current_user_entity_id');
        queryClient.setQueryData(interactionsQueryKey, context.previousInteractions);
        logger.debug('[useSendMessage] 🔄 Interactions optimistic update rolled back');
      }

      // Show error notification (if notification system exists)
      // showErrorNotification(`Failed to send message: ${error.message}`);
    },

    // Always run after success or error
    onSettled: (data, error, variables, context) => {
      logger.debug('[useSendMessage] 🏁 Message send operation settled:', {
        success: !error,
        messageId: data?.messageId,
        tempId: context?.tempId,
        error: error?.message,
      });

      // Invalidate timeline to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.timelineByInteraction(variables.interactionId),
        refetchType: 'none', // Don't refetch immediately since we have optimistic data
      });
    },

    // Network mode - try to send, but queue if offline
    networkMode: 'offlineFirst',
    
    // Retry configuration for message sending
    retry: (failureCount, error: any) => {
      // Don't retry on client errors (validation, etc.)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      
      // Retry up to 2 times for network/server errors
      return failureCount < 2;
    },
    
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Hook for bulk message operations
 */
export const useBulkMessageOperations = () => {
  const queryClient = useQueryClient();

  const markAsRead = useMutation({
    mutationFn: async (messageIds: string[]) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 200));
      return { success: true, messageIds };
    },
    
    onSuccess: (data, messageIds) => {
      // Update all relevant timeline queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.timeline(),
        refetchType: 'none',
      });
      
      // Update interactions to decrease unread counts
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.interactions(),
        refetchType: 'none',
      });
      
      logger.debug('[useBulkMessageOperations] ✅ Messages marked as read:', messageIds);
    },
  });

  const deleteMessages = useMutation({
    mutationFn: async (messageIds: string[]) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true, messageIds };
    },
    
    onSuccess: (data, messageIds) => {
      // Invalidate all timeline and interaction queries
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline() });
      queryClient.invalidateQueries({ queryKey: queryKeys.interactions() });
      
      logger.debug('[useBulkMessageOperations] ✅ Messages deleted:', messageIds);
    },
  });

  return {
    markAsRead,
    deleteMessages,
  };
};

export default useSendMessage;