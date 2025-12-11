/**
 * ProfileContextManager - Centralized Profile Context & Request Cancellation
 *
 * This is the central hub for profile context management in a multi-profile app.
 * It solves the "stale closure" bug where background sync operations continue
 * using old profile/account IDs after a profile switch.
 *
 * PROBLEM SOLVED:
 * - Services with setInterval/setTimeout captured old profileId in closures
 * - After profile switch, these closures fired API calls with wrong context
 * - Backend rejected with 404 (e.g., "personal profile can't access business account")
 *
 * SOLUTION:
 * 1. Centralized AbortController - cancels ALL pending requests on switch
 * 2. Event-driven architecture - services subscribe to start/complete events
 * 3. Single source of truth for current profileId/entityId
 *
 * USAGE:
 * - ProfileSwitchOrchestrator calls onProfileSwitchStart() and onProfileSwitchComplete()
 * - Services subscribe via onSwitchStart() and onSwitchComplete()
 * - Hooks get AbortSignal via getAbortSignal()
 *
 * Reference: https://tanstack.com/query/v4/docs/react/guides/query-cancellation
 *
 * @author Claude AI
 * @date 2025-01-10
 */

import EventEmitter from 'eventemitter3';
import logger from '../utils/logger';

// Typed events for ProfileContextManager
interface ProfileEvents {
  'profile-switch-start': (data: ProfileSwitchStartData) => void;
  'profile-switch-complete': (data: ProfileSwitchCompleteData) => void;
  'profile-switch-failed': () => void;
}

export interface ProfileSwitchStartData {
  oldProfileId: string | null;
  oldEntityId: string | null;
  newProfileId: string;
  newEntityId: string;
}

export interface ProfileSwitchCompleteData {
  profileId: string;
  entityId: string;
  profileType: 'personal' | 'business';
}

export interface ProfileContext {
  profileId: string | null;
  entityId: string | null;
  profileType: 'personal' | 'business' | null;
}

class ProfileContextManager {
  private currentProfileId: string | null = null;
  private currentEntityId: string | null = null;
  private currentProfileType: 'personal' | 'business' | null = null;
  private abortController: AbortController | null = null;
  private eventEmitter = new EventEmitter<ProfileEvents>();
  private isSwitching = false;

  constructor() {
    logger.debug('[ProfileContextManager] Initialized');
  }

  // ============================================================
  // PROFILE SWITCH LIFECYCLE (called by ProfileSwitchOrchestrator)
  // ============================================================

  /**
   * Called by ProfileSwitchOrchestrator at START of profile switch.
   * This MUST be called BEFORE any cache clearing or API calls.
   *
   * Effects:
   * 1. Aborts all pending requests from old profile
   * 2. Emits 'profile-switch-start' - services MUST pause/clear queues
   * 3. Sets isSwitching flag to prevent new operations
   */
  onProfileSwitchStart(newProfileId: string, newEntityId: string): void {
    logger.info(`[ProfileContextManager] 🔄 Profile switch starting: ${this.currentProfileId} → ${newProfileId}`);

    this.isSwitching = true;

    // 1. Abort all pending requests from old profile
    if (this.abortController) {
      logger.debug('[ProfileContextManager] Aborting all pending requests');
      this.abortController.abort('Profile switching');
    }
    this.abortController = new AbortController();

    // 2. Emit event - services MUST pause/clear queues
    const eventData: ProfileSwitchStartData = {
      oldProfileId: this.currentProfileId,
      oldEntityId: this.currentEntityId,
      newProfileId,
      newEntityId,
    };
    this.eventEmitter.emit('profile-switch-start', eventData);

    logger.debug('[ProfileContextManager] ✅ profile-switch-start event emitted');
  }

  /**
   * Called by ProfileSwitchOrchestrator at END of successful profile switch.
   * This should be called AFTER tokens are updated and caches are cleared.
   *
   * Effects:
   * 1. Updates current profile context
   * 2. Clears isSwitching flag
   * 3. Emits 'profile-switch-complete' - services can resume with new context
   */
  onProfileSwitchComplete(
    newProfileId: string,
    newEntityId: string,
    profileType: 'personal' | 'business'
  ): void {
    logger.info(`[ProfileContextManager] ✅ Profile switch complete: ${newProfileId} (${profileType})`);

    // Update current context
    this.currentProfileId = newProfileId;
    this.currentEntityId = newEntityId;
    this.currentProfileType = profileType;
    this.isSwitching = false;

    // Emit event - services can resume with new context
    const eventData: ProfileSwitchCompleteData = {
      profileId: newProfileId,
      entityId: newEntityId,
      profileType,
    };
    this.eventEmitter.emit('profile-switch-complete', eventData);

    logger.debug('[ProfileContextManager] ✅ profile-switch-complete event emitted');
  }

