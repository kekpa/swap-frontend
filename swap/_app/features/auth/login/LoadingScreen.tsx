// Updated: Simplified elegant loading screen with proper data loading timing - 2025-01-27
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../theme/ThemeContext';
import { useData } from '../../../contexts/DataContext';
import { useAuthContext } from '../context/AuthContext';
import logger from '../../../utils/logger';
import { RootStackParamList } from '../../../navigation/rootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'LoadingScreen'>;

const LoadingScreen: React.FC = () => {
  console.log("🔥 [LoadingScreen] ===== COMPONENT MOUNTED =====");
  
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const authContext = useAuthContext();
  const { user } = authContext;
  const { 
    isInitialLoadComplete,
    interactionsList,
    currencyBalances,
    userProfile,
    kycStatus,
    isLoadingInteractions,
    isLoadingBalances,
    isLoadingUserData,
    loadingState,
    hasLocalData,
    hasEssentialLocalData
  } = useData();
  
  console.log("🔥 [LoadingScreen] Current state:", {
    isInitialLoadComplete,
    isLoadingInteractions,
    isLoadingBalances,
    isLoadingUserData,
    interactionsList: interactionsList.length,
    currencyBalances: currencyBalances.length,
    hasUserProfile: !!userProfile,
    hasKycStatus: !!kycStatus
  });

  const [currentMessage, setCurrentMessage] = useState('Initializing your account...');
  const [overallProgress, setOverallProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadingStartTime = useRef(Date.now());

  const loadingMessages = [
    'Initializing your account...',
    'Loading your profile...',
    'Fetching account balance...',
    'Syncing conversations...',
    'Loading transaction history...',
    'Finalizing setup...'
  ];

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Monitor real loading progress from DataContext
  useEffect(() => {
    const realProgress = loadingState?.progress || 0;
    const completedTasks = Array.from(loadingState?.completedTasks || []);
    const isDataLoading = loadingState?.isLoading || false;
    
    console.log("🔥 [LoadingScreen] 📊 Loading state update:", {
      progress: realProgress,
      isLoading: isDataLoading,
      completedTasks,
      isInitialLoadComplete,
      requiredTasks: loadingState?.requiredTasks || []
    });
    
    console.log("🔥 [LoadingScreen] 🎯 Navigation check:", {
      condition1_isInitialLoadComplete: isInitialLoadComplete,
      condition2_realProgress_gte_100: realProgress >= 100,
      condition3_not_data_loading: !isDataLoading,
      allConditionsMet: isInitialLoadComplete && realProgress >= 100 && !isDataLoading,
      willNavigate: isInitialLoadComplete && realProgress >= 100 && !isDataLoading
    });
    
    const messageIndex = Math.min(Math.floor(realProgress / 20), loadingMessages.length - 1);
    
    // Update progress and message based on real data loading
    setOverallProgress(realProgress);
    setCurrentMessage(loadingMessages[messageIndex]);
    
    // Animate progress bar to real progress
    Animated.timing(progressAnim, {
      toValue: realProgress,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    // Navigate when loading is actually complete AND user is still authenticated
    if (isInitialLoadComplete && realProgress >= 100 && !isDataLoading) {
      // CRITICAL: Check if user is still authenticated before navigating
      const isStillAuthenticated = authContext?.isAuthenticated || false;
      
      console.log("🔥 [LoadingScreen] 🎯 Pre-navigation auth check:", {
        isStillAuthenticated,
        isInitialLoadComplete,
        realProgress,
        isDataLoading
      });
      
      if (!isStillAuthenticated) {
        console.log("🔥 [LoadingScreen] ❌ User no longer authenticated, not navigating to App");
        // Don't navigate - let RootNavigator handle the auth state change
        return;
      }
      
      const minLoadTime = 2000; // Minimum 2 seconds for good UX
      const elapsedTime = Date.now() - loadingStartTime.current;
      const remainingTime = Math.max(0, minLoadTime - elapsedTime);
      
      console.log("🔥 [LoadingScreen] 🚀 NAVIGATION TRIGGERED!", {
        minLoadTime,
        elapsedTime,
        remainingTime,
        isInitialLoadComplete,
        realProgress,
        isDataLoading,
        isStillAuthenticated
      });
      
      setTimeout(() => {
        // Double-check authentication before actually navigating
        const finalAuthCheck = authContext?.isAuthenticated || false;
        if (finalAuthCheck) {
        console.log("🔥 [LoadingScreen] ✅ Data loading complete, navigating to app");
          // DON'T navigate manually - let RootNavigator handle the transition
          // The RootNavigator will automatically switch to App when isInitialLoadComplete becomes true
          console.log("🔥 [LoadingScreen] 🎯 Letting RootNavigator handle navigation transition");
        } else {
          console.log("🔥 [LoadingScreen] ❌ Final auth check failed, not navigating");
        }
      }, remainingTime);
    }
    
  }, [loadingState, isInitialLoadComplete, navigation, authContext]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.xxl,
    },
    logo: {
      fontSize: 48,
      fontWeight: '700',
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
    },
    tagline: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    loadingContainer: {
      width: '100%',
      alignItems: 'center',
    },
    progressContainer: {
      width: '100%',
      marginBottom: theme.spacing.lg,
    },
    progressBar: {
      height: 4,
      backgroundColor: theme.colors.grayLight,
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: theme.spacing.md,
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
    progressText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    currentMessage: {
      fontSize: theme.typography.fontSize.lg,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      fontWeight: '500',
      marginBottom: theme.spacing.xl,
    },
    loadingIndicatorContainer: {
      marginTop: theme.spacing.xl,
      alignItems: 'center',
    },
    loadingIndicator: {
      marginTop: theme.spacing.md,
    },
    footer: {
      position: 'absolute',
      bottom: theme.spacing.xl,
      alignItems: 'center',
    },
    footerText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Logo and Branding */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>Swap</Text>
          <Text style={styles.tagline}>Setting up your account...</Text>
        </View>

        {/* Loading Progress */}
        <View style={styles.loadingContainer}>
          <Text style={styles.currentMessage}>
            {currentMessage}
          </Text>

          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {Math.round(overallProgress)}% Complete
            </Text>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp',
                    }),
                  }
                ]}
              />
            </View>
          </View>

          {/* Simple loading indicator */}
          <View style={styles.loadingIndicatorContainer}>
            <ActivityIndicator 
              size="large" 
              color={theme.colors.primary}
              style={styles.loadingIndicator} 
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by Swap • Secure • Fast • Reliable
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

export default LoadingScreen; 