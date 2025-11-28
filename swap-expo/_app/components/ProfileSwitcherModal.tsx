/**
 * ProfileSwitcherModal Component
 *
 * Bottom sheet modal for switching between user profiles (personal + business).
 * Enterprise security pattern with biometric authentication on profile switch.
 */

import React from 'react';
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

interface ProfileSwitcherModalProps {
  visible: boolean;
  profiles: AvailableProfile[];
  currentProfileId: string;
  onSelectProfile: (profile: AvailableProfile) => void;
  onClose: () => void;
  onAddAccount?: () => void;
  onRemoveAccount?: (profile: AvailableProfile) => void;
  isLoading?: boolean;
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

  const handleSelectProfile = React.useCallback((profile: AvailableProfile) => {
    if (profile.profileId === currentProfileId) {
      // Already on this profile, just close modal
      onClose();
      return;
    }

    // Trigger profile switch (will show biometric prompt)
    onSelectProfile(profile);
  }, [currentProfileId, onClose, onSelectProfile]);

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
        {isLoading ? (
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
  );
};

export default ProfileSwitcherModal;
