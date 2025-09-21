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
import { useLoadingState } from '../../../hooks-data/useLoadingState';
import { useAuthContext } from '../context/AuthContext';
import logger from '../../../utils/logger';
import { RootStackParamList } from '../../../navigation/rootNavigator';
import { loadingOrchestrator, LoadingState, TransitionPhase } from '../../../utils/LoadingOrchestrator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'LoadingScreen'>;

const LoadingScreen: React.FC = () => {
  console.log("🏛️ [LoadingScreen] PROFESSIONAL: Component mounted with LoadingOrchestrator integration");

  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const authContext = useAuthContext();
  const { user } = authContext;

  // PROFESSIONAL: Use LoadingOrchestrator instead of old useLoadingState
  const [orchestratorState, setOrchestratorState] = useState<LoadingState>(loadingOrchestrator.getLoadingState());

  // Legacy loading state for backward compatibility during transition
  const {
    isInitialLoadComplete,
    loadingState,
    isLoadingInteractions,
    isLoadingBalances,
    isLoadingUserData,
    hasLocalData,
    hasEssentialLocalData
  } = useLoadingState();
  
  console.log("🔥 [LoadingScreen] Current state:", {
    isInitialLoadComplete,
    isLoadingInteractions,
    isLoadingBalances,
    isLoadingUserData,
    progress: loadingState.progress,
    completedTasks: Array.from(loadingState.completedTasks),
    errors: loadingState.errors
  });

  const [currentMessage, setCurrentMessage] = useState('Initializing your account...');
  const [overallProgress, setOverallProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadingStartTime = useRef(Date.now());

  // PROFESSIONAL: Coordinated loading messages based on transition phase
  const getLoadingMessage = (phase: TransitionPhase, primaryOperation: any): string => {
    switch (phase) {
      case TransitionPhase.AUTH_COMPLETING:
        return 'Completing authentication...';
      case TransitionPhase.DATA_LOADING:
        return primaryOperation?.description || 'Loading your data...';
      case TransitionPhase.UI_PREPARING:
        return 'Preparing your experience...';
      case TransitionPhase.TRANSITION_COMPLETE:
        return 'Welcome back!';
      default:
        return primaryOperation?.description || 'Setting up your account...';
    }
  };

  // PROFESSIONAL: Listen to LoadingOrchestrator state changes
  useEffect(() => {
    const unsubscribe = loadingOrchestrator.onStateChange((newState) => {
      console.log('🏛️ [LoadingScreen] PROFESSIONAL: LoadingOrchestrator state update:', {
        isLoading: newState.isLoading,
        canShowUI: newState.canShowUI,
        shouldShowSplash: newState.shouldShowSplash,
        transitionPhase: newState.transitionPhase,
        activeOperations: newState.activeOperations.length,
        primaryOperation: newState.primaryOperation?.description
      });

      setOrchestratorState(newState);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // PROFESSIONAL: Monitor LoadingOrchestrator state for coordinated transitions
  useEffect(() => {
    const professionalMessage = getLoadingMessage(orchestratorState.transitionPhase, orchestratorState.primaryOperation);
    const professionalProgress = orchestratorState.activeOperations.length > 0 ?
      Math.min(95, orchestratorState.activeOperations.filter(op => op.type.includes('USER') || op.type.includes('PROFILE')).length * 25) :
      orchestratorState.canShowUI ? 100 : 50;

    console.log("🏛️ [LoadingScreen] PROFESSIONAL: Orchestrator-based update:", {
      canShowUI: orchestratorState.canShowUI,
      shouldShowSplash: orchestratorState.shouldShowSplash,
      transitionPhase: orchestratorState.transitionPhase,
      isLoading: orchestratorState.isLoading,
      activeOperations: orchestratorState.activeOperations.length,
      professionalProgress,
      professionalMessage
    });

    // Update UI based on LoadingOrchestrator state
    setCurrentMessage(professionalMessage);
    setOverallProgress(professionalProgress);

    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: professionalProgress,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // PROFESSIONAL: Navigation coordination
    // The LoadingOrchestrator controls when UI can be shown to prevent white flash
    if (orchestratorState.canShowUI && !orchestratorState.isLoading) {
      const isStillAuthenticated = authContext?.isAuthenticated || false;

      console.log("🏛️ [LoadingScreen] PROFESSIONAL: Transition coordination check:", {
        canShowUI: orchestratorState.canShowUI,
        isLoading: orchestratorState.isLoading,
        isStillAuthenticated,
        transitionPhase: orchestratorState.transitionPhase
      });

      if (isStillAuthenticated) {
        console.log("🏛️ [LoadingScreen] ✅ PROFESSIONAL: LoadingOrchestrator allows UI - smooth transition to app");
        // The coordinated transition prevents white flash
        // RootNavigator will handle the actual navigation
      } else {
        console.log("🏛️ [LoadingScreen] ❌ PROFESSIONAL: User no longer authenticated");
      }
    }

  }, [orchestratorState, authContext, progressAnim, getLoadingMessage]);

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