  /**
   * Called if profile switch fails.
   * Restores isSwitching flag so operations can resume.
   */
  onProfileSwitchFailed(): void {
    logger.warn('[ProfileContextManager] ❌ Profile switch failed, restoring state');
    this.isSwitching = false;
    this.eventEmitter.emit('profile-switch-failed');
  }

  // ============================================================
  // ABORT SIGNAL (for API request cancellation)
  // ============================================================

  /**
   * Get AbortSignal for API requests.
   * Pass this to axios/fetch calls to enable automatic cancellation on profile switch.
   *
   * Usage in services:
   * ```typescript
   * const signal = profileContextManager.getAbortSignal();
   * await apiClient.get(url, { signal });
   * ```
   *
   * Usage in TanStack Query hooks:
   * ```typescript
   * queryFn: async ({ signal }) => {
   *   // TanStack Query provides its own signal, but you can also use ours
   *   return fetchData(signal);
   * }
   * ```
   */
  getAbortSignal(): AbortSignal {
    if (!this.abortController) {
      this.abortController = new AbortController();
    }
    return this.abortController.signal;
  }

  /**
   * Check if request should be aborted (signal already aborted).
   * Useful for checking BEFORE making an API call.
   */
  isAborted(): boolean {
    return this.abortController?.signal.aborted ?? false;
  }

  // ============================================================
  // EVENT SUBSCRIPTIONS (for services)
  // ============================================================

  /**
   * Subscribe to profile switch start event.
   * Services should use this to:
   * - Pause queue processing
   * - Clear pending operations
   * - Stop polling/intervals
   *
   * Returns unsubscribe function.
   */
  onSwitchStart(callback: (data: ProfileSwitchStartData) => void): () => void {
    this.eventEmitter.on('profile-switch-start', callback);
    return () => this.eventEmitter.off('profile-switch-start', callback);
  }

  /**
   * Subscribe to profile switch complete event.
   * Services should use this to:
   * - Resume operations with new context
   * - Re-initialize with new profileId/entityId
   * - Rejoin WebSocket rooms
   *
   * Returns unsubscribe function.
   */
  onSwitchComplete(callback: (data: ProfileSwitchCompleteData) => void): () => void {
    this.eventEmitter.on('profile-switch-complete', callback);
    return () => this.eventEmitter.off('profile-switch-complete', callback);
  }

  /**
   * Subscribe to profile switch failed event.
   * Services can use this to resume normal operations if switch fails.
   *
   * Returns unsubscribe function.
   */
  onSwitchFailed(callback: () => void): () => void {
    this.eventEmitter.on('profile-switch-failed', callback);
    return () => this.eventEmitter.off('profile-switch-failed', callback);
  }

  // ============================================================
  // CONTEXT GETTERS (for validation)
  // ============================================================

  /**
   * Get current profile context.
   * Useful for validating if an operation is for the correct profile.
   */
  getCurrentContext(): ProfileContext {
    return {
      profileId: this.currentProfileId,
      entityId: this.currentEntityId,
      profileType: this.currentProfileType,
    };
  }

  /**
   * Check if currently switching profiles.
   * Services should check this before starting new operations.
   */
  isSwitchingProfile(): boolean {
    return this.isSwitching;
  }

  /**
   * Check if a profileId is stale (doesn't match current).
   * Useful in setTimeout/setInterval callbacks to skip stale executions.
   *
   * Usage:
   * ```typescript
   * setTimeout(() => {
   *   if (profileContextManager.isProfileStale(capturedProfileId)) {
   *     return; // Skip - profile changed
   *   }
   *   // Safe to proceed
   * }, 150);
   * ```
   */
  isProfileStale(profileId: string): boolean {
    return this.currentProfileId !== null && this.currentProfileId !== profileId;
  }

  /**
   * Check if an entityId is stale (doesn't match current).
   */
  isEntityStale(entityId: string): boolean {
    return this.currentEntityId !== null && this.currentEntityId !== entityId;
  }

  /**
   * Initialize context (called on app startup/login).
   * This sets the initial profile context without triggering switch events.
   */
  initializeContext(
    profileId: string,
    entityId: string,
    profileType: 'personal' | 'business'
  ): void {
    logger.debug(`[ProfileContextManager] Initializing context: ${profileId} (${profileType})`);
    this.currentProfileId = profileId;
    this.currentEntityId = entityId;
    this.currentProfileType = profileType;
    this.isSwitching = false;

    // Create fresh abort controller
    this.abortController = new AbortController();
  }

  /**
   * Clear context (called on logout).
   */
  clearContext(): void {
    logger.debug('[ProfileContextManager] Clearing context (logout)');
    this.currentProfileId = null;
    this.currentEntityId = null;
    this.currentProfileType = null;
    this.isSwitching = false;

    // Abort any pending requests
    this.abortController?.abort('Logout');
    this.abortController = null;
  }
}

// Singleton instance
export const profileContextManager = new ProfileContextManager();
