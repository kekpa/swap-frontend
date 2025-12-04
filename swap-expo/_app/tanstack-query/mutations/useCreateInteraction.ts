/**
 * useCreateInteraction Hook
 *
 * TanStack Query mutation for creating or getting direct interactions.
 * Replaces DataContext getOrCreateDirectInteraction function.
 */

import { useCallback } from 'react';
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
 * Uses GET endpoint as per REST best practices for idempotent operations
 */
const createOrGetDirectInteraction = async (request: CreateInteractionRequest): Promise<CreateInteractionResponse> => {
  logger.debug('[useCreateInteraction] Getting/creating direct interaction:', request);

  try {
    // Use GET endpoint - backend will find or create the interaction
    const response = await apiClient.get(API_PATHS.INTERACTION.DIRECT(request.contactProfileId));

    if (response.data) {
      logger.debug('[useCreateInteraction] ✅ Interaction retrieved successfully');
      return response.data;
    } else {
      throw new Error('No interaction data received from API');
    }
  } catch (error: any) {
    // 404 is expected when no conversation exists yet - not an error!
    if (error?.response?.status === 404 || error?.status === 404) {
      logger.debug(
        '[useCreateInteraction] ℹ️ No conversation exists yet - this is normal',
        `Contact: ${request.contactProfileId}`
      );
      throw error; // Still throw so React Query can handle it
    }

    // Real errors (network, 500s, etc.) should be logged
    logger.error('[useCreateInteraction] ❌ Failed to get interaction:', error);
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
    
    onSuccess: async (interaction: CreateInteractionResponse) => {
      logger.debug('[useCreateInteraction] ✅ Interaction created/retrieved successfully:', interaction.id);

      // Invalidate all interactions queries to include the new interaction
      queryClient.invalidateQueries({
        queryKey: queryKeys.interactions
      });

      // Invalidate all conversations queries as this might affect recent conversations
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations
      });

      // Pre-populate the timeline query for this interaction (empty initially)
      // Using flat array structure (Fortune 500 pattern - WhatsApp/Stripe/Linear/Slack)
      queryClient.setQueryData(
        queryKeys.timeline(interaction.id),
        []
      );

      logger.debug('[useCreateInteraction] ✅ Interaction queries updated');
    },

    onError: (error: any) => {
      // 404 is expected when no conversation exists yet - not an error!
      if (error?.response?.status === 404 || error?.status === 404) {
        logger.debug('[useCreateInteraction] ℹ️ No conversation exists yet - this is expected behavior');
        return; // Don't log as error
      }

      // Real errors (network, 500s, etc.) should be logged
      logger.error('[useCreateInteraction] ❌ Failed to get interaction:', error);
    },

    retry: (failureCount, error: any) => {
      // Don't retry on 400/401/403/404 errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },

    meta: {
      errorMessage: 'Failed to create interaction',
      // PROFESSIONAL PATTERN: Declare expected errors that should NOT trigger global toast
      // 404 is expected when no conversation exists yet - it's normal behavior, not an error
      expectedErrors: [404],
    },
  });
};

/**
 * Convenience hook that returns just the interaction ID
 * Uses useCallback to prevent infinite loops when used in useEffect dependencies
 *
 * NOTE: Backend GET endpoint now only FINDS interactions, doesn't create them.
 * If 404 is returned, it means no interaction exists yet. This is normal - interactions
 * are created when sending the first message or transaction.
 */
export const useGetOrCreateDirectInteraction = () => {
  const createInteraction = useCreateInteraction();

  const getOrCreateDirectInteraction = useCallback(
    async (contactProfileId: string): Promise<string | null> => {
      try {
        // Try to GET the interaction (read-only endpoint)
        const result = await createInteraction.mutateAsync({ contactProfileId });
        return result.id;
      } catch (error: any) {
        // Handle 404 - no interaction exists yet (this is normal!)
        if (error?.response?.status === 404 || error?.status === 404) {
          logger.debug('[useGetOrCreateDirectInteraction] No interaction exists yet with contact:', contactProfileId);
          // Return null to indicate no interaction exists - UI should handle this gracefully
          return null;
        }

        // Other errors should be logged
        logger.error('[useGetOrCreateDirectInteraction] Failed to get interaction:', error);
        return null;
      }
    },
    [createInteraction.mutateAsync] // Stable dependency - mutateAsync doesn't change
  );

  return {
    getOrCreateDirectInteraction,
    isLoading: createInteraction.isPending,
    error: createInteraction.error,
  };
};

export default useCreateInteraction;