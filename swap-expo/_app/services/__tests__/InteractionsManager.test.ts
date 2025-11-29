/**
 * InteractionsManager Tests
 *
 * Tests singleton pattern, interaction processing, display chat generation,
 * filtering, real-time updates, and event emission.
 */

jest.mock('../../utils/logger');

import { InteractionsManager, getInteractionsManager, DisplayChat } from '../InteractionsManager';
import { InteractionListItem } from '../../types/interaction.types';

// Test data
const testTheme = {
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    success: '#34C759',
    info: '#5AC8FA',
    warning: '#FF9500',
  },
};

const testUser = {
  entityId: 'entity-current',
  firstName: 'John',
  email: 'john@example.com',
};

const testInteraction1: InteractionListItem = {
  id: 'interaction-001',
  name: 'Test Chat',
  is_group: false,
  last_message_snippet: 'Hello there!',
  last_message_at: '2024-01-15T12:00:00Z',
  last_message_sender_id: 'entity-other',
  updated_at: '2024-01-15T12:00:00Z',
  members: [
    { entity_id: 'entity-current', display_name: 'John Doe', entity_type: 'personal' },
    { entity_id: 'entity-other', display_name: 'Jane Smith', entity_type: 'personal' },
  ],
};

const testInteraction2: InteractionListItem = {
  id: 'interaction-002',
  name: 'Business Chat',
  is_group: false,
  last_message_snippet: 'Invoice attached',
  last_message_at: '2024-01-15T14:00:00Z',
  last_message_sender_id: 'entity-business',
  updated_at: '2024-01-15T14:00:00Z',
  members: [
    { entity_id: 'entity-current', display_name: 'John Doe', entity_type: 'personal' },
    { entity_id: 'entity-business', display_name: 'Acme Corp', entity_type: 'business' },
  ],
};

const testGroupInteraction: InteractionListItem = {
  id: 'interaction-003',
  name: 'Team Group',
  is_group: true,
  last_message_snippet: 'Meeting at 3pm',
  last_message_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  members: [
    { entity_id: 'entity-current', display_name: 'John Doe', entity_type: 'personal' },
    { entity_id: 'entity-other', display_name: 'Jane Smith', entity_type: 'personal' },
    { entity_id: 'entity-third', display_name: 'Bob Wilson', entity_type: 'personal' },
  ],
};

