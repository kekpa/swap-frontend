/**
 * LoadingOrchestrator - Professional Loading State Management
 *
 * Enterprise-grade loading coordination system that prevents white flashes
 * and loading state conflicts by intelligently managing all loading states
 * across authentication, navigation, and data operations.
 *
 * Key Features:
 * - Centralized loading state management
 * - Auth-to-app transition coordination
 * - Navigation-aware loading decisions
 * - Professional loading state deduplication
 * - Smooth transition orchestration
 *
 * Fixes:
 * - White flash after login completion
 * - Loading state conflicts during navigation
 * - Uncoordinated auth-to-app transitions
 * - Multiple loading indicators showing simultaneously
 */
import logger from './logger';

/**
 * Used by:
 * - AuthContext for login/logout transitions
 * - LoadingScreen for unified loading display
 * - UserRepository for data loading coordination
 * - Navigation components for transition management
 *
 * @author Claude Code
 * @version 1.0.0
 * @since 2025-09-21
 */

import { navigationStateManager } from './NavigationStateManager';
import { authStateMachine, AuthState } from './AuthStateMachine';

/**
 * Loading operation types for professional tracking
 */
export enum LoadingOperationType {
  // Authentication operations
  LOGIN = 'login',
  LOGOUT = 'logout',
  SESSION_REFRESH = 'session_refresh',
  SESSION_RESTORE = 'session_restore',

  // Data operations
  USER_DATA = 'user_data',
  KYC_DATA = 'kyc_data',
  PROFILE_DATA = 'profile_data',
  INTERACTIONS_DATA = 'interactions_data',

  // Navigation operations
  ROUTE_TRANSITION = 'route_transition',
  APP_INITIALIZATION = 'app_initialization',

  // General operations
  NETWORK_REQUEST = 'network_request',
  FILE_UPLOAD = 'file_upload'
}

/**
 * Loading priority levels
 */
export enum LoadingPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Loading operation interface
 */
export interface LoadingOperation {
  id: string;
  type: LoadingOperationType;
  priority: LoadingPriority;
  timestamp: number;
  description: string;
  metadata?: Record<string, any>;
  expiresAt?: number;
  blockingOperation?: boolean;
}

/**
 * Loading state interface
 */
export interface LoadingState {
  isLoading: boolean;
  activeOperations: LoadingOperation[];
  primaryOperation: LoadingOperation | null;
  canShowUI: boolean;
  shouldShowSplash: boolean;
  transitionPhase: TransitionPhase;
}

/**
 * Transition phases for smooth auth-to-app flow
 */
export enum TransitionPhase {
  NONE = 'none',
  AUTH_COMPLETING = 'auth_completing',
  DATA_LOADING = 'data_loading',
  UI_PREPARING = 'ui_preparing',
  TRANSITION_COMPLETE = 'transition_complete'
}

/**
 * Loading configuration
 */
interface LoadingConfig {
  maxConcurrentOperations: number;
  defaultExpiration: number;
  transitionDelay: number;
  splashMinimumDuration: number;
  uiPreparationDelay: number;
}

/**
 * Default professional configuration
 */
const DEFAULT_CONFIG: LoadingConfig = {
  maxConcurrentOperations: 5,
  defaultExpiration: 30000,        // 30 seconds
  transitionDelay: 300,            // 300ms smooth transition
  splashMinimumDuration: 1000,     // 1 second minimum splash (industry standard)
  uiPreparationDelay: 150,         // 150ms UI preparation
};

/**
 * Loading state change listener
 */
export type LoadingStateListener = (state: LoadingState) => void;

/**
 * Professional Loading Orchestrator
 *
 * Manages all loading states with navigation and authentication awareness
 * to prevent white flashes and loading conflicts.
 */
class LoadingOrchestrator {
  private config: LoadingConfig;
  private operations: Map<string, LoadingOperation> = new Map();
  private listeners: LoadingStateListener[] = [];
  private transitionPhase: TransitionPhase = TransitionPhase.NONE;
  private splashStartTime: number | null = null;
  private lastStateChange: number = 0;

  constructor(config: Partial<LoadingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.setupAuthStateListener();
    this.setupNavigationListener();

    logger.debug('[LoadingOrchestrator] 🏗️ Professional loading orchestrator initialized', {
      config: this.config
    });
  }

