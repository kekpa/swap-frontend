/**
 * AppLockSetupScreen
 *
 * Mandatory app lock setup screen shown after login if lock is not configured.
 * Implements adaptive pattern:
 * - If biometrics available: Show Face ID/Touch ID setup with PIN backup
 * - If no biometrics: Show PIN setup only
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
import PinPad from '../../../components2/PinPad';
import appLockService, { BiometricCapabilities } from '../../../services/AppLockService';
import { logger } from '../../../utils/logger';
import { useKycCompletion } from '../../../hooks-actions/useKycCompletion';

interface AppLockSetupScreenProps {
  /** Callback when setup is complete */
  onComplete: () => void;
  /** User's name for personalization */
  userName?: string;
}

type SetupStep = 'intro' | 'biometric' | 'pin_create' | 'pin_confirm' | 'complete';

const AppLockSetupScreen: React.FC<AppLockSetupScreenProps> = ({
  onComplete,
  userName = 'there',
}) => {
  const { theme } = useTheme();
  const { height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 700;
  const { completeStep } = useKycCompletion(); // For syncing PIN to backend

  // State
  const [step, setStep] = useState<SetupStep>('intro');
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Check biometric capabilities and existing PIN (from KYC sync) on mount
  useEffect(() => {
    const checkCapabilitiesAndExistingPin = async () => {
      setIsLoading(true);

      // PROFESSIONAL: Check if PIN already exists (synced from KYC passcode)
      // If user already set up passcode during KYC, we use that for app lock too
      const isAlreadyConfigured = await appLockService.isConfigured();
      if (isAlreadyConfigured) {
        logger.info('[AppLockSetup] ✅ PIN already configured (likely from KYC passcode sync) - skipping setup');
        // Go straight to complete and exit
        setStep('complete');
        setIsLoading(false);
        setTimeout(onComplete, 300); // Quick transition - user already set up PIN
        return;
      }

      const caps = await appLockService.detectBiometricCapabilities();
      setBiometricCapabilities(caps);
      setIsLoading(false);
      logger.debug(`[AppLockSetup] Biometric capabilities: ${JSON.stringify(caps)}`);
    };
    checkCapabilitiesAndExistingPin();
  }, [onComplete]);

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
      logger.info('[AppLockSetup] Biometric setup successful');
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

  // Handle PIN creation
  useEffect(() => {
    if (step === 'pin_create' && pin.length === 6) {
      logger.debug('[AppLockSetup] PIN created (6 digits), moving to confirm step');
      // Move to confirm step
      setStep('pin_confirm');
    }
  }, [pin, step]);

  // Handle PIN confirmation
  useEffect(() => {
    if (step === 'pin_confirm' && confirmPin.length === 6) {
      logger.debug('[AppLockSetup] Confirm PIN entered (6 digits), checking match...');
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

    // Step 1: Save PIN locally to AppLockService
    const result = await appLockService.setupPin(pin);

    if (result.success) {
      logger.info('[AppLockSetup] PIN setup successful locally');

      // Step 2: Sync PIN to backend (KYC passcode endpoint) - TWO-WAY SYNC
      // This ensures KYC passcode step will be auto-completed
      try {
        logger.info('[AppLockSetup] Syncing PIN to backend...');
        await completeStep('setup_security', { passcode: pin }, {
          skipNavigation: true,  // Don't navigate, we handle that ourselves
          showSuccessAlert: false,
        });
        logger.info('[AppLockSetup] ✅ PIN synced to backend - KYC passcode step complete!');
      } catch (syncError) {
        // Non-fatal: Local PIN is saved, backend sync can retry later
        logger.warn('[AppLockSetup] ⚠️ Backend sync failed (non-fatal):', syncError);
      }

      setIsLoading(false);
      setStep('complete');
      // Auto-proceed after showing success briefly
      setTimeout(onComplete, 500);
    } else {
      setIsLoading(false);
      Alert.alert('Setup Failed', result.error || 'Please try again.');
      setPin('');
      setConfirmPin('');
      setStep('pin_create');
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

  // Intro step
  if (step === 'intro') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={40} color={theme.colors.primary} />
          </View>

          <Text style={styles.title}>Secure Your Account</Text>
          <Text style={styles.subtitle}>
            Hi {userName}! Set up quick unlock to access your account instantly and securely.
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="flash" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.featureText}>Instant unlock - no waiting for network</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="lock-closed" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.featureText}>Your money stays protected</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="time" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.featureText}>Stay logged in for 30+ days</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
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

  // PIN create step
  if (step === 'pin_create') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />
        <View style={styles.content}>
          <View style={styles.pinContainer}>
            <Text style={styles.pinTitle}>
              {hasBiometrics ? 'Create Backup PIN' : 'Create Your PIN'}
            </Text>
            <Text style={styles.pinSubtitle}>
              {hasBiometrics
                ? 'This PIN is used when Face ID is unavailable'
                : 'Enter a 6-digit PIN to secure your account'}
            </Text>
            <PinPad
              value={pin}
              onChange={setPin}
              disabled={isLoading}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // PIN confirm step
  if (step === 'pin_confirm') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />
        <View style={styles.content}>
          <View style={styles.pinContainer}>
            <Text style={styles.pinTitle}>Confirm Your PIN</Text>
            <Text style={styles.pinSubtitle}>Enter the same PIN again to confirm</Text>
            {pinError && <Text style={styles.errorText}>{pinError}</Text>}
            <PinPad
              value={confirmPin}
              onChange={setConfirmPin}
              error={!!pinError}
              disabled={isLoading}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Complete step
  if (step === 'complete') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />
        <View style={styles.content}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={40} color={theme.colors.success} />
            </View>
            <Text style={styles.title}>You're All Set!</Text>
            <Text style={styles.subtitle}>
              Your account is now protected with quick unlock.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return null;
};

export default AppLockSetupScreen;
