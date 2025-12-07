/**
 * NavigationStateManager - Professional Navigation State Tracking
 *
 * Enterprise-grade navigation awareness system that prevents authentication
 * operations during navigation transitions. Follows Netflix/Uber patterns
 * for navigation-aware state management.
 *
 * Key Features:
 * - Real-time navigation state tracking
 * - Transition detection and protection
 * - Route change timing analysis
 * - Professional debouncing for rapid state changes
 *
 * Usage:
 * - Call updateNavigationState() from RootNavigator
 * - Check canPerformAuthOperation() before auth operations
 * - Use isTransitioning() to prevent conflicting operations
 *
 * @author Claude Code
 * @version 1.0.0
 * @since 2025-09-21
 */

import { NavigationState as RNNavigationState } from '@react-navigation/native';
import logger from './logger';

/**
 * Professional navigation state interface
 */
export interface NavigationState {
  isTransitioning: boolean;
  currentRoute: string;
  previousRoute: string | null;
  pendingNavigation: boolean;
  lastRouteChange: number;
  routeChangeCount: number;
  isStable: boolean;
}

/**
 * Navigation event types for professional tracking
 */
export enum NavigationEventType {
  ROUTE_CHANGE = 'route_change',
  TRANSITION_START = 'transition_start',
  TRANSITION_END = 'transition_end',
  NAVIGATION_READY = 'navigation_ready',
  RAPID_CHANGES_DETECTED = 'rapid_changes_detected'
}

/**
 * Professional navigation event interface
 */
export interface NavigationEvent {
  type: NavigationEventType;
  route: string;
  timestamp: number;
  transitionDuration?: number;
  metadata?: Record<string, any>;
}

/**
 * Configuration for navigation state management
 */
interface NavigationConfig {
  transitionTimeout: number;        // Max time for a transition
  stabilityWindow: number;          // Time to consider navigation "stable"
  rapidChangeThreshold: number;     // Min time between changes to avoid rapid changes
  maxTransitionDuration: number;    // Maximum expected transition time
}

/**
 * Default professional configuration
 */
const DEFAULT_CONFIG: NavigationConfig = {
  transitionTimeout: 1000,          // 1 second max transition
  stabilityWindow: 500,             // 500ms stability window
  rapidChangeThreshold: 100,        // 100ms minimum between changes
  maxTransitionDuration: 2000,      // 2 second max transition
};

/**
 * Professional Navigation State Manager
 *
 * Centralized navigation state tracking that prevents authentication
 * race conditions through deterministic navigation awareness.
 */
class NavigationStateManager {
  private state: NavigationState;
  private config: NavigationConfig;
  private transitionTimer: NodeJS.Timeout | null = null;
  private stabilityTimer: NodeJS.Timeout | null = null;
  private eventListeners: Array<(event: NavigationEvent) => void> = [];

  constructor(config: Partial<NavigationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      isTransitioning: false,
      currentRoute: 'Unknown',
      previousRoute: null,
      pendingNavigation: false,
      lastRouteChange: 0,
      routeChangeCount: 0,
      isStable: true,
    };

