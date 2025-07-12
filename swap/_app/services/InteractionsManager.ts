// Created: InteractionsManager service for centralized interactions list business logic - 2025-01-24

import { InteractionListItem } from '../types/interaction.types';
import logger from '../utils/logger';

// Simple EventEmitter implementation for React Native
class SimpleEventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, listener: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  removeListener(event: string, listener: Function): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }

  emit(event: string, ...args: any[]): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
}

export interface InteractionsManagerOptions {
  enableOptimisticUpdates?: boolean;
  enableRealTimeReordering?: boolean;
}

export interface DisplayChat {
  id: string;
  name: string;
  message: string;
  time: string;
  avatar: string;
  avatarColor?: string;
  isVerified?: boolean;
  isGroup?: boolean;
  hasChecked?: boolean;
  sender?: string;
  type?: 'friend' | 'business';
}

export class InteractionsManager extends SimpleEventEmitter {
  private static instance: InteractionsManager | null = null;
  private interactions = new Map<string, InteractionListItem>();
  private displayChats: DisplayChat[] = [];
  private options: InteractionsManagerOptions;
  private currentUser: any = null;
  private theme: any = null;

  private constructor(options: InteractionsManagerOptions = {}) {
    super();
    this.options = {
      enableOptimisticUpdates: true,
      enableRealTimeReordering: true,
      ...options,
    };
  }

  /**
   * Get or create the InteractionsManager singleton instance
   */
  static getInstance(options?: InteractionsManagerOptions): InteractionsManager {
    if (!this.instance) {
      this.instance = new InteractionsManager(options);
    }
    return this.instance;
  }

  /**
   * Set the current user context for interaction processing
   */
  setUserContext(user: any, theme: any): void {
    this.currentUser = user;
    this.theme = theme;
  }

  /**
   * Set interactions from API or local storage
   */
  setInteractions(interactions: InteractionListItem[]): void {
    logger.debug(`[InteractionsManager] Setting ${interactions.length} interactions`, 'interactions_manager');
    
    // Clear existing interactions
    this.interactions.clear();
    
    // Add new interactions
    interactions.forEach(interaction => {
      if (interaction.id) {
        this.interactions.set(interaction.id, interaction);
      }
    });
    
    // Reprocess display chats
    this.processDisplayChats();
    
    // Emit update event
    this.emit('interactions:updated', this.getDisplayChats());
  }

  /**
   * Add or update a single interaction
   */
  updateInteraction(interaction: InteractionListItem): void {
    logger.debug(`[InteractionsManager] Updating interaction ${interaction.id}`, 'interactions_manager');
    
    this.interactions.set(interaction.id, interaction);
    this.processDisplayChats();
    this.emit('interactions:updated', this.getDisplayChats());
    this.emit('interaction:updated', interaction);
  }

  /**
   * Update interaction preview (for real-time message updates)
   */
  updateInteractionPreview(interactionId: string, snippet: string, senderEntityId: string, timestamp: string): void {
    const interaction = this.interactions.get(interactionId);
    if (!interaction) return;

    logger.debug(`[InteractionsManager] Updating preview for ${interactionId}`, 'interactions_manager');
    
    const updatedInteraction: InteractionListItem = {
      ...interaction,
      last_message_snippet: snippet,
      last_message_sender_id: senderEntityId,
      last_message_at: timestamp,
    };

    this.interactions.set(interactionId, updatedInteraction);
    this.processDisplayChats();
    this.emit('interactions:updated', this.getDisplayChats());
    this.emit('interaction:preview-updated', { interactionId, snippet, timestamp });
  }

  /**
   * Get processed display chats
   */
  getDisplayChats(): DisplayChat[] {
    return this.displayChats;
  }

