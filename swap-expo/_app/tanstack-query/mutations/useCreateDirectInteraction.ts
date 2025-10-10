/**
 * useCreateDirectInteraction Hook
 *
 * TanStack Query mutation for CREATING new direct interactions.
 * This hook uses POST and should only be called when sending the first message/transaction.
 *
 * For checking if an interaction exists, use useCreateInteraction (GET endpoint).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../_api/apiClient';
import { queryKeys } from '../queryKeys';
import logger from '../../utils/logger';

export interface CreateDirectInteractionRequest {
  entity_one_id: string;
  entity_two_id: string;
}

export interface CreateDirectInteractionResponse {
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
 * Create a new direct interaction with API
 * Uses POST endpoint to actually CREATE the interaction
 */
const createDirectInteraction = async (
  request: CreateDirectInteractionRequest
): Promise<CreateDirectInteractionResponse> => {
  logger.debug('[useCreateDirectInteraction] Creating new direct interaction:', request);

  try {
    const response = await apiClient.post('/interactions/direct', request);

    // CRITICAL DEBUG: Log full response to diagnose undefined ID issue
    logger.debug('[useCreateDirectInteraction] 📥 RAW API Response:', JSON.stringify({
      status: response.status,
      hasData: !!response.data,
      dataType: typeof response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      fullData: response.data
    }));

    if (response.data) {
      // Clean response format: {id, name, is_group, members, ..., meta}
      const interactionData = response.data;

      // Defensive check for ID existence
      if (!interactionData.id) {
        logger.error('[useCreateDirectInteraction] ❌ CRITICAL: No ID in response!');
        throw new Error('Interaction created but no ID returned from backend');
      }

      logger.debug('[useCreateDirectInteraction] ✅ Interaction created successfully with ID:', interactionData.id);
      return interactionData;
    } else {
      throw new Error('No interaction data received from API');
    }
  } catch (error) {
    logger.error('[useCreateDirectInteraction] ❌ Failed to create interaction:', error);
    throw error;
  }
};

/**
 * useCreateDirectInteraction Hook
 *
 * Use this hook when you need to CREATE a new interaction (e.g., sending first message).
 * Do NOT use this for checking if interaction exists - use useCreateInteraction (GET) instead.
 */
export const useCreateDirectInteraction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDirectInteraction,

    onSuccess: async (interaction: CreateDirectInteractionResponse) => {
      logger.debug(
        '[useCreateDirectInteraction] ✅ Interaction created successfully:',
        interaction.id
      );

      // Invalidate all interactions queries to include the new interaction
      queryClient.invalidateQueries({
        queryKey: queryKeys.interactions,
      });

      // Invalidate all conversations queries as this might affect recent conversations
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations,
      });

      // Pre-populate the timeline query for this interaction (empty initially)
      // Using flat array structure (Fortune 500 pattern - WhatsApp/Stripe/Linear/Slack)
      queryClient.setQueryData(queryKeys.timeline(interaction.id), []);

      logger.debug('[useCreateDirectInteraction] ✅ Interaction queries updated');
    },

    onError: (error) => {
      logger.error('[useCreateDirectInteraction] ❌ Failed to create interaction:', error);
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

export default useCreateDirectInteraction;
