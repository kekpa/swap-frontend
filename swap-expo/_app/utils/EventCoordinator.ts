/**
 * EventCoordinator - Professional Navigation-Aware Event System
 *
 * Enterprise-grade event coordination system that prevents authentication
 * race conditions by intelligently managing data events based on navigation
 * state. Replaces the chaotic event-driven approach with coordinated control.
 *
 * Key Features:
 * - Navigation-aware event queuing
 * - Professional event deduplication
 * - Coordinated timing for auth operations
 * - Event priority management
 * - Smart batching and throttling
 *
 * Used by:
 * - UserRepository for KYC data updates
 * - Other repositories for coordinated data events
 * - AuthContext for professional session management
 *
 * @author Claude Code
 * @version 1.0.0
 * @since 2025-09-21
 */

import logger from './logger';
import { navigationStateManager } from './NavigationStateManager';
import { authStateMachine, AuthEvent, AuthTransitionContext } from './AuthStateMachine';

/**
 * Event types that require coordination
 */
export enum CoordinatedEventType {
  DATA_UPDATED = 'data_updated',
  KYC_UPDATED = 'kyc_updated',
  PROFILE_UPDATED = 'profile_updated',
  SESSION_EXPIRED = 'session_expired',
  NETWORK_CHANGED = 'network_changed',
  AUTH_TOKEN_REFRESH = 'auth_token_refresh'
}

/**
 * Event priority levels
 */
export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Professional event interface
 */
export interface CoordinatedEvent {
  id: string;
  type: CoordinatedEventType;
  priority: EventPriority;
  timestamp: number;
  data: any;
  metadata?: Record<string, any>;
  retryCount?: number;
  maxRetries?: number;
  expiresAt?: number;
}

/**
 * Event processing result
 */
export interface EventProcessingResult {
  success: boolean;
  processed: boolean;
  queued: boolean;
  reason?: string;
  error?: Error;
}

/**
 * Event handler function type
 */
export type EventHandler = (event: CoordinatedEvent) => Promise<EventProcessingResult> | EventProcessingResult;

/**
 * Event processing configuration
 */
interface EventConfig {
  maxQueueSize: number;
  defaultExpiration: number;
  batchProcessingInterval: number;
  maxRetries: number;
  priorityThreshold: EventPriority;
  navigationStabilityRequired: boolean;
}

/**
 * Default professional configuration
 */
const DEFAULT_CONFIG: EventConfig = {
  maxQueueSize: 100,
  defaultExpiration: 30000,        // 30 seconds
  batchProcessingInterval: 500,    // 500ms batch processing
  maxRetries: 3,
  priorityThreshold: EventPriority.NORMAL,
  navigationStabilityRequired: true,
};

/**
 * Professional Event Coordinator
 *
 * Manages all data events with navigation awareness to prevent the
 * authentication race conditions that cause navigation glitches.
 */
class EventCoordinator {
  private config: EventConfig;
  private eventQueue: CoordinatedEvent[] = [];
  private eventHandlers: Map<CoordinatedEventType, EventHandler> = new Map();
  private processingTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private eventHistory: Array<{ event: CoordinatedEvent; result: EventProcessingResult; timestamp: number }> = [];

  constructor(config: Partial<EventConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startBatchProcessing();

    logger.debug('[EventCoordinator] 🏗️ Professional event coordinator initialized', {
      config: this.config
    });
  }

  /**
   * Register an event handler for a specific event type
   */
  registerHandler(eventType: CoordinatedEventType, handler: EventHandler): void {
    this.eventHandlers.set(eventType, handler);

    logger.debug('[EventCoordinator] 📝 Event handler registered', {
      eventType,
      totalHandlers: this.eventHandlers.size
    });
  }

