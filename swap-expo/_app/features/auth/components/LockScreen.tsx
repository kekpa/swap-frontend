/**
 * LockScreen
 *
 * Revolut-style app lock screen with:
 * - Instant Face ID / Touch ID unlock
 * - PIN fallback
 * - "Not you? Log out" option
 *
 * This is LOCAL only - no network calls during unlock.
 *
 * @created 2025-12-01
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  AppState,
  AppStateStatus,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import PinPad from '../../../components2/PinPad';
import appLockService, { BiometricCapabilities } from '../../../services/AppLockService';
import { logger } from '../../../utils/logger';
import { loginService } from '../../../services/auth/LoginService';

// Map raw biometric error codes to user-friendly messages
const getBiometricErrorMessage = (error: string): string | null => {
  const errorMessages: Record<string, string | null> = {
    // User actions - don't show error, just let them retry
    'user_cancel': null,
    'system_cancel': null,
    'app_cancel': null,
    // Device issues
    'not_enrolled': 'Biometrics not set up on this device',
    'not_available': 'Biometrics not available',
    'lockout': 'Too many attempts. Use PIN instead',
    'lockout_permanent': 'Biometrics disabled. Use PIN instead',
    // Generic fallbacks
    'authentication_failed': 'Authentication failed. Try again',
  };

  // Check if we have a mapped message
  const mapped = errorMessages[error];
  if (mapped !== undefined) return mapped; // null means suppress

  // Don't show technical errors
  if (error.includes('cancel') || error.includes('Cancel')) return null;

  // Default: show generic message for unknown errors
  return 'Authentication failed. Try again';
};

interface LockScreenProps {
  /** User's display name for "Welcome back" */
  userName?: string;
  /** User's identifier for password verification (email/phone/username) */
  userIdentifier?: string;
  /** Callback when unlock is successful */
  onUnlock: () => void;
  /** Callback when user wants to log out */
  onLogout: () => void;
  /** Callback when PIN reset is complete (password verified, ready for new PIN setup) */
  onPinReset?: () => void;
}

type UnlockMode = 'biometric' | 'pin';

