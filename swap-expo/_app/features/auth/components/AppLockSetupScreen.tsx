/**
 * AppLockSetupScreen
 *
 * Mandatory app lock setup screen shown after login if lock is not configured.
 * Implements adaptive pattern:
 * - If biometrics available: Show Face ID/Touch ID setup with PIN backup
 * - If no biometrics: Show PIN setup only
 *
 * ARCHITECTURE: Wrapper Component Pattern (Industry Standard)
 * - AppLockSetupContent: Core logic component (props-only, no navigation hooks)
 * - AppLockSetupScreen: Navigation wrapper (handles route params for Stack.Screen usage)
 *
 * @created 2025-12-01
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import PinPad from '../../../components2/PinPad';
import appLockService, { BiometricCapabilities } from '../../../services/AppLockService';
import { logger } from '../../../utils/logger';
import { KycService } from '../../../services/KycService';
import apiClient from '../../../_api/apiClient';
import { API_PATHS } from '../../../_api/apiPaths';

// ============================================
// TYPES
// ============================================

// Route params type for navigation (when used as a screen)
type BusinessSecuritySetupParams = {
  isBusinessSetup?: boolean;
  businessProfileId?: string;
  businessName?: string;
  returnRoute?: string;
};

// Props for the core content component
interface AppLockSetupContentProps {
  /** Callback when setup is complete */
  onComplete?: () => void;
  /** Callback when user wants to logout (escape hatch) */
  onLogout?: () => void;
  /** User's name for personalization */
  userName?: string;
  /** Business mode - for setting up business profile PIN */
  isBusinessSetup?: boolean;
  /** Business profile ID (required when isBusinessSetup is true) */
  businessProfileId?: string;
}

type SetupStep = 'intro' | 'biometric' | 'pin_create' | 'pin_confirm' | 'complete';

// ============================================
// CORE COMPONENT - Props only, no navigation hooks
// ============================================

