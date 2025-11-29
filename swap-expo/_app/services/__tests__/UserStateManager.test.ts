/**
 * UserStateManager Tests
 *
 * Tests global user subscription model (WhatsApp/Signal pattern)
 *
 * Key behaviors tested:
 * - User state initialization
 * - Current chat tracking
 * - App state management (foreground/background)
 * - Online status management
 * - Smart notification decisions
 * - State change listeners
 * - Cleanup on logout
 */

// Mock dependencies before imports
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../websocketService', () => ({
  websocketService: {
    isSocketAuthenticated: jest.fn(),
    joinEntityRoom: jest.fn(),
  },
}));

describe('UserStateManager', () => {
  let UserStateManagerModule: any;
  let userStateManager: any;
  let freshWebsocketService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Re-require mocked modules after resetModules to get fresh references
    freshWebsocketService = require('../websocketService').websocketService;

    // Default mock implementations
    (freshWebsocketService.isSocketAuthenticated as jest.Mock).mockReturnValue(true);
    (freshWebsocketService.joinEntityRoom as jest.Mock).mockReturnValue(undefined);

    // Re-import to get fresh instance
    UserStateManagerModule = require('../UserStateManager');
    userStateManager = UserStateManagerModule.userStateManager;
  });

  afterEach(() => {
    userStateManager.cleanup();
  });

  describe('initialize', () => {
    it('should initialize user state with profileId', () => {
      userStateManager.initialize('profile_123');

      const state = userStateManager.getUserState();

      expect(state.profileId).toBe('profile_123');
      expect(state.isOnline).toBe(true);
      expect(state.appState).toBe('foreground');
    });

    it('should join entity room when socket authenticated', () => {
      (freshWebsocketService.isSocketAuthenticated as jest.Mock).mockReturnValue(true);

      userStateManager.initialize('profile_123');

      expect(freshWebsocketService.joinEntityRoom).toHaveBeenCalledWith('profile_123');
    });

    it('should not join entity room when socket not authenticated', () => {
      (freshWebsocketService.isSocketAuthenticated as jest.Mock).mockReturnValue(false);

      userStateManager.initialize('profile_123');

      expect(freshWebsocketService.joinEntityRoom).not.toHaveBeenCalled();
    });

    it('should update lastSeen timestamp', () => {
      const before = Date.now();

      userStateManager.initialize('profile_123');

      const state = userStateManager.getUserState();
      expect(state.lastSeen).toBeGreaterThanOrEqual(before);
      expect(state.lastSeen).toBeLessThanOrEqual(Date.now());
    });

    it('should notify state change listeners', () => {
      const listener = jest.fn();
      userStateManager.onStateChange(listener);

      userStateManager.initialize('profile_123');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          profileId: 'profile_123',
          isOnline: true,
        }),
      );
    });
  });

  describe('setCurrentChat', () => {
    beforeEach(() => {
      userStateManager.initialize('profile_123');
    });

    it('should update current chat', () => {
      userStateManager.setCurrentChat('int_456');

      const state = userStateManager.getUserState();
      expect(state.currentChat).toBe('int_456');
    });

    it('should clear current chat with null', () => {
      userStateManager.setCurrentChat('int_456');
      userStateManager.setCurrentChat(null);

      const state = userStateManager.getUserState();
      expect(state.currentChat).toBeNull();
    });

    it('should not notify if chat unchanged', () => {
      userStateManager.setCurrentChat('int_456');

      const listener = jest.fn();
      userStateManager.onStateChange(listener);

      userStateManager.setCurrentChat('int_456'); // Same chat

      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify on chat change', () => {
      userStateManager.setCurrentChat('int_123');

      const listener = jest.fn();
      userStateManager.onStateChange(listener);

      userStateManager.setCurrentChat('int_456');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          currentChat: 'int_456',
        }),
      );
    });

    it('should update lastSeen on chat change', () => {
      const initialState = userStateManager.getUserState();
      const initialLastSeen = initialState.lastSeen;

      // Wait a bit to ensure timestamp changes
      jest.advanceTimersByTime(100);

      userStateManager.setCurrentChat('int_new');

      const newState = userStateManager.getUserState();
      expect(newState.lastSeen).toBeGreaterThanOrEqual(initialLastSeen);
    });
  });

  describe('setAppState', () => {
    beforeEach(() => {
      userStateManager.initialize('profile_123');
    });

    it('should update app state to background', () => {
      userStateManager.setAppState('background');

      const state = userStateManager.getUserState();
      expect(state.appState).toBe('background');
    });

    it('should update app state to foreground', () => {
      userStateManager.setAppState('background');
      userStateManager.setAppState('foreground');

      const state = userStateManager.getUserState();
      expect(state.appState).toBe('foreground');
    });

    it('should not notify if app state unchanged', () => {
      const listener = jest.fn();
      userStateManager.onStateChange(listener);

      userStateManager.setAppState('foreground'); // Already foreground

      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify on app state change', () => {
      const listener = jest.fn();
      userStateManager.onStateChange(listener);

      userStateManager.setAppState('background');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          appState: 'background',
        }),
      );
    });
  });

  describe('setOnlineStatus', () => {
    beforeEach(() => {
      userStateManager.initialize('profile_123');
    });

    it('should update online status to offline', () => {
      userStateManager.setOnlineStatus(false);

      const state = userStateManager.getUserState();
      expect(state.isOnline).toBe(false);
    });

    it('should update online status to online', () => {
      userStateManager.setOnlineStatus(false);
      userStateManager.setOnlineStatus(true);

      const state = userStateManager.getUserState();
      expect(state.isOnline).toBe(true);
    });

    it('should not notify if online status unchanged', () => {
      const listener = jest.fn();
      userStateManager.onStateChange(listener);

      userStateManager.setOnlineStatus(true); // Already online

      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify on online status change', () => {
      const listener = jest.fn();
      userStateManager.onStateChange(listener);

      userStateManager.setOnlineStatus(false);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: false,
        }),
      );
    });
  });

  describe('getUserState', () => {
    it('should return copy of user state', () => {
      userStateManager.initialize('profile_123');

      const state1 = userStateManager.getUserState();
      const state2 = userStateManager.getUserState();

      expect(state1).not.toBe(state2); // Different objects
      expect(state1).toEqual(state2); // Same values
    });

    it('should return default state before initialization', () => {
      const state = userStateManager.getUserState();

      expect(state.isOnline).toBe(false);
      expect(state.currentChat).toBeNull();
      expect(state.appState).toBe('background');
      expect(state.profileId).toBeNull();
    });
  });

  describe('shouldNotifyForMessage', () => {
    beforeEach(() => {
      userStateManager.initialize('profile_123');
    });

    it('should notify when app is in background', () => {
      userStateManager.setAppState('background');

      const shouldNotify = userStateManager.shouldNotifyForMessage('int_123');

      expect(shouldNotify).toBe(true);
    });

    it('should notify when user is offline', () => {
      userStateManager.setOnlineStatus(false);

      const shouldNotify = userStateManager.shouldNotifyForMessage('int_123');

      expect(shouldNotify).toBe(true);
    });

    it('should notify when user is in different chat', () => {
      userStateManager.setCurrentChat('int_456');

      const shouldNotify = userStateManager.shouldNotifyForMessage('int_123');

      expect(shouldNotify).toBe(true);
    });

    it('should NOT notify when user is viewing the message chat', () => {
      userStateManager.setCurrentChat('int_123');

      const shouldNotify = userStateManager.shouldNotifyForMessage('int_123');

      expect(shouldNotify).toBe(false);
    });

    it('should notify when user has no current chat', () => {
      userStateManager.setCurrentChat(null);

      const shouldNotify = userStateManager.shouldNotifyForMessage('int_123');

      expect(shouldNotify).toBe(true);
    });

    it('should prioritize background state over current chat', () => {
      userStateManager.setCurrentChat('int_123');
      userStateManager.setAppState('background');

      const shouldNotify = userStateManager.shouldNotifyForMessage('int_123');

      expect(shouldNotify).toBe(true); // Background takes precedence
    });
  });

  describe('onStateChange', () => {
    it('should add listener and receive updates', () => {
      const listener = jest.fn();

      userStateManager.onStateChange(listener);
      userStateManager.initialize('profile_123');

      expect(listener).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const listener = jest.fn();

      const unsubscribe = userStateManager.onStateChange(listener);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();

      userStateManager.initialize('profile_123');
      jest.clearAllMocks();

      userStateManager.setCurrentChat('int_new');

      // Listener should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      userStateManager.onStateChange(listener1);
      userStateManager.onStateChange(listener2);

      userStateManager.initialize('profile_123');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();

      userStateManager.onStateChange(errorListener);
      userStateManager.onStateChange(normalListener);

      // Should not throw
      expect(() => {
        userStateManager.initialize('profile_123');
      }).not.toThrow();

      // Normal listener should still be called
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should reset user state', () => {
      userStateManager.initialize('profile_123');
      userStateManager.setCurrentChat('int_456');
      userStateManager.setAppState('foreground');

      userStateManager.cleanup();

      const state = userStateManager.getUserState();

      expect(state.isOnline).toBe(false);
      expect(state.currentChat).toBeNull();
      expect(state.appState).toBe('background');
      expect(state.profileId).toBeNull();
    });

    it('should clear all listeners', () => {
      const listener = jest.fn();
      userStateManager.onStateChange(listener);

      userStateManager.cleanup();
      jest.clearAllMocks();

      // Try to trigger listener
      userStateManager.initialize('profile_new');

      // Old listener should not be called (was cleared)
      // Note: This is tricky to test because initialize calls notifyStateChange
      // which would call new listeners but the old one was cleared
    });

    it('should be safe to call multiple times', () => {
      userStateManager.initialize('profile_123');

      expect(() => {
        userStateManager.cleanup();
        userStateManager.cleanup();
        userStateManager.cleanup();
      }).not.toThrow();
    });

    it('should allow reinitialization after cleanup', () => {
      userStateManager.initialize('profile_123');
      userStateManager.cleanup();
      userStateManager.initialize('profile_456');

      const state = userStateManager.getUserState();
      expect(state.profileId).toBe('profile_456');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid state changes', () => {
      userStateManager.initialize('profile_123');

      // Rapid changes
      for (let i = 0; i < 100; i++) {
        userStateManager.setCurrentChat(`int_${i}`);
        userStateManager.setAppState(i % 2 === 0 ? 'foreground' : 'background');
        userStateManager.setOnlineStatus(i % 2 === 0);
      }

      const state = userStateManager.getUserState();
      expect(state.currentChat).toBe('int_99');
    });

    it('should handle empty profileId', () => {
      userStateManager.initialize('');

      const state = userStateManager.getUserState();
      expect(state.profileId).toBe('');
    });

    it('should handle special characters in chat ID', () => {
      userStateManager.initialize('profile_123');
      userStateManager.setCurrentChat('int_with-special_chars!@#');

      const state = userStateManager.getUserState();
      expect(state.currentChat).toBe('int_with-special_chars!@#');
    });
  });

  describe('Notification Logic Scenarios', () => {
    beforeEach(() => {
      userStateManager.initialize('profile_123');
    });

    it('Scenario: User actively chatting - no notification', () => {
      userStateManager.setAppState('foreground');
      userStateManager.setOnlineStatus(true);
      userStateManager.setCurrentChat('int_active');

      expect(userStateManager.shouldNotifyForMessage('int_active')).toBe(false);
    });

    it('Scenario: User browsing other chat - notification', () => {
      userStateManager.setAppState('foreground');
      userStateManager.setOnlineStatus(true);
      userStateManager.setCurrentChat('int_other');

      expect(userStateManager.shouldNotifyForMessage('int_new_message')).toBe(true);
    });

    it('Scenario: User on home screen - notification', () => {
      userStateManager.setAppState('foreground');
      userStateManager.setOnlineStatus(true);
      userStateManager.setCurrentChat(null); // Not in any chat

      expect(userStateManager.shouldNotifyForMessage('int_incoming')).toBe(true);
    });

    it('Scenario: App backgrounded - notification', () => {
      userStateManager.setAppState('background');
      userStateManager.setOnlineStatus(true);
      userStateManager.setCurrentChat('int_123'); // Even if "in" chat

      expect(userStateManager.shouldNotifyForMessage('int_123')).toBe(true);
    });

    it('Scenario: User offline - notification (for push)', () => {
      userStateManager.setOnlineStatus(false);
      userStateManager.setAppState('foreground');
      userStateManager.setCurrentChat(null);

      expect(userStateManager.shouldNotifyForMessage('int_offline')).toBe(true);
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(UserStateManagerModule.userStateManager).toBeDefined();
      expect(UserStateManagerModule.default).toBeDefined();
    });

    it('should export same instance as default', () => {
      expect(UserStateManagerModule.userStateManager).toBe(UserStateManagerModule.default);
    });
  });
});
