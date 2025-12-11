/**
 * TransactionPollingManager - Smart post-transaction polling
 *
 * Industry Pattern: Stripe, Square, PayPal - burst polling after action
 *
 * Strategy:
 * - After user sends transaction: Poll 3 times (5s, 15s, 30s), then STOP
 * - Low volume, high urgency (different from MessageSyncManager)
 * - Only polls when user actively waiting for confirmation
 *
 * NOT continuous polling - that's wasteful for low-volume transactions
 */

import { QueryClient } from '@tanstack/react-query';
import logger from '../utils/logger';
import { networkService } from './NetworkService';
import { profileContextManager, ProfileSwitchStartData, ProfileSwitchCompleteData } from './ProfileContextManager';

interface TransactionPollConfig {
  transactionId: string;
  interactionId?: string;
  maxAttempts: number;
  intervals: number[]; // [5000, 15000, 30000] = 5s, 15s, 30s
}

interface ActivePoll {
  transactionId: string;
  interactionId?: string;
  currentAttempt: number;
  maxAttempts: number;
  intervals: number[];
  timeoutId: NodeJS.Timeout | null;
}

/**
 * TransactionPollingManager - Smart burst polling for transaction confirmations
 */
class TransactionPollingManager {
  private queryClient: QueryClient | null = null;
  private activePolls = new Map<string, ActivePoll>();
  private readonly DEFAULT_INTERVALS = [5000, 15000, 30000]; // 5s, 15s, 30s
  private readonly MAX_ATTEMPTS = 3;

  // Profile switch safety - stop polling during switch
  private isPausedForProfileSwitch = false;
  private unsubscribeSwitchStart: (() => void) | null = null;
  private unsubscribeSwitchComplete: (() => void) | null = null;

  /**
   * Initialize with QueryClient
   */
  initialize(queryClient: QueryClient): void {
    this.queryClient = queryClient;

    // Subscribe to profile switch events
    this.subscribeToProfileSwitch();

    logger.info('[TransactionPollingManager] ✅ Initialized');
  }

  /**
   * Subscribe to profile switch events to prevent stale data operations
   *
   * CRITICAL: This stops all active polls when profile switches to prevent
   * polling for transactions that belong to a different profile context.
   */
  private subscribeToProfileSwitch(): void {
    // On profile switch START: Stop all polls immediately
    this.unsubscribeSwitchStart = profileContextManager.onSwitchStart((data: ProfileSwitchStartData) => {
      logger.info('[TransactionPollingManager] 🔄 Profile switch starting - stopping all polls');
      this.isPausedForProfileSwitch = true;
      this.stopAllPolls();

      logger.debug('[TransactionPollingManager] ✅ All polls stopped for profile switch');
    });

    // On profile switch COMPLETE: Resume polling capability (no active polls to resume)
    this.unsubscribeSwitchComplete = profileContextManager.onSwitchComplete((data: ProfileSwitchCompleteData) => {
      logger.info(`[TransactionPollingManager] ✅ Profile switch complete - resuming (${data.profileType})`);
      this.isPausedForProfileSwitch = false;
    });

    // On profile switch FAILED: Resume with old context
    profileContextManager.onSwitchFailed(() => {
      logger.warn('[TransactionPollingManager] ⚠️ Profile switch failed - resuming with old context');
      this.isPausedForProfileSwitch = false;
    });
  }

  /**
   * Start smart polling after transaction send
   *
   * @param transactionId - Transaction to poll for
   * @param interactionId - Optional interaction context
   */
  startPolling(transactionId: string, interactionId?: string): void {
    // Check if paused for profile switch
    if (this.isPausedForProfileSwitch) {
      logger.debug('[TransactionPollingManager] Polling paused for profile switch - skipping');
      return;
    }

    if (!this.queryClient) {
      logger.warn('[TransactionPollingManager] ⚠️ Not initialized - skipping poll');
      return;
    }

    // Check if already polling this transaction
    if (this.activePolls.has(transactionId)) {
      logger.debug(`[TransactionPollingManager] Already polling ${transactionId}`);
      return;
    }

    // Check network state
    const networkState = networkService.getNetworkState();
    if (!networkState.isConnected || networkState.isOfflineMode) {
      logger.debug('[TransactionPollingManager] Offline - skipping poll (will sync on reconnect)');
      return;
    }

    logger.info(`[TransactionPollingManager] 🚀 Starting smart poll for transaction ${transactionId}`, {
      interactionId,
      strategy: 'burst polling (5s, 15s, 30s)',
    });

    // Create active poll tracker
    const poll: ActivePoll = {
      transactionId,
      interactionId,
      currentAttempt: 0,
      maxAttempts: this.MAX_ATTEMPTS,
      intervals: [...this.DEFAULT_INTERVALS],
      timeoutId: null,
    };

    this.activePolls.set(transactionId, poll);

    // Start first poll immediately (after 5s)
    this.schedulePoll(poll);
  }