  /**
   * Get display chats filtered by type
   */
  getFilteredDisplayChats(filter: 'all' | 'friends' | 'business'): DisplayChat[] {
    if (filter === 'all') {
      return this.displayChats;
    }
    
    return this.displayChats.filter(chat => {
      if (filter === 'friends') return chat.type === 'friend';
      if (filter === 'business') return chat.type === 'business';
      return true;
    });
  }

  /**
   * Get badge counts for tabs
   */
  getBadgeCounts(): { all: number; friends: number; business: number } {
    const friends = this.displayChats.filter(chat => chat.type === 'friend').length;
    const business = this.displayChats.filter(chat => chat.type === 'business').length;
    
    return {
      all: this.displayChats.length,
      friends,
      business,
    };
  }

  /**
   * Clear all interactions
   */
  clear(): void {
    this.interactions.clear();
    this.displayChats = [];
    this.emit('interactions:cleared');
    this.emit('interactions:updated', []);
  }

  /**
   * Private: Process interactions into display chats
   */
  private processDisplayChats(): void {
    if (!this.currentUser || !this.theme) {
      logger.warn('[InteractionsManager] Cannot process display chats without user context', 'interactions_manager');
      return;
    }

    const interactions = Array.from(this.interactions.values());
    
    // Sort by last_message_at for real-time reordering
    const sortedInteractions = [...interactions].sort((a, b) => {
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime; // Most recent first
    });

    this.displayChats = sortedInteractions.map((interaction): DisplayChat => {
      let chatName = interaction.name || 'Group Chat';
      let avatarText = '??';
      let interactionType: 'friend' | 'business' = 'friend';
      let avatarColor = this.theme.colors.primary;

      if (!interaction.is_group && interaction.members && interaction.members.length > 0) {
        const otherMember = interaction.members.find(
          (member) => member.entity_id !== this.currentUser.entityId
        );

        if (otherMember) {
          chatName = otherMember.display_name || 'Unknown User';
          avatarText = this.getInitials(chatName);
          const charCode = chatName.charCodeAt(0);
          const colorPalette = [
            this.theme.colors.primary, 
            this.theme.colors.secondary, 
            this.theme.colors.success, 
            this.theme.colors.info, 
            this.theme.colors.warning
          ];
          avatarColor = colorPalette[charCode % colorPalette.length];
          interactionType = otherMember.entity_type === 'business' ? 'business' : 'friend';
        } else {
          chatName = 'Self Chat';
          avatarText = this.currentUser.firstName ? 
            this.getInitials(this.currentUser.firstName) : 
            (this.currentUser.email ? this.currentUser.email.substring(0,2).toUpperCase() : 'ME');
        }
      } else if (interaction.is_group) {
        avatarText = this.getInitials(interaction.name || 'Group');
        interactionType = 'business';
      }

      const messageSnippet = interaction.last_message_snippet || 
        (interaction.is_group ? 'Group created' : 'Chat started');
      const lastMessageTime = interaction.last_message_at || interaction.updated_at || '';

      return {
        id: interaction.id,
        name: chatName,
        message: messageSnippet,
        time: this.formatTime(lastMessageTime),
        avatar: avatarText,
        avatarColor: avatarColor,
        isGroup: interaction.is_group,
        type: interactionType,
      };
    });

    logger.debug(`[InteractionsManager] Processed ${this.displayChats.length} display chats`, 'interactions_manager');
  }

  /**
   * Private: Get initials from name
   */
  private getInitials(name: string): string {
    if (!name) return '??';
    
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Private: Format time for display
   */
  private formatTime(isoString?: string): string {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Invalid Date';
    }
  }

  /**
   * Cleanup when no longer needed
   */
  static destroyInstance(): void {
    if (this.instance) {
      this.instance.removeAllListeners();
      this.instance.clear();
      this.instance = null;
      logger.debug('[InteractionsManager] Destroyed instance', 'interactions_manager');
    }
  }
}

// Export singleton getter for easy access
export const getInteractionsManager = (options?: InteractionsManagerOptions) => 
  InteractionsManager.getInstance(options); 