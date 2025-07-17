type EventCallback = (payload?: any) => void;

class EventEmitter {
  private listeners: Record<string, Set<EventCallback>> = {};

  on(event: string, callback: EventCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(callback);
  }

  off(event: string, callback: EventCallback) {
    this.listeners[event]?.delete(callback);
  }

  once(event: string, callback: EventCallback) {
    const wrapper = (payload?: any) => {
      callback(payload);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  emit(event: string, payload?: any) {
    this.listeners[event]?.forEach(cb => {
      try { cb(payload); } catch (e) { /* swallow */ }
    });
  }

  removeAllListeners(event: string) {
    if (this.listeners[event]) {
      this.listeners[event].clear();
    }
  }
}

export const eventEmitter = new EventEmitter(); 