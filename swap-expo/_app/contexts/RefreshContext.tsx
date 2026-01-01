import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { Vibration } from "react-native";
import logger from "../utils/logger";

/**
 * Professional RefreshContext - Centralized pull-to-refresh management
 *
 * Features (like Revolut/WhatsApp):
 * - Centralized isRefreshing state for UI
 * - Timeout protection (10 second max)
 * - Haptic feedback on pull
 * - Error resilience with try/catch/finally
 * - Double-refresh guard
 * - Register/unregister pattern for screens
 */

interface RefreshContextType {
  // State for UI
  isRefreshing: boolean;
  lastRefreshed: Date | null;

  // Actions
  refresh: () => Promise<void>;
  registerRefreshFn: (key: string, fn: () => Promise<void>) => void;
  unregisterRefreshFn: (key: string) => void;

  // Legacy support (for gradual migration)
  refreshAll: (background?: boolean) => Promise<void>;
  refreshByKey: (key: string, background?: boolean) => Promise<void>;
}

const RefreshContext = createContext<RefreshContextType | null>(null);

const REFRESH_TIMEOUT_MS = 10000; // 10 second max to prevent infinite spinner

/**
 * RefreshProvider - Wrap your app with this for centralized refresh management
 */
export const RefreshProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const refreshFunctions = useRef<Record<string, () => Promise<void>>>({});

  /**
   * Register a screen's refresh function
   */
  const registerRefreshFn = useCallback((key: string, fn: () => Promise<void>) => {
    refreshFunctions.current[key] = fn;
    logger.debug(`Registered refresh function: ${key}`, "data", { totalRegistered: Object.keys(refreshFunctions.current).length });
  }, []);

  /**
   * Unregister when screen unmounts
   */
  const unregisterRefreshFn = useCallback((key: string) => {
    delete refreshFunctions.current[key];
    logger.debug(`Unregistered: ${key}`, 'data');
  }, []);

  /**
   * Main refresh function - called by RefreshControl onRefresh
   * Implements professional patterns:
   * - Double-refresh guard
   * - Haptic feedback
   * - Timeout protection
   * - Error resilience
   */
  const refresh = useCallback(async () => {
    logger.debug("refresh() called", "data", { isRefreshing });

    // Guard against double-refresh
    if (isRefreshing) {
      logger.debug("Already refreshing, skipping", "data");
      return;
    }

    // Check registered functions BEFORE setting isRefreshing
    const keys = Object.keys(refreshFunctions.current);
    logger.debug("Registered refresh keys", "data", { keys });

    if (keys.length === 0) {
      logger.debug("No refresh functions registered, returning early", "data");
      return;
    }

    setIsRefreshing(true);
    logger.debug("Starting refresh", "data");

    // Haptic feedback like Revolut
    try {
      Vibration.vibrate(10);
    } catch {
      // Vibration may not be available on all devices
    }

    logger.debug("Starting refresh for keys", "data", { keys });

    try {
      // Create timeout promise for protection
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Refresh timeout after 10s')), REFRESH_TIMEOUT_MS)
      );

      const refreshPromises = keys.map(async (key) => {
        try {
          logger.debug(`Calling refresh for: ${key}`, "data");
          await refreshFunctions.current[key]();
          logger.debug(`${key} refresh completed`, "data");
        } catch (error) {
          // Log but don't throw - one failing refresh shouldn't break others
          logger.error(`${key} refresh failed`, error, "data");
        }
      });

      // Race against timeout
      await Promise.race([
        Promise.all(refreshPromises),
        timeoutPromise,
      ]);

      setLastRefreshed(new Date());
      logger.debug("All refreshes completed", "data");
    } catch (error) {
      // Timeout or unexpected error
      logger.error("Refresh failed or timed out", error, "data");
    } finally {
      // ALWAYS reset - this is the critical fix for spinner freeze
      logger.debug("Resetting isRefreshing to false", "data");
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  /**
   * Legacy support - refreshAll (for gradual migration)
   */
  const refreshAll = useCallback(async (background = false) => {
    if (!background) {
      await refresh();
    } else {
      // Background refresh - no UI state changes
      const keys = Object.keys(refreshFunctions.current);
      await Promise.all(
        keys.map(async (key) => {
          try {
            await refreshFunctions.current[key]();
          } catch (error) {
            logger.error(`Background refresh ${key} failed`, error, 'data');
          }
        })
      );
    }
  }, [refresh]);

  /**
   * Legacy support - refreshByKey (for gradual migration)
   */
  const refreshByKey = useCallback(async (key: string, background = false) => {
    const fn = refreshFunctions.current[key];
    if (!fn) {
      logger.warn(`No refresh function for key: ${key}`, 'data');
      return;
    }

    if (!background) {
      setIsRefreshing(true);
    }

    try {
      await fn();
      logger.debug(`${key} refreshed successfully`, 'data');
    } catch (error) {
      logger.error(`${key} refresh failed`, error, 'data');
    } finally {
      if (!background) {
        setIsRefreshing(false);
      }
    }
  }, []);

  return (
    <RefreshContext.Provider
      value={{
        isRefreshing,
        lastRefreshed,
        refresh,
        registerRefreshFn,
        unregisterRefreshFn,
        refreshAll,
        refreshByKey,
      }}
    >
      {children}
    </RefreshContext.Provider>
  );
};

/**
 * Hook to access the RefreshContext
 */
export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error("useRefresh must be used within a RefreshProvider");
  }
  return context;
};