  /**
   * Start a loading operation
   */
  startOperation(
    type: LoadingOperationType,
    description: string,
    options: {
      priority?: LoadingPriority;
      metadata?: Record<string, any>;
      expiresIn?: number;
      blockingOperation?: boolean;
      id?: string;
    } = {}
  ): string {
    const operation: LoadingOperation = {
      id: options.id || this.generateOperationId(),
      type,
      priority: options.priority || LoadingPriority.NORMAL,
      timestamp: Date.now(),
      description,
      metadata: options.metadata,
      expiresAt: options.expiresIn ? Date.now() + options.expiresIn : Date.now() + this.config.defaultExpiration,
      blockingOperation: options.blockingOperation || false
    };

    this.operations.set(operation.id, operation);

    logger.debug('[LoadingOrchestrator] 🚀 Loading operation started', {
      id: operation.id,
      type: operation.type,
      description: operation.description,
      priority: operation.priority
    });

    this.updateLoadingState();
    return operation.id;
  }

  /**
   * Complete a loading operation
   */
  completeOperation(operationId: string): void {
    const operation = this.operations.get(operationId);

    if (operation) {
      this.operations.delete(operationId);

      logger.debug('[LoadingOrchestrator] ✅ Loading operation completed', {
        id: operationId,
        type: operation.type,
        duration: Date.now() - operation.timestamp
      });

      this.updateLoadingState();
    }
  }

  /**
   * Professional auth-to-app transition coordination
   * This prevents the white flash after login
   */
  async coordinateAuthToAppTransition(): Promise<void> {
    logger.debug('[LoadingOrchestrator] 🔄 Starting auth-to-app transition coordination');

    this.transitionPhase = TransitionPhase.AUTH_COMPLETING;
    this.splashStartTime = Date.now();

    // Start blocking operation to prevent UI updates
    const transitionId = this.startOperation(
      LoadingOperationType.APP_INITIALIZATION,
      'Coordinating auth-to-app transition',
      {
        priority: LoadingPriority.CRITICAL,
        blockingOperation: true,
        id: 'auth_to_app_transition'
      }
    );

    try {
      // Phase 1: Auth completion
      this.transitionPhase = TransitionPhase.AUTH_COMPLETING;
      this.notifyStateChange();

      await this.waitForMinimumSplashDuration();

      // Phase 2: Data loading
      this.transitionPhase = TransitionPhase.DATA_LOADING;
      this.notifyStateChange();

      await this.waitForDataOperations();

      // Phase 3: UI preparation
      this.transitionPhase = TransitionPhase.UI_PREPARING;
      this.notifyStateChange();

      await this.delay(this.config.uiPreparationDelay);

      // Phase 4: Transition complete
      this.transitionPhase = TransitionPhase.TRANSITION_COMPLETE;
      this.notifyStateChange();

      await this.delay(this.config.transitionDelay);

      // Complete the transition
      this.transitionPhase = TransitionPhase.NONE;
      this.completeOperation(transitionId);

      logger.debug('[LoadingOrchestrator] ✅ Auth-to-app transition completed successfully');

    } catch (error) {
      logger.error('[LoadingOrchestrator] ❌ Error in auth-to-app transition:', error);
      this.transitionPhase = TransitionPhase.NONE;
      this.completeOperation(transitionId);
    }
  }

  /**
   * Check if UI should be shown (prevents white flash)
   */
  canShowUI(): boolean {
    const navigationState = navigationStateManager.getState();
    const authState = authStateMachine.getCurrentState();
    const hasBlockingOperations = Array.from(this.operations.values())
      .some(op => op.blockingOperation);

    const canShow = !hasBlockingOperations &&
                    !navigationState.isTransitioning &&
                    authState !== AuthState.INITIALIZING &&
                    this.transitionPhase === TransitionPhase.NONE;

    logger.trace("canShowUI() check", "navigation", {
      hasBlockingOperations,
      isTransitioning: navigationState.isTransitioning,
      authState,
      transitionPhase: this.transitionPhase,
      result: canShow
    });

    return canShow;
  }

  /**
   * Check if splash screen should be shown
   */
  shouldShowSplash(): boolean {
    const authState = authStateMachine.getCurrentState();
    const hasAuthOperations = Array.from(this.operations.values())
      .some(op => [
        LoadingOperationType.LOGIN,
        LoadingOperationType.SESSION_REFRESH,
        LoadingOperationType.SESSION_RESTORE,
        LoadingOperationType.APP_INITIALIZATION
      ].includes(op.type));

    return authState === AuthState.INITIALIZING ||
           hasAuthOperations ||
           this.transitionPhase !== TransitionPhase.NONE;
  }

