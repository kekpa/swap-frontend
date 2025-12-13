/**
 * ProfileSwitcherModal Component
 *
 * Bottom sheet modal for switching between user profiles (personal + business).
 * Enterprise security pattern with inline PIN entry for business profiles.
 *
 * When switching to a business profile that requires PIN verification,
 * shows an inline PIN entry UI within the modal. The PIN is then passed
 * to the parent's onSelectProfile callback for direct API switch.
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useTheme } from '../theme/ThemeContext';
import { AvailableProfile } from '../features/auth/hooks/useAvailableProfiles';
import { getInitials, getAvatarColor } from '../utils/avatarUtils';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import apiClient from '../_api/apiClient';
import { AUTH_PATHS } from '../_api/apiPaths';
import { logger } from '../utils/logger';
import { getPinWithBiometric, storePinForBiometric, hasPinForBiometric } from '../utils/pinUserStorage';
import PinPad from '../components2/PinPad';

interface ProfileSwitcherModalProps {
  visible: boolean;
  profiles: AvailableProfile[];
  currentProfileId: string;
  onSelectProfile: (profile: AvailableProfile, pin?: string) => Promise<{ success: boolean; error?: string }> | void;
  onClose: () => void;
  onAddAccount?: () => void;
  onRemoveAccount?: (profile: AvailableProfile) => void;
  onPinSetupRequired?: (profile: AvailableProfile) => void; // Called when business profile has no PIN set
  isLoading?: boolean;
}

// Response from check-pin endpoint
interface CheckPinResponse {
  pinRequired: boolean;
  pinSet: boolean;
}

const ProfileSwitcherModal: React.FC<ProfileSwitcherModalProps> = ({
  visible,
  profiles,
  currentProfileId,
  onSelectProfile,
  onClose,
  onAddAccount,
  onRemoveAccount,
  onPinSetupRequired,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const { isConnected } = useNetworkStatus();
  const bottomSheetRef = React.useRef<BottomSheet>(null);

  // PIN check state
  const [isCheckingPin, setIsCheckingPin] = useState(false);

  // Inline PIN entry state
  const [pinEntryProfile, setPinEntryProfile] = useState<AvailableProfile | null>(null);
  const [pin, setPin] = useState('');
  const [isPinError, setIsPinError] = useState(false);
  const [pinErrorMessage, setPinErrorMessage] = useState<string | null>(null);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  // Biometric state
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'iris' | null>(null);

  // Check biometric availability on mount
  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        if (!compatible) {
          setIsBiometricAvailable(false);
          return;
        }

        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
          setIsBiometricAvailable(false);
          return;
        }

        setIsBiometricAvailable(true);

        // Determine biometric type for icon/text
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('face');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricType('iris');
        }
      } catch (error) {
        logger.warn('[ProfileSwitcherModal] Biometric check failed:', error);
        setIsBiometricAvailable(false);
      }
    };

    checkBiometric();
  }, []);

  // Auto-expand modal to 80% when PIN entry is active (so keypad doesn't cover content)
  useEffect(() => {
    if (pinEntryProfile && bottomSheetRef.current) {
      // Snap to index 1 (80%) when PIN entry starts
      bottomSheetRef.current.snapToIndex(1);
    }
  }, [pinEntryProfile]);

  // Calculate snap index based on visible prop
  const snapIndex = React.useMemo(() => (visible ? 0 : -1), [visible]);

  // Backdrop component
  const renderBackdrop = React.useCallback(
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

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: theme.colors.card,
          flexDirection: 'column',
        },
        profileRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        profileRowActive: {
          backgroundColor: theme.colors.primaryOpacity10,
        },
        avatarContainer: {
          width: 40,
          height: 40,
          borderRadius: 20,
          marginRight: theme.spacing.sm,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        },
        avatarImage: {
          width: '100%',
          height: '100%',
        },
        avatarText: {
          fontSize: theme.typography.fontSize.lg,
          fontWeight: '600',
          color: theme.colors.white,
        },
        profileInfo: {
          flex: 1,
          flexDirection: 'column',
        },
        profileName: {
          fontSize: theme.typography.fontSize.md,
          fontWeight: '600',
          color: theme.colors.textPrimary,
          marginBottom: 2,
        },
        profileType: {
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
          textTransform: 'capitalize',
        },
        currentIndicator: {
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: theme.colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
        },
        currentIndicatorDot: {
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: theme.colors.primary,
        },
        emptyIndicator: {
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: theme.colors.border,
        },
        loadingContainer: {
          paddingVertical: theme.spacing.xl,
          alignItems: 'center',
        },
        emptyContainer: {
          paddingVertical: theme.spacing.xl,
          alignItems: 'center',
        },
        emptyText: {
          fontSize: theme.typography.fontSize.md,
          color: theme.colors.textSecondary,
        },
        addAccountButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 12,
          paddingHorizontal: theme.spacing.md,
          height: 48,
          backgroundColor: theme.colors.card,
        },
        addAccountText: {
          fontSize: theme.typography.fontSize.md,
          fontWeight: '600',
          color: theme.colors.primary,
          marginLeft: theme.spacing.xs,
        },
        offlineWarning: {
          backgroundColor: '#FFF3CD',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        offlineWarningText: {
          fontSize: theme.typography.fontSize.sm,
          color: '#856404',
          marginLeft: theme.spacing.xs,
          flex: 1,
        },
        // PIN Entry styles
        pinEntryContainer: {
          padding: theme.spacing.lg,
          alignItems: 'center',
        },
        pinEntryHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
        },
        pinEntryAvatar: {
          width: 48,
          height: 48,
          borderRadius: 24,
          marginRight: theme.spacing.md,
          justifyContent: 'center',
          alignItems: 'center',
        },
        pinEntryAvatarText: {
          fontSize: theme.typography.fontSize.xl,
          fontWeight: '600',
          color: theme.colors.white,
        },
        pinEntryProfileInfo: {
          flex: 1,
        },
        pinEntryTitle: {
          fontSize: theme.typography.fontSize.lg,
          fontWeight: '600',
          color: theme.colors.textPrimary,
        },
        pinEntrySubtitle: {
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
        },
        pinInputContainer: {
          flexDirection: 'row',
          justifyContent: 'center',
          marginBottom: theme.spacing.md,
        },
        pinInput: {
          width: 45,
          height: 50,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.md,
          backgroundColor: theme.colors.card,
          textAlign: 'center',
          fontSize: theme.typography.fontSize.xl,
          marginHorizontal: 4,
          color: theme.colors.textPrimary,
        },
        pinInputError: {
          borderColor: theme.colors.error,
        },
        pinErrorText: {
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.error,
          marginBottom: theme.spacing.md,
          textAlign: 'center',
        },
        pinSubmitButton: {
          backgroundColor: theme.colors.primary,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          borderRadius: theme.borderRadius.md,
          width: '100%',
          alignItems: 'center',
          marginBottom: theme.spacing.sm,
        },
        pinSubmitButtonDisabled: {
          opacity: 0.5,
        },
        pinSubmitButtonText: {
          fontSize: theme.typography.fontSize.md,
          fontWeight: '600',
          color: theme.colors.white,
        },
        pinBackButton: {
          paddingVertical: theme.spacing.sm,
        },
        pinBackButtonText: {
          fontSize: theme.typography.fontSize.md,
          color: theme.colors.primary,
        },
        // Biometric styles
        orDivider: {
          flexDirection: 'row',
          alignItems: 'center',
          marginVertical: theme.spacing.md,
          width: '100%',
        },
        orDividerLine: {
          flex: 1,
          height: 1,
          backgroundColor: theme.colors.border,
        },
        orDividerText: {
          marginHorizontal: theme.spacing.md,
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
        },
        biometricButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          borderRadius: theme.borderRadius.md,
          borderWidth: 1,
          borderColor: theme.colors.primary,
          backgroundColor: theme.colors.card,
          width: '100%',
          marginBottom: theme.spacing.sm,
        },
        biometricButtonText: {
          fontSize: theme.typography.fontSize.md,
          fontWeight: '600',
          color: theme.colors.primary,
          marginLeft: theme.spacing.sm,
        },
      }),
    [theme],
  );

  // Check if PIN is required for any profile (personal or business)
  const checkPinRequired = useCallback(async (profileId: string): Promise<CheckPinResponse> => {
    try {
      const { data } = await apiClient.get<CheckPinResponse>(
        AUTH_PATHS.CHECK_PROFILE_PIN(profileId)
      );
      return data;
    } catch (error: any) {
      logger.warn('[ProfileSwitcherModal] Failed to check PIN requirement:', error.message);
      // Default to no PIN required if check fails
      return { pinRequired: false, pinSet: false };
    }
  }, []);

  const handleSelectProfile = useCallback(async (profile: AvailableProfile) => {
    logger.debug('[ProfileSwitcherModal] Profile selected:', {
      profileId: profile.profileId,
      entityId: profile.entityId,
      displayName: profile.displayName,
      type: profile.type,
      currentProfileId
    });

    if (profile.profileId === currentProfileId) {
      // Already on this profile, just close modal
      logger.debug('[ProfileSwitcherModal] Same profile selected, closing modal');
      onClose();
      return;
    }

    // Check if ANY profile requires PIN (both personal and business)
    setIsCheckingPin(true);
    try {
      const pinStatus = await checkPinRequired(profile.profileId);
      logger.debug('[ProfileSwitcherModal] PIN status:', pinStatus);

      if (pinStatus.pinRequired) {
        // PIN exists - show inline PIN entry
        logger.debug('[ProfileSwitcherModal] PIN required, showing inline PIN entry...');
        setIsCheckingPin(false);
        setPinEntryProfile(profile);
        setPin('');
        setIsPinError(false);
        return;
      }

      // SECURITY: Business profiles MUST have PIN set before switching
      // If no PIN exists yet, force user to create one first
      if (!pinStatus.pinSet && profile.type === 'business') {
        logger.debug('[ProfileSwitcherModal] Business profile has no PIN, forcing setup...');
        setIsCheckingPin(false);
        if (onPinSetupRequired) {
          onClose(); // Close modal before navigating
          onPinSetupRequired(profile);
        } else {
          // Fallback: Alert user if callback not provided
          Alert.alert(
            'Setup Required',
            'Please set up a passcode for this business account before switching.',
            [{ text: 'OK' }]
          );
        }
        return;
      }
    } catch (error: any) {
      logger.error('[ProfileSwitcherModal] PIN check failed:', error.message);
    } finally {
      setIsCheckingPin(false);
    }

    // Personal profile without PIN requirement - allow switch
    logger.debug('[ProfileSwitcherModal] Personal profile, no PIN required, triggering switch...');
    onSelectProfile(profile);
  }, [currentProfileId, onClose, onSelectProfile, onPinSetupRequired, checkPinRequired]);

  // Process error message and add guidance for lockout scenarios
  const processErrorMessage = useCallback((errorMsg: string, isBusinessProfile: boolean): string => {
    let message = errorMsg || 'Invalid PIN';

    // Add guidance for lockout scenarios
    if (message.toLowerCase().includes('too many') || message.toLowerCase().includes('locked')) {
      if (isBusinessProfile) {
        message += '\n\nContact your business administrator to reset your PIN, or reach out to Swap support.';
      } else {
        message += '\n\nYou can also use your password to log in again.';
      }
    }

    return message;
  }, []);

  // Handle PIN input change from PinPad
  const handlePinChange = useCallback((newPin: string) => {
    setIsPinError(false);
    setPinErrorMessage(null);
    setPin(newPin);

    // AUTO-SUBMIT: If all 6 digits entered, submit automatically
    if (newPin.length === 6 && !isSubmittingPin && pinEntryProfile) {
      // Small delay for visual feedback before submit
      setTimeout(async () => {
        if (newPin.length !== 6 || !pinEntryProfile) return;

        setIsSubmittingPin(true);
        setIsPinError(false);
        logger.debug('[ProfileSwitcherModal] Auto-submitting PIN for profile switch...');

        try {
          const result = await onSelectProfile(pinEntryProfile, newPin);
          if (result && !result.success) {
            logger.warn('[ProfileSwitcherModal] Switch failed:', result.error);
            const errorMessage = processErrorMessage(
              result.error || 'Invalid PIN. Please try again.',
              pinEntryProfile.type === 'business'
            );
            setPinErrorMessage(errorMessage);
            setIsPinError(true);
            setPin('');
          } else {
            setPinEntryProfile(null);
            setPin('');
            setPinErrorMessage(null);
          }
        } catch (error: any) {
          logger.error('[ProfileSwitcherModal] PIN submit error:', error);
          setPinErrorMessage('Failed to verify PIN. Please try again.');
          setIsPinError(true);
          setPin('');
        } finally {
          setIsSubmittingPin(false);
        }
      }, 100);
    }
  }, [isSubmittingPin, pinEntryProfile, onSelectProfile, processErrorMessage]);

  // Handle PIN submission (manual button press)
  const handlePinSubmit = useCallback(async () => {
    if (!pinEntryProfile) return;

    if (pin.length !== 6) {
      setPinErrorMessage('Please enter all 6 digits.');
      setIsPinError(true);
      return;
    }

    setIsSubmittingPin(true);
    setIsPinError(false);
    logger.debug('[ProfileSwitcherModal] Submitting PIN for profile switch...');

    try {
      const result = await onSelectProfile(pinEntryProfile, pin);

      if (result && !result.success) {
        logger.warn('[ProfileSwitcherModal] Switch failed:', result.error);
        const errorMessage = processErrorMessage(
          result.error || 'Invalid PIN. Please try again.',
          pinEntryProfile.type === 'business'
        );
        setPinErrorMessage(errorMessage);
        setIsPinError(true);
        setPin('');
      } else {
        // Success! Store PIN for future biometric access (non-blocking)
        storePinForBiometric(pinEntryProfile.profileId, pin).catch((err) => {
          logger.warn('[ProfileSwitcherModal] Failed to store PIN for biometric (non-fatal):', err);
        });
        setPinEntryProfile(null);
        setPin('');
        setPinErrorMessage(null);
      }
    } catch (error: any) {
      logger.error('[ProfileSwitcherModal] PIN submit error:', error);
      setPinErrorMessage('Failed to verify PIN. Please try again.');
      setIsPinError(true);
      setPin('');
    } finally {
      setIsSubmittingPin(false);
    }
  }, [pinEntryProfile, pin, onSelectProfile, processErrorMessage]);

  // Handle biometric authentication as alternative to PIN
  // Uses "Biometric Unlocks PIN" pattern - retrieves stored PIN from Keychain using Face ID
  const handleBiometricAuth = useCallback(async () => {
    if (!pinEntryProfile) return;

    setIsSubmittingPin(true);
    setIsPinError(false);
    logger.debug('[ProfileSwitcherModal] Starting biometric authentication...');

    try {
      // Retrieve PIN from Keychain using biometric (Face ID / Touch ID)
      // This triggers the biometric prompt AND returns the actual PIN if successful
      const storedPin = await getPinWithBiometric(
        pinEntryProfile.profileId,
        `Authenticate to switch to ${pinEntryProfile.displayName}`
      );

      if (storedPin) {
        logger.info('[ProfileSwitcherModal] Biometric auth successful, switching profile with PIN...');

        // Send the actual PIN to backend - backend verifies the hash as normal
        const switchResult = await onSelectProfile(pinEntryProfile, storedPin);

        if (switchResult && !switchResult.success) {
          // PIN was wrong (maybe user changed it?) - clear stored PIN and ask for manual entry
          logger.warn('[ProfileSwitcherModal] Switch failed after biometric:', switchResult.error);
          const errorMessage = processErrorMessage(
            switchResult.error || 'PIN verification failed',
            pinEntryProfile.type === 'business'
          );
          setPinErrorMessage(errorMessage);
          setIsPinError(true);
          Alert.alert(
            'PIN Changed',
            'Your PIN may have been changed. Please enter your current PIN.',
            [{ text: 'OK' }]
          );
        } else {
          // Success - parent will close modal
          setPinEntryProfile(null);
          setPin('');
        }
      } else {
        // Biometric failed/cancelled OR no PIN stored yet
        // Check if PIN is stored - if not, inform user they need to enter PIN first
        const hasBiometricPin = await hasPinForBiometric(pinEntryProfile.profileId);
        if (!hasBiometricPin) {
          logger.debug('[ProfileSwitcherModal] No PIN stored for biometric, user must enter manually first');
          Alert.alert(
            'Enter PIN First',
            'Enter your PIN once to enable Face ID for this profile.',
            [{ text: 'OK' }]
          );
        } else {
          // Biometric was cancelled or failed
          logger.debug('[ProfileSwitcherModal] Biometric auth cancelled or failed');
        }
      }
    } catch (error: any) {
      logger.error('[ProfileSwitcherModal] Biometric auth error:', error);
      Alert.alert('Authentication Failed', 'Please try again or use PIN.');
    } finally {
      setIsSubmittingPin(false);
    }
  }, [pinEntryProfile, onSelectProfile, processErrorMessage]);

  // Handle back from PIN entry
  const handleBackFromPinEntry = useCallback(() => {
    setPinEntryProfile(null);
    setPin('');
    setIsPinError(false);
    setPinErrorMessage(null);
  }, []);

  const handleRemoveAccount = React.useCallback((profile: AvailableProfile, event: any) => {
    // Stop propagation so row click doesn't trigger
    event?.stopPropagation();

    if (!onRemoveAccount) return;

    // Show confirmation alert
    Alert.alert(
      'Remove Account?',
      `Are you sure you want to remove ${profile.displayName}? You'll need to sign in again to add it back.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemoveAccount(profile)
        }
      ]
    );
  }, [onRemoveAccount]);

  const renderItem = React.useCallback(
    ({ item }: { item: AvailableProfile }) => {
      const isCurrent = item.profileId === currentProfileId;
      const initials = getInitials(item.displayName);
      const avatarColor = getAvatarColor(item.entityId);

      return (
        <TouchableOpacity
          style={[styles.profileRow, isCurrent && styles.profileRowActive]}
          onPress={() => handleSelectProfile(item)}
          disabled={isLoading}
        >
          {/* Avatar */}
          <View style={[styles.avatarContainer, { backgroundColor: item.avatarUrl ? 'transparent' : avatarColor }]}>
            {item.avatarUrl ? (
              <Image
                source={{ uri: item.avatarUrl }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{item.displayName}</Text>
            <Text style={styles.profileType}>
              {item.type === 'business' ? 'Business Profile' : 'Personal Profile'}
            </Text>
          </View>

          {/* Current Indicator */}
          {isCurrent ? (
            <View style={styles.currentIndicator}>
              <View style={styles.currentIndicatorDot} />
            </View>
          ) : (
            <View style={styles.emptyIndicator} />
          )}
        </TouchableOpacity>
      );
    },
    [currentProfileId, handleSelectProfile, handleRemoveAccount, onRemoveAccount, isLoading, styles, theme],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={snapIndex}
      snapPoints={['50%', '95%']}
      enablePanDownToClose={true}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.card }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      onChange={(index) => {
        if (index === -1) {
          onClose();
        }
      }}
    >
      <BottomSheetView style={styles.container}>
        {/* Offline Warning Banner */}
        {!isConnected && (
          <View style={styles.offlineWarning}>
            <Ionicons name="warning" size={20} color="#856404" />
            <Text style={styles.offlineWarningText}>
              Offline - Account switching requires internet connection
            </Text>
          </View>
        )}

        {/* PIN Entry View - wrapped in ScrollView for smaller screens */}
        {pinEntryProfile ? (
          <BottomSheetScrollView
            contentContainerStyle={styles.pinEntryContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Header */}
            <View style={styles.pinEntryHeader}>
              <View style={[styles.pinEntryAvatar, { backgroundColor: getAvatarColor(pinEntryProfile.entityId) }]}>
                {pinEntryProfile.avatarUrl ? (
                  <Image
                    source={{ uri: pinEntryProfile.avatarUrl }}
                    style={{ width: '100%', height: '100%', borderRadius: 24 }}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={styles.pinEntryAvatarText}>
                    {getInitials(pinEntryProfile.displayName)}
                  </Text>
                )}
              </View>
              <View style={styles.pinEntryProfileInfo}>
                <Text style={styles.pinEntryTitle}>{pinEntryProfile.displayName}</Text>
                <Text style={styles.pinEntrySubtitle}>Enter PIN to access</Text>
              </View>
            </View>

            {/* PIN Pad - Custom keypad instead of native keyboard */}
            <PinPad
              value={pin}
              onChange={handlePinChange}
              length={6}
              error={isPinError}
              disabled={isSubmittingPin}
            />

            {/* Error Message */}
            {isPinError && pinErrorMessage && (
              <Text style={styles.pinErrorText}>{pinErrorMessage}</Text>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.pinSubmitButton,
                (pin.length !== 6 || isSubmittingPin) && styles.pinSubmitButtonDisabled
              ]}
              onPress={handlePinSubmit}
              disabled={pin.length !== 6 || isSubmittingPin}
            >
              {isSubmittingPin ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Text style={styles.pinSubmitButtonText}>Switch Profile</Text>
              )}
            </TouchableOpacity>

            {/* Biometric Option */}
            {isBiometricAvailable && (
              <>
                <View style={styles.orDivider}>
                  <View style={styles.orDividerLine} />
                  <Text style={styles.orDividerText}>or</Text>
                  <View style={styles.orDividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={handleBiometricAuth}
                  disabled={isSubmittingPin}
                >
                  <Ionicons
                    name={biometricType === 'face' ? 'scan' : 'finger-print'}
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.biometricButtonText}>
                    {biometricType === 'face'
                      ? (Platform.OS === 'ios' ? 'Use Face ID' : 'Use Face Recognition')
                      : 'Use Fingerprint'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Back Button */}
            <TouchableOpacity style={styles.pinBackButton} onPress={handleBackFromPinEntry}>
              <Text style={styles.pinBackButtonText}>← Back to profiles</Text>
            </TouchableOpacity>
          </BottomSheetScrollView>
        ) : isLoading || isCheckingPin ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : profiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No profiles available</Text>
          </View>
        ) : (
          /* PROFESSIONAL PATTERN: Button inside ScrollView (Revolut, N26, Google Pay pattern)
           * This ensures the Add Account button is always visible at the bottom of the list
           * and scrolls naturally with profiles if the list grows. Avoids flex: 1 layout conflicts. */
          <BottomSheetScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Profile items */}
            {profiles.map((profile) => (
              <View key={profile.profileId}>
                {renderItem({ item: profile })}
              </View>
            ))}

            {/* Add Account as last list item - always visible at bottom of list */}
            {onAddAccount && (
              <TouchableOpacity
                style={[styles.addAccountButton, { marginTop: 8 }]}
                onPress={onAddAccount}
              >
                <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.addAccountText}>Add Account</Text>
              </TouchableOpacity>
            )}
          </BottomSheetScrollView>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
};

export default ProfileSwitcherModal;
