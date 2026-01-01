import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../navigation/profileNavigator';
import { useTheme } from '../theme/ThemeContext';
import { useKycCompletion } from '../hooks-actions/useKycCompletion';
import PinPad from './PinPad';
import appLockService from '../services/AppLockService';
import logger from '../utils/logger';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;
type PasscodeScreenRouteProp = RouteProp<ProfileStackParamList, 'Passcode'>;

type PasscodeMode = 'create' | 'confirm';

interface PasscodeProps {
  onPasscodeConfirmed?: (passcode: string) => void;
}

// Created: Added Passcode component for secure passcode creation and confirmation - 2025-XX-XX
// Updated: Integrated with backend API to store passcode in Supabase user metadata during KYC flow - 2025-06-07
// Updated: Made responsive for small screens like iPhone SE - 2025-06-08
// Updated: Added context-aware navigation for better UX when updating vs first-time KYC - 2025-01-26

const PasscodeScreen: React.FC<PasscodeProps> = ({ 
  onPasscodeConfirmed 
}) => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PasscodeScreenRouteProp>();
  const { theme } = useTheme();
  const { completeStep } = useKycCompletion(); // ✅ Updated to use completeStep (industry standard)
  const isKycFlow = route.params?.isKycFlow || false;
  const isBusiness = route.params?.isBusiness || false;
  const personalUsername = route.params?.personalUsername;
  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;
  
  logger.debug('PasscodeScreen mounted', 'auth', { isKycFlow, returnToTimeline, sourceRoute });

  const [mode, setMode] = useState<PasscodeMode>('create');
  const [passcode, setPasscode] = useState<string>('');
  const [originalPasscode, setOriginalPasscode] = useState<string>('');
  const [hasExistingPin, setHasExistingPin] = useState<boolean>(false);
  const [isCheckingExistingPin, setIsCheckingExistingPin] = useState<boolean>(true);

  // Check if PIN already exists from AppLock setup (TWO-WAY SYNC)
  // If user already set up PIN via AppLockSetupScreen, we just need them to verify it
  useEffect(() => {
    const checkExistingPin = async () => {
      if (!isKycFlow) {
        setIsCheckingExistingPin(false);
        return;
      }

      try {
        const isConfigured = await appLockService.isConfigured();
        if (isConfigured) {
          logger.debug('PIN already exists from AppLock - switching to verify mode', 'auth');
          setHasExistingPin(true);
          setMode('confirm'); // Skip create, just verify existing PIN
        }
      } catch (error) {
        logger.warn('Error checking existing PIN', 'auth');
      } finally {
        setIsCheckingExistingPin(false);
      }
    };
    checkExistingPin();
  }, [isKycFlow]);

  // Get screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 700; // iPhone SE and similar
  const isTinyScreen = screenHeight < 600; // Even smaller screens

  const handleBack = () => {
    logger.debug('handleBack called', 'auth', { mode, isKycFlow, returnToTimeline, sourceRoute });
    if (mode === 'confirm') {
      setMode('create');
      setPasscode('');
    } else if (isKycFlow) {
      // Always return to timeline when in KYC flow
      if (returnToTimeline) {
        logger.debug('Returning to VerifyYourIdentity timeline', 'auth');
        navigation.navigate('VerifyYourIdentity', sourceRoute ? { sourceRoute } : undefined);
      } else {
        // Default KYC back behavior
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
          navigation.navigate('VerifyYourIdentity', sourceRoute ? { sourceRoute } : undefined);
        }
      }
    } else {
      if (navigation.canGoBack()) navigation.goBack();
    }
  };

  useEffect(() => {
    if (passcode.length === 6) {
      if (mode === 'create') {
        setOriginalPasscode(passcode);
        setPasscode('');
        setMode('confirm');
      } else {
        // Confirm mode - either verifying against originalPasscode OR existing AppLock PIN
        if (hasExistingPin) {
          // Verify against existing AppLock PIN
          logger.debug('Verifying against existing AppLock PIN', 'auth');
          verifyExistingPin(passcode);
        } else if (passcode === originalPasscode) {
          // Passcode confirmed successfully (normal create flow)
          logger.info('Passcode set successfully', 'auth');

          if (onPasscodeConfirmed) {
            onPasscodeConfirmed(passcode);
          } else if (isKycFlow) {
            logger.debug('KYC flow confirmed. Storing passcode in backend', 'auth');
            // Store passcode in backend during KYC flow
            storePasscodeInBackend(passcode);
          } else {
            // Default behavior for non-KYC flow
          setTimeout(() => {
            navigation.goBack();
            }, 500);
          }
        } else {
          // Passcode doesn't match
          logger.warn('Passcodes do not match', 'auth');
          setPasscode('');
          // Show error message
        }
      }
    }
  }, [passcode, mode, originalPasscode, navigation, onPasscodeConfirmed, isKycFlow, sourceRoute, hasExistingPin]);

  // Verify existing PIN from AppLock and sync to backend
  const verifyExistingPin = async (enteredPin: string) => {
    try {
      logger.debug('Verifying PIN against AppLockService', 'auth');
      const result = await appLockService.unlockWithPin(enteredPin);

      if (result.success) {
        logger.info('PIN verified! Syncing to backend for KYC', 'auth');
        // PIN is correct - sync to backend for KYC completion
        storePasscodeInBackend(enteredPin);
      } else {
        logger.warn('PIN incorrect', 'auth');
        setPasscode('');
        // Could show an error here
      }
    } catch (error) {
      logger.error('PIN verification error', error, 'auth');
      setPasscode('');
    }
  };

  const storePasscodeInBackend = async (confirmedPasscode: string) => {
    logger.debug('Starting professional KYC completion for passcode', 'auth');

    // Use professional KYC completion system
    const result = await completeStep('passcode_setup', { passcode: confirmedPasscode }, {
      returnToTimeline,
      sourceRoute,
      showSuccessAlert: false,
      customSuccessMessage: 'Passcode setup completed successfully!',
      skipNavigation: !isKycFlow // Skip navigation if not in KYC flow
    });

    if (result.success) {
      logger.info('Professional passcode completion successful', 'auth');

      // PROFESSIONAL: Sync KYC passcode to local AppLockService for unified PIN experience
      // This ensures user only needs ONE PIN for both transactions and app lock (Revolut-style)
      try {
        logger.debug('Syncing passcode to AppLockService for unified PIN', 'auth');
        await appLockService.setupPin(confirmedPasscode);
        logger.info('AppLockService PIN synced successfully - user has ONE PIN for everything', 'auth');
      } catch (pinError) {
        logger.warn('Failed to sync PIN to AppLockService (non-fatal)', 'auth');
        // Non-fatal: KYC passcode is still saved to backend
      }

      // Add a small delay for better UX
      setTimeout(() => {
        if (!isKycFlow) {
          // Default behavior for non-KYC usage
          logger.debug('Non-KYC flow, navigating to VerificationComplete', 'auth');
          navigation.navigate('VerificationComplete');
        }
        // KYC navigation is handled by the completion system
      }, 500);
    } else {
      logger.warn('Professional passcode completion failed - handled by completion system', 'auth');
    }
  };

  const handlePinChange = (newValue: string) => {
    setPasscode(newValue);
  };

  const styles = useMemo(() => {
    const titleFontSize = isTinyScreen ? theme.typography.fontSize.xl : isSmallScreen ? theme.typography.fontSize.xxl - 2 : theme.typography.fontSize.xxl;
    const subtitleFontSize = isSmallScreen ? theme.typography.fontSize.sm : theme.typography.fontSize.md;
    const containerPadding = isSmallScreen ? theme.spacing.md : theme.spacing.lg;
    const verticalSpacing = isTinyScreen ? theme.spacing.md : isSmallScreen ? theme.spacing.lg : theme.spacing.xl;

    return StyleSheet.create({
      container: { flex: 1, backgroundColor: theme.colors.card },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm + 2,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.card
      },
      backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
      headerTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: '600', color: theme.colors.textPrimary },
      passcodeContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: containerPadding,
        paddingTop: containerPadding,
        justifyContent: isSmallScreen ? 'flex-start' : 'center',
        backgroundColor: theme.colors.background,
      },
      passcodeTitle: {
        fontSize: titleFontSize,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
        marginTop: isSmallScreen ? theme.spacing.md : 0
      },
      passcodeSubtitle: {
        fontSize: subtitleFontSize,
        color: theme.colors.textSecondary,
        marginBottom: verticalSpacing,
        textAlign: 'center',
        paddingHorizontal: theme.spacing.md,
        lineHeight: isSmallScreen ? 18 : 22
      },
      pinPadContainer: {
        marginBottom: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
      },
      securityText: {
        fontSize: isSmallScreen ? theme.typography.fontSize.xs : theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginHorizontal: theme.spacing.lg,
        lineHeight: isSmallScreen ? 16 : 20,
        marginTop: isSmallScreen ? 'auto' : 'auto',
        paddingBottom: isSmallScreen ? theme.spacing.sm : theme.spacing.lg
      },
      // Subtle "via @username" caption for business profile switch
      viaCaption: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.md,
        opacity: 0.8,
      },
    });
  }, [theme, isSmallScreen, isTinyScreen]);

  // Show loading while checking for existing PIN
  if (isCheckingExistingPin) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.card}/>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.card}/>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Passcode
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Info banner for business profile users */}
      {isBusiness && (
        <View style={{
          backgroundColor: theme.colors.primaryUltraLight,
          padding: theme.spacing.md,
          marginHorizontal: theme.spacing.md,
          marginTop: theme.spacing.sm,
          borderRadius: theme.borderRadius.sm,
          borderLeftWidth: 3,
          borderLeftColor: theme.colors.primary,
        }}>
          <Text style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm,
          }}>
            Note: This PIN is shared across all your profiles
          </Text>
        </View>
      )}

      <View style={styles.passcodeContainer}>
        <Text style={styles.passcodeTitle}>
          {hasExistingPin
            ? 'Enter your PIN'
            : mode === 'create'
              ? 'Create your passcode'
              : 'Confirm your passcode'}
        </Text>
        <Text style={styles.passcodeSubtitle}>
          {hasExistingPin
            ? 'Enter your app lock PIN to continue.'
            : mode === 'create'
              ? 'Enter a 6-digit passcode for your account.'
              : 'Re-enter your 6-digit passcode to confirm.'}
        </Text>

        {/* Subtle "via @username" indicator for business profile switch */}
        {isBusiness && personalUsername && (
          <Text style={styles.viaCaption}>via @{personalUsername}</Text>
        )}

        <View style={styles.pinPadContainer}>
          <PinPad
            value={passcode}
            onChange={handlePinChange}
          />
        </View>

        <Text style={styles.securityText}>
          This passcode will be used to access your account.{'\n'}
          Make sure it's secure and don't share it with anyone.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default PasscodeScreen; 
 