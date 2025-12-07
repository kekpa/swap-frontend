// Copyright 2025 frantzopf
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// app/App.tsx

import './utils/localStoragePolyfill';
import { LogLevel, setLogLevel, setLogCategory } from "./utils/logger";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigator from "./navigation/rootNavigator";
import { AuthProvider } from "./features/auth/context/AuthContext";
import { RefreshProvider } from "./contexts/RefreshContext";
import { appLifecycleManager } from "./services/AppLifecycleManager";
import { QueryProvider } from "./tanstack-query/QueryProvider";
import { QueryErrorBoundary } from "./tanstack-query/errors/QueryErrorBoundary";
import { useAuthContext } from "./features/auth/context/AuthContext";
import { ToastContainer } from "./components/Toast";
import { ThemeProvider } from './theme/ThemeContext';
import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, TouchableOpacity, LogBox, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { databaseManager } from './localdb/DatabaseManager';
import logger from './utils/logger';
import { navigationStateManager } from './utils/NavigationStateManager';
import { navigationRef } from './utils/navigationRef';
import { tokenManager } from './services/token';
import appLockService from './services/AppLockService';
import LockScreen from './features/auth/components/LockScreen';
import AppLockSetupScreen from './features/auth/components/AppLockSetupScreen';
import { authEvents, APP_LOCK_EVENTS } from './_api/apiClient';
import { useKycStatusDirect } from './hooks-data/useKycQuery';

// PROFESSIONAL FIX: Suppress technical warnings that don't represent bugs
// - TanStack Query: queries are intentionally cancelled during navigation
// - React Native debugger: we don't use the RN debugger (use terminal/browser console instead)
// - DevTools connection: React Native tries to connect to debugger tools we don't use
LogBox.ignoreLogs([
  'A query that was dehydrated as pending ended up rejecting',
  'Failed to open debugger',
  'Ignoring DevTools', // Suppresses "Ignoring DevTools app debug target" warnings
]);

// Configure logging based on environment
if (__DEV__) {
  // In development, show DEBUG level logs but disable some categories
  setLogLevel(LogLevel.DEBUG);

  // Uncomment these lines to disable specific categories
  // setLogCategory('api', false); // Disable API request/response logs
  // setLogCategory('data', false); // Disable data loading/caching logs
} else {
  // In production, only show WARN level and above
  setLogLevel(LogLevel.WARN);
}

