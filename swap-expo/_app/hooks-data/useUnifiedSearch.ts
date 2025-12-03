/**
 * useUnifiedSearch - Unified search hook for local-first + network search
 *
 * Combines:
 * 1. Local interactions (SQLite) - Instant ~10ms
 * 2. Network entities (Backend API) - ~200-500ms
 *
 * Features:
 * - Deduplication by entity_id (prefer interactions)
 * - Consistent avatar colors via entity_id hash
 * - Date display for interactions
 * - Single source of truth for all search screens
 *
 * Created: 2025-12-04
 */

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchEntities, ResolvedEntity } from './useSearchEntities';
import { useInteractions, InteractionItem } from './useInteractions';
import { useAuthContext } from '../features/auth/context/AuthContext';
import { getAvatarColor, getInitials } from '../utils/avatarUtils';
import logger from '../utils/logger';

// SearchResult interface - shared across all search screens
export interface SearchResult {
  id: string;
  name: string;
  type: 'entity' | 'interaction' | 'contact';
  avatarUrl?: string;
  initials: string;
  avatarColor: string;
  secondaryText: string;
  date?: string; // For interactions - shows relative date
  originalData: any;
}

// Configuration options for the unified search
export interface UnifiedSearchOptions {
  searchLocalInteractions?: boolean;  // Default: true
  searchNetworkEntities?: boolean;    // Default: true
  deduplicateByEntityId?: boolean;    // Default: true
  maxLocalResults?: number;           // Default: 10
}

// Return type for the hook
export interface UnifiedSearchResult {
  // Combined results (local interactions + network entities)
  results: SearchResult[];

  // Loading states
  isLoadingLocal: boolean;      // Local interactions filtering (very fast)
  isLoadingNetwork: boolean;    // Backend entity search
  isLoading: boolean;           // Any source loading

  // Search state
  hasSearched: boolean;

  // Actions
  refetch: () => Promise<void>;
}

/**
 * Format relative date for search results (e.g., "Nov 8", "Today")
 */