  /**
   * Professional event emission with coordination
   */
  async emitEvent(
    type: CoordinatedEventType,
    data: any,
    options: {
      priority?: EventPriority;
      metadata?: Record<string, any>;
      maxRetries?: number;
      expiresIn?: number;
      immediate?: boolean;
    } = {}
  ): Promise<EventProcessingResult> {
    const event: CoordinatedEvent = {
      id: this.generateEventId(),
      type,
      priority: options.priority || EventPriority.NORMAL,
      timestamp: Date.now(),
      data,
      metadata: options.metadata,
      retryCount: 0,
      maxRetries: options.maxRetries || this.config.maxRetries,
      expiresAt: options.expiresIn ? Date.now() + options.expiresIn : Date.now() + this.config.defaultExpiration
    };

    logger.debug('[EventCoordinator] 📡 Event emitted', {
      eventId: event.id,
      type: event.type,
      priority: event.priority,
      immediate: options.immediate,
      navigationState: navigationStateManager.getState()
    });

    // Handle immediate processing for critical events
    if (options.immediate || event.priority === EventPriority.CRITICAL) {
      return await this.processEventImmediate(event);
    }

    // Check if we can process now based on navigation state
    const canProcessNow = this.canProcessEvents();

    if (canProcessNow) {
      return await this.processEventImmediate(event);
    } else {
      // Queue for later processing
      return this.queueEvent(event);
    }
  }

  /**
   * Emit data updated event (most common use case)
   */
  async emitDataUpdated(
    dataType: 'kyc' | 'profile' | 'user' | 'transaction',
    data: any,
    metadata?: Record<string, any>
  ): Promise<EventProcessingResult> {
    // Map data types to coordinated event types
    const eventTypeMap = {
      kyc: CoordinatedEventType.KYC_UPDATED,
      profile: CoordinatedEventType.PROFILE_UPDATED,
      user: CoordinatedEventType.DATA_UPDATED,
      transaction: CoordinatedEventType.DATA_UPDATED
    };

    const eventType = eventTypeMap[dataType] || CoordinatedEventType.DATA_UPDATED;

    return await this.emitEvent(eventType, data, {
      priority: dataType === 'kyc' ? EventPriority.HIGH : EventPriority.NORMAL,
      metadata: {
        dataType,
        ...metadata
      }
    });
  }

  /**
   * Process event immediately (bypassing queue)
   */
  private async processEventImmediate(event: CoordinatedEvent): Promise<EventProcessingResult> {
    const handler = this.eventHandlers.get(event.type);

    if (!handler) {
      logger.warn('[EventCoordinator] ⚠️ No handler for event type', {
        eventId: event.id,
        type: event.type
      });

      return {
        success: false,
        processed: false,
        queued: false,
        reason: 'No handler registered'
      };
    }

    try {
      const result = await handler(event);

      logger.debug('[EventCoordinator] ✅ Event processed immediately', {
        eventId: event.id,
        type: event.type,
        result
      });

      this.recordEventResult(event, result);
      return result;

    } catch (error) {
      logger.error('[EventCoordinator] ❌ Error processing event immediately', {
        eventId: event.id,
        type: event.type,
        error: error.message
      });

      const result: EventProcessingResult = {
        success: false,
        processed: false,
        queued: false,
        error: error as Error,
        reason: 'Processing error'
      };

      this.recordEventResult(event, result);
      return result;
    }
  }

  /**
   * Queue event for later processing
   */
  private queueEvent(event: CoordinatedEvent): EventProcessingResult {
    // Check queue size limit
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      // Remove oldest low-priority events to make room
      this.eventQueue = this.eventQueue
        .filter(e => e.priority >= EventPriority.NORMAL)
        .slice(-this.config.maxQueueSize + 1);

      logger.warn('[EventCoordinator] ⚠️ Event queue full, removed old low-priority events');
    }

    // Insert event based on priority
    this.insertEventByPriority(event);

    logger.debug('[EventCoordinator] 📥 Event queued', {
      eventId: event.id,
      type: event.type,
      priority: event.priority,
      queueSize: this.eventQueue.length
    });