    logger.debug('[NavigationStateManager] 🏗️ Professional navigation state manager initialized');
  }

  /**
   * Update navigation state from React Navigation
   * Call this from RootNavigator's onStateChange
   */
  updateNavigationState(navigationState: RNNavigationState | undefined): void {
    if (!navigationState) return;

    const currentRoute = this.extractCurrentRoute(navigationState);
    const now = Date.now();
    const timeSinceLastChange = now - this.state.lastRouteChange;

    // Detect rapid navigation changes (potential glitch indicator)
    if (timeSinceLastChange < this.config.rapidChangeThreshold && this.state.lastRouteChange > 0) {
      logger.warn('[NavigationStateManager] ⚠️ Rapid navigation changes detected', {
        timeSinceLastChange,
        currentRoute,
        previousRoute: this.state.currentRoute,
        threshold: this.config.rapidChangeThreshold
      });

      this.emitEvent({
        type: NavigationEventType.RAPID_CHANGES_DETECTED,
        route: currentRoute,
        timestamp: now,
        metadata: { timeSinceLastChange, threshold: this.config.rapidChangeThreshold }
      });
    }

    // Update state
    const previousRoute = this.state.currentRoute;
    this.state = {
      ...this.state,
      currentRoute,
      previousRoute: currentRoute !== previousRoute ? previousRoute : this.state.previousRoute,
      lastRouteChange: now,
      routeChangeCount: this.state.routeChangeCount + 1,
      isStable: false,
    };

    // Handle route change
    if (currentRoute !== previousRoute) {
      this.handleRouteChange(currentRoute, previousRoute, now);
    }

    // Set stability timer
    this.clearStabilityTimer();
    this.stabilityTimer = setTimeout(() => {
      this.state.isStable = true;
      logger.debug('[NavigationStateManager] ✅ Navigation stabilized', {
        route: this.state.currentRoute,
        duration: Date.now() - this.state.lastRouteChange
      });
    }, this.config.stabilityWindow);
  }

  /**
   * Professional route change handler
   */
  private handleRouteChange(newRoute: string, oldRoute: string, timestamp: number): void {
    logger.debug('[NavigationStateManager] 🔄 Route change detected', {
      from: oldRoute,
      to: newRoute,
      timestamp,
      isTransitioning: this.state.isTransitioning
    });

    // Start transition tracking
    this.startTransition(newRoute, timestamp);

    // Emit route change event
    this.emitEvent({
      type: NavigationEventType.ROUTE_CHANGE,
      route: newRoute,
      timestamp,
      metadata: { previousRoute: oldRoute }
    });
  }

  /**
   * Start transition tracking with timeout protection
   */
  private startTransition(route: string, timestamp: number): void {
    console.log('🔀 [NavigationStateManager] startTransition() - isTransitioning=true', { route });
    this.state.isTransitioning = true;
    this.state.pendingNavigation = false;

    // Clear any existing transition timer
    this.clearTransitionTimer();

    // Set transition timeout
    this.transitionTimer = setTimeout(() => {
      logger.debug('[NavigationStateManager] Transition timeout reached (this is normal for slower devices)', {
        route,
        duration: Date.now() - timestamp,
        maxDuration: this.config.transitionTimeout
      });

      this.endTransition(route, Date.now());
    }, this.config.transitionTimeout);

    // Emit transition start event
    this.emitEvent({
      type: NavigationEventType.TRANSITION_START,
      route,
      timestamp
    });

    // Auto-end transition after reasonable time
    setTimeout(() => {
      if (this.state.isTransitioning) {
        this.endTransition(route, Date.now());
      }
    }, Math.min(this.config.maxTransitionDuration, this.config.transitionTimeout));
  }

  /**
   * End transition tracking
   */
  private endTransition(route: string, timestamp: number): void {
    const transitionDuration = timestamp - this.state.lastRouteChange;

    console.log('🔀 [NavigationStateManager] endTransition() - isTransitioning=false', { route, transitionDuration });
    this.state.isTransitioning = false;
    this.clearTransitionTimer();

    logger.debug('[NavigationStateManager] ✅ Transition completed', {
      route,
      duration: transitionDuration
    });

    // Emit transition end event
    this.emitEvent({
      type: NavigationEventType.TRANSITION_END,
      route,
      timestamp,
      transitionDuration
    });
  }

  /**
   * Professional safety check for auth operations
   * This is the key method that prevents navigation glitches
   */
  canPerformAuthOperation(reason?: string): boolean {
    const can = !this.state.isTransitioning &&
                !this.state.pendingNavigation &&
                this.state.isStable &&
                (Date.now() - this.state.lastRouteChange) > this.config.stabilityWindow;

    logger.debug('[NavigationStateManager] 🔐 Auth operation check', {
      reason: reason || 'unknown',
      canPerform: can,
      state: {
        isTransitioning: this.state.isTransitioning,
        pendingNavigation: this.state.pendingNavigation,
        isStable: this.state.isStable,
        timeSinceLastChange: Date.now() - this.state.lastRouteChange,
        requiredStability: this.config.stabilityWindow
      }
    });

    return can;
  }

  /**
   * Check if navigation is currently transitioning
   */
  isTransitioning(): boolean {
    return this.state.isTransitioning;
  }

  /**
   * Get current navigation state (read-only)
   */
  getState(): Readonly<NavigationState> {
    return { ...this.state };
  }

  /**
   * Mark navigation as pending (e.g., before programmatic navigation)
   */
  setPendingNavigation(pending: boolean, reason?: string): void {
    this.state.pendingNavigation = pending;

    logger.debug('[NavigationStateManager] 📍 Pending navigation state changed', {
      pending,
      reason: reason || 'unknown',
      currentRoute: this.state.currentRoute
    });
  }

  /**
   * Professional event emission system
   */
  private emitEvent(event: NavigationEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error('[NavigationStateManager] Error in event listener:', error);
      }
    });
  }

  /**
   * Subscribe to navigation events
   */
  addEventListener(listener: (event: NavigationEvent) => void): () => void {
    this.eventListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index !== -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Extract current route from React Navigation state
   */
  private extractCurrentRoute(state: RNNavigationState): string {
    const route = state.routes[state.index];

    if (route.state) {
      // Nested navigator - recurse
      return this.extractCurrentRoute(route.state as RNNavigationState);
    }

    return route.name;
  }

  /**
   * Cleanup timers
   */
  private clearTransitionTimer(): void {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
  }

  private clearStabilityTimer(): void {
    if (this.stabilityTimer) {
      clearTimeout(this.stabilityTimer);
      this.stabilityTimer = null;
    }
  }

  /**
   * Professional cleanup
   */
  destroy(): void {
    this.clearTransitionTimer();
    this.clearStabilityTimer();
    this.eventListeners = [];

    logger.debug('[NavigationStateManager] 🧹 Navigation state manager destroyed');
  }
}

// Export singleton instance for global use
export const navigationStateManager = new NavigationStateManager();

export default NavigationStateManager;