export const formatRelativeDate = (isoString?: string): string | undefined => {
  if (!isoString) return undefined;
  try {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch (e) {
    return undefined;
  }
};

/**
 * Unified search hook for consistent search across all screens
 *
 * @param query - Search query string
 * @param options - Configuration options
 * @returns Combined search results with loading states
 */
export const useUnifiedSearch = (
  query: string,
  options: UnifiedSearchOptions = {}
): UnifiedSearchResult => {
  const {
    searchLocalInteractions = true,
    searchNetworkEntities = true,
    deduplicateByEntityId = true,
    maxLocalResults = 10,
  } = options;

  const { user } = useAuthContext();
  const [hasSearched, setHasSearched] = useState(false);
  const [mappedNetworkResults, setMappedNetworkResults] = useState<SearchResult[]>([]);
  const prevResultsRef = useRef('');

  // Get interactions for local search
  const { interactions, isLoading: isLoadingInteractions } = useInteractions({ enabled: true });

  // Network entity search
  const {
    results: { entities: entitySearchResults },
    isLoading: isLoadingEntitySearch,
    refetch: refetchSearch,
  } = useSearchEntities({
    query,
    enabled: searchNetworkEntities && query.length >= 2,
  });

  // LOCAL-FIRST: Filter cached interactions for instant results (~10ms)
  const localInteractionResults = useMemo((): SearchResult[] => {
    if (!searchLocalInteractions || !query || query.length < 2 || !interactions) {
      return [];
    }

    const queryLower = query.toLowerCase();

    return interactions
      .filter((interaction: InteractionItem) => {
        // Search interaction name
        if (interaction.name?.toLowerCase().includes(queryLower)) return true;

        // Search member names (other participant)
        const otherMember = interaction.members?.find(m => m.entity_id !== user?.entityId);
        if (otherMember?.display_name?.toLowerCase().includes(queryLower)) return true;

        // Search last message snippet
        if (interaction.last_message_snippet?.toLowerCase().includes(queryLower)) return true;

        return false;
      })
      .slice(0, maxLocalResults)
      .map((interaction: InteractionItem): SearchResult => {
        const otherMember = !interaction.is_group
          ? interaction.members?.find(m => m.entity_id !== user?.entityId)
          : null;

        const displayName = otherMember?.display_name || interaction.name || 'Unknown';
        const entityIdForColor = otherMember?.entity_id || interaction.id;

        return {
          id: interaction.id,
          name: displayName,
          type: 'interaction' as const,
          avatarUrl: otherMember?.avatar_url,
          initials: getInitials(displayName),
          avatarColor: getAvatarColor(entityIdForColor),
          secondaryText: interaction.last_message_snippet
            ? interaction.last_message_snippet.substring(0, 50) +
              (interaction.last_message_snippet.length > 50 ? '...' : '')
            : 'No messages yet',
          date: formatRelativeDate(interaction.last_message_at),
          originalData: {
            ...interaction,
            isInteraction: true,
            contactEntityId: otherMember?.entity_id,
          },
        };
      });
  }, [searchLocalInteractions, query, interactions, user?.entityId, maxLocalResults]);

  // Map network entity results to SearchResult format
  useEffect(() => {
    if (!searchNetworkEntities) return;

    // Skip if dependencies didn't actually change
    const resultsFingerprint = entitySearchResults?.length
      ? entitySearchResults.map(e => e.id).join(',')
      : '';

    if (resultsFingerprint === prevResultsRef.current && prevResultsRef.current !== '') {
      return;
    }

    prevResultsRef.current = resultsFingerprint;

    if (entitySearchResults && entitySearchResults.length > 0) {
      logger.debug(`[useUnifiedSearch] Processing ${entitySearchResults.length} network results`);

      const mapped = entitySearchResults.map((entity: ResolvedEntity): SearchResult => ({
        id: entity.id,
        name: entity.displayName || 'Unknown User',
        type: 'entity' as const,
        avatarUrl: entity.avatarUrl || undefined,
        initials: getInitials(entity.displayName || 'Unknown User'),
        avatarColor: getAvatarColor(entity.id),
        secondaryText:
          entity.entityType === 'profile'
            ? 'Profile'
            : entity.entityType === 'business'
            ? 'Business'
            : 'Account',
        originalData: entity,
      }));

      setMappedNetworkResults(mapped);
      setHasSearched(true);
    } else if (hasSearched && query.length >= 2) {
      setMappedNetworkResults([]);
    }
  }, [entitySearchResults, searchNetworkEntities, hasSearched, query.length]);

  // Update hasSearched when query changes
  useEffect(() => {
    if (query.length >= 2) {
      setHasSearched(true);
    } else {
      setHasSearched(false);
      setMappedNetworkResults([]);
      prevResultsRef.current = '';
    }
  }, [query]);

  // Combine and deduplicate results
  const combinedResults = useMemo((): SearchResult[] => {
    if (!deduplicateByEntityId) {
      return [...localInteractionResults, ...mappedNetworkResults];
    }

    const seen = new Map<string, SearchResult>();

    // Process local interactions first (they have last_message_snippet context)
    localInteractionResults.forEach(result => {
      // Use the contact's entity_id for deduplication, not the interaction id
      const entityId = result.originalData?.contactEntityId || result.id;
      seen.set(entityId, result);
    });

    // Add network entity results only if not already from an interaction
    mappedNetworkResults.forEach(result => {
      const entityId = result.id;
      if (!seen.has(entityId)) {
        seen.set(entityId, result);
      }
    });

    return Array.from(seen.values());
  }, [localInteractionResults, mappedNetworkResults, deduplicateByEntityId]);

  // Refetch function
  const refetch = useCallback(async () => {
    if (searchNetworkEntities && query.length >= 2) {
      await refetchSearch();
    }
  }, [searchNetworkEntities, query, refetchSearch]);

  return {
    results: combinedResults,
    isLoadingLocal: isLoadingInteractions,
    isLoadingNetwork: isLoadingEntitySearch,
    isLoading: isLoadingEntitySearch, // Network is the slow part
    hasSearched,
    refetch,
  };
};

export default useUnifiedSearch;