describe('InteractionsManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Destroy singleton before each test
    InteractionsManager.destroyInstance();
  });

  afterEach(() => {
    InteractionsManager.destroyInstance();
  });

  // ============================================================
  // SINGLETON TESTS
  // ============================================================

  describe('singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = InteractionsManager.getInstance();
      const instance2 = InteractionsManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should return same instance via getInteractionsManager helper', () => {
      const instance1 = getInteractionsManager();
      const instance2 = getInteractionsManager();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after destroy', () => {
      const instance1 = InteractionsManager.getInstance();
      InteractionsManager.destroyInstance();
      const instance2 = InteractionsManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });

    it('should accept options on first creation', () => {
      const instance = InteractionsManager.getInstance({
        enableOptimisticUpdates: false,
        enableRealTimeReordering: false,
      });

      expect(instance).toBeDefined();
    });
  });

  // ============================================================
  // setUserContext TESTS
  // ============================================================

  describe('setUserContext', () => {
    it('should set user and theme context', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);

      // Context is set - processing should work
      manager.setInteractions([testInteraction1]);
      const chats = manager.getDisplayChats();

      expect(chats).toHaveLength(1);
    });

    it('should not process chats without user context', () => {
      const manager = InteractionsManager.getInstance();
      // No setUserContext called

      manager.setInteractions([testInteraction1]);
      const chats = manager.getDisplayChats();

      expect(chats).toHaveLength(0);
    });
  });

  // ============================================================
  // setInteractions TESTS
  // ============================================================

  describe('setInteractions', () => {
    it('should set interactions and emit update event', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);

      const listener = jest.fn();
      manager.on('interactions:updated', listener);

      manager.setInteractions([testInteraction1, testInteraction2]);

      expect(listener).toHaveBeenCalled();
      expect(manager.getDisplayChats()).toHaveLength(2);
    });

    it('should clear existing interactions before setting new ones', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);

      manager.setInteractions([testInteraction1]);
      expect(manager.getDisplayChats()).toHaveLength(1);

      manager.setInteractions([testInteraction2]);
      expect(manager.getDisplayChats()).toHaveLength(1);
      expect(manager.getDisplayChats()[0].id).toBe('interaction-002');
    });

    it('should skip interactions without id', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);

      const invalidInteraction = { ...testInteraction1, id: '' };
      manager.setInteractions([invalidInteraction, testInteraction2]);

      expect(manager.getDisplayChats()).toHaveLength(1);
    });

    it('should sort interactions by last_message_at (most recent first)', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);

      // Add interactions out of order
      manager.setInteractions([testInteraction1, testInteraction2, testGroupInteraction]);

      const chats = manager.getDisplayChats();
      // testInteraction2 is most recent (14:00), then testInteraction1 (12:00), then group (10:00)
      expect(chats[0].id).toBe('interaction-002');
      expect(chats[1].id).toBe('interaction-001');
      expect(chats[2].id).toBe('interaction-003');
    });
  });

  // ============================================================
  // updateInteraction TESTS
  // ============================================================

  describe('updateInteraction', () => {
    it('should add new interaction', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);

      manager.updateInteraction(testInteraction1);

      expect(manager.getDisplayChats()).toHaveLength(1);
    });

    it('should update existing interaction', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testInteraction1]);

      const updatedInteraction = {
        ...testInteraction1,
        last_message_snippet: 'Updated message',
      };
      manager.updateInteraction(updatedInteraction);

      const chats = manager.getDisplayChats();
      expect(chats[0].message).toBe('Updated message');
    });

    it('should emit both interactions:updated and interaction:updated events', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);

      const listListener = jest.fn();
      const itemListener = jest.fn();
      manager.on('interactions:updated', listListener);
      manager.on('interaction:updated', itemListener);

      manager.updateInteraction(testInteraction1);

      expect(listListener).toHaveBeenCalled();
      expect(itemListener).toHaveBeenCalledWith(testInteraction1);
    });
  });

  // ============================================================
  // updateInteractionPreview TESTS
  // ============================================================

  describe('updateInteractionPreview', () => {
    it('should update preview for existing interaction', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testInteraction1]);

      manager.updateInteractionPreview(
        'interaction-001',
        'New preview message',
        'entity-other',
        '2024-01-15T15:00:00Z'
      );

      const chats = manager.getDisplayChats();
      expect(chats[0].message).toBe('New preview message');
    });

    it('should emit preview-updated event', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testInteraction1]);

      const listener = jest.fn();
      manager.on('interaction:preview-updated', listener);

      manager.updateInteractionPreview(
        'interaction-001',
        'New preview',
        'entity-other',
        '2024-01-15T15:00:00Z'
      );

      expect(listener).toHaveBeenCalledWith({
        interactionId: 'interaction-001',
        snippet: 'New preview',
        timestamp: '2024-01-15T15:00:00Z',
      });
    });

    it('should do nothing for non-existent interaction', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testInteraction1]);

      const listener = jest.fn();
      manager.on('interaction:preview-updated', listener);

      manager.updateInteractionPreview(
        'non-existent',
        'New preview',
        'entity-other',
        '2024-01-15T15:00:00Z'
      );

      expect(listener).not.toHaveBeenCalled();
    });

    it('should reorder chats based on new timestamp', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testInteraction1, testInteraction2]);

      // testInteraction2 is currently first (14:00)
      expect(manager.getDisplayChats()[0].id).toBe('interaction-002');

      // Update testInteraction1 to be more recent
      manager.updateInteractionPreview(
        'interaction-001',
        'Newer message',
        'entity-other',
        '2024-01-15T16:00:00Z'
      );

      // Now testInteraction1 should be first
      expect(manager.getDisplayChats()[0].id).toBe('interaction-001');
    });
  });

  // ============================================================
  // getDisplayChats TESTS
  // ============================================================

  describe('getDisplayChats', () => {
    it('should return empty array when no interactions', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);

      expect(manager.getDisplayChats()).toEqual([]);
    });

    it('should return processed display chats', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testInteraction1]);

      const chats = manager.getDisplayChats();
      expect(chats).toHaveLength(1);
      expect(chats[0]).toHaveProperty('id');
      expect(chats[0]).toHaveProperty('name');
      expect(chats[0]).toHaveProperty('message');
      expect(chats[0]).toHaveProperty('time');
      expect(chats[0]).toHaveProperty('avatar');
    });

    it('should use other member name for non-group chats', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testInteraction1]);

      const chats = manager.getDisplayChats();
      expect(chats[0].name).toBe('Jane Smith');
    });

    it('should use group name for group chats', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testGroupInteraction]);

      const chats = manager.getDisplayChats();
      expect(chats[0].name).toBe('Team Group');
      expect(chats[0].isGroup).toBe(true);
    });
  });

  // ============================================================
  // getFilteredDisplayChats TESTS
  // ============================================================

  describe('getFilteredDisplayChats', () => {
    beforeEach(() => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testInteraction1, testInteraction2, testGroupInteraction]);
    });

    it('should return all chats for "all" filter', () => {
      const manager = InteractionsManager.getInstance();
      const chats = manager.getFilteredDisplayChats('all');
      expect(chats).toHaveLength(3);
    });

    it('should return only friend chats for "friends" filter', () => {
      const manager = InteractionsManager.getInstance();
      const chats = manager.getFilteredDisplayChats('friends');

      chats.forEach((chat) => {
        expect(chat.type).toBe('friend');
      });
    });

    it('should return only business chats for "business" filter', () => {
      const manager = InteractionsManager.getInstance();
      const chats = manager.getFilteredDisplayChats('business');

      chats.forEach((chat) => {
        expect(chat.type).toBe('business');
      });
    });
  });

  // ============================================================
  // getBadgeCounts TESTS
  // ============================================================

  describe('getBadgeCounts', () => {
    it('should return zero counts when no interactions', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);

      const counts = manager.getBadgeCounts();
      expect(counts).toEqual({ all: 0, friends: 0, business: 0 });
    });

    it('should return correct counts by type', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testInteraction1, testInteraction2, testGroupInteraction]);

      const counts = manager.getBadgeCounts();
      expect(counts.all).toBe(3);
      expect(counts.friends + counts.business).toBe(3);
    });
  });

  // ============================================================
  // clear TESTS
  // ============================================================

  describe('clear', () => {
    it('should clear all interactions', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testInteraction1, testInteraction2]);

      manager.clear();

      expect(manager.getDisplayChats()).toHaveLength(0);
    });

    it('should emit cleared and updated events', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testInteraction1]);

      const clearedListener = jest.fn();
      const updatedListener = jest.fn();
      manager.on('interactions:cleared', clearedListener);
      manager.on('interactions:updated', updatedListener);

      manager.clear();

      expect(clearedListener).toHaveBeenCalled();
      expect(updatedListener).toHaveBeenCalledWith([]);
    });
  });

  // ============================================================
  // destroyInstance TESTS
  // ============================================================

  describe('destroyInstance', () => {
    it('should remove all listeners and clear data', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);

      const listener = jest.fn();
      manager.on('interactions:updated', listener);

      // This should trigger the listener (listener added BEFORE setInteractions)
      manager.setInteractions([testInteraction1]);

      InteractionsManager.destroyInstance();

      // Getting new instance and triggering event should not call old listener
      const newManager = InteractionsManager.getInstance();
      newManager.setUserContext(testUser, testTheme);
      newManager.setInteractions([testInteraction2]);

      // Old listener should only have been called once (before destroy)
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should be safe to call multiple times', () => {
      InteractionsManager.destroyInstance();
      InteractionsManager.destroyInstance();
      InteractionsManager.destroyInstance();
      // Should not throw
    });
  });

  // ============================================================
  // EVENT EMITTER TESTS
  // ============================================================

  describe('event emitter', () => {
    it('should add event listeners', () => {
      const manager = InteractionsManager.getInstance();
      const listener = jest.fn();

      manager.on('test:event', listener);
      manager.emit('test:event', 'arg1', 'arg2');

      expect(listener).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should remove specific listener', () => {
      const manager = InteractionsManager.getInstance();
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      manager.on('test:event', listener1);
      manager.on('test:event', listener2);
      manager.removeListener('test:event', listener1);
      manager.emit('test:event');

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should remove all listeners for event', () => {
      const manager = InteractionsManager.getInstance();
      const listener = jest.fn();

      manager.on('test:event', listener);
      manager.removeAllListeners('test:event');
      manager.emit('test:event');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const manager = InteractionsManager.getInstance();
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();

      manager.on('test:event', errorListener);
      manager.on('test:event', goodListener);

      // Should not throw
      manager.emit('test:event');

      // Good listener should still be called
      expect(goodListener).toHaveBeenCalled();
    });
  });

  // ============================================================
  // DISPLAY CHAT PROCESSING TESTS
  // ============================================================

  describe('display chat processing', () => {
    it('should generate initials from name', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testInteraction1]);

      const chats = manager.getDisplayChats();
      // "Jane Smith" should have initials "JS"
      expect(chats[0].avatar).toBe('JS');
    });

    it('should handle single word names', () => {
      const singleNameInteraction: InteractionListItem = {
        ...testInteraction1,
        id: 'single-name',
        members: [
          { entity_id: 'entity-current', display_name: 'John', entity_type: 'personal' },
          { entity_id: 'entity-other', display_name: 'Madonna', entity_type: 'personal' },
        ],
      };

      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([singleNameInteraction]);

      const chats = manager.getDisplayChats();
      expect(chats[0].avatar).toBe('MA');
    });

    it('should assign avatar colors based on name', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testInteraction1, testInteraction2]);

      const chats = manager.getDisplayChats();
      expect(chats[0].avatarColor).toBeDefined();
      expect(chats[1].avatarColor).toBeDefined();
    });

    it('should format time for today as HH:MM', () => {
      const todayInteraction: InteractionListItem = {
        ...testInteraction1,
        id: 'today',
        last_message_at: new Date().toISOString(),
      };

      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([todayInteraction]);

      const chats = manager.getDisplayChats();
      // Should contain colon (time format)
      expect(chats[0].time).toMatch(/:/);
    });

    it('should format time for other days as date', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testInteraction1]); // Has old date

      const chats = manager.getDisplayChats();
      // Should contain month abbreviation
      expect(chats[0].time).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
    });

    it('should handle missing last_message_at', () => {
      const noMessageTimeInteraction: InteractionListItem = {
        ...testInteraction1,
        id: 'no-time',
        last_message_at: undefined,
        updated_at: '2024-01-15T12:00:00Z',
      };

      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([noMessageTimeInteraction]);

      const chats = manager.getDisplayChats();
      expect(chats[0].time).toBeDefined();
    });

    it('should set default message for interactions without snippet', () => {
      const noSnippetInteraction: InteractionListItem = {
        ...testInteraction1,
        id: 'no-snippet',
        last_message_snippet: undefined,
      };

      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([noSnippetInteraction]);

      const chats = manager.getDisplayChats();
      expect(chats[0].message).toBe('Chat started');
    });

    it('should set default message for group without snippet', () => {
      const noSnippetGroup: InteractionListItem = {
        ...testGroupInteraction,
        id: 'no-snippet-group',
        last_message_snippet: undefined,
      };

      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([noSnippetGroup]);

      const chats = manager.getDisplayChats();
      expect(chats[0].message).toBe('Group created');
    });

    it('should handle self chat (only current user as member)', () => {
      const selfChatInteraction: InteractionListItem = {
        ...testInteraction1,
        id: 'self-chat',
        members: [
          { entity_id: 'entity-current', display_name: 'John Doe', entity_type: 'personal' },
        ],
      };

      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([selfChatInteraction]);

      const chats = manager.getDisplayChats();
      expect(chats[0].name).toBe('Self Chat');
    });

    it('should mark business interactions correctly', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testInteraction2]);

      const chats = manager.getDisplayChats();
      expect(chats[0].type).toBe('business');
    });

    it('should mark friend interactions correctly', () => {
      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([testInteraction1]);

      const chats = manager.getDisplayChats();
      expect(chats[0].type).toBe('friend');
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe('edge cases', () => {
    it('should handle empty members array', () => {
      const emptyMembersInteraction: InteractionListItem = {
        ...testInteraction1,
        id: 'empty-members',
        members: [],
      };

      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([emptyMembersInteraction]);

      const chats = manager.getDisplayChats();
      expect(chats[0].name).toBe('Test Chat');
    });

    it('should handle undefined members', () => {
      const noMembersInteraction: InteractionListItem = {
        ...testInteraction1,
        id: 'no-members',
        members: undefined,
      };

      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([noMembersInteraction]);

      const chats = manager.getDisplayChats();
      expect(chats[0].name).toBe('Test Chat');
    });

    it('should handle invalid date string', () => {
      const invalidDateInteraction: InteractionListItem = {
        ...testInteraction1,
        id: 'invalid-date',
        last_message_at: 'not-a-date',
      };

      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([invalidDateInteraction]);

      const chats = manager.getDisplayChats();
      expect(chats[0].time).toBe('Invalid Date');
    });

    it('should handle member with missing display_name', () => {
      const noNameMemberInteraction: InteractionListItem = {
        ...testInteraction1,
        id: 'no-name-member',
        members: [
          { entity_id: 'entity-current', display_name: 'John', entity_type: 'personal' },
          { entity_id: 'entity-other', display_name: '', entity_type: 'personal' },
        ],
      };

      const manager = InteractionsManager.getInstance();
      manager.setUserContext(testUser, testTheme);
      manager.setInteractions([noNameMemberInteraction]);

      const chats = manager.getDisplayChats();
      expect(chats[0].name).toBe('Unknown User');
    });
  });
});
