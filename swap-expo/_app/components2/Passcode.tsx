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
  
  console.log(`[PasscodeScreen] Mounted/Focused. isKycFlow: ${isKycFlow}, returnToTimeline: ${returnToTimeline}, sourceRoute: ${sourceRoute}`);

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
          console.log('[PasscodeScreen] ✅ PIN already exists from AppLock - switching to verify mode');
          setHasExistingPin(true);
          setMode('confirm'); // Skip create, just verify existing PIN
        }
      } catch (error) {
        console.warn('[PasscodeScreen] Error checking existing PIN:', error);
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
    console.log(`[PasscodeScreen] handleBack called. mode: ${mode}, isKycFlow: ${isKycFlow}, returnToTimeline: ${returnToTimeline}, sourceRoute: ${sourceRoute}`);
    if (mode === 'confirm') {
      setMode('create');
      setPasscode('');
    } else if (isKycFlow) {
      // Always return to timeline when in KYC flow
      if (returnToTimeline) {
        console.log(`[PasscodeScreen] Returning to VerifyYourIdentity timeline`);
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
          console.log('[PasscodeScreen] Verifying against existing AppLock PIN...');
          verifyExistingPin(passcode);
        } else if (passcode === originalPasscode) {
          // Passcode confirmed successfully (normal create flow)
          console.log('Passcode set successfully');

          if (onPasscodeConfirmed) {
            onPasscodeConfirmed(passcode);
          } else if (isKycFlow) {
            console.log(`[PasscodeScreen] KYC flow confirmed. Storing passcode in backend...`);
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
          console.log('Passcodes do not match');
          setPasscode('');
          // Show error message
        }
      }
    }
  }, [passcode, mode, originalPasscode, navigation, onPasscodeConfirmed, isKycFlow, sourceRoute, hasExistingPin]);

  // Verify existing PIN from AppLock and sync to backend
  const verifyExistingPin = async (enteredPin: string) => {
    try {
      console.log('[PasscodeScreen] 🔐 Verifying PIN against AppLockService...');
      const result = await appLockService.unlockWithPin(enteredPin);

      if (result.success) {
        console.log('[PasscodeScreen] ✅ PIN verified! Syncing to backend for KYC...');
        // PIN is correct - sync to backend for KYC completion
        storePasscodeInBackend(enteredPin);
      } else {
        console.log('[PasscodeScreen] ❌ PIN incorrect');
        setPasscode('');
        // Could show an error here
      }
    } catch (error) {
      console.error('[PasscodeScreen] PIN verification error:', error);
      setPasscode('');
    }
  };

  const storePasscodeInBackend = async (confirmedPasscode: string) => {
    console.log(`[PasscodeScreen] 🚀 Starting professional KYC completion for passcode...`);

    // Use professional KYC completion system
    const result = await completeStep('passcode_setup', { passcode: confirmedPasscode }, {
      returnToTimeline,
      sourceRoute,
      showSuccessAlert: false,
      customSuccessMessage: 'Passcode setup completed successfully!',
      skipNavigation: !isKycFlow // Skip navigation if not in KYC flow
    });

    if (result.success) {
      console.log(`[PasscodeScreen] ✅ Professional passcode completion successful!`);

      // PROFESSIONAL: Sync KYC passcode to local AppLockService for unified PIN experience
      // This ensures user only needs ONE PIN for both transactions and app lock (Revolut-style)
      try {
        console.log(`[PasscodeScreen] 🔐 Syncing passcode to AppLockService for unified PIN...`);
        await appLockService.setupPin(confirmedPasscode);
        console.log(`[PasscodeScreen] ✅ AppLockService PIN synced successfully - user has ONE PIN for everything!`);
      } catch (pinError) {
        console.warn(`[PasscodeScreen] ⚠️ Failed to sync PIN to AppLockService:`, pinError);
        // Non-fatal: KYC passcode is still saved to backend
      }

      // Add a small delay for better UX
      setTimeout(() => {
        if (!isKycFlow) {
          // Default behavior for non-KYC usage
          console.log(`[PasscodeScreen] Non-KYC flow, navigating to VerificationComplete`);
          navigation.navigate('VerificationComplete');
        }
        // KYC navigation is handled by the completion system
      }, 500);
    } else {
      console.log(`[PasscodeScreen] ❌ Professional passcode completion failed - handled by completion system`);
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
        justifyContent: isSmallScreen ? 'flex-start' : 'center'
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
 