    return {
      success: true,
      processed: false,
      queued: true,
      reason: 'Navigation state prevents immediate processing'
    };
  }

  /**
   * Insert event into queue based on priority
   */
  private insertEventByPriority(event: CoordinatedEvent): void {
    let insertIndex = this.eventQueue.length;

    for (let i = 0; i < this.eventQueue.length; i++) {
      if (this.eventQueue[i].priority < event.priority) {
        insertIndex = i;
        break;
      }
    }

    this.eventQueue.splice(insertIndex, 0, event);
  }

  /**
   * Check if events can be processed based on navigation state
   */
  private canProcessEvents(): boolean {
    const navigationState = navigationStateManager.getState();
    const authCanProcess = authStateMachine.canPerformAuthOperation();

    const canProcess = !navigationState.isTransitioning &&
                      navigationState.isStable &&
                      authCanProcess &&
                      (!this.config.navigationStabilityRequired ||
                       (Date.now() - navigationState.lastRouteChange) > 1000);

    if (!canProcess) {
      logger.debug('[EventCoordinator] 🚫 Event processing blocked', {
        navigationState: {
          isTransitioning: navigationState.isTransitioning,
          isStable: navigationState.isStable,
          timeSinceLastChange: Date.now() - navigationState.lastRouteChange
        },
        authCanProcess,
        queueSize: this.eventQueue.length
      });
    }

    return canProcess;
  }

  /**
   * Start batch processing timer
   */
  private startBatchProcessing(): void {
    this.processingTimer = setInterval(() => {
      this.processBatch();
    }, this.config.batchProcessingInterval);
  }

  /**
   * Process a batch of queued events
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    if (!this.canProcessEvents()) {
      return;
    }

    this.isProcessing = true;

    try {
      const now = Date.now();
      const validEvents = this.eventQueue.filter(event => event.expiresAt! > now);
      const expiredEvents = this.eventQueue.filter(event => event.expiresAt! <= now);

      // Remove expired events
      if (expiredEvents.length > 0) {
        logger.debug('[EventCoordinator] 🗑️ Removing expired events', {
          expiredCount: expiredEvents.length
        });
      }

      this.eventQueue = validEvents;

      // Process up to 5 events per batch
      const eventsToProcess = this.eventQueue.splice(0, 5);

      if (eventsToProcess.length > 0) {
        logger.debug('[EventCoordinator] 🔄 Processing event batch', {
          batchSize: eventsToProcess.length,
          remainingQueue: this.eventQueue.length
        });

        for (const event of eventsToProcess) {
          await this.processQueuedEvent(event);
        }
      }

    } catch (error) {
      logger.error('[EventCoordinator] ❌ Error in batch processing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single queued event with retry logic
   */
  private async processQueuedEvent(event: CoordinatedEvent): Promise<void> {
    const handler = this.eventHandlers.get(event.type);

    if (!handler) {
      logger.warn('[EventCoordinator] ⚠️ No handler for queued event', {
        eventId: event.id,
        type: event.type
      });
      return;
    }

    try {
      const result = await handler(event);

      if (result.success) {
        logger.debug('[EventCoordinator] ✅ Queued event processed successfully', {
          eventId: event.id,
          type: event.type
        });

        this.recordEventResult(event, result);
      } else {
        // Retry logic
        await this.handleEventFailure(event, result.error);
      }

    } catch (error) {
      await this.handleEventFailure(event, error as Error);
    }
  }

  /**
   * Handle event processing failure with retry logic
   */
  private async handleEventFailure(event: CoordinatedEvent, error: Error): Promise<void> {
    event.retryCount = (event.retryCount || 0) + 1;

    if (event.retryCount <= event.maxRetries!) {
      logger.debug('[EventCoordinator] 🔄 Retrying failed event', {
        eventId: event.id,
        type: event.type,
        retryCount: event.retryCount,
        maxRetries: event.maxRetries
      });

      // Re-queue with exponential backoff
      setTimeout(() => {
        this.queueEvent(event);
      }, Math.pow(2, event.retryCount) * 1000);

    } else {
      logger.error('[EventCoordinator] ❌ Event failed after max retries', {
        eventId: event.id,
        type: event.type,
        retryCount: event.retryCount,
        error: error.message
      });

      this.recordEventResult(event, {
        success: false,
        processed: true,
        queued: false,
        error,
        reason: 'Max retries exceeded'
      });
    }
  }

  /**
   * Record event processing result for debugging
   */
  private recordEventResult(event: CoordinatedEvent, result: EventProcessingResult): void {
    this.eventHistory.push({
      event,
      result,
      timestamp: Date.now()
    });

    // Keep only last 50 events for memory efficiency
    if (this.eventHistory.length > 50) {
      this.eventHistory = this.eventHistory.slice(-50);
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get queue status for debugging
   */
  getQueueStatus(): {
    queueSize: number;
    isProcessing: boolean;
    canProcessEvents: boolean;
    eventsByPriority: Record<string, number>;
    oldestEvent?: { id: string; age: number };
  } {
    const eventsByPriority = this.eventQueue.reduce((acc, event) => {
      const priority = EventPriority[event.priority];
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const oldestEvent = this.eventQueue.length > 0 ? {
      id: this.eventQueue[this.eventQueue.length - 1].id,
      age: Date.now() - this.eventQueue[this.eventQueue.length - 1].timestamp
    } : undefined;

    return {
      queueSize: this.eventQueue.length,
      isProcessing: this.isProcessing,
      canProcessEvents: this.canProcessEvents(),
      eventsByPriority,
      oldestEvent
    };
  }

  /**
   * Get processing history for debugging
   */
  getProcessingHistory(): Array<{ event: CoordinatedEvent; result: EventProcessingResult; timestamp: number }> {
    return [...this.eventHistory];
  }

  /**
   * Subscribe to data update events (for AuthContext and other consumers)
   * Professional event subscription pattern
   */
  onDataUpdated(handler: (eventType: string, data: any, metadata?: Record<string, any>) => void): () => void {
    // Register handlers for all data-related event types
    const dataEventTypes = [
      CoordinatedEventType.DATA_UPDATED,
      CoordinatedEventType.KYC_UPDATED,
      CoordinatedEventType.PROFILE_UPDATED
    ];

    const eventHandler: EventHandler = (event: CoordinatedEvent) => {
      // Extract data type from metadata or derive from event type
      let eventType = 'data';
      if (event.metadata?.dataType) {
        eventType = event.metadata.dataType;
      } else {
        // Map event types to data types
        switch (event.type) {
          case CoordinatedEventType.KYC_UPDATED:
            eventType = 'kyc';
            break;
          case CoordinatedEventType.PROFILE_UPDATED:
            eventType = 'profile';
            break;
          case CoordinatedEventType.DATA_UPDATED:
            eventType = event.metadata?.dataType || 'user';
            break;
        }
      }

      try {
        handler(eventType, event.data, event.metadata);
        return { success: true, processed: true, queued: false };
      } catch (error) {
        logger.error('[EventCoordinator] ❌ Error in onDataUpdated handler:', error);
        return {
          success: false,
          processed: false,
          queued: false,
          error: error as Error
        };
      }
    };

    // Register the handler for all data event types
    dataEventTypes.forEach(eventType => {
      this.eventHandlers.set(eventType, eventHandler);
    });

    logger.debug('[EventCoordinator] 📝 onDataUpdated subscription registered');

    // Return unsubscribe function
    return () => {
      dataEventTypes.forEach(eventType => {
        this.eventHandlers.delete(eventType);
      });
      logger.debug('[EventCoordinator] 🗑️ onDataUpdated subscription removed');
    };
  }

  /**
   * Professional cleanup
   */
  destroy(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    this.eventQueue = [];
    this.eventHandlers.clear();
    this.eventHistory = [];

    logger.debug('[EventCoordinator] 🧹 Event coordinator destroyed');
  }
}

// Export singleton instance for global use
export const eventCoordinator = new EventCoordinator();

export default EventCoordinator;