// Updated: Simplified AuthGuard, removed problematic reset action - 2024-07-30
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

import React, { useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
// import { useNavigation, CommonActions } from '@react-navigation/native'; // No longer dispatching from here
import logger from '../../../utils/logger';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const auth = useAuthContext();
  // const navigation = useNavigation(); // Not needed for reset anymore

  useEffect(() => {
    // This effect primarily ensures that if needsLogin becomes true,
    // the AuthContext state is updated. RootNavigator will handle the UI switch.
    if (!auth.isLoading && !auth.isAuthenticated && auth.needsLogin) {
      logger.debug('[AuthGuard] Detected unauthenticated state with needsLogin=true. RootNavigator should handle redirection.', 'auth');
      // The AuthContext's forceLogout or similar should have set isAuthenticated to false
      // and needsLogin to true. RootNavigator will react to isAuthenticated.
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.needsLogin]);

  if (auth.isLoading) {
    logger.debug('[AuthGuard] Auth is loading...', 'auth');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If not authenticated, RootNavigator should prevent this component from being deeply rendered.
  // Rendering null here is a safeguard.
  if (!auth.isAuthenticated) {
    logger.debug('[AuthGuard] Not authenticated, rendering null. RootNavigator should have switched to Auth flow.', 'auth');
    return null;
  }

  logger.debug('[AuthGuard] Authenticated, rendering children.', 'auth');
  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Note: Ensure that RootNavigator has a stack named 'Auth'
// that contains your authentication screens (login, signup, etc.)

