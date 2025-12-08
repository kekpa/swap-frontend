/**
 * BusinessPinInputModal Component
 *
 * Bottom sheet modal for entering business access PIN when switching profiles.
 * Shows a 4-6 digit PIN pad with error handling and lockout messages.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useTheme } from '../theme/ThemeContext';
import PinPad from '../components2/PinPad';

interface BusinessPinInputModalProps {
  visible: boolean;
  businessName: string;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
  lockoutUntil?: Date | null;
}

const BusinessPinInputModal: React.FC<BusinessPinInputModalProps> = ({
  visible,
  businessName,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
  lockoutUntil = null,
}) => {
  const { theme } = useTheme();
  const bottomSheetRef = React.useRef<BottomSheet>(null);
  const [pin, setPin] = useState('');

  // Calculate snap index based on visible prop
  const snapIndex = useMemo(() => (visible ? 0 : -1), [visible]);

  // Clear PIN when modal becomes visible or on error
  useEffect(() => {
    if (visible) {
      setPin('');
    }
  }, [visible]);

  // Clear PIN on error
  useEffect(() => {
    if (error) {
      setPin('');
    }
  }, [error]);

  // Handle PIN change - auto-submit when PIN is complete (4-6 digits)
  const handlePinChange = useCallback((value: string) => {
    setPin(value);

    // Auto-submit when PIN is 4-6 digits
    // Most PINs are 4 digits, but we support up to 6
    if (value.length >= 4 && value.length <= 6) {
      // Wait a brief moment to show the last digit, then submit
      setTimeout(() => {
        onSubmit(value);
      }, 100);
    }
  }, [onSubmit]);

  // Check if currently locked out
  const isLockedOut = lockoutUntil && new Date(lockoutUntil) > new Date();
  const lockoutRemaining = isLockedOut
    ? Math.ceil((new Date(lockoutUntil).getTime() - Date.now()) / 60000)
    : 0;

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: theme.colors.card,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: theme.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          marginBottom: theme.spacing.lg,
        },
        cancelButton: {
          padding: theme.spacing.xs,
        },
        cancelText: {
          fontSize: theme.typography.fontSize.md,
          color: theme.colors.primary,
        },
        headerTitle: {
          fontSize: theme.typography.fontSize.lg,
          fontWeight: '600',
          color: theme.colors.textPrimary,
        },
        placeholder: {
          width: 60,
        },
        businessName: {
          fontSize: theme.typography.fontSize.md,
          fontWeight: '500',
          color: theme.colors.textPrimary,
          textAlign: 'center',
          marginBottom: theme.spacing.xs,
        },
        subtitle: {
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
          textAlign: 'center',
          marginBottom: theme.spacing.lg,
        },
        pinContainer: {
          alignItems: 'center',
          paddingVertical: theme.spacing.md,
        },
        errorContainer: {
          backgroundColor: theme.colors.error + '15',
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.sm,
          marginBottom: theme.spacing.md,
        },
        errorText: {
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.error,
          textAlign: 'center',
        },
        lockoutContainer: {
          backgroundColor: theme.colors.warning + '15',
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.sm,
          marginBottom: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        },
        lockoutText: {
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.warning,
          marginLeft: theme.spacing.xs,
        },
        loadingContainer: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.card + 'CC',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
        },
      }),
    [theme]
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={snapIndex}
      snapPoints={['70%']}
      enablePanDownToClose={!isLoading}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.card }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      onChange={(index) => {
        if (index === -1 && !isLoading) {
          onCancel();
        }
      }}
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isLoading}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business PIN</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Business Name */}
        <Text style={styles.businessName}>{businessName}</Text>
        <Text style={styles.subtitle}>
          Enter your PIN to access this business profile
        </Text>

        {/* Error Message */}
        {error && !isLockedOut && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Lockout Message */}
        {isLockedOut && (
          <View style={styles.lockoutContainer}>
            <Ionicons name="lock-closed" size={18} color={theme.colors.warning} />
            <Text style={styles.lockoutText}>
              Too many attempts. Try again in {lockoutRemaining} minute{lockoutRemaining !== 1 ? 's' : ''}.
            </Text>
          </View>
        )}

        {/* PIN Pad */}
        <View style={styles.pinContainer}>
          <PinPad
            value={pin}
            onChange={handlePinChange}
            length={6}
            error={!!error}
            disabled={isLoading || isLockedOut}
          />
        </View>

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
};

export default BusinessPinInputModal;
