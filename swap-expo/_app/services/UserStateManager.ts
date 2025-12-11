/**
 * UserStateManager - Global User Subscription Model
 * 
 * 🚀 PHASE 2.1: Professional messaging architecture like WhatsApp/Signal
 * 
 * Instead of complex room management, users subscribe to ONE global channel
 * and we track user state for smart message delivery and notifications.
 * 
 * Architecture Benefits:
 * - Single subscription per user (scales to millions)
 * - No complex room joining/leaving
 * - Smart notification logic based on user state
 * - WhatsApp/Messenger-level reliability
 */

import logger from '../utils/logger';
import { websocketService } from './websocketService';
import { profileContextManager, ProfileSwitchStartData, ProfileSwitchCompleteData } from './ProfileContextManager';

interface UserState {
  isOnline: boolean;
  currentChat: string | null; // Current chat/interaction ID user is viewing
  appState: 'foreground' | 'background';
  lastSeen: number;
  profileId: string | null;
}

class UserStateManager {
  private userState: UserState = {
    isOnline: false,
    currentChat: null,
    appState: 'background',
    lastSeen: Date.now(),
    profileId: null,
  };

  private stateChangeListeners: Array<(state: UserState) => void> = [];

  // Profile switch safety
  private unsubscribeSwitchStart: (() => void) | null = null;
  private unsubscribeSwitchComplete: (() => void) | null = null;

  constructor() {
    // Subscribe to profile switch events
    this.subscribeToProfileSwitch();
  }

  /**
   * Subscribe to profile switch events to rejoin correct WebSocket room
   *
   * CRITICAL: When profile switches, user must join the new entity's room
   * to receive messages/notifications for the correct profile.
   */
  private subscribeToProfileSwitch(): void {
    // On profile switch START: Clear current state
    this.unsubscribeSwitchStart = profileContextManager.onSwitchStart((data: ProfileSwitchStartData) => {
      logger.info('[UserStateManager] 🔄 Profile switch starting - clearing current state');

      // Clear current chat context (user shouldn't stay in old profile's chat)
      this.userState = {
        ...this.userState,
        currentChat: null,
        profileId: null,
      };

      logger.debug('[UserStateManager] ✅ State cleared for profile switch');
    });

    // On profile switch COMPLETE: Reinitialize with new profile
    this.unsubscribeSwitchComplete = profileContextManager.onSwitchComplete((data: ProfileSwitchCompleteData) => {
      logger.info(`[UserStateManager] ✅ Profile switch complete - reinitializing (${data.profileType})`);

      // Reinitialize with new profile's entity ID
      this.initialize(data.entityId);
    });

    // On profile switch FAILED: Resume with old context (no action needed)
    profileContextManager.onSwitchFailed(() => {
      logger.warn('[UserStateManager] ⚠️ Profile switch failed - keeping old context');
    });
  }

  /**
   * Initialize user state and global subscription
   */
  initialize(profileId: string): void {
    logger.debug(`[UserStateManager] 🚀 Initializing global user subscription: ${profileId}`);
    
    this.userState = {
      ...this.userState,
      profileId,
      isOnline: true,
      appState: 'foreground',
      lastSeen: Date.now(),
    };

    // 🚀 GLOBAL SUBSCRIPTION: Join user's entity room for ALL messages (unified personal/business)
    // This is the only room the user needs to join
    if (websocketService.isSocketAuthenticated()) {
      // Note: For UserStateManager, we assume profileId is actually entityId for backward compatibility
      // This will be properly fixed when we update all callers to pass entityId
      websocketService.joinEntityRoom(profileId);
      logger.info(`[UserStateManager] ✅ Global subscription established: entity:${profileId}`);
    } else {
      logger.warn('[UserStateManager] ⚠️ Cannot establish global subscription - socket not authenticated');
    }

    this.notifyStateChange();
  }

