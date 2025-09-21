/**
 * QueryProvider Component
 * 
 * Provides TanStack Query context to the entire app.
 * Handles QueryClient initialization and cleanup.
 */

import React, { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { View, ActivityIndicator, Text } from 'react-native';
import { queryClient, initializeQueryClient, cleanupQueryClient } from './queryClient';
import { logger } from '../utils/logger';

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize QueryClient when provider mounts
    const initialize = async () => {
      try {
        logger.info('[QueryProvider] Initializing TanStack Query...');
        await initializeQueryClient();
        setIsInitialized(true);
        logger.info('[QueryProvider] ✅ TanStack Query initialization complete');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[QueryProvider] ❌ TanStack Query initialization failed:', errorMessage);
        setInitError(errorMessage);
        // Still allow the app to continue without cache persistence
        setIsInitialized(true);
      }
    };

    initialize();
    
    // Cleanup when provider unmounts
    return () => {
      logger.info('[QueryProvider] Cleaning up TanStack Query...');
      cleanupQueryClient();
    };
  }, []);

  // Show loading while initializing
  if (!isInitialized && !initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ color: '#FFF', marginTop: 16, fontSize: 14 }}>Initializing Query Cache...</Text>
      </View>
    );
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* TODO: Re-add DevTools after fixing web component issues */}
    </QueryClientProvider>
  );
};

export default QueryProvider; 