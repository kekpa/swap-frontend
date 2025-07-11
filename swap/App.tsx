import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './_app/features/auth/context/AuthContext';
import { ThemeProvider } from './_app/theme/ThemeContext';
import { DataProvider } from './_app/contexts/DataContext';
import AppNavigator from './_app/navigation/appNavigator';
import OfflineIndicator from './_app/components/OfflineIndicator';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <DataProvider>
              <View style={styles.appContainer}>
                {/* Global offline indicator */}
                <OfflineIndicator />
                
                <AppNavigator />
                <StatusBar style="auto" />
              </View>
            </DataProvider>
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