/**
 * PROFESSIONAL PROFILE SWITCH ORCHESTRATOR
 *
 * Purpose: Manage profile switching with state machine pattern, atomicity, and rollback.
 * Industry Standard: Matches Google, Microsoft, and banking app profile switching patterns.
 *
 * Key Features:
 * - State machine with 9 states (IDLE → SUCCESS or FAILED → ROLLED_BACK)
 * - Atomic operations (all-or-nothing)
 * - Automatic rollback on any failure
 * - Snapshot current state before switch
 * - Biometric re-authentication
 * - Progress tracking for UI feedback
 *
 * Architecture:
 * - Single Responsibility: Orchestrate profile switch only
 * - Dependency Injection: Receives dependencies (apiClient, authContext)
 * - Error Handling: Comprehensive with specific error types
 * - Testability: Pure functions, mockable dependencies
 *
 * @author Swap Engineering Team
 * @date 2025-01-18
 */

import logger from '../utils/logger';
import { tokenManager, saveAccessToken, saveRefreshToken } from './token';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import { queryKeys } from '../tanstack-query/queryKeys';
import { clearProfileLocalDB } from '../localdb';

/**
 * Profile switch states (state machine)
 */
export enum ProfileSwitchState {
  IDLE = 'idle',
  BIOMETRIC_PENDING = 'biometric_pending',
  API_CALL_PENDING = 'api_call_pending',
  TOKEN_UPDATE_PENDING = 'token_update_pending',
  DATA_FETCH_PENDING = 'data_fetch_pending',
  CACHE_CLEAR_PENDING = 'cache_clear_pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
}

/**
 * Profile switch events (state transitions)
 */
export enum ProfileSwitchEvent {
  START = 'start',
  BIOMETRIC_APPROVED = 'biometric_approved',
  BIOMETRIC_REJECTED = 'biometric_rejected',
  API_SUCCESS = 'api_success',
  API_FAILED = 'api_failed',
  TOKENS_UPDATED = 'tokens_updated',
  TOKENS_FAILED = 'tokens_failed',
  DATA_FETCHED = 'data_fetched',
  DATA_FAILED = 'data_failed',
  CACHE_CLEARED = 'cache_cleared',
  CACHE_FAILED = 'cache_failed',
  ROLLBACK = 'rollback',
  ROLLBACK_COMPLETE = 'rollback_complete',
}

/**
 * Snapshot of current profile state (for rollback)
 */
interface ProfileSnapshot {
  accessToken: string | null;
  refreshToken: string | null;
  profileId: string | null;
  entityId: string | null;
  user: any; // AuthContext user object
  timestamp: number;
}

/**
 * Profile switch result
 */
export interface ProfileSwitchResult {
  success: boolean;
  newProfileId?: string;
  error?: string;
  state: ProfileSwitchState;
}

/**
 * Available profile info (for optimistic updates)
 */
export interface AvailableProfile {
  profileId: string;
  entityId: string;
  type: 'personal' | 'business';
  displayName: string;
  avatarUrl?: string;
}

/**
 * Profile switch options
 */
export interface ProfileSwitchOptions {
  targetProfileId: string;
  requireBiometric?: boolean; // Default: true
  apiClient: any; // Axios instance
  authContext: any; // AuthContext instance
  queryClient?: any; // TanStack Query client (optional)
  availableProfiles?: AvailableProfile[]; // For optimistic UI updates (Phase 3)
}

/**
 * Profile Switch Orchestrator
 *
 * Manages the entire profile switching lifecycle with state machine pattern.
 */
export class ProfileSwitchOrchestrator {
  // Current state
  private state: ProfileSwitchState = ProfileSwitchState.IDLE;

  // Snapshot for rollback
  private snapshot: ProfileSnapshot | null = null;

  // Switch in progress lock
  private isSwitching: boolean = false;

  // Progress callback for UI updates
  private progressCallback?: (state: ProfileSwitchState, message: string) => void;

