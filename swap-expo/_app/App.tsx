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
import { QueryProvider } from "./query/QueryProvider";
import { useAuthContext } from "./features/auth/context/AuthContext";
import { ToastContainer } from "./components/Toast";
import { ThemeProvider } from './theme/ThemeContext';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { databaseManager } from './localdb/DatabaseManager';
import logger from './utils/logger';

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
    if (authContext.isAuthenticated && authContext.user && !authContext.isLoading) {
      // Initialize services when user is authenticated
      appLifecycleManager.initialize(authContext).catch(error => {
        logger.error('[AppLifecycleHandler] Failed to initialize services:', error);
      });
    } else if (!authContext.isAuthenticated && !authContext.isLoading) {
      // Cleanup services when user logs out
      appLifecycleManager.cleanup();
    }
  }, [authContext.isAuthenticated, authContext.user, authContext.isLoading]);

  return <>{children}</>;
};

const App: React.FC = () => {
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);

  // Initialize database on app startup
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        logger.info('[App] 🚀 Initializing database...');
        const success = await databaseManager.initialize();
        
        if (success) {
          logger.info('[App] ✅ Database initialization completed successfully');
          setIsDatabaseReady(true);
        } else {
          const error = 'Database initialization failed';
          logger.error('[App] ❌ Database initialization failed');
          setDatabaseError(error);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[App] ❌ Database initialization error:', errorMessage);
        setDatabaseError(errorMessage);
      }
    };

    initializeDatabase();
  }, []);

  // Show loading screen while database initializes
  if (!isDatabaseReady && !databaseError) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={{ color: '#FFF', marginTop: 16, fontSize: 16 }}>Initializing Database...</Text>
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
        <AuthProvider>
          <RefreshProvider>
            <AppLifecycleHandler>
              <NavigationContainer>
                <RootNavigator />
                <ToastContainer />
                <StatusBar style="auto" />
              </NavigationContainer>
            </AppLifecycleHandler>
          </RefreshProvider>
        </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