  /**
   * Update which chat the user is currently viewing
   * Used for smart notification decisions
   */
  setCurrentChat(chatId: string | null): void {
    if (this.userState.currentChat !== chatId) {
      logger.debug(`[UserStateManager] 📱 User switched chat: ${this.userState.currentChat} → ${chatId}`);
      
      this.userState = {
        ...this.userState,
        currentChat: chatId,
        lastSeen: Date.now(),
      };

      this.notifyStateChange();
    }
  }

  /**
   * Update app state (foreground/background)
   */
  setAppState(appState: 'foreground' | 'background'): void {
    if (this.userState.appState !== appState) {
      logger.debug(`[UserStateManager] 📱 App state changed: ${this.userState.appState} → ${appState}`);
      
      this.userState = {
        ...this.userState,
        appState,
        lastSeen: Date.now(),
      };

      this.notifyStateChange();
    }
  }

  /**
   * Update online status
   */
  setOnlineStatus(isOnline: boolean): void {
    if (this.userState.isOnline !== isOnline) {
      logger.debug(`[UserStateManager] 🌐 Online status: ${this.userState.isOnline} → ${isOnline}`);
      
      this.userState = {
        ...this.userState,
        isOnline,
        lastSeen: Date.now(),
      };

      this.notifyStateChange();
    }
  }

  /**
   * Get current user state
   */
  getUserState(): UserState {
    return { ...this.userState };
  }

  /**
   * Check if user should receive a notification for a message
   * Professional logic like WhatsApp/Signal
   */
  shouldNotifyForMessage(messageInteractionId: string): boolean {
    const state = this.getUserState();

    // Always notify if app is in background
    if (state.appState === 'background') {
      logger.debug(`[UserStateManager] 🔔 Should notify: app in background`);
      return true;
    }

    // Always notify if user is offline
    if (!state.isOnline) {
      logger.debug(`[UserStateManager] 🔔 Should notify: user offline`);
      return true;
    }

    // Notify if user is in a different chat
    if (state.currentChat !== messageInteractionId) {
      logger.debug(`[UserStateManager] 🔔 Should notify: different chat (current: ${state.currentChat}, message: ${messageInteractionId})`);
      return true;
    }

    // Don't notify if user is actively viewing the chat
    logger.debug(`[UserStateManager] 🔕 No notification: user viewing chat ${messageInteractionId}`);
    return false;
  }

  /**
   * Subscribe to user state changes
   */
  onStateChange(listener: (state: UserState) => void): () => void {
    this.stateChangeListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.stateChangeListeners.indexOf(listener);
      if (index > -1) {
        this.stateChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Cleanup on logout
   */
  cleanup(): void {
    logger.debug('[UserStateManager] 🧹 Cleaning up user state');

    this.userState = {
      isOnline: false,
      currentChat: null,
      appState: 'background',
      lastSeen: Date.now(),
      profileId: null,
    };

    // Unsubscribe from profile switch events
    if (this.unsubscribeSwitchStart) {
      this.unsubscribeSwitchStart();
      this.unsubscribeSwitchStart = null;
    }
    if (this.unsubscribeSwitchComplete) {
      this.unsubscribeSwitchComplete();
      this.unsubscribeSwitchComplete = null;
    }

    this.stateChangeListeners = [];
  }

  /**
   * Reset all internal state - primarily for testing
   * @internal
   */
  reset(): void {
    this.userState = {
      isOnline: false,
      currentChat: null,
      appState: 'background',
      lastSeen: Date.now(),
      profileId: null,
    };
    this.stateChangeListeners = [];
    logger.debug('[UserStateManager] Reset completed');
  }

  private notifyStateChange(): void {
    const state = this.getUserState();
    this.stateChangeListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        logger.error('[UserStateManager] Error in state change listener:', error);
      }
    });

    // 🚀 PHASE 2.2: Log state for smart notification debugging
    logger.debug('[UserStateManager] 📊 User state updated:', {
      isOnline: state.isOnline,
      currentChat: state.currentChat,
      appState: state.appState,
      profileId: state.profileId,
    });
  }
}

// Export singleton instance
export const userStateManager = new UserStateManager();
export default userStateManager;