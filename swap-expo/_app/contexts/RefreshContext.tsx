import React, { createContext, useContext } from "react";
import { useRefreshManager } from "../utils/refreshManager";

// Use the actual interface from the implementation
interface RefreshManager {
  registerRefresh: (key: string, refreshFn: (background?: boolean) => Promise<void>) => void;
  unregisterRefresh: (key: string) => void;
  refreshAll: (background?: boolean) => Promise<void>;
  refreshByKey: (key: string, background?: boolean) => Promise<void>;
}

/**
 * Create a context for the RefreshManager
 */
const RefreshContext = createContext<RefreshManager | null>(null);

/**
 * Provider component for the RefreshManager
 * This should be placed high in the component tree
 */
export const RefreshProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const refreshManager = useRefreshManager();

  return (
    <RefreshContext.Provider value={refreshManager}>
      {children}
    </RefreshContext.Provider>
  );
};

/**
 * Hook to access the RefreshManager
 * Use this in components that need to trigger refreshes
 */
export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error("useRefresh must be used within a RefreshProvider");
  }
  return context;
};
