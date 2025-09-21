// WhatsApp-style instant full-text search hook - 2025-01-25
// Provides blazing fast search across all content with SQLite FTS

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../tanstack-query/queryKeys';
import { fullTextSearchRepository } from '../localdb/FullTextSearchRepository';
import logger from '../utils/logger';

interface SearchResult {
  id: string;
  type: 'transaction' | 'contact' | 'message' | 'interaction';
  title: string;
  subtitle: string;
  amount?: string;
  currency?: string;
  date: string;
  entityId?: string;
  avatarColor?: string;
  initials?: string;
  relevanceScore: number;
}

interface UseFullTextSearchResult {
  results: {
    all: SearchResult[];
    transactions: SearchResult[];
    contacts: SearchResult[];
    messages: SearchResult[];
  };
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isEmpty: boolean;
  hasQuery: boolean;
}

/**
 * WhatsApp-style instant search with debouncing and offline-first
 */
export const useFullTextSearch = (
  query: string,
  options: {
    enabled?: boolean;
    limit?: number;
    debounceMs?: number;
  } = {}
): UseFullTextSearchResult => {
  const {
    enabled = true,
    limit = 20,
    debounceMs = 300,
  } = options;

  // Debounce the search query
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const hasQuery = debouncedQuery.trim().length >= 2;

  const {
    data: results,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.fullTextSearch(debouncedQuery, limit),
    queryFn: async () => {
      if (!hasQuery) {
        return { all: [], transactions: [], contacts: [], messages: [] };
      }

      logger.debug(`[useFullTextSearch] 🔍 INSTANT SEARCH: "${debouncedQuery}"`);
      
      try {
        // Initialize FTS if not already done
        await fullTextSearchRepository.initializeFTS();
        
        // Perform the search
        const searchResults = await fullTextSearchRepository.searchAll(debouncedQuery, limit);
        
        logger.debug(`[useFullTextSearch] ✅ INSTANT SEARCH: Found ${searchResults.all.length} results`);
        return searchResults;
        
      } catch (error) {
        logger.error(`[useFullTextSearch] ❌ INSTANT SEARCH failed:`, error);
        throw error;
      }
    },
    enabled: enabled && hasQuery,
    
    // Performance optimizations for instant search
    staleTime: 5 * 60 * 1000, // 5 minutes - search results can be cached longer
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in memory for fast access
    
    // Offline-first configuration
    networkMode: 'offlineFirst',
    
    // Search should be instant - no unnecessary refetches
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    
    // No retries for search - it should be instant or nothing
    retry: false,
    
    // Use placeholder data for smooth transitions
    placeholderData: (previousData: any) => previousData,
  });

  const finalResults = results || { all: [], transactions: [], contacts: [], messages: [] };
  const isEmpty = hasQuery && finalResults.all.length === 0;

  return {
    results: finalResults,
    isLoading: hasQuery && isLoading,
    isError,
    error: error as Error | null,
    isEmpty,
    hasQuery,
  };
};

/**
 * Hook for searching specific category
 */
export const useTransactionSearch = (query: string, limit: number = 10) => {
  const { results, isLoading, isError, error } = useFullTextSearch(query, { limit });
  
  return {
    transactions: results.transactions,
    isLoading,
    isError,
    error,
    isEmpty: query.length >= 2 && results.transactions.length === 0,
  };
};

export const useContactSearch = (query: string, limit: number = 10) => {
  const { results, isLoading, isError, error } = useFullTextSearch(query, { limit });
  
  return {
    contacts: results.contacts,
    isLoading,
    isError,
    error,
    isEmpty: query.length >= 2 && results.contacts.length === 0,
  };
};

/**
 * Hook for indexing content for search
 */
export const useSearchIndexer = () => {
  const indexTransaction = React.useCallback(async (transaction: any) => {
    try {
      await fullTextSearchRepository.indexTransaction(transaction);
    } catch (error) {
      logger.warn('[useSearchIndexer] Failed to index transaction:', error);
    }
  }, []);

  const indexContact = React.useCallback(async (contact: any) => {
    try {
      await fullTextSearchRepository.indexContact(contact);
    } catch (error) {
      logger.warn('[useSearchIndexer] Failed to index contact:', error);
    }
  }, []);

  const indexMessage = React.useCallback(async (message: any) => {
    try {
      await fullTextSearchRepository.indexMessage(message);
    } catch (error) {
      logger.warn('[useSearchIndexer] Failed to index message:', error);
    }
  }, []);

  const batchIndex = React.useCallback(async (items: { type: 'transaction' | 'contact' | 'message'; data: any }[]) => {
    try {
      await fullTextSearchRepository.batchIndex(items);
    } catch (error) {
      logger.warn('[useSearchIndexer] Failed to batch index items:', error);
    }
  }, []);

  const clearIndex = React.useCallback(async () => {
    try {
      await fullTextSearchRepository.clearIndex();
    } catch (error) {
      logger.warn('[useSearchIndexer] Failed to clear search index:', error);
    }
  }, []);

  return {
    indexTransaction,
    indexContact,
    indexMessage,
    batchIndex,
    clearIndex,
  };
};

export default useFullTextSearch;