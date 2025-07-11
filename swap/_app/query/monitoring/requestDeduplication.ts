/**
 * Request Deduplication Monitoring
 * 
 * Monitors and verifies TanStack Query's request deduplication behavior.
 * Provides insights into duplicate request patterns and performance metrics.
 */

import { QueryKey } from '@tanstack/react-query';
import { logger } from '../../utils/logger';

// Request tracking interface
export interface RequestInfo {
  queryKey: QueryKey;
  timestamp: number;
  status: 'pending' | 'completed' | 'error';
  duration?: number;
  wasDeduplicated: boolean;
  requestId: string;
  observers: number; // Number of components observing this query
}

// Deduplication metrics
export interface DeduplicationMetrics {
  totalRequests: number;
  deduplicatedRequests: number;
  uniqueRequests: number;
  deduplicationRate: number;
  avgRequestDuration: number;
  peakConcurrentRequests: number;
  mostRequestedQueries: Array<{ queryKey: string; count: number; deduplicationRate: number }>;
}

// Active request tracking
const activeRequests = new Map<string, RequestInfo>();
const completedRequests: RequestInfo[] = [];
const maxHistorySize = 1000; // Keep last 1000 completed requests

// Generate unique request ID
const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Serialize query key for consistent comparison
const serializeQueryKey = (queryKey: QueryKey): string => {
  return JSON.stringify(queryKey);
};

/**
 * Track a new request start
 */
export const trackRequestStart = (queryKey: QueryKey, observers: number = 1): string => {
  const requestId = generateRequestId();
  const serializedKey = serializeQueryKey(queryKey);
  
  // Check if there's already a pending request for this query
  const existingRequest = Array.from(activeRequests.values()).find(
    req => serializeQueryKey(req.queryKey) === serializedKey && req.status === 'pending'
  );
  
  const wasDeduplicated = !!existingRequest;
  
  const requestInfo: RequestInfo = {
    queryKey,
    timestamp: Date.now(),
    status: 'pending',
    wasDeduplicated,
    requestId,
    observers,
  };
  
  activeRequests.set(requestId, requestInfo);
  
  if (wasDeduplicated) {
    logger.debug('[RequestDeduplication] 🔄 Request deduplicated:', {
      queryKey: serializedKey,
      requestId,
      existingRequestId: existingRequest?.requestId,
      observers,
    });
  } else {
    logger.debug('[RequestDeduplication] 🚀 New request started:', {
      queryKey: serializedKey,
      requestId,
      observers,
    });
  }
  
  return requestId;
};

/**
 * Track request completion
 */
export const trackRequestEnd = (
  requestId: string, 
  status: 'completed' | 'error'
): void => {
  const request = activeRequests.get(requestId);
  if (!request) {
    logger.warn('[RequestDeduplication] Request not found for completion:', requestId);
    return;
  }
  
  const duration = Date.now() - request.timestamp;
  const updatedRequest: RequestInfo = {
    ...request,
    status,
    duration,
  };
  
  // Move to completed requests
  activeRequests.delete(requestId);
  completedRequests.push(updatedRequest);
  
  // Maintain history size
  if (completedRequests.length > maxHistorySize) {
    completedRequests.splice(0, completedRequests.length - maxHistorySize);
  }
  
  logger.debug('[RequestDeduplication] ✅ Request completed:', {
    queryKey: serializeQueryKey(request.queryKey),
    requestId,
    status,
    duration: `${duration}ms`,
    wasDeduplicated: request.wasDeduplicated,
  });
};

/**
 * Calculate deduplication metrics
 */
