import logger from './logger';

type EventCallback = (payload?: any) => void;

class EventEmitter {
  private listeners: Record<string, Set<EventCallback>> = {};

  on(event: string, callback: EventCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(callback);
    logger.trace(`Listener registered for '${event}'`, 'app', {
      event,
      totalListeners: this.listeners[event].size
    });
  }

  off(event: string, callback: EventCallback) {
    this.listeners[event]?.delete(callback);
    logger.trace(`Listener removed for '${event}'`, 'app', {
      event,
      remainingListeners: this.listeners[event]?.size || 0
    });
  }

  once(event: string, callback: EventCallback) {
    const wrapper = (payload?: any) => {
      callback(payload);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  emit(event: string, payload?: any) {
    const listenerCount = this.listeners[event]?.size || 0;
    logger.trace(`Emitting '${event}' to ${listenerCount} listener(s)`, 'app', {
      event,
      listenerCount,
      hasPayload: !!payload,
      payloadKeys: payload ? Object.keys(payload) : []
    });

    if (listenerCount === 0) {
      logger.trace(`No listeners for '${event}' event (fire-and-forget)`, 'app');
    }

    this.listeners[event]?.forEach(cb => {
      try {
        cb(payload);
      } catch (e) {
        logger.error(`Error in '${event}' listener`, e, 'app');
      }
    });
  }

  removeAllListeners(event: string) {
    if (this.listeners[event]) {
      this.listeners[event].clear();
    }
  }
}

export const eventEmitter = new EventEmitter(); 