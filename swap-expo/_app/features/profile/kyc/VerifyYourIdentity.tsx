import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../navigation/profileNavigator';
import { useTheme } from '../../../theme/ThemeContext';
import { Theme } from '../../../theme/theme';
import { useKycStatusCritical, useKycStatus } from '../../../query/hooks/useKycQuery';
import { useAuthContext } from '../../auth/context/AuthContext';
import * as LocalAuthentication from 'expo-local-authentication';

// Updated: Enhanced component to work with new KYC process structure and improved error handling - 2025-01-26

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

// Define route params type
type VerifyYourIdentityRouteParams = {
  sourceRoute?: string;
};

// Step identification
enum VerificationStep {
  SETUP_ACCOUNT = 0,
  CONFIRM_PHONE = 1,
  // CONFIRM_EMAIL = 2, // Disabled for Haiti market - using phone + PIN instead
  PERSONAL_INFO = 3,
  VERIFY_ID = 4,
  TAKE_SELFIE = 5,
  SETUP_SECURITY = 6,
  BIOMETRIC_SETUP = 7
}

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
      marginBottom: theme.spacing.lg, 
      position: 'relative', 
      zIndex: 1,
      opacity: canAccess ? 1 : 0.5,
    },
    timelineStatus: { 
      width: 30, 
      height: 30, 
      borderRadius: 15, 
      backgroundColor: theme.colors.white, // Solid white prevents timeline line from showing through
      borderWidth: 1, 
      borderColor: theme.colors.border, 
      marginRight: theme.spacing.md, 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 2 
    },
    completedStatus: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    activeStatus: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    inProgressStatus: { backgroundColor: theme.colors.warning, borderColor: theme.colors.warning },
    failedStatus: { backgroundColor: theme.colors.error, borderColor: theme.colors.error },
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
  }), [theme, canAccess]);

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
      style={[componentStyles.timelineItem, isLast && { marginBottom: 0 }]}
      onPress={canAccess ? onPress : undefined}
      disabled={!onPress || !canAccess}
    >
      <View style={[componentStyles.timelineStatus, statusStyle]}>
        {statusIcon}
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
  
  // For compatibility with the existing component logic, create verificationStatus from kycStatus
  const verificationStatus = useMemo(() => {
    if (!kycStatus?.data) return null;

    const data = kycStatus.data;
    return {
      setupAccount: {
        isCompleted: data.setup_account_completed || false,
        isActive: false,
        canAccess: true
      },
      confirmPhone: {
        isCompleted: data.phone_verification_completed || false,
        isActive: false,
        canAccess: true
      },
      // Email verification disabled for Haiti market
      // confirmEmail: {
      //   isCompleted: data.email_verification_completed || false,
      //   isActive: false,
      //   canAccess: true
      // },
      personalInfo: {
        isCompleted: data.personal_info_completed || false,
        isActive: false,
        canAccess: true
      },
      verifyId: {
        isCompleted: data.document_verification_completed || false,
        isActive: false,
        canAccess: true
      },
      takeSelfie: {
        isCompleted: data.selfie_completed || false,
        isActive: false,
        canAccess: true
      },
      setupSecurity: {
        isCompleted: data.security_setup_completed || false,
        isActive: false,
        canAccess: true
      },
      biometricSetup: {
        isCompleted: data.biometric_setup_completed || false,
        isActive: false,
        canAccess: true
      },
    };
  }, [kycStatus]);
  
  // Biometric availability check
  const isBiometricAvailable = true; // Simplified for now
  const [activeStep, setActiveStep] = useState<VerificationStep>(VerificationStep.PERSONAL_INFO);
  
  // Determine profile type
  const isBusinessProfile = user?.profileType === 'business';
  const businessName = user?.businessName;
  
  console.log('🔥 [VerifyYourIdentity] 📊 Component state (Professional KYC):', {
    hasKycStatus: !!kycStatus,
    hasVerificationStatus: !!verificationStatus,
    isLoading,
    error,
    isBiometricAvailable,
    isStale,
    lastUpdated: lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never',
    cacheStatus: isStale ? '🔴 Stale' : '🟢 Fresh',
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

  // Update active step based on verification status
  useEffect(() => {
    if (verificationStatus) {
      if (isBusinessProfile) {
        // Business profile flow - check business-specific properties
        if ((verificationStatus as any).businessInfo?.isActive) {
          setActiveStep(VerificationStep.PERSONAL_INFO); // Maps to business info
        } else if ((verificationStatus as any).businessVerification?.isActive) {
          setActiveStep(VerificationStep.VERIFY_ID); // Maps to business verification
        } else if ((verificationStatus as any).businessSecurity?.isActive) {
          setActiveStep(VerificationStep.SETUP_SECURITY);
        }
      } else {
        // Personal profile flow - check personal-specific properties
        if (verificationStatus.personalInfo?.isActive) {
          setActiveStep(VerificationStep.PERSONAL_INFO);
        } else if (verificationStatus.verifyId?.isActive) {
          setActiveStep(VerificationStep.VERIFY_ID);
        } else if (verificationStatus.takeSelfie?.isActive) {
          setActiveStep(VerificationStep.TAKE_SELFIE);
        } else if (verificationStatus.setupSecurity?.isActive) {
          setActiveStep(VerificationStep.SETUP_SECURITY);
        }
      }
    }
  }, [verificationStatus, isBusinessProfile]);

  // Biometric availability is now handled by useKycStatus hook

  const handleBack = () => {
    console.log(`[VerifyYourIdentityScreen] handleBack called. Navigating to Profile.`);
    // Always navigate to Profile. ProfileScreen is responsible for its own back navigation 
    // to the original sourceRoute it received.
    navigation.navigate('Profile');
  };

  const handleStepPress = (step: VerificationStep) => {
    // All steps return to timeline after completion - gives users full control
    const navParams = { 
      returnToTimeline: true,
      sourceRoute,
    };
    console.log(`[VerifyYourIdentityScreen] handleStepPress for ${VerificationStep[step]} (Business: ${isBusinessProfile}). Navigating with params: ${JSON.stringify(navParams)}`);

    if (step === VerificationStep.SETUP_SECURITY) {
      navigation.navigate('Passcode', { isKycFlow: true, ...navParams });
    } else if (step === VerificationStep.BIOMETRIC_SETUP) {
      navigation.navigate('BiometricSetup', navParams);
    } else if (step === VerificationStep.TAKE_SELFIE) {
      if (isBusinessProfile) {
        // For business profiles, "take selfie" step maps to business verification
        navigation.navigate('BusinessVerification', navParams);
      } else {
        navigation.navigate('TakeSelfie', navParams);
      }
    } else if (step === VerificationStep.VERIFY_ID) {
      if (isBusinessProfile) {
        // For business profiles, "verify ID" step maps to business verification
        navigation.navigate('BusinessVerification', navParams);
      } else {
        navigation.navigate('UploadId', navParams);
      }
    } else if (step === VerificationStep.PERSONAL_INFO) {
      if (isBusinessProfile) {
        // For business profiles, "personal info" step maps to business info
        navigation.navigate('BusinessInfoFlow', navParams);
      } else {
        navigation.navigate('PersonalInfoFlow', navParams);
      }
    } else if (step === VerificationStep.CONFIRM_PHONE) {
      navigation.navigate('PhoneEntry', { ...navParams, currentPhone: kycStatus?.phone });
    // } else if (step === VerificationStep.CONFIRM_EMAIL) {
    //   navigation.navigate('KycEmailEntry', { ...navParams, currentEmail: kycStatus?.email });
    } else {
      console.log(`[VerifyYourIdentityScreen] handleStepPress: No navigation defined for step ${VerificationStep[step]}`);
    }
  };

  const handleContinue = () => {
    // If all applicable steps are completed, navigate back to Profile
    if (allStepsCompleted) {
      console.log('[VerifyYourIdentityScreen] All steps completed, navigating back to Profile');
      navigation.navigate('Profile');
      return;
    }

    // Smart continue - find the next incomplete step in proper order
    let nextStep: VerificationStep | null = null;
    
    if (!verificationStatus?.confirmPhone.isCompleted) {
      nextStep = VerificationStep.CONFIRM_PHONE;
    // Email verification disabled for Haiti market
    // } else if (!verificationStatus?.confirmEmail.isCompleted) {
    //   nextStep = VerificationStep.CONFIRM_EMAIL;
    } else if (isBusinessProfile) {
      // Business profile flow
      if (!(verificationStatus as any)?.businessInfo?.isCompleted) {
        nextStep = VerificationStep.PERSONAL_INFO; // Maps to BusinessInfoFlow
      } else if (!(verificationStatus as any)?.businessVerification?.isCompleted) {
        nextStep = VerificationStep.VERIFY_ID; // Maps to BusinessVerification
      } else if (!(verificationStatus as any)?.businessSecurity?.isCompleted) {
        nextStep = VerificationStep.SETUP_SECURITY;
      } else if (isBiometricAvailable && !verificationStatus?.biometricSetup.isCompleted) {
        nextStep = VerificationStep.BIOMETRIC_SETUP;
      }
    } else {
      // Personal profile flow
      if (!verificationStatus?.personalInfo.isCompleted) {
        nextStep = VerificationStep.PERSONAL_INFO;
      } else if (!verificationStatus?.verifyId.isCompleted) {
        nextStep = VerificationStep.VERIFY_ID;
      } else if (!verificationStatus?.takeSelfie.isCompleted) {
        nextStep = VerificationStep.TAKE_SELFIE;
      } else if (!verificationStatus?.setupSecurity.isCompleted) {
        nextStep = VerificationStep.SETUP_SECURITY;
      } else if (isBiometricAvailable && !verificationStatus?.biometricSetup.isCompleted) {
        nextStep = VerificationStep.BIOMETRIC_SETUP;
      }
    }

    const navParams = { 
      returnToTimeline: true,
      sourceRoute,
    };
    
    if (nextStep !== null) {
      console.log(`[VerifyYourIdentityScreen] handleContinue to next incomplete step: ${VerificationStep[nextStep]}. Navigating with params: ${JSON.stringify(navParams)}`);
      
      switch (nextStep) {
        case VerificationStep.CONFIRM_PHONE:
          navigation.navigate('PhoneEntry', { ...navParams, currentPhone: kycStatus?.phone });
          break;
        // Email verification disabled for Haiti market
        // case VerificationStep.CONFIRM_EMAIL:
        //   navigation.navigate('KycEmailEntry', { ...navParams, currentEmail: kycStatus?.email });
        //   break;
        case VerificationStep.SETUP_SECURITY:
          navigation.navigate('Passcode', { isKycFlow: true, ...navParams });
          break;
        case VerificationStep.TAKE_SELFIE:
          if (isBusinessProfile) {
            navigation.navigate('BusinessVerification', navParams);
          } else {
            navigation.navigate('TakeSelfie', navParams);
          }
          break;
        case VerificationStep.VERIFY_ID:
          if (isBusinessProfile) {
            navigation.navigate('BusinessVerification', navParams);
          } else {
            navigation.navigate('UploadId', navParams);
          }
          break;
        case VerificationStep.PERSONAL_INFO:
          if (isBusinessProfile) {
            navigation.navigate('BusinessInfoFlow', navParams);
          } else {
            navigation.navigate('PersonalInfoFlow', navParams);
          }
          break;
        case VerificationStep.BIOMETRIC_SETUP:
          navigation.navigate('BiometricSetup', navParams);
          break;
      }
    } else {
      console.log('[VerifyYourIdentityScreen] handleContinue: All steps completed, navigating back to Profile');
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

  // Determine if all steps are truly completed on the client-side
  const allStepsCompleted = useMemo(() => {
    if (!verificationStatus) return false;
    
    // Get required steps based on profile type (email verification removed for Haiti market)
    const requiredSteps = isBusinessProfile
      ? ['setupAccount', 'confirmPhone', 'businessInfo', 'businessVerification', 'businessSecurity']
      : ['setupAccount', 'confirmPhone', 'personalInfo', 'verifyId', 'takeSelfie', 'setupSecurity'];
    
    // Add biometric step if device supports it (for both profile types)
    if (isBiometricAvailable) {
      requiredSteps.push('biometricSetup');
    }
    
    // Check if all required steps are completed
    return requiredSteps.every(stepKey => {
      const stepStatus = (verificationStatus as any)[stepKey];
      return stepStatus?.isCompleted || false;
    });
  }, [verificationStatus, isBiometricAvailable, isBusinessProfile]);

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
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.card },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: '600', color: theme.colors.textPrimary },
    helpButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    scrollView: { flex: 1 },
    kycContainer: { padding: theme.spacing.lg },
    statusDescription: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.xl, marginTop: theme.spacing.sm, lineHeight: 22, paddingHorizontal: theme.spacing.sm },
    timelineContainer: { padding: 0, paddingLeft: theme.spacing.md, marginBottom: theme.spacing.xl, position: 'relative' },
    timelineMainLine: { position: 'absolute', top: 15, bottom: 15, left: 31, width: 1, backgroundColor: theme.colors.border, zIndex: 0 },
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
        <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        
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
        <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        
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
      <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
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
          {/* Process Status Badge - Render based on client-side completion check */}
          {allStepsCompleted ? (
            <View style={[styles.processStatusBadge, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.processStatusText, { color: theme.colors.success }]}>
                Status: Completed
              </Text>
            </View>
          ) : (
            <View style={styles.processStatusBadge}>
              <Text style={styles.processStatusText}>
                Status: In Progress
              </Text>
            </View>
          )}
          
          <Text style={styles.statusDescription}>
            {getProcessStatusMessage()}
          </Text>
          
          {/* Timeline */}
          <View style={styles.timelineContainer}>
            {/* Main timeline vertical line */}
            <View style={styles.timelineMainLine}></View>
            
            <TimelineStep
              theme={theme}
              title={isBusinessProfile ? "Set up business account" : "Set up Swap account"}
              description={isBusinessProfile ? `${businessName || 'Business'} account created successfully` : "Account created successfully"}
              isCompleted={verificationStatus?.setupAccount?.isCompleted || false}
              canAccess={verificationStatus?.setupAccount?.canAccess || true}
              onPress={() => handleStepPress(VerificationStep.SETUP_ACCOUNT)}
            />
            
            <TimelineStep
              theme={theme}
              title="Confirm your phone number"
              description="Receive verification code"
              isCompleted={verificationStatus?.confirmPhone?.isCompleted || false}
              canAccess={verificationStatus?.confirmPhone?.canAccess || true}
              onPress={() => handleStepPress(VerificationStep.CONFIRM_PHONE)}
            />
            
            {/* Email verification disabled for Haiti market - using phone + PIN instead */}
            {/* <TimelineStep
              theme={theme}
              title="Confirm your email address"
              description="Email confirmed"
              isCompleted={verificationStatus?.confirmEmail?.isCompleted || false}
              canAccess={verificationStatus?.confirmEmail?.canAccess || true}
              onPress={() => handleStepPress(VerificationStep.CONFIRM_EMAIL)}
            /> */}
            
            {isBusinessProfile ? (
              // Business Profile Steps
              <>
                <TimelineStep
                  theme={theme}
                  title="Your business information"
                  description="Business name, type, address, and registration details"
                  isCompleted={(verificationStatus as any)?.businessInfo?.isCompleted || false}
                  isActive={(verificationStatus as any)?.businessInfo?.isActive || false}
                  canAccess={(verificationStatus as any)?.businessInfo?.canAccess || true}
                  stepStatus={kycStatus?.steps?.business_info?.status}
                  onPress={() => handleStepPress(VerificationStep.PERSONAL_INFO)} // Reuse enum for navigation
                />
                
                <TimelineStep
                  theme={theme}
                  title="Verify your business"
                  description="Upload business documents or photos"
                  isCompleted={(verificationStatus as any)?.businessVerification?.isCompleted || false}
                  isActive={(verificationStatus as any)?.businessVerification?.isActive || false}
                  canAccess={(verificationStatus as any)?.businessVerification?.canAccess || true}
                  stepStatus={kycStatus?.steps?.business_verification?.status}
                  onPress={() => handleStepPress(VerificationStep.VERIFY_ID)} // Reuse enum for navigation
                />
                
                <TimelineStep
                  theme={theme}
                  title="Set up business security"
                  description="Create a 6-digit business passcode"
                  isCompleted={(verificationStatus as any)?.businessSecurity?.isCompleted || false}
                  isActive={(verificationStatus as any)?.businessSecurity?.isActive || false}
                  canAccess={(verificationStatus as any)?.businessSecurity?.canAccess || true}
                  stepStatus={kycStatus?.steps?.business_security?.status}
                  isLast={!isBiometricAvailable}
                  onPress={() => handleStepPress(VerificationStep.SETUP_SECURITY)}
                />
              </>
            ) : (
              // Personal Profile Steps
              <>
                <TimelineStep
                  theme={theme}
                  title="Your personal information"
                  description="Full name, Date of birth, Country of residence, Citizenship"
                  isCompleted={verificationStatus?.personalInfo?.isCompleted || false}
                  isActive={verificationStatus?.personalInfo?.isActive || false}
                  canAccess={verificationStatus?.personalInfo?.canAccess || true}
                  stepStatus={kycStatus?.steps?.personal_info?.status}
                  onPress={() => handleStepPress(VerificationStep.PERSONAL_INFO)}
                />
                
                <TimelineStep
                  theme={theme}
                  title="Verify your identity"
                  description="Upload ID document"
                  isCompleted={verificationStatus?.verifyId?.isCompleted || false}
                  isActive={verificationStatus?.verifyId?.isActive || false}
                  canAccess={verificationStatus?.verifyId?.canAccess || true}
                  stepStatus={kycStatus?.steps?.document_verification?.status}
                  onPress={() => handleStepPress(VerificationStep.VERIFY_ID)}
                />
                
                <TimelineStep
                  theme={theme}
                  title="Take a selfie"
                  description="Verify photo matches ID"
                  isCompleted={verificationStatus?.takeSelfie?.isCompleted || false}
                  isActive={verificationStatus?.takeSelfie?.isActive || false}
                  canAccess={verificationStatus?.takeSelfie?.canAccess || true}
                  stepStatus={kycStatus?.steps?.selfie?.status}
                  onPress={() => handleStepPress(VerificationStep.TAKE_SELFIE)}
                />
                
                <TimelineStep
                  theme={theme}
                  title="Set up security"
                  description="Create a 6-digit passcode"
                  isCompleted={verificationStatus?.setupSecurity?.isCompleted || false}
                  isActive={verificationStatus?.setupSecurity?.isActive || false}
                  canAccess={verificationStatus?.setupSecurity?.canAccess || true}
                  stepStatus={kycStatus?.steps?.security_setup?.status}
                  isLast={!isBiometricAvailable}
                  onPress={() => handleStepPress(VerificationStep.SETUP_SECURITY)}
                />
              </>
            )}
            
            {/* Only show biometric setup if device supports it */}
            {isBiometricAvailable && (
              <TimelineStep
                theme={theme}
                title="Set up biometric authentication"
                description="Enable Face ID, Touch ID, or fingerprint login"
                isCompleted={verificationStatus?.biometricSetup?.isCompleted || false}
                isActive={verificationStatus?.biometricSetup?.isActive || false}
                canAccess={verificationStatus?.biometricSetup?.canAccess || true}
                stepStatus={kycStatus?.steps?.biometric_setup?.status}
                isLast={true}
                onPress={() => handleStepPress(VerificationStep.BIOMETRIC_SETUP)}
              />
            )}
          </View>
          
          {/* Continue Button */}
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