export const getDeduplicationMetrics = (): DeduplicationMetrics => {
  const allRequests = [...completedRequests, ...Array.from(activeRequests.values())];
  
  if (allRequests.length === 0) {
    return {
      totalRequests: 0,
      deduplicatedRequests: 0,
      uniqueRequests: 0,
      deduplicationRate: 0,
      avgRequestDuration: 0,
      peakConcurrentRequests: 0,
      mostRequestedQueries: [],
    };
  }
  
  const totalRequests = allRequests.length;
  const deduplicatedRequests = allRequests.filter(req => req.wasDeduplicated).length;
  const uniqueRequests = totalRequests - deduplicatedRequests;
  const deduplicationRate = totalRequests > 0 ? (deduplicatedRequests / totalRequests) * 100 : 0;
  
  // Calculate average duration for completed requests
  const completedWithDuration = completedRequests.filter(req => req.duration !== undefined);
  const avgRequestDuration = completedWithDuration.length > 0
    ? completedWithDuration.reduce((sum, req) => sum + (req.duration || 0), 0) / completedWithDuration.length
    : 0;
  
  // Peak concurrent requests (current active requests is a proxy)
  const peakConcurrentRequests = activeRequests.size;
  
  // Most requested queries
  const queryStats = new Map<string, { count: number; deduplicated: number }>();
  allRequests.forEach(req => {
    const key = serializeQueryKey(req.queryKey);
    const existing = queryStats.get(key) || { count: 0, deduplicated: 0 };
    queryStats.set(key, {
      count: existing.count + 1,
      deduplicated: existing.deduplicated + (req.wasDeduplicated ? 1 : 0),
    });
  });
  
  const mostRequestedQueries = Array.from(queryStats.entries())
    .map(([queryKey, stats]) => ({
      queryKey,
      count: stats.count,
      deduplicationRate: stats.count > 0 ? (stats.deduplicated / stats.count) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10
  
  return {
    totalRequests,
    deduplicatedRequests,
    uniqueRequests,
    deduplicationRate,
    avgRequestDuration,
    peakConcurrentRequests,
    mostRequestedQueries,
  };
};

/**
 * Get current active requests
 */
export const getActiveRequests = (): RequestInfo[] => {
  return Array.from(activeRequests.values());
};

/**
 * Get request history
 */
export const getRequestHistory = (limit: number = 50): RequestInfo[] => {
  return completedRequests.slice(-limit);
};

/**
 * Clear tracking data (useful for testing or memory management)
 */
export const clearTrackingData = (): void => {
  activeRequests.clear();
  completedRequests.length = 0;
  logger.info('[RequestDeduplication] Tracking data cleared');
};

/**
 * Log deduplication summary
 */
export const logDeduplicationSummary = (): void => {
  const metrics = getDeduplicationMetrics();
  
  logger.info('[RequestDeduplication] 📊 Deduplication Summary:', {
    totalRequests: metrics.totalRequests,
    deduplicationRate: `${metrics.deduplicationRate.toFixed(1)}%`,
    avgDuration: `${metrics.avgRequestDuration.toFixed(0)}ms`,
    activeRequests: activeRequests.size,
    topQueries: metrics.mostRequestedQueries.slice(0, 3).map(q => ({
      query: q.queryKey.substring(0, 50) + (q.queryKey.length > 50 ? '...' : ''),
      count: q.count,
      dedupRate: `${q.deduplicationRate.toFixed(1)}%`,
    })),
  });
};

/**
 * Detect potential deduplication issues
 */
export const detectDeduplicationIssues = (): Array<{
  issue: string;
  description: string;
  queryKey?: string;
  severity: 'low' | 'medium' | 'high';
}> => {
  const issues: Array<{
    issue: string;
    description: string;
    queryKey?: string;
    severity: 'low' | 'medium' | 'high';
  }> = [];
  
  const metrics = getDeduplicationMetrics();
  
  // Low deduplication rate might indicate query key inconsistency
  if (metrics.deduplicationRate < 20 && metrics.totalRequests > 20) {
    issues.push({
      issue: 'Low Deduplication Rate',
      description: `Only ${metrics.deduplicationRate.toFixed(1)}% of requests are being deduplicated. This might indicate inconsistent query keys or rapid cache invalidation.`,
      severity: 'medium',
    });
  }
  
  // High number of concurrent requests for same query
  const concurrentSameQuery = new Map<string, number>();
  activeRequests.forEach(req => {
    const key = serializeQueryKey(req.queryKey);
    concurrentSameQuery.set(key, (concurrentSameQuery.get(key) || 0) + 1);
  });
  
  concurrentSameQuery.forEach((count, queryKey) => {
    if (count > 3) {
      issues.push({
        issue: 'Multiple Concurrent Requests',
        description: `${count} concurrent requests for the same query. Deduplication might not be working properly.`,
        queryKey,
        severity: 'high',
      });
    }
  });
  
  // Long-running requests that might be blocking others
  const longRunningRequests = Array.from(activeRequests.values()).filter(
    req => Date.now() - req.timestamp > 10000 // 10 seconds
  );
  
  if (longRunningRequests.length > 0) {
    longRunningRequests.forEach(req => {
      issues.push({
        issue: 'Long-Running Request',
        description: `Request has been pending for ${Math.round((Date.now() - req.timestamp) / 1000)}s. This might block deduplication for other requests.`,
        queryKey: serializeQueryKey(req.queryKey),
        severity: 'medium',
      });
    });
  }
  
  return issues;
};

/**
 * Periodic monitoring function to log stats and detect issues
 */
export const startPeriodicMonitoring = (intervalMs: number = 60000): (() => void) => {
  const interval = setInterval(() => {
    if (__DEV__) {
      logDeduplicationSummary();
      
      const issues = detectDeduplicationIssues();
      if (issues.length > 0) {
        logger.warn('[RequestDeduplication] ⚠️ Detected potential issues:', issues);
      }
    }
  }, intervalMs);
  
  logger.info('[RequestDeduplication] Started periodic monitoring');
  
  // Return cleanup function
  return () => {
    clearInterval(interval);
    logger.info('[RequestDeduplication] Stopped periodic monitoring');
  };
};

export default {
  trackRequestStart,
  trackRequestEnd,
  getDeduplicationMetrics,
  getActiveRequests,
  getRequestHistory,
  clearTrackingData,
  logDeduplicationSummary,
  detectDeduplicationIssues,
  startPeriodicMonitoring,
};