  /**
   * Schedule next poll attempt
   */
  private schedulePoll(poll: ActivePoll): void {
    if (poll.currentAttempt >= poll.maxAttempts) {
      logger.info(`[TransactionPollingManager] ✅ Completed polling for ${poll.transactionId}`, {
        attempts: poll.currentAttempt,
      });
      this.activePolls.delete(poll.transactionId);
      return;
    }

    const delay = poll.intervals[poll.currentAttempt];

    logger.debug(`[TransactionPollingManager] 📡 Scheduling poll attempt ${poll.currentAttempt + 1}/${poll.maxAttempts}`, {
      transactionId: poll.transactionId,
      delay: `${delay}ms`,
    });

    poll.timeoutId = setTimeout(() => {
      this.executePoll(poll);
    }, delay);
  }

  /**
   * Execute poll - invalidate transaction queries to refetch
   */
  private async executePoll(poll: ActivePoll): Promise<void> {
    if (!this.queryClient) return;

    logger.info(`[TransactionPollingManager] 🔄 Poll attempt ${poll.currentAttempt + 1}/${poll.maxAttempts}`, {
      transactionId: poll.transactionId,
    });

    try {
      // Invalidate transaction queries - this triggers refetch
      await this.queryClient.invalidateQueries({
        queryKey: ['transactions'],
        refetchType: 'active',
      });

      // If interaction context provided, also invalidate timeline
      if (poll.interactionId) {
        await this.queryClient.invalidateQueries({
          queryKey: ['timeline', poll.interactionId],
          refetchType: 'active',
        });
      }

      logger.debug(`[TransactionPollingManager] ✅ Poll executed successfully`, {
        transactionId: poll.transactionId,
        attempt: poll.currentAttempt + 1,
      });

    } catch (error) {
      logger.error(`[TransactionPollingManager] ❌ Poll failed`, {
        transactionId: poll.transactionId,
        attempt: poll.currentAttempt + 1,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Schedule next poll
    poll.currentAttempt++;
    this.schedulePoll(poll);
  }

  /**
   * Stop polling for a specific transaction
   */
  stopPolling(transactionId: string): void {
    const poll = this.activePolls.get(transactionId);
    if (!poll) {
      logger.debug(`[TransactionPollingManager] No active poll for ${transactionId}`);
      return;
    }

    logger.info(`[TransactionPollingManager] 🛑 Stopping poll for ${transactionId}`, {
      attemptsSoFar: poll.currentAttempt,
    });

    // Clear timeout
    if (poll.timeoutId) {
      clearTimeout(poll.timeoutId);
      poll.timeoutId = null;
    }

    // Remove from active polls
    this.activePolls.delete(transactionId);
  }

  /**
   * Stop all active polls
   */
  stopAllPolls(): void {
    logger.debug(`[TransactionPollingManager] 🛑 Stopping all polls (${this.activePolls.size} active)`);

    for (const [transactionId] of this.activePolls) {
      this.stopPolling(transactionId);
    }
  }

  /**
   * Get polling status for transaction
   */
  isPolling(transactionId: string): boolean {
    return this.activePolls.has(transactionId);
  }

  /**
   * Get active polls count
   */
  getActivePollsCount(): number {
    return this.activePolls.size;
  }

  /**
   * Get polling statistics
   */
  getStats(): {
    activePolls: number;
    transactions: string[];
  } {
    return {
      activePolls: this.activePolls.size,
      transactions: Array.from(this.activePolls.keys()),
    };
  }

  /**
   * Cleanup - stop all polls
   */
  cleanup(): void {
    logger.debug('[TransactionPollingManager] 🧹 Cleaning up...');
    this.stopAllPolls();
    this.queryClient = null;

    // Unsubscribe from profile switch events
    if (this.unsubscribeSwitchStart) {
      this.unsubscribeSwitchStart();
      this.unsubscribeSwitchStart = null;
    }
    if (this.unsubscribeSwitchComplete) {
      this.unsubscribeSwitchComplete();
      this.unsubscribeSwitchComplete = null;
    }

    logger.info('[TransactionPollingManager] ✅ Cleanup complete');
  }

  /**
   * Reset all internal state - primarily for testing
   * @internal
   */
  reset(): void {
    this.stopAllPolls();
    this.isPausedForProfileSwitch = false;
    logger.debug('[TransactionPollingManager] Reset completed');
  }
}

// Export singleton instance
export const transactionPollingManager = new TransactionPollingManager();
export default transactionPollingManager;
