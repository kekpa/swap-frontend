/**
 * Request Deduplication Monitoring Tests
 *
 * Tests TanStack Query request deduplication tracking
 *
 * Key behaviors tested:
 * - Request tracking (start/end)
 * - Deduplication detection
 * - Metrics calculation
 * - History management
 * - Issue detection
 * - Periodic monitoring
 */

// Mock dependencies before imports
jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  trackRequestStart,
  trackRequestEnd,
  getDeduplicationMetrics,
  getActiveRequests,
  getRequestHistory,
  clearTrackingData,
  logDeduplicationSummary,
  detectDeduplicationIssues,
  startPeriodicMonitoring,
  getDebugInfo,
} from '../requestDeduplication';

describe('requestDeduplication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearTrackingData();
  });

  afterEach(() => {
    clearTrackingData();
  });

  describe('trackRequestStart', () => {
    it('should return a unique request ID', () => {
      const requestId = trackRequestStart(['test', 'query']);

      expect(requestId).toMatch(/^req_/);
    });

    it('should track request as active', () => {
      trackRequestStart(['test', 'query']);

      const activeRequests = getActiveRequests();
      expect(activeRequests.length).toBe(1);
      expect(activeRequests[0].status).toBe('pending');
    });

    it('should store query key in request info', () => {
      const queryKey = ['users', 'list', { page: 1 }];
      trackRequestStart(queryKey);

      const activeRequests = getActiveRequests();
      expect(activeRequests[0].queryKey).toEqual(queryKey);
    });

    it('should detect deduplicated requests', () => {
      // First request - not deduplicated
      trackRequestStart(['same', 'query']);

      // Second request with same query - should be deduplicated
      trackRequestStart(['same', 'query']);

      const activeRequests = getActiveRequests();
      expect(activeRequests[0].wasDeduplicated).toBe(false);
      expect(activeRequests[1].wasDeduplicated).toBe(true);
    });

    it('should track observer count', () => {
      trackRequestStart(['test', 'query'], 3);

      const activeRequests = getActiveRequests();
      expect(activeRequests[0].observers).toBe(3);
    });

    it('should default observer count to 1', () => {
      trackRequestStart(['test', 'query']);

      const activeRequests = getActiveRequests();
      expect(activeRequests[0].observers).toBe(1);
    });

    it('should log for new requests', () => {
      const logger = require('../../../utils/logger').default;

      trackRequestStart(['new', 'request']);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('New request started')
      );
    });

    it('should log for deduplicated requests', () => {
      const logger = require('../../../utils/logger').default;

      trackRequestStart(['duplicate', 'query']);
      trackRequestStart(['duplicate', 'query']);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Request deduplicated')
      );
    });
  });

  describe('trackRequestEnd', () => {
    it('should mark request as completed', () => {
      const requestId = trackRequestStart(['test', 'query']);

      trackRequestEnd(requestId, 'completed');

      const activeRequests = getActiveRequests();
      expect(activeRequests.length).toBe(0);

      const history = getRequestHistory();
      expect(history[0].status).toBe('completed');
    });

    it('should mark request as error', () => {
      const requestId = trackRequestStart(['test', 'query']);

      trackRequestEnd(requestId, 'error');

      const history = getRequestHistory();
      expect(history[0].status).toBe('error');
    });

    it('should calculate request duration', () => {
      jest.useFakeTimers({ advanceTimers: true });

      const requestId = trackRequestStart(['test', 'query']);

      // Advance time
      jest.advanceTimersByTime(500);

      trackRequestEnd(requestId, 'completed');

      const history = getRequestHistory();
      expect(history[0].duration).toBeGreaterThanOrEqual(500);

      jest.useRealTimers();
    });

    it('should handle non-existent request ID', () => {
      const logger = require('../../../utils/logger').default;

      trackRequestEnd('non_existent_id', 'completed');

      // Logger is called with a single formatted string
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Request not found')
      );
    });

    it('should move request to completed list', () => {
      const requestId = trackRequestStart(['test', 'query']);

      expect(getActiveRequests().length).toBe(1);
      expect(getRequestHistory().length).toBe(0);

      trackRequestEnd(requestId, 'completed');

      expect(getActiveRequests().length).toBe(0);
      expect(getRequestHistory().length).toBe(1);
    });
  });

  describe('getDeduplicationMetrics', () => {
    it('should return empty metrics when no requests', () => {
      const metrics = getDeduplicationMetrics();

      expect(metrics.totalRequests).toBe(0);
      expect(metrics.deduplicatedRequests).toBe(0);
      expect(metrics.uniqueRequests).toBe(0);
      expect(metrics.deduplicationRate).toBe(0);
      expect(metrics.avgRequestDuration).toBe(0);
      expect(metrics.mostRequestedQueries).toEqual([]);
    });

    it('should calculate total requests', () => {
      const requestId1 = trackRequestStart(['query1']);
      const requestId2 = trackRequestStart(['query2']);

      trackRequestEnd(requestId1, 'completed');
      trackRequestEnd(requestId2, 'completed');

      const metrics = getDeduplicationMetrics();
      expect(metrics.totalRequests).toBe(2);
    });

    it('should calculate deduplication rate', () => {
      const requestId1 = trackRequestStart(['same', 'query']);
      const requestId2 = trackRequestStart(['same', 'query']); // Deduplicated
      const requestId3 = trackRequestStart(['different', 'query']);

      trackRequestEnd(requestId1, 'completed');
      trackRequestEnd(requestId2, 'completed');
      trackRequestEnd(requestId3, 'completed');

      const metrics = getDeduplicationMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.deduplicatedRequests).toBe(1);
      expect(metrics.deduplicationRate).toBeCloseTo(33.33, 1);
    });

    it('should calculate average request duration', () => {
      jest.useFakeTimers({ advanceTimers: true });

      const requestId1 = trackRequestStart(['query1']);
      jest.advanceTimersByTime(100);
      trackRequestEnd(requestId1, 'completed');

      const requestId2 = trackRequestStart(['query2']);
      jest.advanceTimersByTime(200);
      trackRequestEnd(requestId2, 'completed');

      const metrics = getDeduplicationMetrics();
      expect(metrics.avgRequestDuration).toBeGreaterThanOrEqual(150);

      jest.useRealTimers();
    });

    it('should track peak concurrent requests', () => {
      const requestId1 = trackRequestStart(['query1']);
      const requestId2 = trackRequestStart(['query2']);
      const requestId3 = trackRequestStart(['query3']);

      const metrics = getDeduplicationMetrics();
      expect(metrics.peakConcurrentRequests).toBe(3);

      trackRequestEnd(requestId1, 'completed');
      trackRequestEnd(requestId2, 'completed');
      trackRequestEnd(requestId3, 'completed');
    });

    it('should identify most requested queries', () => {
      // Make multiple requests to same query
      for (let i = 0; i < 5; i++) {
        const id = trackRequestStart(['popular', 'query']);
        trackRequestEnd(id, 'completed');
      }

      for (let i = 0; i < 2; i++) {
        const id = trackRequestStart(['less', 'popular']);
        trackRequestEnd(id, 'completed');
      }

      const metrics = getDeduplicationMetrics();
      expect(metrics.mostRequestedQueries[0].queryKey).toContain('popular');
      expect(metrics.mostRequestedQueries[0].count).toBe(5);
    });
  });

  describe('getActiveRequests', () => {
    it('should return only pending requests', () => {
      const requestId1 = trackRequestStart(['active1']);
      const requestId2 = trackRequestStart(['active2']);
      const requestId3 = trackRequestStart(['completed']);

      trackRequestEnd(requestId3, 'completed');

      const activeRequests = getActiveRequests();
      expect(activeRequests.length).toBe(2);

      trackRequestEnd(requestId1, 'completed');
      trackRequestEnd(requestId2, 'completed');
    });
  });

  describe('getRequestHistory', () => {
    it('should return completed requests', () => {
      const requestId1 = trackRequestStart(['query1']);
      const requestId2 = trackRequestStart(['query2']);

      trackRequestEnd(requestId1, 'completed');
      trackRequestEnd(requestId2, 'error');

      const history = getRequestHistory();
      expect(history.length).toBe(2);
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        const id = trackRequestStart(['query', i]);
        trackRequestEnd(id, 'completed');
      }

      const history = getRequestHistory(3);
      expect(history.length).toBe(3);
    });

    it('should return most recent requests', () => {
      for (let i = 0; i < 5; i++) {
        const id = trackRequestStart(['query', i]);
        trackRequestEnd(id, 'completed');
      }

      const history = getRequestHistory(2);
      // Should get the last 2 (most recent)
      expect(history.length).toBe(2);
    });
  });

  describe('clearTrackingData', () => {
    it('should clear all active requests', () => {
      trackRequestStart(['query1']);
      trackRequestStart(['query2']);

      expect(getActiveRequests().length).toBe(2);

      clearTrackingData();

      expect(getActiveRequests().length).toBe(0);
    });

    it('should clear request history', () => {
      const id = trackRequestStart(['query']);
      trackRequestEnd(id, 'completed');

      expect(getRequestHistory().length).toBe(1);

      clearTrackingData();

      expect(getRequestHistory().length).toBe(0);
    });

    it('should log when clearing', () => {
      const logger = require('../../../utils/logger').default;

      clearTrackingData();

      expect(logger.info).toHaveBeenCalledWith(
        '[RequestDeduplication] Tracking data cleared'
      );
    });
  });

  describe('logDeduplicationSummary', () => {
    it('should log summary information', () => {
      const logger = require('../../../utils/logger').default;

      const id1 = trackRequestStart(['query1']);
      const id2 = trackRequestStart(['query1']); // Deduplicated

      trackRequestEnd(id1, 'completed');
      trackRequestEnd(id2, 'completed');

      logDeduplicationSummary();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Deduplication Summary')
      );
    });

    it('should include top queries in summary', () => {
      const logger = require('../../../utils/logger').default;

      for (let i = 0; i < 3; i++) {
        const id = trackRequestStart(['top', 'query']);
        trackRequestEnd(id, 'completed');
      }

      logDeduplicationSummary();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('topQueries')
      );
    });
  });

  describe('detectDeduplicationIssues', () => {
    it('should return empty array when no issues', () => {
      const issues = detectDeduplicationIssues();

      expect(issues).toEqual([]);
    });

    it('should detect low deduplication rate', () => {
      // Create many unique requests (low deduplication)
      for (let i = 0; i < 25; i++) {
        const id = trackRequestStart(['unique', 'query', i]);
        trackRequestEnd(id, 'completed');
      }

      const issues = detectDeduplicationIssues();

      const lowDedupIssue = issues.find((i) => i.issue === 'Low Deduplication Rate');
      expect(lowDedupIssue).toBeDefined();
      expect(lowDedupIssue?.severity).toBe('medium');
    });

    it('should detect multiple concurrent requests for same query', () => {
      // Create 4+ concurrent requests for same query
      for (let i = 0; i < 4; i++) {
        trackRequestStart(['concurrent', 'query']);
      }

      const issues = detectDeduplicationIssues();

      const concurrentIssue = issues.find(
        (i) => i.issue === 'Multiple Concurrent Requests'
      );
      expect(concurrentIssue).toBeDefined();
      expect(concurrentIssue?.severity).toBe('high');
    });

    it('should detect slow requests', () => {
      jest.useFakeTimers({ advanceTimers: true });

      const requestId = trackRequestStart(['slow', 'query']);

      // Simulate 6 seconds
      jest.advanceTimersByTime(6000);

      trackRequestEnd(requestId, 'completed');

      const issues = detectDeduplicationIssues();

      const slowIssue = issues.find((i) => i.issue === 'Slow Request Detected');
      expect(slowIssue).toBeDefined();
      expect(slowIssue?.severity).toBe('medium');

      jest.useRealTimers();
    });

    it('should log issues when found', () => {
      const logger = require('../../../utils/logger').default;

      // Create condition for an issue
      for (let i = 0; i < 5; i++) {
        trackRequestStart(['issue', 'query']);
      }

      detectDeduplicationIssues();

      // Logger is called with a single formatted string containing the issues
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Detected potential issues')
      );
    });
  });

  describe('startPeriodicMonitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers({ advanceTimers: true });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start monitoring at specified interval', () => {
      const logger = require('../../../utils/logger').default;

      const stop = startPeriodicMonitoring(1000);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Started periodic monitoring')
      );

      stop();
    });

    it('should log summary periodically', () => {
      const logger = require('../../../utils/logger').default;

      const stop = startPeriodicMonitoring(1000);

      jest.advanceTimersByTime(3000);

      // Should have logged multiple times
      expect(logger.info.mock.calls.filter((call: any) =>
        call[0].includes('Deduplication Summary')
      ).length).toBeGreaterThan(0);

      stop();
    });

    it('should return stop function', () => {
      const logger = require('../../../utils/logger').default;

      const stop = startPeriodicMonitoring(1000);

      stop();

      expect(logger.info).toHaveBeenCalledWith(
        '[RequestDeduplication] Stopped periodic monitoring'
      );
    });

    it('should stop monitoring when stop is called', () => {
      const logger = require('../../../utils/logger').default;

      const stop = startPeriodicMonitoring(1000);

      jest.advanceTimersByTime(500);
      stop();

      logger.info.mockClear();

      jest.advanceTimersByTime(2000);

      // Should not have logged after stopping
      expect(
        logger.info.mock.calls.filter((call: any) =>
          call[0].includes('Deduplication Summary')
        ).length
      ).toBe(0);
    });
  });

  describe('getDebugInfo', () => {
    it('should return debug information', () => {
      const id1 = trackRequestStart(['active']);
      const id2 = trackRequestStart(['completed']);
      trackRequestEnd(id2, 'completed');

      const debugInfo = getDebugInfo();

      expect(debugInfo).toHaveProperty('activeRequests');
      expect(debugInfo).toHaveProperty('completedRequests');
      expect(debugInfo).toHaveProperty('metrics');

      expect(debugInfo.activeRequests.length).toBe(1);
      expect(debugInfo.completedRequests.length).toBe(1);

      trackRequestEnd(id1, 'completed');
    });

    it('should limit completed requests in debug info', () => {
      // Create more than 10 completed requests
      for (let i = 0; i < 15; i++) {
        const id = trackRequestStart(['query', i]);
        trackRequestEnd(id, 'completed');
      }

      const debugInfo = getDebugInfo();

      // Should only show last 10
      expect(debugInfo.completedRequests.length).toBe(10);
    });

    it('should include current metrics', () => {
      const id = trackRequestStart(['query']);
      trackRequestEnd(id, 'completed');

      const debugInfo = getDebugInfo();

      expect(debugInfo.metrics.totalRequests).toBe(1);
    });
  });

  describe('history size management', () => {
    it('should limit history to maxHistorySize', () => {
      // Create more than 1000 completed requests
      for (let i = 0; i < 1010; i++) {
        const id = trackRequestStart(['query', i]);
        trackRequestEnd(id, 'completed');
      }

      const history = getRequestHistory(1100); // Request more than limit
      expect(history.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('query key serialization', () => {
    it('should handle complex query keys', () => {
      const complexKey = [
        'users',
        { page: 1, filters: { status: 'active', role: ['admin', 'user'] } },
      ];

      const requestId = trackRequestStart(complexKey);

      const activeRequests = getActiveRequests();
      expect(activeRequests[0].queryKey).toEqual(complexKey);

      trackRequestEnd(requestId, 'completed');
    });

    it('should detect deduplication with complex keys', () => {
      const key1 = ['data', { id: 123, nested: { value: 'test' } }];
      const key2 = ['data', { id: 123, nested: { value: 'test' } }]; // Same structure

      const id1 = trackRequestStart(key1);
      const id2 = trackRequestStart(key2);

      const activeRequests = getActiveRequests();

      expect(activeRequests.find((r) => r.requestId === id1)?.wasDeduplicated).toBe(false);
      expect(activeRequests.find((r) => r.requestId === id2)?.wasDeduplicated).toBe(true);

      trackRequestEnd(id1, 'completed');
      trackRequestEnd(id2, 'completed');
    });
  });
});
