/**
 * Refresh management related types for the frontend
 */

// Refresh state for a specific area
export interface RefreshState {
  isRefreshing: boolean;
  lastRefreshed: number | null;
  error: Error | null;
}

// Refresh areas in the app
export enum RefreshArea {
  BALANCES = 'balances',
  TRANSACTIONS = 'transactions',
  PROFILE = 'profile', 
  NOTIFICATIONS = 'notifications',
  ALL = 'all'
}

// RefreshManager interface for the context
export interface RefreshManager {
  isRefreshing: boolean;
  refreshAreas: Record<RefreshArea, RefreshState>;
  refresh: (areas?: RefreshArea[]) => Promise<void>;
  startRefresh: (area: RefreshArea) => void;
  finishRefresh: (area: RefreshArea, error?: Error) => void;
  getRefreshState: (area: RefreshArea) => RefreshState;
  shouldRefresh: (area: RefreshArea, threshold?: number) => boolean;
}

// Props for the refresh provider component
export interface RefreshProviderProps {
  children: React.ReactNode;
  refreshThreshold?: number; // Time in ms that should pass before refreshing again
} 