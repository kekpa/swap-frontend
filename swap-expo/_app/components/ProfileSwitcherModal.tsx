/**
 * ProfileSwitcherModal Component
 *
 * Bottom sheet modal for switching between user profiles (personal + business).
 * Enterprise security pattern with biometric authentication on profile switch.
 * Supports optional business PIN verification for extra security.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
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
import BusinessPinInputModal from './BusinessPinInputModal';
import apiClient from '../_api/apiClient';
import { BUSINESS_PATHS } from '../_api/apiPaths';
import { logger } from '../utils/logger';

interface ProfileSwitcherModalProps {
  visible: boolean;
  profiles: AvailableProfile[];
  currentProfileId: string;
  onSelectProfile: (profile: AvailableProfile, pin?: string) => void;
  onClose: () => void;
  onAddAccount?: () => void;
  onRemoveAccount?: (profile: AvailableProfile) => void;
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
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const { isConnected } = useNetworkStatus();
  const { height } = useWindowDimensions();
  const bottomSheetRef = React.useRef<BottomSheet>(null);

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinProfile, setPinProfile] = useState<AvailableProfile | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLockoutUntil, setPinLockoutUntil] = useState<Date | null>(null);
  const [isCheckingPin, setIsCheckingPin] = useState(false);

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
      }),
    [theme],
  );

  // Check if PIN is required for a business profile
  const checkPinRequired = useCallback(async (businessProfileId: string): Promise<CheckPinResponse> => {
    try {
      const { data } = await apiClient.get<CheckPinResponse>(
        BUSINESS_PATHS.CHECK_PIN(businessProfileId)
      );
      return data;
    } catch (error: any) {
      logger.warn('[ProfileSwitcherModal] Failed to check PIN requirement:', error.message);
      // Default to no PIN required if check fails
      return { pinRequired: false, pinSet: false };
    }
  }, []);

  // Handle PIN submission
  const handlePinSubmit = useCallback((pin: string) => {
    if (!pinProfile) return;

    logger.debug('[ProfileSwitcherModal] PIN submitted, attempting switch...');
    setPinError(null);

    // Close PIN modal and trigger profile switch with PIN
    setShowPinModal(false);
    onSelectProfile(pinProfile, pin);
  }, [pinProfile, onSelectProfile]);

  // Handle PIN modal cancel
  const handlePinCancel = useCallback(() => {
    setShowPinModal(false);
    setPinProfile(null);
    setPinError(null);
    setPinLockoutUntil(null);
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

    // Check if business profile requires PIN
    if (profile.type === 'business') {
      setIsCheckingPin(true);
      try {
        const pinStatus = await checkPinRequired(profile.profileId);
        logger.debug('[ProfileSwitcherModal] PIN status:', pinStatus);

        if (pinStatus.pinRequired) {
          // Show PIN input modal
          setPinProfile(profile);
          setPinError(null);
          setPinLockoutUntil(null);
          setShowPinModal(true);
          setIsCheckingPin(false);
          return;
        }
      } catch (error: any) {
        logger.error('[ProfileSwitcherModal] PIN check failed:', error.message);
      } finally {
        setIsCheckingPin(false);
      }
    }

    // Trigger profile switch (will show biometric prompt)
    logger.debug('[ProfileSwitcherModal] Triggering profile switch...');
    onSelectProfile(profile);
  }, [currentProfileId, onClose, onSelectProfile, checkPinRequired]);

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
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={snapIndex}
        snapPoints={['50%']}
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

          {/* Profile List */}
          {isLoading || isCheckingPin ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : profiles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No profiles available</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {/* Scrollable profiles - takes remaining space above button */}
              <BottomSheetScrollView style={{ flex: 1 }}>
                {profiles.map((profile) => (
                  <View key={profile.profileId}>
                    {renderItem({ item: profile })}
                  </View>
                ))}
              </BottomSheetScrollView>

              {/* Fixed button at bottom - always visible */}
              {onAddAccount && (
                <TouchableOpacity style={styles.addAccountButton} onPress={onAddAccount}>
                  <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.addAccountText}>Add Account</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>

      {/* Business PIN Input Modal */}
      <BusinessPinInputModal
        visible={showPinModal}
        businessName={pinProfile?.displayName || ''}
        onSubmit={handlePinSubmit}
        onCancel={handlePinCancel}
        isLoading={isLoading}
        error={pinError}
        lockoutUntil={pinLockoutUntil}
      />
    </>
  );
};

export default ProfileSwitcherModal;
