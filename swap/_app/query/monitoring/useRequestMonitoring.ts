/**
 * useRequestMonitoring Hook
 * 
 * Integrates request deduplication monitoring with TanStack Query.
 * Automatically tracks query execution and provides deduplication insights.
 */

import React, { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import logger from '../../utils/logger';
import {
  trackRequestStart,
  trackRequestEnd,
  getDeduplicationMetrics,
  detectDeduplicationIssues,
  startPeriodicMonitoring,
} from './requestDeduplication';

interface UseRequestMonitoringOptions {
  enablePeriodicReporting?: boolean;
  reportingIntervalMs?: number;
  enableIssueDetection?: boolean;
  onIssueDetected?: (issues: Array<{
    issue: string;
    description: string;
    queryKey?: string;
    severity: 'low' | 'medium' | 'high';
  }>) => void;
}

/**
 * Hook to monitor TanStack Query request patterns and deduplication
 */
export const useRequestMonitoring = (options: UseRequestMonitoringOptions = {}) => {
  const queryClient = useQueryClient();
  const {
    enablePeriodicReporting = __DEV__,
    reportingIntervalMs = 60000, // 1 minute
    enableIssueDetection = true,
    onIssueDetected,
  } = options;
  
  const monitoringCleanupRef = useRef<(() => void) | null>(null);
  const requestTrackingRef = useRef(new Map<string, string>()); // queryKey -> requestId mapping

  // Set up query cache monitoring
  useEffect(() => {
    const queryCache = queryClient.getQueryCache();
    
    // Track query fetches
    const unsubscribe = queryCache.subscribe((event) => {
      if (event.type === 'observerAdded') {
        const { query, observer } = event;
        const queryKey = query.queryKey;
        const serializedKey = JSON.stringify(queryKey);
        
        // Track observers count for this query
        const observersCount = query.getObserversCount();
        
        // Track request start
        const requestId = trackRequestStart(queryKey, observersCount);
        requestTrackingRef.current.set(serializedKey, requestId);
        
        logger.debug(`[useRequestMonitoring] Observer added for query: ${serializedKey}, observers: ${observersCount}, requestId: ${requestId}`);
        
      } else if (event.type === 'updated') {
        const { query } = event;
        const queryKey = query.queryKey;
        const serializedKey = JSON.stringify(queryKey);
        const requestId = requestTrackingRef.current.get(serializedKey);
        
        // Track request completion based on query state
        if (requestId && (query.state.status === 'success' || query.state.status === 'error')) {
          const status = query.state.status === 'success' ? 'completed' : 'error';
          trackRequestEnd(requestId, status);
          requestTrackingRef.current.delete(serializedKey);
          
          logger.debug(`[useRequestMonitoring] Query updated: ${serializedKey}, status: ${status}, requestId: ${requestId}, dataUpdatedAt: ${query.state.dataUpdatedAt}`);
        }
      }
    });

    return unsubscribe;
  }, [queryClient]);

  // Set up periodic monitoring
  useEffect(() => {
    if (enablePeriodicReporting) {
      monitoringCleanupRef.current = startPeriodicMonitoring(reportingIntervalMs);
    }

    return () => {
      if (monitoringCleanupRef.current) {
        monitoringCleanupRef.current();
        monitoringCleanupRef.current = null;
      }
    };
  }, [enablePeriodicReporting, reportingIntervalMs]);

  // Issue detection
  useEffect(() => {
    if (!enableIssueDetection) return;

    const interval = setInterval(() => {
      const issues = detectDeduplicationIssues();
      if (issues.length > 0) {
        logger.warn(`[useRequestMonitoring] Detected deduplication issues: ${JSON.stringify(issues)}`);
        onIssueDetected?.(issues);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [enableIssueDetection, onIssueDetected]);

  // Return monitoring utilities
  return {
    getMetrics: getDeduplicationMetrics,
    detectIssues: detectDeduplicationIssues,
    getCurrentStats: () => {
      const metrics = getDeduplicationMetrics();
      return {
        deduplicationRate: `${metrics.deduplicationRate.toFixed(1)}%`,
        totalRequests: metrics.totalRequests,
        activeRequests: metrics.peakConcurrentRequests,
        avgDuration: `${metrics.avgRequestDuration.toFixed(0)}ms`,
      };
    },
  };
};

/**
 * Higher-order component to wrap providers with request monitoring
 */
export const withRequestMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  monitoringOptions?: UseRequestMonitoringOptions
) => {
  return (props: P) => {
    useRequestMonitoring(monitoringOptions);
    return React.createElement(Component, props);
  };
};

export default useRequestMonitoring;