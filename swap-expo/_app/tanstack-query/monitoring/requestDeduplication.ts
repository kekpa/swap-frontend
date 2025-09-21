/**
 * Request Deduplication Monitoring
 * 
 * Tracks TanStack Query request patterns to identify deduplication opportunities
 * and potential performance issues.
 */

import { QueryKey } from '@tanstack/react-query';
import logger from '../../utils/logger';

export interface RequestInfo {
  queryKey: QueryKey;
  timestamp: number;
  status: 'pending' | 'completed' | 'error';
  duration?: number;
  wasDeduplicated: boolean;
  requestId: string;
  observers: number; // Number of components observing this query
}

export interface DeduplicationMetrics {
  totalRequests: number;
  deduplicatedRequests: number;
  uniqueRequests: number;
  deduplicationRate: number;
  avgRequestDuration: number;
  peakConcurrentRequests: number;
  mostRequestedQueries: Array<{ queryKey: string; count: number; deduplicationRate: number }>;
}

// In-memory tracking
const activeRequests = new Map<string, RequestInfo>();
const completedRequests: RequestInfo[] = [];
const maxHistorySize = 1000;

// Utility functions
const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const serializeQueryKey = (queryKey: QueryKey): string => {
  return JSON.stringify(queryKey);
};

/**
 * Track request start and detect deduplication
 */
export const trackRequestStart = (queryKey: QueryKey, observers: number = 1): string => {
  const serializedKey = serializeQueryKey(queryKey);
  const requestId = generateRequestId();
  
  // Check if there's already an active request for this query
  const existingRequest = Array.from(activeRequests.values()).find(
    req => serializeQueryKey(req.queryKey) === serializedKey
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
    logger.debug(`[RequestDeduplication] 🔄 Request deduplicated: ${serializedKey}, requestId: ${requestId}, existingRequestId: ${existingRequest?.requestId}, observers: ${observers}`);
  } else {
    logger.debug(`[RequestDeduplication] 🚀 New request started: ${serializedKey}, requestId: ${requestId}, observers: ${observers}`);
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
    logger.warn(`[RequestDeduplication] Request not found for completion: ${requestId}`);
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
  
  logger.debug(`[RequestDeduplication] ✅ Request completed: ${serializeQueryKey(request.queryKey)}, requestId: ${requestId}, status: ${status}, duration: ${duration}ms, wasDeduplicated: ${request.wasDeduplicated}`);
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
  const topQueries = metrics.mostRequestedQueries.slice(0, 3).map(q => ({
    query: q.queryKey.substring(0, 50) + (q.queryKey.length > 50 ? '...' : ''),
    count: q.count,
    dedupRate: `${q.deduplicationRate.toFixed(1)}%`,
  }));
  
  logger.info(`[RequestDeduplication] 📊 Deduplication Summary: totalRequests: ${metrics.totalRequests}, deduplicationRate: ${metrics.deduplicationRate.toFixed(1)}%, avgDuration: ${metrics.avgRequestDuration.toFixed(0)}ms, activeRequests: ${activeRequests.size}, topQueries: ${JSON.stringify(topQueries)}`);
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
        description: `${count} concurrent requests detected for the same query. This might indicate a component re-rendering issue or missing request deduplication.`,
        queryKey,
        severity: 'high',
      });
    }
  });
  
  // Very slow requests
  const slowRequests = completedRequests.filter(req => (req.duration || 0) > 5000); // 5 seconds
  if (slowRequests.length > 0) {
    const slowestQuery = slowRequests.reduce((prev, current) => 
      (prev.duration || 0) > (current.duration || 0) ? prev : current
    );
    
    issues.push({
      issue: 'Slow Request Detected',
      description: `Request took ${slowestQuery.duration}ms to complete. Consider optimizing the query or adding loading states.`,
      queryKey: serializeQueryKey(slowestQuery.queryKey),
      severity: 'medium',
    });
  }
  
  // Log issues if any found
  if (issues.length > 0) {
    logger.warn(`[RequestDeduplication] ⚠️ Detected potential issues: ${JSON.stringify(issues)}`);
  }
  
  return issues;
};

/**
 * Start periodic monitoring
 */
export const startPeriodicMonitoring = (intervalMs: number = 60000): (() => void) => {
  const interval = setInterval(() => {
    logDeduplicationSummary();
    detectDeduplicationIssues();
  }, intervalMs);
  
  logger.info(`[RequestDeduplication] Started periodic monitoring (interval: ${intervalMs}ms)`);
  
  return () => {
    clearInterval(interval);
    logger.info('[RequestDeduplication] Stopped periodic monitoring');
  };
};

/**
 * Export for debugging
 */
export const getDebugInfo = () => ({
  activeRequests: Array.from(activeRequests.entries()),
  completedRequests: completedRequests.slice(-10), // Last 10
  metrics: getDeduplicationMetrics(),
});