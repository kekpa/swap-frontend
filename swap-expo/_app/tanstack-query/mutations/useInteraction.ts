/**
 * useInteraction - ONE Hook for Interaction Management
 *
 * CLEAN API:
 * - ONE hook: useInteraction()
 * - ONE function: ensureInteraction(contactId)
 *
 * The function handles everything internally:
 * - Finds existing interaction (GET)
 * - Creates new one if not found (POST)
 * - Returns interaction ID
 *
 * Usage:
 * ```typescript
 * const { ensureInteraction, isLoading } = useInteraction();
 * const interactionId = await ensureInteraction(contactId);
 * ```
 */

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../../_api/apiClient';
import { queryKeys } from '../queryKeys';
import logger from '../../utils/logger';
import API_PATHS from '../../_api/apiPaths';
import { useAuthContext } from '../../features/auth/context/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

export interface InteractionResponse {
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

// ============================================================================
// ONE HOOK TO RULE THEM ALL
// ============================================================================

/**
 * useInteraction - The ONLY hook you need for interactions
 *
 * Returns:
 * - ensureInteraction(contactId): Get or create interaction, returns ID
 * - isLoading: Whether an operation is in progress
 * - error: Any error that occurred
 */
export const useInteraction = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * ensureInteraction - Get or create an interaction with a contact
   *
   * This is the ONLY function you need. It:
   * 1. Tries to FIND existing interaction (GET)
   * 2. If not found, CREATES new one (POST)
   * 3. Returns the interaction ID
   *
   * @param contactId - The contact's profile/entity ID
   * @returns The interaction ID (never null unless error)
   */
  const ensureInteraction = useCallback(
    async (contactId: string): Promise<string | null> => {
      if (!contactId) {
        logger.warn('[useInteraction] No contactId provided');
        return null;
      }

      if (!currentUser?.entityId) {
        logger.warn('[useInteraction] No current user entity ID');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        // STEP 1: Try to FIND existing interaction
        logger.debug('[useInteraction] Finding interaction with:', contactId);

        try {
          const findResponse = await apiClient.get(API_PATHS.INTERACTION.DIRECT(contactId));

          if (findResponse.data?.id) {
            logger.debug('[useInteraction] Found existing interaction:', findResponse.data.id);
            setIsLoading(false);
            return findResponse.data.id;
          }
        } catch (findError: any) {
          // 404 means no interaction exists - this is expected, continue to create
          if (findError?.response?.status !== 404 && findError?.status !== 404) {
            // Real error (not 404), throw it
            throw findError;
          }
          logger.debug('[useInteraction] No existing interaction found, will create');
        }

        // STEP 2: CREATE new interaction
        logger.debug('[useInteraction] Creating new interaction');

        const createResponse = await apiClient.post('/interactions/direct', {
          entity_one_id: currentUser.entityId,
          entity_two_id: contactId,
        });

        if (!createResponse.data?.id) {
          throw new Error('Interaction created but no ID returned');
        }

        const newId = createResponse.data.id;
        logger.debug('[useInteraction] Created new interaction:', newId);

        // Update cache
        queryClient.invalidateQueries({ queryKey: queryKeys.interactions });
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
        queryClient.setQueryData(queryKeys.timeline(newId), []);

        setIsLoading(false);
        return newId;

      } catch (err: any) {
        logger.error('[useInteraction] Failed:', err);
        setError(err);
        setIsLoading(false);
        return null;
      }
    },
    [currentUser?.entityId, queryClient]
  );

  return {
    ensureInteraction,
    isLoading,
    error,
  };
};

// Default export
export default useInteraction;