const LockScreen: React.FC<LockScreenProps> = ({
  userName = 'there',
  userIdentifier,
  onUnlock,
  onLogout,
  onPinReset,
}) => {
  const { theme } = useTheme();
  const { height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 700;

  // State
  const [mode, setMode] = useState<UnlockMode>('biometric');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Forgot PIN state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Check biometric capabilities on mount
  useEffect(() => {
    const checkCapabilities = async () => {
      const caps = await appLockService.detectBiometricCapabilities();
      setBiometricCapabilities(caps);

      // If no biometrics, go straight to PIN mode
      if (!caps.hasHardware || !caps.isEnrolled) {
        setMode('pin');
      }
    };
    checkCapabilities();
  }, []);

  // Track app state for auto-triggering biometric when returning to app
  const appState = useRef(AppState.currentState);
  const biometricTriggeredForSession = useRef(false);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds > 0) {
      const timer = setInterval(() => {
        setLockoutSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutSeconds]);

  // Handle PIN completion
  useEffect(() => {
    if (pin.length === 6) {
      handlePinUnlock(pin);
    }
  }, [pin]);

  const handleBiometricUnlock = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await appLockService.unlockWithBiometric();

      if (result.success) {
        logger.info('[LockScreen] Biometric unlock successful');
        onUnlock();
      } else {
        // Check for lockout
        const lockout = appLockService.isLockedOut();
        if (lockout.lockedOut) {
          setLockoutSeconds(Math.ceil(lockout.remainingMs / 1000));
        }
        // Use friendly error message (suppress cancel errors)
        const friendlyError = getBiometricErrorMessage(result.error || 'authentication_failed');
        if (friendlyError) {
          setError(friendlyError);
        }
        // If null, user cancelled - don't show error, just let them retry
      }
    } catch (err: any) {
      const friendlyError = getBiometricErrorMessage(err.message || 'authentication_failed');
      if (friendlyError) {
        setError(friendlyError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, onUnlock]);

  // Auto-trigger biometric on mount if available (Revolut-style instant unlock)
  useEffect(() => {
    if (mode === 'biometric' && biometricCapabilities?.isEnrolled && !biometricTriggeredForSession.current) {
      biometricTriggeredForSession.current = true;
      // Small delay to ensure UI is ready (prevents issues on some devices)
      const timer = setTimeout(() => {
        handleBiometricUnlock();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mode, biometricCapabilities, handleBiometricUnlock]);

  // Listen for app state changes to auto-trigger biometric when returning from background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // App came to foreground from background/inactive
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        mode === 'biometric' &&
        biometricCapabilities?.isEnrolled &&
        !isLoading
      ) {
        logger.debug('[LockScreen] App returned to foreground - auto-triggering biometric');
        // Small delay to ensure app is fully active
        setTimeout(() => {
          handleBiometricUnlock();
        }, 200);
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [mode, biometricCapabilities, isLoading, handleBiometricUnlock]);

  const handlePinUnlock = useCallback(async (enteredPin: string) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await appLockService.unlockWithPin(enteredPin);

      if (result.success) {
        logger.info('[LockScreen] PIN unlock successful');
        onUnlock();
      } else {
        // Check for lockout
        const lockout = appLockService.isLockedOut();
        if (lockout.lockedOut) {
          setLockoutSeconds(Math.ceil(lockout.remainingMs / 1000));
        }
        setError(result.error || 'Incorrect PIN');
        setPin(''); // Clear PIN on error
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, onUnlock]);

  const handleSwitchToPin = () => {
    setMode('pin');
    setError(null);
    setPin('');
  };

  const handleSwitchToBiometric = () => {
    if (biometricCapabilities?.isEnrolled) {
      setMode('biometric');
      setError(null);
      setPin('');
    }
  };

  // Forgot PIN handlers
  const handleForgotPin = () => {
    setShowPasswordModal(true);
    setPassword('');
    setPasswordError(null);
  };

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setPassword('');
    setPasswordError(null);
    setShowPassword(false);
  };

  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setPasswordError('Please enter your password');
      return;
    }

    if (!userIdentifier) {
      setPasswordError('Unable to verify - missing user identifier');
      return;
    }

    setIsVerifyingPassword(true);
    setPasswordError(null);

    try {
      // Verify password with backend
      const result = await loginService.login(userIdentifier, password);

      if (result.success) {
        logger.info('[LockScreen] Password verified, unlocking app');

        // Just unlock - user is now authenticated via password
        await appLockService.unlock();

        // Close modal and go to app
        handleClosePasswordModal();
        onUnlock();
      } else {
        setPasswordError(result.message || 'Incorrect password');
      }
    } catch (err: any) {
      logger.error('[LockScreen] Password verification error:', err);
      setPasswordError('Verification failed. Please try again.');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const getBiometricIcon = (): string => {
    if (biometricCapabilities?.biometricType === 'facial') {
      return 'scan-outline'; // Face ID
    }
    return 'finger-print-outline'; // Touch ID / Fingerprint
  };

  const getBiometricLabel = (): string => {
    if (biometricCapabilities?.biometricType === 'facial') {
      return 'Face ID';
    }
    return 'Touch ID';
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: isSmallScreen ? 'flex-start' : 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: isSmallScreen ? theme.spacing.xl : 0,
    },
    logoContainer: {
      backgroundColor: '#8b14fd',
      paddingHorizontal: isSmallScreen ? 12 : 18,
      paddingVertical: isSmallScreen ? 5 : 10,
      borderRadius: 8,
      marginBottom: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
    },
    logoText: {
      color: '#FFFFFF',
      fontSize: isSmallScreen ? 24 : 30,
      fontWeight: '700',
      fontStyle: 'italic',
    },
    greeting: {
      fontSize: isSmallScreen ? theme.typography.fontSize.lg : theme.typography.fontSize.xxl,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: isSmallScreen ? theme.spacing.xs : theme.spacing.sm,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: isSmallScreen ? theme.typography.fontSize.sm : theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      marginBottom: isSmallScreen ? theme.spacing.lg : theme.spacing.xl,
      textAlign: 'center',
    },
    biometricContainer: {
      alignItems: 'center',
      marginBottom: isSmallScreen ? theme.spacing.md : theme.spacing.xl,
    },
    biometricButton: {
      width: isSmallScreen ? 80 : 100,
      height: isSmallScreen ? 80 : 100,
      borderRadius: isSmallScreen ? 40 : 50,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      ...theme.shadows.medium,
    },
    biometricButtonDisabled: {
      backgroundColor: theme.colors.inputBorder,
    },
    biometricLabel: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
    },
    switchModeButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    switchModeText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.primary,
    },
    errorContainer: {
      marginVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      textAlign: 'center',
    },
    lockoutText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.warning,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    pinContainer: {
      width: '100%',
      alignItems: 'center',
    },
    pinTitle: {
      fontSize: isSmallScreen ? theme.typography.fontSize.md : theme.typography.fontSize.xl,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: isSmallScreen ? theme.spacing.sm : theme.spacing.lg,
      textAlign: 'center',
    },
    footer: {
      paddingVertical: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
    },
    logoutButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    logoutText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    logoutTextBold: {
      color: theme.colors.error,
      fontWeight: '600',
    },
    forgotPinButton: {
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    forgotPinText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
    },
    // Password modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    modalContent: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      ...theme.shadows.large,
    },
    modalTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    passwordInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.md,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
    },
    passwordToggle: {
      padding: theme.spacing.md,
    },
    modalError: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    modalCancelButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
    },
    modalVerifyButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    modalVerifyText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.white,
      fontWeight: '600',
    },
    modalVerifyButtonDisabled: {
      backgroundColor: theme.colors.inputBorder,
    },
  }), [theme, isSmallScreen]);

  const renderBiometricMode = () => (
    <View style={styles.biometricContainer}>
      <TouchableOpacity
        style={[
          styles.biometricButton,
          (isLoading || lockoutSeconds > 0) && styles.biometricButtonDisabled,
        ]}
        onPress={handleBiometricUnlock}
        disabled={isLoading || lockoutSeconds > 0}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.white} />
        ) : (
          <Ionicons
            name={getBiometricIcon() as any}
            size={isSmallScreen ? 36 : 48}
            color={theme.colors.white}
          />
        )}
      </TouchableOpacity>
      <Text style={styles.biometricLabel}>
        Tap to unlock with {getBiometricLabel()}
      </Text>
    </View>
  );

  const renderPinMode = () => (
    <View style={styles.pinContainer}>
      <Text style={styles.pinTitle}>Enter your PIN</Text>
      <PinPad
        value={pin}
        onChange={setPin}
        error={!!error}
        disabled={isLoading || lockoutSeconds > 0}
      />
      {onPinReset && userIdentifier && (
        <TouchableOpacity style={styles.forgotPinButton} onPress={handleForgotPin}>
          <Text style={styles.forgotPinText}>Forgot PIN?</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPasswordModal = () => (
    <Modal
      visible={showPasswordModal}
      transparent
      animationType="fade"
      onRequestClose={handleClosePasswordModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Sign in with password</Text>
          <Text style={styles.modalSubtitle}>
            Use your password to unlock the app
          </Text>

          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter password"
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isVerifyingPassword}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {passwordError && (
            <Text style={styles.modalError}>{passwordError}</Text>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={handleClosePasswordModal}
              disabled={isVerifyingPassword}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalVerifyButton,
                isVerifyingPassword && styles.modalVerifyButtonDisabled,
              ]}
              onPress={handleVerifyPassword}
              disabled={isVerifyingPassword}
            >
              {isVerifyingPassword ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Text style={styles.modalVerifyText}>Sign in</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <View style={styles.content}>
        {/* Logo - Text style matching app branding */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Swap</Text>
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>Welcome back, {userName}</Text>
        <Text style={styles.subtitle}>
          {mode === 'biometric'
            ? `Use ${getBiometricLabel()} to unlock`
            : 'Enter your PIN to unlock'}
        </Text>

        {/* Lockout warning */}
        {lockoutSeconds > 0 && (
          <Text style={styles.lockoutText}>
            Too many attempts. Try again in {lockoutSeconds}s
          </Text>
        )}

        {/* Error */}
        {error && !lockoutSeconds && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Unlock UI */}
        {mode === 'biometric' ? renderBiometricMode() : renderPinMode()}

        {/* Switch mode button */}
        {mode === 'biometric' ? (
          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={handleSwitchToPin}
          >
            <Text style={styles.switchModeText}>Use PIN instead</Text>
          </TouchableOpacity>
        ) : biometricCapabilities?.isEnrolled ? (
          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={handleSwitchToBiometric}
          >
            <Text style={styles.switchModeText}>Use {getBiometricLabel()} instead</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Footer with logout */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>
            Not you?{' '}
            <Text style={styles.logoutTextBold}>Log out</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Password verification modal for PIN reset */}
      {renderPasswordModal()}
    </SafeAreaView>
  );
};

export default LockScreen;