// Component to handle App Lock Screen
const AppLockHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authContext = useAuthContext();
  const [isAppLocked, setIsAppLocked] = useState(true);
  const [isLockConfigured, setIsLockConfigured] = useState<boolean | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  // Use navigation-free KYC hook (safe outside NavigationContainer)
  // This prevents showing setup screen if user already completed KYC passcode setup
  const { data: kycData } = useKycStatusDirect(authContext.user?.entityId);

  // Initialize app lock service and check lock state
  useEffect(() => {
    const initAppLock = async () => {
      await appLockService.initialize();
      const configured = await appLockService.isConfigured();
      setIsLockConfigured(configured);

      // If user is authenticated and lock is configured, check if locked
      if (authContext.isAuthenticated && configured) {
        setIsAppLocked(appLockService.isLocked());
        setNeedsSetup(false);
      } else if (authContext.isAuthenticated && !configured) {
        // User is authenticated but local lock not configured
        // Check if backend says passcode was already set up (KYC flow)
        if (kycData?.passcode_setup_completed) {
          // Backend says passcode exists - skip setup screen
          logger.debug('[AppLockHandler] Skipping setup - backend passcode_setup_completed=true');
          setNeedsSetup(false);
          setIsAppLocked(false);
        } else {
          // Neither local nor backend has passcode - show setup
          setNeedsSetup(true);
          setIsAppLocked(false);
        }
      } else {
        // Not authenticated = not locked, no setup needed
        setIsAppLocked(false);
        setNeedsSetup(false);
      }
    };

    initAppLock();
  }, [authContext.isAuthenticated, kycData?.passcode_setup_completed]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // Track when app goes to background for timeout calculation
        // NOT on 'inactive' - that's just system dialogs (permissions, share sheet, etc.)
        if (isLockConfigured && authContext.isAuthenticated) {
          logger.debug('[AppLockHandler] App going to background, starting timeout...');
          appLockService.setBackgroundedAt(Date.now());
        }
      } else if (nextAppState === 'active') {
        // Check if app was in background for longer than 3 minutes
        if (isLockConfigured && authContext.isAuthenticated && appLockService.isBackgroundTimeoutExpired()) {
          logger.debug('[AppLockHandler] Background timeout expired, locking...');
          appLockService.lock();
          setIsAppLocked(true);
        }
        // Clear background timestamp
        appLockService.setBackgroundedAt(null);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isLockConfigured, authContext.isAuthenticated]);

  // Listen for SESSION_EXPIRED events (token refresh failures)
  // Revolut-style: lock the app instead of logging out
  useEffect(() => {
    const handleSessionExpired = (reason: string) => {
      if (isLockConfigured && authContext.isAuthenticated) {
        logger.info(`[AppLockHandler] Session expired (${reason}), locking app...`);
        appLockService.lock();
        setIsAppLocked(true);
      }
    };

    authEvents.on(APP_LOCK_EVENTS.SESSION_EXPIRED, handleSessionExpired);
    return () => {
      authEvents.off(APP_LOCK_EVENTS.SESSION_EXPIRED, handleSessionExpired);
    };
  }, [isLockConfigured, authContext.isAuthenticated]);

  const handleUnlock = useCallback(() => {
    logger.info('[AppLockHandler] App unlocked');
    setIsAppLocked(false);
  }, []);

  const handleLogout = useCallback(async () => {
    logger.info('[AppLockHandler] Logout from lock screen');
    await appLockService.reset();
    await authContext.logout();
    setIsAppLocked(false);
    setNeedsSetup(false);
  }, [authContext]);

  const handleSetupComplete = useCallback(async () => {
    logger.info('[AppLockHandler] Lock setup complete');
    setIsLockConfigured(true);
    setNeedsSetup(false);
    setIsAppLocked(false);
  }, []);

  const handlePinReset = useCallback(async () => {
    logger.info('[AppLockHandler] PIN reset requested - showing setup screen');
    setIsLockConfigured(false);
    setNeedsSetup(true);
    setIsAppLocked(false);
  }, []);

  // Show setup screen if:
  // - User is authenticated
  // - Lock is not configured
  // - Not loading
  if (authContext.isAuthenticated && needsSetup && !authContext.isLoading) {
    return (
      <AppLockSetupScreen
        userName={authContext.user?.firstName || authContext.user?.businessName || 'there'}
        onComplete={handleSetupComplete}
        onLogout={handleLogout}
      />
    );
  }

  // Show lock screen if:
  // - Lock is configured
  // - User is authenticated
  // - App is locked
  if (isLockConfigured && authContext.isAuthenticated && isAppLocked && !authContext.isLoading) {
    // Get user identifier for password verification (prefer email, then username)
    const userIdentifier = authContext.user?.email || authContext.user?.username;

    return (
      <LockScreen
        userName={authContext.user?.firstName || authContext.user?.businessName || 'there'}
        userIdentifier={userIdentifier}
        onUnlock={handleUnlock}
        onLogout={handleLogout}
        onPinReset={handlePinReset}
      />
    );
  }

  return <>{children}</>;
};

// Component to handle AppLifecycleManager initialization
const AppLifecycleHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Wrap useAuthContext in try-catch to handle initialization issues
  let authContext;
  try {
    authContext = useAuthContext();
  } catch (error) {
    logger.warn('[AppLifecycleHandler] AuthContext not available yet, skipping lifecycle management');
    return <>{children}</>;
  }
  
  useEffect(() => {
    // Professional debugging - log every single trigger
    console.log('🔥 [AppLifecycleHandler] useEffect triggered:', {
      isAuthenticated: authContext.isAuthenticated,
      hasUser: !!authContext.user,
      userId: authContext.user?.entityId,
      isLoading: authContext.isLoading,
      timestamp: new Date().toISOString(),
    });

    if (authContext.isAuthenticated && authContext.user && !authContext.isLoading) {
      console.log('🔥 [AppLifecycleHandler] ✅ ALL CONDITIONS MET - Calling initialize()');

      console.log('🔥🔥🔥 [AppLifecycleHandler] INITIALIZING SERVICES FOR USER:', {
        userEntityId: authContext.user?.entityId,
        userProfileId: authContext.user?.profileId,
        isAuthenticated: authContext.isAuthenticated,
        isLoading: authContext.isLoading,
        timestamp: new Date().toISOString(),
        deviceType: 'DEBUGGING_APP_INIT'
      });

      // Initialize services when user is authenticated
      appLifecycleManager.initialize(authContext).catch(error => {
        logger.error('[AppLifecycleHandler] Failed to initialize services:', error);
        console.error('🔥 [AppLifecycleHandler] ❌ Initialize failed:', error);
        console.log('🔥🔥🔥 [AppLifecycleHandler] INITIALIZATION FAILED:', {
          error: error.message,
          userEntityId: authContext.user?.entityId,
          userProfileId: authContext.user?.profileId,
          timestamp: new Date().toISOString()
        });
      });
    } else if (!authContext.isAuthenticated && !authContext.isLoading) {
      console.log('🔥 [AppLifecycleHandler] User logged out - cleaning up services');
      // Cleanup services when user logs out
      appLifecycleManager.cleanup();
    } else {
      console.log('🔥 [AppLifecycleHandler] ⏸️ CONDITIONS NOT MET - Skipping initialization:', {
        reason: !authContext.isAuthenticated ? 'NOT_AUTHENTICATED' :
                !authContext.user ? 'NO_USER_OBJECT' :
                authContext.isLoading ? 'STILL_LOADING' : 'UNKNOWN',
        details: {
          isAuthenticated: authContext.isAuthenticated,
          hasUser: !!authContext.user,
          isLoading: authContext.isLoading,
        }
      });
    }
  }, [authContext.isAuthenticated, authContext.user, authContext.isLoading]);

  return <>{children}</>;
};

