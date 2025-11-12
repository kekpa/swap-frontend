type EventCallback = (payload?: any) => void;

class EventEmitter {
  private listeners: Record<string, Set<EventCallback>> = {};

  on(event: string, callback: EventCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(callback);
    console.log(`🔥🔥🔥 [EventEmitter] LISTENER REGISTERED for '${event}':`, {
      event,
      totalListeners: this.listeners[event].size,
      timestamp: new Date().toISOString()
    });
  }

  off(event: string, callback: EventCallback) {
    this.listeners[event]?.delete(callback);
    console.log(`🔥🔥🔥 [EventEmitter] LISTENER REMOVED for '${event}':`, {
      event,
      remainingListeners: this.listeners[event]?.size || 0,
      timestamp: new Date().toISOString()
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
    console.log(`🔥🔥🔥 [EventEmitter] EMITTING '${event}' to ${listenerCount} listener(s):`, {
      event,
      listenerCount,
      hasPayload: !!payload,
      payloadKeys: payload ? Object.keys(payload) : [],
      timestamp: new Date().toISOString()
    });

    if (listenerCount === 0) {
      console.log(`🔥🔥🔥 [EventEmitter] ℹ️ INFO: No listeners for '${event}' event (fire-and-forget)`);
    }

    this.listeners[event]?.forEach(cb => {
      try {
        cb(payload);
      } catch (e) {
        console.error(`🔥🔥🔥 [EventEmitter] ❌ Error in '${event}' listener:`, e);
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