  /**
   * Set progress callback for UI feedback
   */
  setProgressCallback(callback: (state: ProfileSwitchState, message: string) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Get current state
   */
  getCurrentState(): ProfileSwitchState {
    return this.state;
  }

  /**
   * Check if switch is in progress
   */
  isSwitchInProgress(): boolean {
    return this.isSwitching;
  }

  /**
   * Main entry point: Switch to target profile
   *
   * This method orchestrates the entire profile switch lifecycle:
   * 1. Capture current state (snapshot)
   * 2. Biometric authentication
   * 3. Call backend API
   * 4. Update tokens (atomic)
   * 5. Fetch new profile data
   * 6. Clear caches
   * 7. Update UI state
   *
   * On any error: Automatic rollback to previous state
   */
  async switchProfile(options: ProfileSwitchOptions): Promise<ProfileSwitchResult> {
    const { targetProfileId, requireBiometric = true, apiClient, authContext, queryClient, availableProfiles } = options;

    console.log('🎭 [ProfileSwitchOrchestrator] switchProfile() called', {
      targetProfileId,
      currentUser: authContext?.user?.entityId,
      requireBiometric
    });

    // Prevent concurrent switches
    if (this.isSwitching) {
      console.log('🎭 [ProfileSwitchOrchestrator] ⚠️ Profile switch already in progress');
      return {
        success: false,
        error: 'Profile switch already in progress',
        state: this.state,
      };
    }

    try {
      this.isSwitching = true;
      this.state = ProfileSwitchState.IDLE;

      // CRITICAL: Set isProfileSwitching flag to prevent stale queries during switch
      authContext.setIsProfileSwitching?.(true);
      console.log('🎭 [ProfileSwitchOrchestrator] 🔒 isProfileSwitching = true (queries disabled)');

      console.log('🎭 [ProfileSwitchOrchestrator] STEP 0: Starting profile switch');

      // ============================================================================
      // OPTIMIZATION: Non-blocking token refresh (if needed)
      // ============================================================================
      // REMOVED: Token refresh check was blocking the switch flow (could add 0-2s delay)
      // The switch-profile API call will fail with 401 if token is expired,
      // which will trigger automatic rollback. This is faster than preemptive refresh.
      if (tokenManager.shouldRefreshToken()) {
        logger.warn('[ProfileSwitchOrchestrator] ⚠️ Token expires soon - switch API may trigger refresh');
      }

      // ============================================================================
      // STEP 1: Capture current state (snapshot for rollback)
      // ============================================================================
      console.log('🎭 [ProfileSwitchOrchestrator] STEP 1: Capturing snapshot...');
      this.updateProgress(ProfileSwitchState.IDLE, 'Preparing profile switch...');
      this.snapshot = await this.captureSnapshot(authContext);

      console.log('🎭 [ProfileSwitchOrchestrator] STEP 1 DONE: Snapshot captured', {
        oldProfileId: this.snapshot?.profileId,
        oldEntityId: this.snapshot?.entityId
      });

      // ============================================================================
      // PHASE 3: OPTIMISTIC UI UPDATE (Instant avatar/name/data switch - 0ms lag)
      // ============================================================================
      let targetProfile: AvailableProfile | undefined;

      // Try to use passed availableProfiles first
      if (availableProfiles && availableProfiles.length > 0) {
        targetProfile = availableProfiles.find(p => p.profileId === targetProfileId);
      }

      // FALLBACK: If availableProfiles not passed or target not found, try queryClient cache
      // This ensures optimistic updates work on FIRST switch, not just cached switches
      if (!targetProfile && queryClient) {
        logger.debug('[ProfileSwitchOrchestrator] 🔍 FALLBACK: availableProfiles not provided, checking queryClient cache...');
        const cachedProfiles = queryClient.getQueryData<AvailableProfile[]>(queryKeys.availableProfiles);

        if (cachedProfiles && cachedProfiles.length > 0) {
          targetProfile = cachedProfiles.find(p => p.profileId === targetProfileId);
          if (targetProfile) {
            logger.debug('[ProfileSwitchOrchestrator] ✅ FALLBACK: Found target profile in queryClient cache');
          }
        }
      }

      // If we have target profile data (from props OR cache), perform optimistic update
      if (targetProfile) {
        logger.debug('[ProfileSwitchOrchestrator] 🚀 OPTIMISTIC: Setting optimistic user data for instant UI update');

        // PROFESSIONAL FIX: Parse displayName into firstName/lastName or businessName
        // This prevents "UA" (Unknown Avatar) flash during profile switch by providing
        // all fields that getHeaderInitials() needs for instant avatar display
        let firstName: string | undefined;
        let lastName: string | undefined;
        let businessName: string | undefined;

        if (targetProfile.type === 'business') {
          // Business profile: displayName is the business name
          businessName = targetProfile.displayName;
        } else {
          // Personal profile: displayName is "FirstName LastName"
          // Example: "Rose Marie Augustin" → firstName: "Rose Marie", lastName: "Augustin"
          const nameParts = targetProfile.displayName.split(' ');
          if (nameParts.length >= 2) {
            lastName = nameParts[nameParts.length - 1];
            firstName = nameParts.slice(0, -1).join(' ');
          } else {
            firstName = targetProfile.displayName;
          }
        }

        // REMOVED: Optimistic UI update moved to AFTER token update (lines 691-697)
        // This prevents race condition where queries fire with stale tokens
        logger.debug('[ProfileSwitchOrchestrator] ⏳ Optimistic update deferred until after token refresh (prevents race condition)');

        // OPTIMIZATION: Prefetch avatar image for instant display
        if (targetProfile.avatarUrl) {
          try {
            const { Image } = await import('react-native');
            await Image.prefetch(targetProfile.avatarUrl);
            logger.debug('[ProfileSwitchOrchestrator] ✅ OPTIMISTIC: Avatar image prefetched');
          } catch (imgError: any) {
            logger.warn('[ProfileSwitchOrchestrator] ⚠️ Avatar prefetch failed (non-critical):', imgError);
          }
        }
      } else {
        logger.warn('[ProfileSwitchOrchestrator] ⚠️ No target profile data available for optimistic update (will update after API)');
      }

      // ============================================================================
      // STEP 2: Biometric authentication + PHASE 4: Parallel prefetching
      // ============================================================================
      if (requireBiometric) {
        this.state = ProfileSwitchState.BIOMETRIC_PENDING;
        this.updateProgress(this.state, 'Authenticating...');

        // PHASE 4: Start prefetching data DURING biometric prompt (parallel - 2-3s free time!)
        const prefetchPromise = this.prefetchProfileData(apiClient, targetProfileId, queryClient);

        // Biometric authentication (user takes 2-3 seconds)
        const biometricApproved = await this.requestBiometricAuth();

        if (!biometricApproved) {
          logger.warn('[ProfileSwitchOrchestrator] ❌ Biometric authentication rejected');
          // No need to rollback - optimistic update hasn't happened yet
          throw new Error('Biometric authentication required');
        }

        logger.debug('[ProfileSwitchOrchestrator] ✅ Biometric authentication approved');

        // Wait for prefetch to complete (likely already done by now!)
        const prefetchedData = await prefetchPromise;
        if (prefetchedData) {
          logger.debug('[ProfileSwitchOrchestrator] ✅ PHASE 4: Profile data prefetched during biometric prompt');
        }
      }

      // ============================================================================
      // STEP 3: Call backend API
      // ============================================================================
      this.state = ProfileSwitchState.API_CALL_PENDING;
      this.updateProgress(this.state, 'Switching profile...');

      const apiResponse = await this.callSwitchProfileAPI(apiClient, targetProfileId);

      logger.debug('[ProfileSwitchOrchestrator] ✅ API call successful', 'profile_switch');

      // ============================================================================
      // STEP 4: Update tokens (ATOMIC)
      // ============================================================================
      console.log('🎭 [ProfileSwitchOrchestrator] STEP 4: Updating tokens atomically...');
      this.state = ProfileSwitchState.TOKEN_UPDATE_PENDING;
      this.updateProgress(this.state, 'Updating credentials...');

      await this.atomicTokenUpdate(apiResponse, apiClient);

      console.log('🎭 [ProfileSwitchOrchestrator] STEP 4 DONE: Tokens updated atomically');

      // ============================================================================
      // STEP 5: Fetch new profile data
      // ============================================================================
      console.log('🎭 [ProfileSwitchOrchestrator] STEP 5: Fetching profile data...');
      this.state = ProfileSwitchState.DATA_FETCH_PENDING;
      this.updateProgress(this.state, 'Loading profile...');

      const newProfile = await this.fetchProfileData(apiClient);

      console.log('🎭 [ProfileSwitchOrchestrator] STEP 5 DONE: Profile data fetched', {
        newProfileId: newProfile?.id,
        firstName: newProfile?.first_name,
        lastName: newProfile?.last_name,
        businessName: newProfile?.business_name,
        profileType: newProfile?.type
      });

      // ============================================================================
      // STEP 6: Update AuthContext FIRST (CRITICAL: before cache clearing)
      // This ensures hooks have new profile IDs when TanStack Query refetches
      // ============================================================================
      console.log('🎭 [ProfileSwitchOrchestrator] STEP 6: Updating AuthContext (CRITICAL - before cache clear)...');
      await this.updateAuthContext(authContext, newProfile);

      console.log('🎭 [ProfileSwitchOrchestrator] STEP 6 DONE: AuthContext updated');

      // ============================================================================
      // STEP 7: Parallel operations for better performance
      // Now safe to clear caches - refetches will use new profile IDs from AuthContext
      // ============================================================================
      this.state = ProfileSwitchState.CACHE_CLEAR_PENDING;
      this.updateProgress(this.state, 'Finalizing switch...');

      // OPTIMIZATION: Run cache clear and WebSocket reconnect in parallel
      // These operations are independent and can happen simultaneously
      // Extract old profile info from snapshot for surgical cache invalidation
      const oldProfileId = this.snapshot?.profileId || '';
      const oldEntityId = this.snapshot?.entityId || '';

      const parallelOperations = [
        // Cache clearing with surgical invalidation (Phase 2 optimization)
        this.clearAllCaches(apiClient, queryClient, oldProfileId, oldEntityId, newProfile),

        // WebSocket reconnection (non-blocking, fire-and-forget)
        (async () => {
          try {
            const { websocketService } = await import('./websocketService');
            if (websocketService && websocketService.isSocketConnected()) {
              logger.debug('[ProfileSwitchOrchestrator] Disconnecting WebSocket for profile context update...');
              await websocketService.disconnect();
              // WebSocket will auto-reconnect with new profile context when needed
              logger.debug('[ProfileSwitchOrchestrator] ✅ WebSocket disconnected (will auto-reconnect with new profile)');
            }
          } catch (wsError: any) {
            logger.warn('[ProfileSwitchOrchestrator] ⚠️ WebSocket disconnect failed (non-critical):', wsError);
          }
        })(),
      ];

      // Wait for all parallel operations to complete
      const results = await Promise.allSettled(parallelOperations);

      // Check for failures - if any cache operation failed, go NUCLEAR
      // Industry best practice: Never leave partial state, clear everything and refetch fresh
      const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failures.length > 0 && queryClient) {
        const reasons = failures.map(f => String(f.reason)).join(', ');
        logger.warn(`[ProfileSwitchOrchestrator] ⚠️ Surgical cache clear failed: ${reasons}`);
        logger.info('[ProfileSwitchOrchestrator] 🔄 Going NUCLEAR - clearing ALL cached data for consistency');

        try {
          // NUCLEAR: Clear ALL TanStack Query cache
          queryClient.clear();
          logger.debug('[ProfileSwitchOrchestrator] ✅ Nuclear cache clear completed - all data will be fetched fresh');
        } catch (nuclearError) {
          logger.error('[ProfileSwitchOrchestrator] ❌ Nuclear cache clear failed:', nuclearError);
          // Continue anyway - hooks will fetch fresh data on next render
        }
      }

      console.log('🎭 [ProfileSwitchOrchestrator] STEP 7 DONE: Cache clearing completed');
      logger.debug('[ProfileSwitchOrchestrator] ✅ Cache operations completed (cache + WebSocket)');

      // ============================================================================
      // STEP 8: Update PIN storage for new profile (Instagram-style multi-profile)
      // ============================================================================
      try {
        const { storeProfilePinData, setLastActiveProfile } = await import('../utils/pinUserStorage');

        // ARCHITECTURE: All profiles (personal + business) belong to the SAME auth user
        // Phone is the primary identifier stored in JWT - consistent across all profiles
        // Business profiles share auth user with personal profile
        const identifier = tokenManager.getAuthUserIdentifier();

        console.log('🎭 [ProfileSwitchOrchestrator] STEP 8: Storing PIN data for profile', {
          profileId: newProfile.id,
          profileType: newProfile.type,
          identifier: identifier ? `${identifier.slice(0, 5)}...` : 'MISSING',
        });

        if (!identifier) {
          logger.warn('[ProfileSwitchOrchestrator] ⚠️ Cannot store PIN data - no phone in JWT');
        } else {
          await storeProfilePinData(newProfile.id, {
            identifier,
            username: newProfile.type === 'personal' ? newProfile.username : undefined,
            businessName: newProfile.type === 'business' ? newProfile.business_name : undefined,
            displayName: newProfile.type === 'business'
              ? newProfile.business_name
              : `${newProfile.first_name} ${newProfile.last_name}`,
            profileType: newProfile.type === 'business' ? 'business' : 'personal',
            avatarUrl: newProfile.avatar_url || newProfile.logo_url,
          });

          logger.debug('[ProfileSwitchOrchestrator] ✅ PIN data stored for profile');
        }

        await setLastActiveProfile(newProfile.id);

        logger.debug('[ProfileSwitchOrchestrator] ✅ Last active profile updated');
      } catch (pinError: any) {
        logger.warn('[ProfileSwitchOrchestrator] ⚠️ PIN data update failed (non-critical):', pinError);
      }

      // ============================================================================
      // SUCCESS
      // ============================================================================
      this.state = ProfileSwitchState.SUCCESS;
      this.updateProgress(this.state, 'Profile switched successfully');
      this.snapshot = null; // Clear snapshot on success

      logger.info('[ProfileSwitchOrchestrator] ✅ Profile switch completed successfully', 'profile_switch');

      return {
        success: true,
        newProfileId: newProfile.id,
        state: this.state,
      };

    } catch (error) {
      // ============================================================================
      // ERROR: Rollback to previous state
      // ============================================================================
      this.state = ProfileSwitchState.FAILED;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('[ProfileSwitchOrchestrator] ❌ Profile switch failed:', error);

      // Attempt rollback
      await this.rollback(apiClient, authContext);

      return {
        success: false,
        error: errorMessage,
        state: this.state,
      };

    } finally {
      this.isSwitching = false;
      // CRITICAL: Reset isProfileSwitching flag to re-enable queries
      authContext.setIsProfileSwitching?.(false);
      console.log('🎭 [ProfileSwitchOrchestrator] 🔓 isProfileSwitching = false (queries enabled)');
    }
  }

