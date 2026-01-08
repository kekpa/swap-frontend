/**
 * SmartNotificationHandler - Professional notification logic
 * 
 * 🚀 PHASE 2.2: WhatsApp/Signal-level smart notifications
 * 
 * Handles intelligent notification decisions based on user state:
 * - App background → Always notify
 * - Different chat → Notify  
 * - Same chat → Silent (user sees message directly)
 * - WebSocket failed → Fallback to push notification
 */

import logger from '../utils/logger';
import { userStateManager } from './UserStateManager';
import { pushNotificationService } from './PushNotificationService';

interface MessageEvent {
  id: string;
  interaction_id: string;
  content: string;
  from_entity_id: string;
  created_at: string;
  message_type?: string;
}

interface NotificationDecision {
  shouldNotify: boolean;
  reason: string;
  notificationType: 'none' | 'silent' | 'sound' | 'push';
}

class SmartNotificationHandler {
  /**
   * Determine if and how to notify user about a new message
   */
  evaluateNotification(message: MessageEvent): NotificationDecision {
    const userState = userStateManager.getUserState();
    
    logger.debug('[SmartNotificationHandler] 🤔 Evaluating notification for message', 'notifications', {
      messageId: message.id,
      interactionId: message.interaction_id,
      userCurrentChat: userState.currentChat,
      userAppState: userState.appState,
      userOnline: userState.isOnline,
    });

    // 1. App in background → Always notify with push
    if (userState.appState === 'background') {
      return {
        shouldNotify: true,
        reason: 'App in background',
        notificationType: 'push',
      };
    }

    // 2. User offline → Always notify (for when they come back)
    if (!userState.isOnline) {
      return {
        shouldNotify: true,
        reason: 'User offline',
        notificationType: 'push',
      };
    }

    // 3. User in different chat → Notify with sound
    if (userState.currentChat && userState.currentChat !== message.interaction_id) {
      return {
        shouldNotify: true,
        reason: `User in different chat (current: ${userState.currentChat})`,
        notificationType: 'sound',
      };
    }

    // 4. User on interactions list → Notify with sound
    if (!userState.currentChat) {
      return {
        shouldNotify: true,
        reason: 'User on interactions list',
        notificationType: 'sound',
      };
    }

    // 5. User actively viewing the same chat → Silent (they see it directly)
    if (userState.currentChat === message.interaction_id) {
      return {
        shouldNotify: false,
        reason: 'User actively viewing chat',
        notificationType: 'silent',
      };
    }

    // Fallback: notify
    return {
      shouldNotify: true,
      reason: 'Fallback decision',
      notificationType: 'sound',
    };
  }

  /**
   * Handle message notification based on evaluation
   */
  handleMessageNotification(message: MessageEvent): void {
    const decision = this.evaluateNotification(message);
    
    logger.info('[SmartNotificationHandler] 🔔 Notification decision', 'notifications', {
      messageId: message.id,
      shouldNotify: decision.shouldNotify,
      reason: decision.reason,
      type: decision.notificationType,
    });

    if (!decision.shouldNotify) {
      return;
    }

    switch (decision.notificationType) {
      case 'push':
        this.sendPushNotification(message);
        break;
      case 'sound':
        this.playNotificationSound(message);
        break;
      case 'silent':
        // Already handled above
        break;
      default:
        logger.warn('[SmartNotificationHandler] Unknown notification type: ' + decision.notificationType, 'app');
    }
  }

  /**
   * Send push notification (for background/offline scenarios)
   * 🚀 PHASE 2.4: Expo Push Notifications implementation
   */
  private async sendPushNotification(message: MessageEvent): Promise<void> {
    try {
      logger.debug('[SmartNotificationHandler] 📱 Sending push notification', 'notifications', {
        messageId: message.id,
        content: message.content.substring(0, 50) + '...',
      });

      const userState = userStateManager.getUserState();
      
      // Determine notification title and body
      const title = 'New message'; // TODO: Get sender name from message
      const body = this.formatNotificationBody(message);
      
      const notificationPayload = {
        title,
        body,
        data: {
          interactionId: message.interaction_id,
          messageId: message.id,
          fromEntityId: message.from_entity_id,
          messageType: message.message_type || 'text',
        },
        sound: true,
        priority: 'high' as const,
        badge: 1, // Set badge count for push notifications
      };

      // Send via appropriate method based on app state
      if (userState.appState === 'background') {
        // App in background - request backend push notification
        await pushNotificationService.requestBackendPushNotification(notificationPayload);
      } else {
        // App in foreground - send local notification
        await pushNotificationService.sendLocalNotification(notificationPayload);
      }

    } catch (error) {
      logger.error('[SmartNotificationHandler] Failed to send push notification', error, 'app');
    }
  }

  /**
   * Play notification sound (for foreground scenarios)
   */
  private async playNotificationSound(message: MessageEvent): Promise<void> {
    try {
      logger.debug('[SmartNotificationHandler] 🔊 Playing notification sound', 'notifications', {
        messageId: message.id,
      });

      // Send local notification for foreground scenarios
      const title = 'New message'; // TODO: Get sender name
      const body = this.formatNotificationBody(message);
      
      await pushNotificationService.sendLocalNotification({
        title,
        body,
        data: {
          interactionId: message.interaction_id,
          messageId: message.id,
          fromEntityId: message.from_entity_id,
          messageType: message.message_type || 'text',
        },
        sound: true,
        priority: 'normal',
        badge: 1, // Set badge count for local notifications
      });

      logger.debug('[SmartNotificationHandler] Notification sound played via local notification', 'app');
      
    } catch (error) {
      logger.error('[SmartNotificationHandler] Failed to play notification sound', error, 'app');
    }
  }

  /**
   * Format notification body text
   */
  private formatNotificationBody(message: MessageEvent): string {
    const maxLength = 100;
    let body = message.content;

    // Handle different message types
    switch (message.message_type) {
      case 'image':
        body = '📷 Image';
        break;
      case 'file':
        body = '📎 File';
        break;
      case 'transaction':
        body = '💰 Payment';
        break;
      default:
        // Truncate long text messages
        if (body.length > maxLength) {
          body = body.substring(0, maxLength) + '...';
        }
    }

    return body;
  }

  /**
   * Handle special notification scenarios
   */
  handleSpecialNotifications = {
    /**
     * WebSocket delivery failed - force push notification
     */
    websocketFailed: (message: MessageEvent) => {
      logger.warn('[SmartNotificationHandler] WebSocket delivery failed, forcing push notification', 'app');
      this.sendPushNotification(message);
    },

    /**
     * User hasn't seen message after timeout - remind notification
     */
    unseenMessageReminder: (message: MessageEvent, timeoutMs: number = 30000) => {
      setTimeout(() => {
        const userState = userStateManager.getUserState();
        
        // If user still not viewing the chat, send reminder
        if (userState.currentChat !== message.interaction_id) {
          logger.info('[SmartNotificationHandler] Unseen message reminder', 'app');
          this.playNotificationSound(message);
        }
      }, timeoutMs);
    },
  };
}

// Export singleton instance
export const smartNotificationHandler = new SmartNotificationHandler();
export default smartNotificationHandler;