const AppLockSetupContent: React.FC<AppLockSetupContentProps> = ({
  onComplete,
  onLogout,
  userName: propUserName,
  isBusinessSetup = false,
  businessProfileId,
}) => {
  const { theme } = useTheme();
  const { height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 700;

  // Derive display name (same for both personal and business)
  const userName = propUserName ?? 'there';

  // State
  const [step, setStep] = useState<SetupStep>('intro');
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Handle completion
  const handleComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  // Check biometric capabilities and existing PIN on mount
  useEffect(() => {
    const checkCapabilitiesAndExistingPin = async () => {
      setIsLoading(true);

      // Check if PIN already exists based on mode
      let isAlreadyConfigured = false;

      if (isBusinessSetup && businessProfileId) {
        // Business mode: check business PIN
        isAlreadyConfigured = await appLockService.isBusinessPinConfigured(businessProfileId);
        logger.debug(`[AppLockSetup] Business PIN check for ${businessProfileId}: ${isAlreadyConfigured}`);
      } else {
        // Personal mode: check personal PIN (from KYC sync)
        isAlreadyConfigured = await appLockService.isConfigured();
      }

      if (isAlreadyConfigured) {
        logger.info(`[AppLockSetup] ✅ PIN already configured (${isBusinessSetup ? 'business' : 'personal'}) - skipping setup`);
        setStep('complete');
        setIsLoading(false);
        setTimeout(handleComplete, 300); // Quick transition
        return;
      }

      const caps = await appLockService.detectBiometricCapabilities();
      setBiometricCapabilities(caps);
      setIsLoading(false);
      logger.debug(`[AppLockSetup] Biometric capabilities: ${JSON.stringify(caps)}`);
    };
    checkCapabilitiesAndExistingPin();
  }, [handleComplete, isBusinessSetup, businessProfileId]);

  const hasBiometrics = biometricCapabilities?.hasHardware && biometricCapabilities?.isEnrolled;

  const getBiometricName = (): string => {
    if (biometricCapabilities?.biometricType === 'facial') return 'Face ID';
    if (biometricCapabilities?.biometricType === 'fingerprint') return 'Touch ID';
    return 'Biometric';
  };

  const getBiometricIcon = (): string => {
    if (biometricCapabilities?.biometricType === 'facial') return 'scan-outline';
    return 'finger-print-outline';
  };

  // Handle biometric setup
  const handleBiometricSetup = useCallback(async () => {
    setIsLoading(true);
    const result = await appLockService.setupBiometric();
    setIsLoading(false);

    if (result.success) {
      logger.info('[AppLockSetup] Biometric setup successful (local-only, not synced to backend)');
      // Note: Biometric is local-only, not tracked in backend KYC steps
      // Now setup backup PIN
      setStep('pin_create');
    } else {
      Alert.alert(
        'Biometric Setup Failed',
        result.error || 'Please try again or use PIN instead.',
        [
          { text: 'Try Again', onPress: handleBiometricSetup },
          { text: 'Use PIN', onPress: () => setStep('pin_create') },
        ]
      );
    }
  }, []);

  // Handle PIN creation - always 6 digits for both personal and business
  const PIN_LENGTH = 6;

  useEffect(() => {
    if (step === 'pin_create' && pin.length === PIN_LENGTH) {
      logger.debug('[AppLockSetup] PIN created (6 digits), moving to confirm step');
      setStep('pin_confirm');
    }
  }, [pin, step]);

  // Handle PIN confirmation - always 6 digits
  useEffect(() => {
    if (step === 'pin_confirm' && confirmPin.length === PIN_LENGTH) {
      logger.debug('[AppLockSetup] Confirm PIN entered, checking match...');
      if (confirmPin === pin) {
        // PINs match - complete setup
        logger.debug('[AppLockSetup] ✅ PINs match! Completing setup...');
        completePinSetup();
      } else {
        // PINs don't match
        logger.debug('[AppLockSetup] ❌ PINs do not match, resetting...');
        setPinError('PINs do not match. Try again.');
        setConfirmPin('');
        // Go back to create step after delay
        setTimeout(() => {
          setPin('');
          setPinError(null);
          setStep('pin_create');
        }, 1500);
      }
    }
  }, [confirmPin, step, pin]);

  const completePinSetup = async () => {
    setIsLoading(true);

    if (isBusinessSetup && businessProfileId) {
      // BUSINESS MODE: Save business PIN locally + sync to backend
      logger.info(`[AppLockSetup] Setting up business PIN for profile ${businessProfileId}...`);

      // Step 1: Save PIN locally to AppLockService (for offline app lock)
      const localResult = await appLockService.setupBusinessPin(pin, businessProfileId);

      if (localResult.success) {
        logger.info('[AppLockSetup] Business PIN saved locally');

        // Step 2: Sync PIN to backend
        try {
          logger.info('[AppLockSetup] Syncing business PIN to backend...');
          await apiClient.post(API_PATHS.BUSINESS.SET_PIN(businessProfileId), { pin });
          logger.info('[AppLockSetup] ✅ Business PIN synced to backend!');
        } catch (syncError: any) {
          logger.warn('[AppLockSetup] ⚠️ Backend sync failed (non-fatal):', syncError.message);
          // Non-fatal: Local PIN is saved, backend sync can retry later
        }

        setIsLoading(false);
        setStep('complete');
        setTimeout(handleComplete, 500);
      } else {
        setIsLoading(false);
        Alert.alert('Setup Failed', localResult.error || 'Please try again.');
        setPin('');
        setConfirmPin('');
        setStep('pin_create');
      }
    } else {
      // PERSONAL MODE: Existing behavior
      // Step 1: Save PIN locally to AppLockService
      const result = await appLockService.setupPin(pin);

      if (result.success) {
        logger.info('[AppLockSetup] PIN setup successful locally');

        // Step 2: Sync PIN to backend via KycService - SECURITY CRITICAL
        try {
          logger.info('[AppLockSetup] Syncing passcode to backend for account security...');
          const syncResult = await KycService.storePasscode(pin);
          if (syncResult.success) {
            logger.info('[AppLockSetup] ✅ Passcode synced to backend!');
          } else {
            logger.warn('[AppLockSetup] ⚠️ Backend sync failed (non-fatal):', syncResult.error);
          }
        } catch (syncError) {
          logger.warn('[AppLockSetup] ⚠️ Backend sync failed (non-fatal):', syncError);
        }

        setIsLoading(false);
        setStep('complete');
        setTimeout(handleComplete, 500);
      } else {
        setIsLoading(false);
        Alert.alert('Setup Failed', result.error || 'Please try again.');
        setPin('');
        setConfirmPin('');
        setStep('pin_create');
      }
    }
  };

  const handleSkipBiometric = () => {
    setStep('pin_create');
  };

  const handleContinue = () => {
    if (hasBiometrics) {
      setStep('biometric');
    } else {
      setStep('pin_create');
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    iconContainer: {
      width: isSmallScreen ? 80 : 100,
      height: isSmallScreen ? 80 : 100,
      borderRadius: isSmallScreen ? 40 : 50,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: isSmallScreen ? theme.typography.fontSize.xl : theme.typography.fontSize.xxl,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xl,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: theme.spacing.md,
    },
    biometricButton: {
      width: '100%',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
      ...theme.shadows.medium,
    },
    biometricButtonText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.white,
      marginLeft: theme.spacing.sm,
    },
    secondaryButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    secondaryButtonText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
    },
    primaryButton: {
      width: '100%',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.lg,
      ...theme.shadows.medium,
    },
    primaryButtonText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.white,
    },
    pinContainer: {
      width: '100%',
      alignItems: 'center',
    },
    pinTitle: {
      fontSize: isSmallScreen ? theme.typography.fontSize.lg : theme.typography.fontSize.xl,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    pinSubtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    successContainer: {
      alignItems: 'center',
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.success + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    featureList: {
      marginTop: theme.spacing.lg,
      width: '100%',
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    featureIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    featureText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      flex: 1,
    },
  }), [theme, isSmallScreen]);

  // Loading state
  if (isLoading && step === 'intro') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Intro step - same UI for both personal and business
  if (step === 'intro') {
    const title = 'Secure Your Account';
    const subtitle = `Hi ${userName}! Set up quick unlock to access your account instantly and securely.`;

    const features = [
      { icon: 'flash', text: 'Instant unlock - no waiting for network' },
      { icon: 'lock-closed', text: 'Your money stays protected' },
      { icon: 'time', text: 'Stay logged in for 30+ days' },
    ];

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={40} color={theme.colors.primary} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.featureList}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon as any} size={16} color={theme.colors.primary} />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>

          {/* Use Different Account option - available for both personal and business */}
          {onLogout && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onLogout}>
              <Text style={styles.secondaryButtonText}>Use Different Account</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Biometric setup step
  if (step === 'biometric') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name={getBiometricIcon() as any} size={40} color={theme.colors.primary} />
          </View>

          <Text style={styles.title}>Enable {getBiometricName()}</Text>
          <Text style={styles.subtitle}>
            Use {getBiometricName()} for instant, secure access to your account.
          </Text>

          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricSetup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <>
                <Ionicons name={getBiometricIcon() as any} size={24} color={theme.colors.white} />
                <Text style={styles.biometricButtonText}>Enable {getBiometricName()}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleSkipBiometric}>
            <Text style={styles.secondaryButtonText}>Use PIN instead</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // PIN create step - same UI for both personal and business
  if (step === 'pin_create') {
    const pinTitle = hasBiometrics ? 'Create Backup PIN' : 'Create Your PIN';
    const pinSubtitle = hasBiometrics
      ? 'This PIN is used when Face ID is unavailable'
      : 'Enter a 6-digit PIN to secure your account';

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />
        <View style={styles.content}>
          <View style={styles.pinContainer}>
            <Text style={styles.pinTitle}>{pinTitle}</Text>
            <Text style={styles.pinSubtitle}>{pinSubtitle}</Text>
            <PinPad
              value={pin}
              onChange={setPin}
              disabled={isLoading}
              length={PIN_LENGTH}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // PIN confirm step - same UI for both personal and business
  if (step === 'pin_confirm') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />
        <View style={styles.content}>
          <View style={styles.pinContainer}>
            <Text style={styles.pinTitle}>Confirm Your PIN</Text>
            <Text style={styles.pinSubtitle}>Enter the same PIN again to confirm</Text>
            {pinError && <Text style={styles.errorText}>{pinError}</Text>}
            {isLoading && (
              <View style={{ alignItems: 'center', marginBottom: theme.spacing.md }}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  marginTop: theme.spacing.xs
                }}>
                  Securing your account...
                </Text>
              </View>
            )}
            <PinPad
              value={confirmPin}
              onChange={setConfirmPin}
              error={!!pinError}
              disabled={isLoading}
              length={PIN_LENGTH}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Complete step - same UI for both personal and business
  if (step === 'complete') {
    const completeTitle = "You're All Set!";
    const completeSubtitle = 'Your account is now protected with quick unlock.';

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />
        <View style={styles.content}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={40} color={theme.colors.success} />
            </View>
            <Text style={styles.title}>{completeTitle}</Text>
            <Text style={styles.subtitle}>{completeSubtitle}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return null;
};

// ============================================
// NAVIGATION SCREEN WRAPPER - For Stack.Screen usage
// Uses navigation hooks safely within navigator context
// ============================================

const AppLockSetupScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: BusinessSecuritySetupParams }, 'params'>>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  // Map route params to callbacks
  const handleComplete = useCallback(() => {
    if (route.params?.returnRoute) {
      navigation.navigate(route.params.returnRoute as never, {
        businessId: route.params?.businessProfileId,
      } as never);
    } else {
      navigation.goBack();
    }
  }, [navigation, route.params?.returnRoute, route.params?.businessProfileId]);

  return (
    <AppLockSetupContent
      userName={route.params?.businessName}
      isBusinessSetup={route.params?.isBusinessSetup}
      businessProfileId={route.params?.businessProfileId}
      onComplete={handleComplete}
    />
  );
};

// ============================================
// EXPORTS
// ============================================

// Named export for embedded usage (App.tsx)
export { AppLockSetupContent };

// Default export for navigation usage (profileNavigator.tsx)
export default AppLockSetupScreen;
