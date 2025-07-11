/**
 * Query Monitoring Exports
 * 
 * Centralized exports for TanStack Query monitoring and analytics.
 */

// Request deduplication monitoring
export {
  trackRequestStart,
  trackRequestEnd,
  getDeduplicationMetrics,
  getActiveRequests,
  getRequestHistory,
  clearTrackingData,
  logDeduplicationSummary,
  detectDeduplicationIssues,
  startPeriodicMonitoring,
} from './requestDeduplication';

// Request monitoring hooks
export {
  useRequestMonitoring,
  withRequestMonitoring,
} from './useRequestMonitoring';

// Re-export types for convenience
export type { DeduplicationMetrics, RequestInfo } from './requestDeduplication';