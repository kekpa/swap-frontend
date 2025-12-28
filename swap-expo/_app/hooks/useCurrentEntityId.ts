/**
 * useCurrentEntityId Hook
 *
 * PROFESSIONAL PATTERN: Single source of truth for current entity ID
 *
 * This hook provides access to the currently active entity ID across the app.
 * Entity ID is the universal identifier used by the backend (entities.id).
 *
 * IMPORTANT: Use this hook for all backend-facing operations.
 * - Backend uses entity_id (entities.id) everywhere
 * - Profile ID (reference_id) is for legacy/display purposes only
 *
 * Used for:
 * - Local timeline caching (SQLite queries)
 * - Timeline sync service
 * - Message/transaction queries
 *
 * @returns {string | null} Current entity ID or null if not authenticated
 *
 * @example
 * ```typescript
 * const entityId = useCurrentEntityId();
 *
 * if (!entityId) {
 *   throw new Error('Entity ID required');
 * }
 *
 * // Use for local cache queries
 * const timeline = await repository.getTimeline({ entityId });
 * ```
 *
 * Created: 2025-01-27 - Entity-centric architecture migration
 */

import { useAuthContext } from '../features/auth/context/AuthContext';

/**
 * Hook to get the current entity ID
 *
 * ARCHITECTURE: Entity ID is the backend's universal identifier.
 * All local cache operations MUST use entity_id to align with backend patterns.
 *
 * Returns null if:
 * - User is not authenticated
 * - Entity ID is missing or empty (backend data integrity issue)
 */
export const useCurrentEntityId = (): string | null => {
  const { user } = useAuthContext();

  // Validate entityId exists and is not empty string
  // Empty string from backend = entity lookup failed = data integrity issue
  if (!user?.entityId || user.entityId === '') {
    return null;
  }

  return user.entityId;
};

export default useCurrentEntityId;
