/**
 * useCreateInteraction Hook
 * 
 * TanStack Query mutation for creating or getting direct interactions.
 * Replaces DataContext getOrCreateDirectInteraction function.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../_api/apiClient';
import { queryKeys } from '../queryKeys';
import logger from '../../utils/logger';
import API_PATHS from '../../_api/apiPaths';

export interface CreateInteractionRequest {
  contactProfileId: string;
  interactionType?: 'direct' | 'group';
}

export interface CreateInteractionResponse {
  id: string;
  name?: string;
  is_group: boolean;
  members: Array<{
    entity_id: string;
    role: string;
    display_name?: string;
    avatar_url?: string;
    entity_type?: string;
  }>;
  created_at: string;
  updated_at: string;
}

/**
 * Create or get direct interaction with API
 */
const createOrGetDirectInteraction = async (request: CreateInteractionRequest): Promise<CreateInteractionResponse> => {
  logger.debug('[useCreateInteraction] Creating/getting direct interaction:', request);
  
  try {
    const response = await apiClient.post(API_PATHS.INTERACTION.DIRECT(request.contactProfileId), {
      interaction_type: request.interactionType || 'direct'
    });
    
    if (response.data) {
      logger.debug('[useCreateInteraction] ✅ Interaction created/retrieved successfully');
      return response.data;
    } else {
      throw new Error('No interaction data received from API');
    }
  } catch (error) {
    logger.error('[useCreateInteraction] ❌ Failed to create/get interaction:', error);
    throw error;
  }
};

/**
 * useCreateInteraction Hook
 */
export const useCreateInteraction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrGetDirectInteraction,
    
    onSuccess: async (interaction: CreateInteractionResponse, request) => {
      logger.debug('[useCreateInteraction] ✅ Interaction created/retrieved successfully:', interaction.id);

      // Invalidate interactions list to include the new interaction
      queryClient.invalidateQueries({
        queryKey: queryKeys.interactions()
      });

      // Invalidate recent conversations as this might affect the list
      queryClient.invalidateQueries({
        queryKey: queryKeys.recentConversations()
      });

      // Pre-populate the timeline query for this interaction (empty initially)
      queryClient.setQueryData(
        queryKeys.timeline(interaction.id),
        { data: [], pagination: { hasMore: false, offset: 0 } }
      );

      logger.debug('[useCreateInteraction] ✅ Interaction queries updated');
    },

    onError: (error, request) => {
      logger.error('[useCreateInteraction] ❌ Failed to create/get interaction:', error);
    },

    retry: (failureCount, error: any) => {
      // Don't retry on 400/401/403 errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },

    meta: {
      errorMessage: 'Failed to create interaction',
    },
  });
};

/**
 * Convenience hook that returns just the interaction ID
 */
export const useGetOrCreateDirectInteraction = () => {
  const createInteraction = useCreateInteraction();
  
  const getOrCreateDirectInteraction = async (contactProfileId: string): Promise<string | null> => {
    try {
      const result = await createInteraction.mutateAsync({ contactProfileId });
      return result.id;
    } catch (error) {
      logger.error('[useGetOrCreateDirectInteraction] Failed to get/create interaction:', error);
      return null;
    }
  };

  return {
    getOrCreateDirectInteraction,
    isLoading: createInteraction.isPending,
    error: createInteraction.error,
  };
};

export default useCreateInteraction;