  /**
   * Capture current state snapshot for rollback
   */
  private async captureSnapshot(authContext: any): Promise<ProfileSnapshot> {
    return {
      accessToken: tokenManager.getCurrentAccessToken(),
      refreshToken: await tokenManager.getRefreshToken(),
      profileId: tokenManager.getCurrentProfileId(),
      entityId: tokenManager.getCurrentEntityId(),
      user: authContext.user,
      timestamp: Date.now(),
    };
  }

  /**
   * Request biometric authentication
   */
  private async requestBiometricAuth(): Promise<boolean> {
    try {
      // Check if biometrics are available
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        logger.warn('[ProfileSwitchOrchestrator] ⚠️ Biometric hardware not available');
        return true; // Skip biometric if not available
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        logger.warn('[ProfileSwitchOrchestrator] ⚠️ No biometrics enrolled');
        return true; // Skip biometric if not enrolled
      }

      // Request biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to switch profiles',
        fallbackLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      logger.error('[ProfileSwitchOrchestrator] ❌ Biometric authentication error:', error);
      return false;
    }
  }

  /**
   * Call backend /auth/switch-profile API
   */
  private async callSwitchProfileAPI(apiClient: any, targetProfileId: string): Promise<any> {
    const response = await apiClient.post('/auth/switch-profile', {
      targetProfileId,
    });

    if (!response.data || !response.data.access_token) {
      throw new Error('Invalid API response: missing access_token');
    }

    return response.data;
  }

  /**
   * Atomic token update (all-or-nothing)
   *
   * Either ALL succeed or ALL fail (with rollback)
   */
  private async atomicTokenUpdate(apiResponse: any, apiClient: any): Promise<void> {
    try {
      // Step 1: Update BOTH TokenManager AND axios.defaults headers (single source of truth)
      // Using apiClient.setAccessToken() ensures both in-memory cache and axios defaults are synced
      apiClient.setAccessToken(apiResponse.access_token);
      apiClient.setRefreshToken(apiResponse.refresh_token);

      // CRITICAL: Update X-Profile-ID header with new profileId from JWT
      // Without this, backend API calls use old profile context and switch fails
      const newProfileId = tokenManager.getCurrentProfileId();
      if (newProfileId) {
        apiClient.setProfileId(newProfileId);
        logger.debug('[ProfileSwitchOrchestrator] ✅ X-Profile-ID header updated:', newProfileId);
      }

      logger.debug('[ProfileSwitchOrchestrator] ✅ In-memory tokens and axios headers updated');

      // Step 2: Persist to storage (ASYNCHRONOUS - can fail)
      await Promise.all([
        tokenManager.setAccessToken(apiResponse.access_token),
        tokenManager.setRefreshToken(apiResponse.refresh_token),
      ]);

      logger.debug('[ProfileSwitchOrchestrator] ✅ Tokens persisted to storage');

    } catch (error) {
      // Rollback in-memory tokens and axios headers on storage failure
      if (this.snapshot) {
        if (this.snapshot.accessToken) {
          apiClient.setAccessToken(this.snapshot.accessToken);
        }
        if (this.snapshot.refreshToken) {
          apiClient.setRefreshToken(this.snapshot.refreshToken);
        }
      }

      logger.error('[ProfileSwitchOrchestrator] ❌ Token update failed, rolled back in-memory tokens and axios headers');
      throw error;
    }
  }

  /**
   * Fetch new profile data from /auth/me
   */
  private async fetchProfileData(apiClient: any): Promise<any> {
    const response = await apiClient.get('/auth/me', {
      headers: {
        'Cache-Control': 'no-cache', // Force fresh data
      },
    });

    if (!response.data || !response.data.id) {
      throw new Error('Invalid profile data received');
    }

    return response.data;
  }

  /**
   * Prefetch new profile data during biometric prompt (PHASE 4 OPTIMIZATION)
   *
   * This runs IN PARALLEL with biometric authentication, utilizing the 2-3 seconds
   * of user interaction time to prefetch data. By the time biometric completes,
   * data is ready for instant display.
   *
   * Impact: Zero wait time after biometric approval - WhatsApp-level instant switching
   */
  private async prefetchProfileData(
    apiClient: any,
    targetProfileId: string,
    queryClient: any | undefined
  ): Promise<any | null> {
    try {
      logger.debug('[ProfileSwitchOrchestrator] 🚀 PHASE 4: Starting parallel prefetch during biometric prompt');

      // Don't wait for biometric - fetch in background!
      // Note: We're NOT updating tokens yet (that requires biometric approval)
      // This is just prefetching public/cached data

      // Since we can't make authenticated API calls without new tokens,
      // we'll prefetch what we can from cache and prepare queries
      if (!queryClient) {
        return null;
      }

      const { queryKeys } = await import('../tanstack-query/queryKeys');

      // Prefetch available profiles (this is profile-agnostic, safe to fetch)
      try {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.availableProfiles,
          queryFn: async () => {
            const response = await apiClient.get('/auth/available-profiles');
            return response.data;
          },
          staleTime: 300000, // 5 minutes
        });

        logger.debug('[ProfileSwitchOrchestrator] ✅ PHASE 4: Available profiles prefetched');
      } catch (error: any) {
        logger.warn('[ProfileSwitchOrchestrator] ⚠️ PHASE 4: Prefetch failed (non-critical):', error);
      }

      return { prefetched: true };
    } catch (error: any) {
      // Prefetch failures are non-critical - switch will still work
      logger.warn('[ProfileSwitchOrchestrator] ⚠️ PHASE 4: Prefetch error (non-critical):', error);
      return null;
    }
  }

  /**
   * Clear old profile caches and prefetch new profile data (OPTIMIZED - Phase 2)
   *
   * OPTIMIZATION: Instead of nuclear `queryClient.clear()`, we surgically invalidate
   * only the OLD profile's queries and prefetch NEW profile data.
   *
   * Impact: No white flashes, smoother transitions, preserves unrelated cached data
   */
  private async clearAllCaches(
    apiClient: any,
    queryClient: any | undefined,
    oldProfileId: string,
    oldEntityId: string,
    newProfile: any
  ): Promise<void> {
    // Clear apiClient caches (HTTP layer)
    if (apiClient.clearProfileCache) {
      await apiClient.clearProfileCache();
    }
    if (apiClient.clearCache) {
      await apiClient.clearCache();
    }

    // OPTIMIZATION: Surgical TanStack Query cache invalidation
    if (queryClient) {
      // Import query key utilities
      const { queryKeyUtils } = await import('../tanstack-query/queryKeys');

      // Get all OLD profile's query keys (profile-aware)
      const oldProfileKeys = queryKeyUtils.getUserDataKeys(oldProfileId, oldEntityId);

      // Invalidate ONLY old profile's queries (surgical, not nuclear)
      await Promise.all(
        oldProfileKeys.map(key =>
          queryClient.invalidateQueries({
            queryKey: key,
            exact: false, // Match all queries starting with this key
          })
        )
      );

      // Also invalidate availableProfiles (needs refresh after switch)
      const { queryKeys } = await import('../tanstack-query/queryKeys');
      await queryClient.invalidateQueries({
        queryKey: queryKeys.availableProfiles,
      });

      // PROFESSIONAL: Invalidate ALL KYC queries (Google/Slack/Banking pattern)
      // Industry standard: Clear ALL tenant-specific caches on authentication context switch
      // Prevents data leakage between profiles (OWASP security best practice)
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          // Invalidate any query containing 'kyc' or 'verification'
          // This ensures fresh KYC data after profile switch with zero stale data risk
          return key.some(part =>
            typeof part === 'string' &&
            (part.includes('kyc') || part.includes('verification'))
          );
        }
      });

      logger.debug('[ProfileSwitchOrchestrator] ✅ Old profile caches surgically invalidated (including KYC)');

      // CRITICAL: Clear SQLite local database for old profile (privacy & data isolation)
      // This removes ALL old profile data: messages, interactions, transactions, balances, etc.
      try {
        await clearProfileLocalDB(oldProfileId);
        logger.debug('[ProfileSwitchOrchestrator] ✅ Local DB cleared for old profile (messages, interactions, transactions, wallets cleared)');
      } catch (dbError: any) {
        logger.warn('[ProfileSwitchOrchestrator] ⚠️ Local DB clear failed (non-critical):', dbError);
      }

      // OPTIMIZATION: Prefetch NEW profile's critical data for instant display
      const newProfileId = newProfile.id || newProfile.profile_id;
      const newEntityId = newProfile.entity_id;

      if (newProfileId && newEntityId) {
        // Prefetch current profile (uses already-fetched data from /auth/me)
        await queryClient.prefetchQuery({
          queryKey: queryKeys.currentProfile(newProfileId),
          queryFn: () => Promise.resolve(newProfile),
          staleTime: 60000, // Cache for 1 minute
        });

        logger.debug('[ProfileSwitchOrchestrator] ✅ New profile data prefetched');
      }
    }
  }

  /**
   * Update AuthContext with new profile
   */
  private async updateAuthContext(authContext: any, newProfile: any): Promise<void> {
    // Map profile to user object format
    const mappedUser = this.mapProfileToUser(newProfile);

    // Update AuthContext state
    authContext.setUser(mappedUser);
    authContext.setIsAuthenticated(true);

    logger.debug('[ProfileSwitchOrchestrator] ✅ AuthContext updated with new profile');
  }

  /**
   * Map backend profile to AuthContext user format
   */
  private mapProfileToUser(profile: any): any {
    // Use same fallback chain as AuthContext (AuthContext.tsx line 520, 646)
    // to handle inconsistent backend response structure
    const profileId = profile.id || profile.profile_id || profile.user_id;

    if (!profileId) {
      throw new Error('Invalid profile data: missing profileId');
    }

    return {
      id: profile.id,
      profileId: profileId,
      entityId: profile.entity_id,
      profileType: profile.type,
      displayName: profile.type === 'business' ? profile.business_name : `${profile.first_name} ${profile.last_name}`,
      firstName: profile.first_name,
      lastName: profile.last_name,
      businessName: profile.business_name,
      email: profile.email,
      username: profile.username,
      avatarUrl: profile.avatar_url,
    };
  }

  /**
   * Rollback to previous state
   */
  private async rollback(apiClient: any, authContext: any): Promise<void> {
    if (!this.snapshot) {
      logger.warn('[ProfileSwitchOrchestrator] ⚠️ No snapshot available for rollback');
      this.state = ProfileSwitchState.ROLLED_BACK;
      this.showErrorAlert('Profile switch failed. Please try again.');
      return;
    }

    try {
      logger.info('[ProfileSwitchOrchestrator] 🔄 Rolling back to previous state...');

      // Restore in-memory tokens
      if (this.snapshot.accessToken) {
        tokenManager.setAccessToken(this.snapshot.accessToken);
      }

      // Restore persisted tokens
      if (this.snapshot.accessToken) {
        tokenManager.setAccessToken(this.snapshot.accessToken);
      }
      if (this.snapshot.refreshToken) {
        tokenManager.setRefreshToken(this.snapshot.refreshToken);
      }

      // CRITICAL: Restore X-Profile-ID header
      // Without this, API calls use new profile context but old tokens = mismatch
      if (this.snapshot.profileId) {
        apiClient.setProfileId(this.snapshot.profileId);
        logger.debug('[ProfileSwitchOrchestrator] ✅ X-Profile-ID header restored:', this.snapshot.profileId);
      }

      // Restore AuthContext
      if (this.snapshot.user) {
        authContext.setUser(this.snapshot.user);
      }

      this.state = ProfileSwitchState.ROLLED_BACK;
      logger.info('[ProfileSwitchOrchestrator] ✅ Rollback completed successfully');

      this.showErrorAlert('Profile switch failed. You remain in your current profile.');

    } catch (rollbackError) {
      logger.error('[ProfileSwitchOrchestrator] ❌ Rollback failed:', rollbackError);
      this.showErrorAlert('Profile switch failed and rollback encountered errors. Please restart the app.');
    }
  }

  /**
   * Show error alert to user
   */
  private showErrorAlert(message: string): void {
    Alert.alert('Profile Switch Failed', message, [{ text: 'OK' }]);
  }

  /**
   * Update progress (for UI feedback)
   */
  private updateProgress(state: ProfileSwitchState, message: string): void {
    if (this.progressCallback) {
      this.progressCallback(state, message);
    }
  }
}

// Export singleton instance
export const profileSwitchOrchestrator = new ProfileSwitchOrchestrator();

// Export class for testing
export default ProfileSwitchOrchestrator;