  /**
   * Get current loading state
   */
  getLoadingState(): LoadingState {
    const activeOperations = Array.from(this.operations.values())
      .filter(op => op.expiresAt! > Date.now())
      .sort((a, b) => b.priority - a.priority);

    const primaryOperation = activeOperations.length > 0 ? activeOperations[0] : null;

    return {
      isLoading: activeOperations.length > 0,
      activeOperations,
      primaryOperation,
      canShowUI: this.canShowUI(),
      shouldShowSplash: this.shouldShowSplash(),
      transitionPhase: this.transitionPhase
    };
  }

  /**
   * Subscribe to loading state changes
   */
  onStateChange(listener: LoadingStateListener): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Setup auth state listener for coordination
   */
  private setupAuthStateListener(): void {
    authStateMachine.onStateChange((newState, context) => {
      switch (newState) {
        case AuthState.AUTHENTICATED:
          if (context.event === 'login_success') {
            // Coordinate smooth transition after login
            this.coordinateAuthToAppTransition();
          }
          break;

        case AuthState.UNAUTHENTICATED:
          // Clear all operations on logout
          this.operations.clear();
          this.transitionPhase = TransitionPhase.NONE;
          this.updateLoadingState();
          break;
      }
    });
  }

  /**
   * Setup navigation listener for coordination
   */
  private setupNavigationListener(): void {
    navigationStateManager.addEventListener((event) => {
      // Clean up expired operations during navigation changes
      this.cleanupExpiredOperations();
    });
  }

  /**
   * Update loading state and notify listeners
   */
  private updateLoadingState(): void {
    this.lastStateChange = Date.now();
    this.cleanupExpiredOperations();
    this.notifyStateChange();
  }

  /**
   * Notify all listeners of state change
   */
  private notifyStateChange(): void {
    const state = this.getLoadingState();

    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        logger.error('[LoadingOrchestrator] Error in state change listener:', error);
      }
    });
  }

  /**
   * Clean up expired operations
   */
  private cleanupExpiredOperations(): void {
    const now = Date.now();
    const expiredOperations: string[] = [];

    for (const [id, operation] of this.operations) {
      if (operation.expiresAt! <= now) {
        expiredOperations.push(id);
      }
    }

    expiredOperations.forEach(id => {
      this.operations.delete(id);
      logger.debug('[LoadingOrchestrator] 🗑️ Expired operation removed', { id });
    });
  }

  /**
   * Wait for minimum splash duration to prevent flash
   */
  private async waitForMinimumSplashDuration(): Promise<void> {
    if (!this.splashStartTime) return;

    const elapsed = Date.now() - this.splashStartTime;
    const remaining = this.config.splashMinimumDuration - elapsed;

    if (remaining > 0) {
      await this.delay(remaining);
    }
  }

  /**
   * Wait for critical data operations to complete
   */
  private async waitForDataOperations(): Promise<void> {
    const maxWait = 5000; // 5 seconds max
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const hasDataOperations = Array.from(this.operations.values())
        .some(op => [
          LoadingOperationType.USER_DATA,
          LoadingOperationType.PROFILE_DATA
        ].includes(op.type));

      if (!hasDataOperations) break;

      await this.delay(100);
    }
  }

  /**
   * Professional delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `loading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get debug information
   */
  getDebugInfo(): Record<string, any> {
    return {
      activeOperations: this.operations.size,
      transitionPhase: this.transitionPhase,
      canShowUI: this.canShowUI(),
      shouldShowSplash: this.shouldShowSplash(),
      operationTypes: Array.from(this.operations.values()).map(op => op.type),
      lastStateChange: new Date(this.lastStateChange).toISOString()
    };
  }

  /**
   * Professional cleanup
   */
  destroy(): void {
    this.operations.clear();
    this.listeners = [];
    this.transitionPhase = TransitionPhase.NONE;
    this.splashStartTime = null;

    logger.debug('[LoadingOrchestrator] 🧹 Loading orchestrator destroyed');
  }
}

// Export singleton instance for global use
export const loadingOrchestrator = new LoadingOrchestrator();

export default LoadingOrchestrator;