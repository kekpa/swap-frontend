/**
 * QueryProvider Component
 * 
 * Provides TanStack Query context to the entire app.
 * Handles QueryClient initialization and cleanup.
 */

import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, initializeQueryClient, cleanupQueryClient } from './queryClient';
import { logger } from '../utils/logger';

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  useEffect(() => {
    // Initialize QueryClient when provider mounts
    logger.info('[QueryProvider] Initializing TanStack Query...');
    initializeQueryClient();
    
    // Cleanup when provider unmounts
    return () => {
      logger.info('[QueryProvider] Cleaning up TanStack Query...');
      cleanupQueryClient();
    };
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export default QueryProvider; 