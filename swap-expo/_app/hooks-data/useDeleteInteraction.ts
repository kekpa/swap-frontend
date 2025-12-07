/**
 * Delete/Archive Interaction Hooks
 *
 * Provides mutations for deleting/archiving interactions and querying archived interactions.
 *
 * Delete logic (handled by backend):
 * - If interaction has NO transactions → Soft delete (hidden from UI)
 * - If interaction HAS transactions → Archive (visible in "Archived" section)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../_api/apiClient';
import { INTERACTION_PATHS } from '../_api/apiPaths';
import { logger } from '../utils/logger';

// Types
interface DeleteOrArchiveResponse {
  action: 'deleted' | 'archived';
  interactionId: string;
  message: string;
}

interface UnarchiveResponse {
  success: boolean;
  interactionId: string;
}

interface ArchivedInteractionsResponse {
  interactions: any[]; // InteractionListItemDto[]
  count: number;
}

/**
 * Hook for deleting/archiving an interaction
 *
 * Smart delete that checks for financial data:
 * - If NO transactions: Soft delete (sets deleted_at)
 * - If HAS transactions: Archive (sets archived_at)
 */
export const useDeleteInteraction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (interactionId: string): Promise<DeleteOrArchiveResponse> => {
      logger.info(`[useDeleteInteraction] Deleting/archiving interaction: ${interactionId}`);
      const response = await apiClient.delete(INTERACTION_PATHS.DELETE(interactionId));
      return response.data;
    },
    onSuccess: (data, interactionId) => {
      logger.info(
        `[useDeleteInteraction] Successfully ${data.action} interaction: ${interactionId}`
      );

      // Invalidate interactions list cache
      queryClient.invalidateQueries({ queryKey: ['interactions'] });

      // If archived, also invalidate archived list
      if (data.action === 'archived') {
        queryClient.invalidateQueries({ queryKey: ['interactions', 'archived'] });
      }
    },
    onError: (error: any, interactionId) => {
      logger.error(
        `[useDeleteInteraction] Failed to delete/archive interaction: ${interactionId}`,
        error
      );
    },
  });
};

/**
 * Hook for unarchiving an interaction
 *
 * Restores an archived conversation back to the main list.
 */
export const useUnarchiveInteraction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (interactionId: string): Promise<UnarchiveResponse> => {
      logger.info(`[useUnarchiveInteraction] Unarchiving interaction: ${interactionId}`);
      const response = await apiClient.post(INTERACTION_PATHS.UNARCHIVE(interactionId));
      return response.data;
    },
    onSuccess: (data, interactionId) => {
      logger.info(`[useUnarchiveInteraction] Successfully unarchived interaction: ${interactionId}`);

      // Invalidate both lists
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      queryClient.invalidateQueries({ queryKey: ['interactions', 'archived'] });
    },
    onError: (error: any, interactionId) => {
      logger.error(
        `[useUnarchiveInteraction] Failed to unarchive interaction: ${interactionId}`,
        error
      );
    },
  });
};

/**
 * Hook for fetching archived interactions
 *
 * Returns interactions that have been archived (conversations with transactions
 * that the user "deleted").
 */
export const useArchivedInteractions = () => {
  return useQuery({
    queryKey: ['interactions', 'archived'],
    queryFn: async (): Promise<ArchivedInteractionsResponse> => {
      logger.info('[useArchivedInteractions] Fetching archived interactions');
      const response = await apiClient.get(INTERACTION_PATHS.ARCHIVED);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for getting just the archived count (for badge display)
 */
export const useArchivedCount = () => {
  const { data, isLoading } = useArchivedInteractions();

  return {
    count: data?.count ?? 0,
    isLoading,
  };
};