const App: React.FC = () => {
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);

  // Initialize database and token manager on app startup
  useEffect(() => {
    const initializeAppInfrastructure = async () => {
      try {
        // Phase 1: Initialize database
        logger.info('[App] 🚀 Initializing database...');
        const dbSuccess = await databaseManager.initialize();

        if (!dbSuccess) {
          const error = 'Database initialization failed';
          logger.error('[App] ❌ Database initialization failed');
          setDatabaseError(error);
          return;
        }

        logger.info('[App] ✅ Database initialization completed successfully');

        // Phase 2: Initialize TokenManager (load tokens from storage)
        logger.info('[App] 🔐 Initializing TokenManager...');
        await tokenManager.initialize();
        logger.info('[App] ✅ TokenManager initialization completed successfully');

        // Phase 3: Initialize AppLockService (Revolut-style app lock)
        logger.info('[App] 🔒 Initializing AppLockService...');
        await appLockService.initialize();
        logger.info('[App] ✅ AppLockService initialization completed successfully');

        // All infrastructure initialized successfully
        setIsDatabaseReady(true);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[App] ❌ App infrastructure initialization error:', errorMessage);
        setDatabaseError(errorMessage);
      }
    };

    initializeAppInfrastructure();
  }, []);

  // Show loading screen while database initializes
  // Purple background (#8b14fd) matches native splash for seamless transition
  if (!isDatabaseReady && !databaseError) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#8b14fd' }}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={{ color: '#FFF', marginTop: 16, fontSize: 16 }}>Loading...</Text>
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  // Show error screen if database failed to initialize
  if (databaseError) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 20 }}>
            <Text style={{ color: '#EF4444', fontSize: 18, textAlign: 'center', marginBottom: 16 }}>
              Database Initialization Failed
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center' }}>
              {databaseError}
            </Text>
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryProvider>
          {/* PROFESSIONAL ERROR HANDLING: Error Boundary catches React errors and provides recovery */}
          <QueryErrorBoundary
            fallback={(error, reset) => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 20 }}>
                <Text style={{ color: '#EF4444', fontSize: 18, textAlign: 'center', marginBottom: 16 }}>
                  Something went wrong
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
                  {error.message || 'An unexpected error occurred'}
                </Text>
                <TouchableOpacity
                  onPress={reset}
                  style={{ backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
                >
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
            onError={(error) => {
              logger.error('[App] Error caught by boundary:', error);
            }}
          >
            <AuthProvider>
              <RefreshProvider>
                <AppLockHandler>
                  <AppLifecycleHandler>
                    <NavigationContainer
                      ref={navigationRef}
                      onStateChange={(state) => {
                        // Professional navigation state tracking
                        navigationStateManager.updateNavigationState(state);
                      }}
                    >
                      <RootNavigator />
                      <ToastContainer />
                      <StatusBar style="auto" />
                    </NavigationContainer>
                  </AppLifecycleHandler>
                </AppLockHandler>
              </RefreshProvider>
            </AuthProvider>
          </QueryErrorBoundary>
        </QueryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
