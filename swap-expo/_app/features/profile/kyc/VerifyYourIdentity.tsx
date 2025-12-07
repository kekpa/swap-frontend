import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator, // Still used in loading/error states
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../navigation/profileNavigator';
import { useTheme } from '../../../theme/ThemeContext';
import { Theme } from '../../../theme/theme';
import { useKycStatusCritical, useKycStatus } from '../../../hooks-data/useKycQuery';
import { useAuthContext } from '../../auth/context/AuthContext';
// Note: useBiometricAvailability removed - biometric is local-only, not tracked in backend
import * as LocalAuthentication from 'expo-local-authentication';
import { getTimelineForEntityType } from '../../../config/kycTimelines';

// Updated: Enhanced component to work with new KYC process structure and improved error handling - 2025-01-26
// Updated: Refactored to use configuration-driven timeline system for scalability - 2025-11-10

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

// Define route params type
type VerifyYourIdentityRouteParams = {
  sourceRoute?: string;
};

// Timeline step component
interface TimelineStepProps {
  title: string;
  description: string;
  isCompleted: boolean;
  isActive?: boolean;
  isLast?: boolean;
  onPress?: () => void;
  theme: Theme;
  canAccess?: boolean;
  stepStatus?: string;
}

const TimelineStep: React.FC<TimelineStepProps> = ({
  title,
  description,
  isCompleted,
  isActive = false,
  isLast = false,
  onPress,
  theme,
  canAccess = true,
  stepStatus
}) => {
  const componentStyles = useMemo(() => StyleSheet.create({
    timelineItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: isLast ? 0 : theme.spacing.lg,
      position: 'relative',
      zIndex: 1,
      opacity: canAccess ? 1 : 0.5,
    },
    timelineStatusContainer: {
      position: 'relative',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    timelineStatus: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.white,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2
    },
    completedStatus: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    activeStatus: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    inProgressStatus: { backgroundColor: theme.colors.warning, borderColor: theme.colors.warning },
    failedStatus: { backgroundColor: theme.colors.error, borderColor: theme.colors.error },
    // PROFESSIONAL: Absolute positioned line that extends to next step
    timelineLineSegment: {
      position: 'absolute',
      top: 30, // Start below circle
      left: 14.5, // Center of 30px circle (15px) minus half line width (0.5px)
      width: 1,
      height: 62, // Extends to reach next circle, accounts for 2-line descriptions
      backgroundColor: theme.colors.border,
      zIndex: 0,
    },
    timelineContent: { paddingTop: theme.spacing.xs, flex: 1 },
    timelineTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs / 2
    },
    activeTitle: { color: theme.colors.primary, fontWeight: '600' },
    timelineDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary
    },
    statusBadge: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs / 2,
      fontStyle: 'italic',
    },
  }), [theme, canAccess, isLast]);

  let statusStyle = {};
  let statusIcon = null;
  
  if (isCompleted) {
    statusStyle = componentStyles.completedStatus;
    statusIcon = <Ionicons name="checkmark" size={16} color={theme.colors.white} />;
  } else if (isActive) {
    statusStyle = componentStyles.activeStatus;
  } else if (stepStatus === 'in_progress') {
    statusStyle = componentStyles.inProgressStatus;
    statusIcon = <Ionicons name="hourglass" size={12} color={theme.colors.white} />;
  } else if (stepStatus === 'failed') {
    statusStyle = componentStyles.failedStatus;
    statusIcon = <Ionicons name="close" size={14} color={theme.colors.white} />;
  }
  
  const titleStyle = isActive ? componentStyles.activeTitle : {};

  return (
    <TouchableOpacity
      style={componentStyles.timelineItem}
      onPress={canAccess ? onPress : undefined}
      disabled={!onPress || !canAccess}
    >
      {/* PROFESSIONAL: Circle + line segment container for scalable timeline */}
      <View style={componentStyles.timelineStatusContainer}>
        <View style={[componentStyles.timelineStatus, statusStyle]}>
          {statusIcon}
        </View>
        {/* Render line segment for all steps except the last */}
        {!isLast && (
          <View style={componentStyles.timelineLineSegment} />
        )}
      </View>
      <View style={componentStyles.timelineContent}>
        <Text style={[componentStyles.timelineTitle, titleStyle]}>{title}</Text>
        <Text style={componentStyles.timelineDescription}>{description}</Text>
        {stepStatus && stepStatus !== 'not_started' && stepStatus !== 'completed' && (
          <Text style={componentStyles.statusBadge}>
            Status: {stepStatus.replace('_', ' ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const VerifyYourIdentityScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'VerifyYourIdentity'>>();
  const { theme } = useTheme();
  const { user } = useAuthContext();

  // Use professional KYC query with enterprise features
  const {
    data: kycStatus,
    isLoading,
    error,
    refresh: refreshStatus,
    invalidate: invalidateKycStatus,
    isStale,
    lastUpdated
  } = useKycStatus(user?.entityId);

  // Determine profile type (must be before timeline loading)
  const isBusinessProfile = user?.profileType === 'business';
  const businessName = user?.businessName;

  // Get entity type from backend response (single source of truth!)
  const entityType = kycStatus?.entity_type || (isBusinessProfile ? 'business' : 'profile');

  // PROFESSIONAL: Load timeline configuration dynamically based on entity type
  const timelineConfig = useMemo(
    () => getTimelineForEntityType(entityType),
    [entityType]
  );

  // Dynamic biometric availability check for iOS and Android
  // Note: biometric availability hook removed - biometric is local-only, not tracked in backend

  // PROFESSIONAL: Dynamic verification status computation from timeline configuration
  // This adapts automatically to entity type (personal vs business)
  const verificationStatus = useMemo(() => {
    const data = kycStatus || {};

    // Map timeline steps to verification status with completion flags from backend
    const allSteps = timelineConfig.steps.map((step, index) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      isCompleted: (data as any)[step.completionFlag] || false,
      isActive: false, // Will be computed based on first incomplete step
      canAccess: true,
      navigationRoute: step.navigationRoute,
      navigationParams: step.navigationParams,
      stepIndex: index,
    }));

    // Note: biometric_setup filter removed - biometric is no longer in KYC timeline
    // Biometric is local-only, not tracked in backend KYC steps

    return allSteps;
  }, [kycStatus, timelineConfig]);

  // Find first incomplete step (active step)
  const activeStepIndex = useMemo(() => {
    const firstIncomplete = verificationStatus.findIndex(step => !step.isCompleted);
    return firstIncomplete >= 0 ? firstIncomplete : verificationStatus.length - 1;
  }, [verificationStatus]);

  // OPTIMISTIC UI: Always show timeline instantly - no loading states, true local-first
  // Data is always "ready" - we show defaults for missing data, update in background

  console.log('🔥 [VerifyYourIdentity] 📊 Component state (OPTIMISTIC UI - Professional KYC):', {
    hasKycStatus: !!kycStatus,
    hasVerificationStatus: !!verificationStatus,
    isLoading,
    error,
    isStale,
    lastUpdated: lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never',
    cacheStatus: isStale ? '🔴 Stale' : '🟢 Fresh',
    optimisticUI: 'Always showing timeline instantly',
    verificationStatus
  });

  const sourceRoute = route.params?.sourceRoute;
  
  // PROFESSIONAL: Enhanced focus/mount handling with intelligent refresh
  useEffect(() => {
    console.log(`[VerifyYourIdentityScreen] 🚀 FOCUS/MOUNT (Professional KYC). sourceRoute: ${sourceRoute}, route.key: ${route.key}`);

    if (route.params) {
      console.log(`[VerifyYourIdentityScreen] 📋 Route params:`, route.params);
    }

    // Professional logging of KYC status with cache info
    if (kycStatus) {
      console.log(`[VerifyYourIdentityScreen] 📊 KYC Status (${isStale ? 'STALE' : 'FRESH'}):`, {
        currentLevel: kycStatus.currentLevel,
        isVerificationInProgress: kycStatus.isVerificationInProgress,
        steps: kycStatus.steps ? Object.keys(kycStatus.steps).length : 0,
        completedAt: kycStatus.completedAt,
        lastUpdate: lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never',
        cacheAge: lastUpdated ? `${Math.round((Date.now() - lastUpdated) / 1000)}s ago` : 'N/A'
      });
    } else if (!isLoading) {
      console.log('[VerifyYourIdentityScreen] ⚠️ No KYC status available (not loading)');
    }
  }, [route.params, sourceRoute, route.key, kycStatus, isStale, lastUpdated, isLoading]);

  // Auto-complete KYC when all steps are completed
  // Note: Biometric is local-only, not tracked in backend KYC steps
  useEffect(() => {
    // Check if all visible steps are completed
    const allCompleted = verificationStatus.every(step => step.isCompleted);

    // Check if backend status is not yet in_review or completed
    const needsCompletion = kycStatus?.process?.overall_status === 'in_progress';

    if (allCompleted && needsCompletion && !isLoading) {
      console.log('[VerifyYourIdentity] 🎯 All KYC steps completed - completing KYC...');

      // Call backend to complete KYC
      import('../../../_api/apiClient').then(({ default: apiClient }) => {
        apiClient.post('/kyc/complete-without-biometric', {})
          .then(() => {
            console.log('[VerifyYourIdentity] ✅ KYC completed');
            // Refresh status to show updated "Under Review" state
            refreshStatus();
          })
          .catch(error => {
            console.error('[VerifyYourIdentity] ❌ Error completing KYC:', error);
          });
      });
    }
  }, [verificationStatus, kycStatus?.process?.overall_status, isLoading]);

  const handleBack = () => {
    console.log(`[VerifyYourIdentityScreen] handleBack called. Navigating to Profile.`);
    navigation.navigate('Profile');
  };

  // PROFESSIONAL: Simplified step press handler using timeline configuration
  const handleStepPress = (stepData: typeof verificationStatus[number]) => {
    console.log(`[VerifyYourIdentityScreen] handleStepPress for ${stepData.id}. Has navigation: ${!!stepData.navigationRoute}`);

    if (stepData.navigationRoute) {
      const navParams = stepData.navigationParams || { returnToTimeline: true, sourceRoute };
      navigation.navigate(stepData.navigationRoute as any, navParams);
    } else {
      console.log(`[VerifyYourIdentityScreen] No navigation route configured for step: ${stepData.id}`);
    }
  };

  // PROFESSIONAL: Simplified continue handler using array-based verification status
  const handleContinue = () => {
    // Find first incomplete step
    const nextIncompleteStep = verificationStatus.find(step => !step.isCompleted);

    if (nextIncompleteStep) {
      console.log(`[VerifyYourIdentityScreen] handleContinue to next incomplete step: ${nextIncompleteStep.id}`);
      handleStepPress(nextIncompleteStep);
    } else {
      console.log('[VerifyYourIdentityScreen] All steps completed, navigating back to Profile');
      navigation.navigate('Profile');
    }
  };

  const handleHelp = () => {
    console.log('Help pressed');
    // Implement help action
  };

  const handleRetry = () => {
    console.log('Retrying KYC status fetch...');
    refreshStatus();
  };

  // PROFESSIONAL: Check if all steps are completed on the client-side
  // Simple array check - verificationStatus is already filtered to only show relevant steps
  const allStepsCompleted = useMemo(() => {
    if (!verificationStatus || verificationStatus.length === 0) return false;

    // Check if every step in the array has isCompleted: true
    return verificationStatus.every(step => step.isCompleted);
  }, [verificationStatus]);

  // Get overall process status message
  const getProcessStatusMessage = () => {
    if (allStepsCompleted) {
      return 'Congratulations! Your identity verification is complete. You can now access all features.';
    }
    
    // Fallback messages based on backend status if not all steps are complete
    const backendStatus = kycStatus?.process?.overall_status || kycStatus?.kyc_status;
    const hasFailedSteps = Object.values(kycStatus?.steps || {}).some(step => (step as any).status === 'failed');

    if (hasFailedSteps) {
      return 'Some verification steps need attention. Please review and update the failed steps below:';
    }
    
    if (backendStatus === 'pending' || backendStatus === 'in_progress') {
      return 'Your identity verification is in progress. Please complete the remaining steps below:';
    }
    
    return 'Complete the following steps to open your bank account and manage it from your smartphone:';
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.card },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.card },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: '600', color: theme.colors.textPrimary },
    helpButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    scrollView: { flex: 1, backgroundColor: theme.colors.background },
    kycContainer: { padding: theme.spacing.lg },
    statusDescription: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.xl, marginTop: theme.spacing.sm, lineHeight: 22, paddingHorizontal: theme.spacing.sm },
    timelineContainer: { padding: 0, paddingLeft: theme.spacing.md, marginBottom: theme.spacing.xl },
    continueButton: { ...theme.commonStyles.primaryButton, marginTop: theme.spacing.lg },
    continueButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorContainer: { padding: theme.spacing.lg, alignItems: 'center' },
    errorText: { fontSize: theme.typography.fontSize.md, color: theme.colors.error, textAlign: 'center', marginBottom: theme.spacing.md },
    retryButton: { ...theme.commonStyles.secondaryButton, paddingHorizontal: theme.spacing.lg },
    retryButtonText: { color: theme.colors.primary, fontSize: theme.typography.fontSize.md, fontWeight: '600' },
    processStatusBadge: {
      backgroundColor: theme.colors.primaryLight,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
      alignSelf: 'center',
      marginBottom: theme.spacing.md,
    },
    processStatusText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
  }), [theme]);

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.card} />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isBusinessProfile ? 'Verify Your Business' : 'Verify Your Identity'}
          </Text>
          <TouchableOpacity style={styles.helpButton} onPress={handleHelp}>
            <Ionicons name="help-circle-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.statusDescription, { marginTop: theme.spacing.md }]}>
            Loading your verification status...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.card} />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isBusinessProfile ? 'Verify Your Business' : 'Verify Your Identity'}
          </Text>
          <TouchableOpacity style={styles.helpButton} onPress={handleHelp}>
            <Ionicons name="help-circle-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} style={{ marginBottom: theme.spacing.md }} />
          <Text style={styles.errorText}>
            Unable to load verification status. Please check your connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.card} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isBusinessProfile ? 'Verify Your Business' : 'Verify Your Identity'}
        </Text>
        <TouchableOpacity style={styles.helpButton} onPress={handleHelp}>
          <Ionicons name="help-circle-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.kycContainer}>
          {/* PROFESSIONAL: 3-State Status Badge for Banking UX */}
          {allStepsCompleted && kycStatus?.process?.overall_status === 'in_review' ? (
            // State 1: Backend confirmed review - "Under Review" (Orange)
            <View style={[styles.processStatusBadge, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.processStatusText, { color: '#F59E0B' }]}>
                Status: Under Review
              </Text>
            </View>
          ) : allStepsCompleted ? (
            // State 2: All steps done, can still edit - "Completed" (Green)
            <View style={[styles.processStatusBadge, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.processStatusText, { color: '#10B981' }]}>
                Status: Completed
              </Text>
            </View>
          ) : (
            // State 3: Has steps to complete - "In Progress" (Purple)
            <View style={styles.processStatusBadge}>
              <Text style={styles.processStatusText}>
                Status: In Progress
              </Text>
            </View>
          )}
          
          <Text style={styles.statusDescription}>
            {getProcessStatusMessage()}
          </Text>
          
          {/* PROFESSIONAL: Dynamic timeline from configuration - adapts to entity type automatically */}
          <View style={styles.timelineContainer}>
            {verificationStatus.map((step, index) => {
              const isLast = index === verificationStatus.length - 1;
              const isActive = index === activeStepIndex;

              return (
                <TimelineStep
                  key={step.id}
                  theme={theme}
                  title={step.title}
                  description={step.description}
                  isCompleted={step.isCompleted}
                  isActive={isActive}
                  canAccess={step.canAccess}
                  isLast={isLast}
                  onPress={() => handleStepPress(step)}
                />
              );
            })}
          </View>

          {/* OPTIMISTIC UI: Always show continue button - true local-first experience */}
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>
              {allStepsCompleted ? 'Back to Profile' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VerifyYourIdentityScreen; 