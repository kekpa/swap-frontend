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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import PinPad from '../components2/PinPad';
import appLockService, { BiometricCapabilities } from '../services/AppLockService';
import { logger } from '../utils/logger';

interface LockScreenProps {
  /** User's display name for "Welcome back" */
  userName?: string;
  /** Callback when unlock is successful */
  onUnlock: () => void;
  /** Callback when user wants to log out */
  onLogout: () => void;
}

type UnlockMode = 'biometric' | 'pin';

const LockScreen: React.FC<LockScreenProps> = ({
  userName = 'there',
  onUnlock,
  onLogout,
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

  // Auto-trigger biometric on mount if available
  useEffect(() => {
    if (mode === 'biometric' && biometricCapabilities?.isEnrolled) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        handleBiometricUnlock();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [mode, biometricCapabilities]);

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
        setError(result.error || 'Authentication failed');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, onUnlock]);

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
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    logo: {
      width: isSmallScreen ? 60 : 80,
      height: isSmallScreen ? 60 : 80,
      marginBottom: theme.spacing.lg,
    },
    greeting: {
      fontSize: isSmallScreen ? theme.typography.fontSize.xl : theme.typography.fontSize.xxl,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xl,
      textAlign: 'center',
    },
    biometricContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
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
      fontSize: isSmallScreen ? theme.typography.fontSize.lg : theme.typography.fontSize.xl,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    footer: {
      paddingVertical: theme.spacing.lg,
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
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <View style={styles.content}>
        {/* Logo */}
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />

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
    </SafeAreaView>
  );
};

export default LockScreen;
