import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './_app/features/auth/context/AuthContext';
import { ThemeProvider } from './_app/theme/ThemeContext';
import AppNavigator from './_app/navigation/appNavigator';
import { appLifecycleManager } from './_app/services/AppLifecycleManager';
import { useAuthContext } from './_app/features/auth/context/AuthContext';
import OfflineIndicator from './_app/components/OfflineIndicator';
import React, { useEffect } from 'react';
import logger from './_app/utils/logger';

// Component to handle AppLifecycleManager initialization
const AppLifecycleHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authContext = useAuthContext();
  
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

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppLifecycleHandler>
              <View style={styles.appContainer}>
                {/* Global offline indicator */}
                <OfflineIndicator />
                
                <AppNavigator />
                <StatusBar style="auto" />
              </View>
            </AppLifecycleHandler>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appContainer: {
    flex: 1,
    position: 'relative',
  },
}); 