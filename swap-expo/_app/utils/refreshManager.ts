import { useCallback, useRef } from "react";

/**
 * Type definition for refresh functions
 * All refresh functions should return a Promise<void>
 */
type RefreshFunction = (background?: boolean) => Promise<void>;

/**
 * Interface for the RefreshManager
 */
interface RefreshManager {
  registerRefresh: (key: string, refreshFn: RefreshFunction) => void;
  unregisterRefresh: (key: string) => void;
  refreshAll: (background?: boolean) => Promise<void>;
  refreshByKey: (key: string, background?: boolean) => Promise<void>;
}

/**
 * Hook to create and manage a RefreshManager
 * This allows components to register their refresh functions
 * and provides a way to refresh all or specific components
 */
export const useRefreshManager = (): RefreshManager => {
  // Store all refresh functions in a ref to avoid re-renders
  const refreshFunctions = useRef<Record<string, RefreshFunction>>({});

  /**
   * Register a refresh function with a unique key
   */
  const registerRefresh = useCallback(
    (key: string, refreshFn: RefreshFunction) => {
      refreshFunctions.current[key] = refreshFn;
      console.log(
        `[INFO] [RefreshManager] Registered refresh function: ${key}`
      );
    },
    []
  );

  /**
   * Unregister a refresh function by key
   */
  const unregisterRefresh = useCallback((key: string) => {
    if (refreshFunctions.current[key]) {
      delete refreshFunctions.current[key];
      console.log(
        `[INFO] [RefreshManager] Unregistered refresh function: ${key}`
      );
    }
  }, []);

  /**
   * Refresh all registered components
   * @param background Whether to refresh in the background (without showing loading indicators)
   */
  const refreshAll = useCallback(async (background = true) => {
    console.log(
      `[INFO] [RefreshManager] Refreshing all components (background: ${background})`
    );
    const keys = Object.keys(refreshFunctions.current);

    if (keys.length === 0) {
      console.log("[INFO] [RefreshManager] No refresh functions registered");
      return;
    }

    try {
      const promises = keys.map((key) => {
        console.log(`[INFO] [RefreshManager] Refreshing: ${key}`);
        return refreshFunctions.current[key](background);
      });

      await Promise.all(promises);
      console.log("[INFO] [RefreshManager] All refreshes completed");
    } catch (error) {
      console.error(
        "[ERROR] [RefreshManager] Error refreshing components:",
        error
      );
    }
  }, []);

  /**
   * Refresh a specific component by key
   * @param key The key of the component to refresh
   * @param background Whether to refresh in the background (without showing loading indicators)
   */
  const refreshByKey = useCallback(async (key: string, background = true) => {
    console.log(
      `[INFO] [RefreshManager] Refreshing component: ${key} (background: ${background})`
    );

    const fn = refreshFunctions.current[key];
    if (fn) {
      try {
        await fn(background);
        console.log(`[INFO] [RefreshManager] Refresh completed for: ${key}`);
      } catch (error) {
        console.error(
          `[ERROR] [RefreshManager] Error refreshing component ${key}:`,
          error
        );
      }
    } else {
      console.warn(
        `[WARN] [RefreshManager] No refresh function found for key: ${key}`
      );
    }
  }, []);

  return {
    registerRefresh,
    unregisterRefresh,
    refreshAll,
    refreshByKey,
  };
};
