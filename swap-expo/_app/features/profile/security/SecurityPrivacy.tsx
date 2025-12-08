import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../navigation/profileNavigator';
import { useTheme } from '../../../theme/ThemeContext';
import { Theme } from '../../../theme/theme';
import { useAuthContext } from '../../auth/context/AuthContext';
import apiClient from '../../../_api/apiClient';
import { BUSINESS_PATHS } from '../../../_api/apiPaths';
import { logger } from '../../../utils/logger';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  hasToggle?: boolean;
  initialToggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  hasNavigation?: boolean;
  onPress?: () => void;
  theme: Theme;
}

interface DeviceItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  details: string;
  lastActive: string;
  isCurrent?: boolean;
  onSignOut?: () => void;
  onRemove?: () => void;
  theme: Theme;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  description,
  hasToggle = false,
  initialToggleValue = false,
  onToggleChange,
  hasNavigation = false,
  onPress,
  theme,
}) => {
  const [isEnabled, setIsEnabled] = useState(initialToggleValue);

  const toggleSwitch = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    if (onToggleChange) {
      onToggleChange(newValue);
    }
  };

  const componentStyles = useMemo(() => StyleSheet.create({
    settingItem: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
    settingIcon: { width: 40, height: 40, backgroundColor: theme.colors.primaryUltraLight, borderRadius: theme.borderRadius.sm, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
    settingContent: { flex: 1 },
    settingTitle: { fontWeight: '600', fontSize: theme.typography.fontSize.md, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs / 2 },
    settingDescription: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary },
    settingAction: { alignItems: 'center', justifyContent: 'center' },
  }), [theme]);

  return (
    <TouchableOpacity 
      style={componentStyles.settingItem}
      onPress={hasNavigation ? onPress : undefined}
      activeOpacity={hasNavigation ? 0.7 : 1}
    >
      <View style={componentStyles.settingIcon}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
      </View>
      <View style={componentStyles.settingContent}>
        <Text style={componentStyles.settingTitle}>{title}</Text>
        <Text style={componentStyles.settingDescription}>{description}</Text>
      </View>
      <View style={componentStyles.settingAction}>
        {hasToggle ? (
          <Switch
            trackColor={{ false: theme.colors.grayLight, true: theme.colors.primary }}
            thumbColor={theme.colors.white}
            ios_backgroundColor={theme.colors.grayLight}
            onValueChange={toggleSwitch}
            value={isEnabled}
          />
        ) : hasNavigation ? (
          <Ionicons name="chevron-forward" size={18} color={theme.colors.grayLight} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const DeviceItem: React.FC<DeviceItemProps> = ({
  icon,
  name,
  details,
  lastActive,
  isCurrent = false,
  onSignOut,
  onRemove,
  theme,
}) => {
  const componentStyles = useMemo(() => StyleSheet.create({
    deviceItem: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.sm + 2, borderRadius: theme.borderRadius.sm, marginBottom: theme.spacing.sm, backgroundColor: theme.colors.grayUltraLight },
    currentDevice: { backgroundColor: theme.colors.primaryUltraLight, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.primary },
    deviceIcon: { width: 36, height: 36, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.sm, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
    deviceInfo: { flex: 1 },
    deviceNameContainer: { flexDirection: 'row', alignItems: 'center' },
    deviceName: { fontWeight: '500', fontSize: theme.typography.fontSize.sm, color: theme.colors.textPrimary },
    deviceBadge: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, paddingHorizontal: theme.spacing.xs + 2, paddingVertical: 2, marginLeft: theme.spacing.sm },
    deviceBadgeText: { fontSize: 10, fontWeight: '500', color: theme.colors.white },
    deviceDetails: { fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary },
    lastActivity: { fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary, fontStyle: 'italic', marginTop: theme.spacing.xs / 2 },
    buttonSecondary: { backgroundColor: theme.colors.grayLight, borderRadius: theme.borderRadius.xs, paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.sm, marginLeft: theme.spacing.xs },
    buttonSecondaryText: { fontSize: theme.typography.fontSize.xs, fontWeight: '500', color: theme.colors.textPrimary },
    buttonDanger: { backgroundColor: theme.colors.error === '#EF4444' ? '#fee2e2' : theme.colors.grayUltraLight, borderRadius: theme.borderRadius.xs, paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.sm, marginLeft: theme.spacing.xs },
    buttonDangerText: { fontSize: theme.typography.fontSize.xs, fontWeight: '500', color: theme.colors.error },
  }), [theme]);

  return (
    <View style={[componentStyles.deviceItem, isCurrent && componentStyles.currentDevice]}>
      <View style={componentStyles.deviceIcon}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
      </View>
      <View style={componentStyles.deviceInfo}>
        <View style={componentStyles.deviceNameContainer}>
          <Text style={componentStyles.deviceName}>{name}</Text>
          {isCurrent && <View style={componentStyles.deviceBadge}><Text style={componentStyles.deviceBadgeText}>Current</Text></View>}
        </View>
        <Text style={componentStyles.deviceDetails}>{details}</Text>
        <Text style={componentStyles.lastActivity}>{lastActive}</Text>
      </View>
      {!isCurrent && (
        <TouchableOpacity 
          style={onRemove ? componentStyles.buttonDanger : componentStyles.buttonSecondary}
          onPress={onRemove || onSignOut}
        >
          <Text style={onRemove ? componentStyles.buttonDangerText : componentStyles.buttonSecondaryText}>
            {onRemove ? 'Remove' : 'Sign Out'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const SecurityPrivacyScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user } = useAuthContext();

  // Business PIN state
  const isBusinessProfile = user?.profile_type === 'business';
  const [hasBusinessPin, setHasBusinessPin] = useState(false);
  const [isLoadingPinStatus, setIsLoadingPinStatus] = useState(false);

  // Check if business PIN is set when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isBusinessProfile && user?.profileId) {
        checkBusinessPinStatus();
      }
    }, [isBusinessProfile, user?.profileId])
  );

  const checkBusinessPinStatus = async () => {
    if (!user?.profileId) return;

    setIsLoadingPinStatus(true);
    try {
      const { data } = await apiClient.get<{ pinRequired: boolean; pinSet: boolean }>(
        BUSINESS_PATHS.CHECK_PIN(user.profileId)
      );
      setHasBusinessPin(data.pinSet);
    } catch (error: any) {
      logger.warn('[SecurityPrivacy] Failed to check business PIN status:', error.message);
    } finally {
      setIsLoadingPinStatus(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChangePasscode = () => {
    // Business profiles share PIN with personal profile - warn user
    if (user?.profile_type === 'business') {
      Alert.alert(
        'Changing Personal PIN',
        'Your PIN is shared across all your profiles (personal and business). Changing it here will affect all profiles.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => navigation.navigate('Passcode') }
        ]
      );
    } else {
      navigation.navigate('Passcode');
    }
  };

  const handleEntityAccess = () => {
    console.log('Navigate to Entity Relationship Access');
    // Implement navigation when screen is available
  };

  const handle2FAToggle = (value: boolean) => {
    console.log('2FA toggled:', value);
    // Implement 2FA functionality
  };

  const handleBiometricToggle = (value: boolean) => {
    console.log('Biometric toggled:', value);
    // Implement biometric functionality
  };

  const handleTransactionVerification = (value: boolean) => {
    console.log('Transaction verification toggled:', value);
    // Implement transaction verification
  };

  const handleSignOut = (deviceName: string) => {
    console.log('Sign out from device:', deviceName);
    // Implement sign out
  };

  const handleRemoveDevice = (deviceName: string) => {
    console.log('Remove device:', deviceName);
    // Implement device removal
  };

  const handleSetBusinessPin = () => {
    navigation.navigate('BusinessPinSetup', { mode: 'create' });
  };

  const handleRemoveBusinessPin = () => {
    Alert.alert(
      'Remove Business PIN',
      'Are you sure you want to remove your business access PIN? Anyone with your personal credentials will be able to access this business profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove PIN',
          style: 'destructive',
          onPress: () => navigation.navigate('BusinessPinSetup', { mode: 'remove' }),
        },
      ]
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.card },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: '600', color: theme.colors.textPrimary },
    scrollView: { flex: 1 },
    securityContainer: { padding: theme.spacing.lg },
    alertBox: { backgroundColor: theme.colors.warning === '#F59E0B' ? '#fff4e5' : theme.colors.primaryUltraLight, borderLeftWidth: 4, borderLeftColor: theme.colors.warning, borderRadius: theme.borderRadius.xs, padding: theme.spacing.sm + 2, marginBottom: theme.spacing.lg },
    alertTitle: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs / 2 },
    alertTitleText: { fontWeight: '600', color: theme.colors.warning === '#F59E0B' ? '#7c2d12' : theme.colors.textPrimary, fontSize: theme.typography.fontSize.sm },
    alertIcon: { marginRight: theme.spacing.sm },
    alertText: { fontSize: theme.typography.fontSize.sm -1, lineHeight: 20, color: theme.colors.warning === '#F59E0B' ? '#7c2d12' : theme.colors.textSecondary },
    sectionTitle: { fontSize: theme.typography.fontSize.md, fontWeight: '600', color: theme.colors.primary, marginBottom: theme.spacing.sm, marginTop: theme.spacing.lg, letterSpacing: 0.5, textTransform: 'uppercase' },
    infoCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, overflow: 'hidden', ...theme.shadows.small, borderWidth: 1, borderColor: theme.colors.border },
    deviceList: { padding: theme.spacing.md },
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security & Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.securityContainer}>
          {/* Security Alert */}
          <View style={styles.alertBox}>
            <View style={styles.alertTitle}>
              <Ionicons name="warning-outline" size={20} color={theme.colors.warning} style={styles.alertIcon} />
              <Text style={styles.alertTitleText}>Security Notification</Text>
            </View>
            <Text style={styles.alertText}>
              Enable Two-Factor Authentication for enhanced account security. This adds an extra layer of protection to your account.
            </Text>
          </View>

          {/* Login Security */}
          <Text style={styles.sectionTitle}>LOGIN SECURITY</Text>
          <View style={styles.infoCard}>
            <SettingItem theme={theme} icon="lock-closed-outline" title="Change Passcode" description="Update your 6-digit passcode" hasNavigation onPress={handleChangePasscode} />
            <SettingItem theme={theme} icon="shield-checkmark-outline" title="Two-Factor Authentication" description="Secure your account with 2FA" hasToggle initialToggleValue={true} onToggleChange={handle2FAToggle} />
            <SettingItem theme={theme} icon="eye-outline" title="Biometric Login" description="Use fingerprint or face recognition" hasToggle initialToggleValue={true} onToggleChange={handleBiometricToggle} />
          </View>

          {/* Business Security - Only show for business profiles */}
          {isBusinessProfile && (
            <>
              <Text style={styles.sectionTitle}>BUSINESS SECURITY</Text>
              <View style={styles.infoCard}>
                <SettingItem
                  theme={theme}
                  icon="key-outline"
                  title="Business Access PIN"
                  description={hasBusinessPin ? 'PIN protection enabled' : 'Add extra security for profile switching'}
                  hasNavigation
                  onPress={hasBusinessPin ? handleRemoveBusinessPin : handleSetBusinessPin}
                />
              </View>
              <Text style={{ fontSize: theme.typography.fontSize.sm - 1, color: theme.colors.textSecondary, marginHorizontal: theme.spacing.xs, marginTop: theme.spacing.xs, marginBottom: theme.spacing.sm }}>
                Business PIN adds extra protection when switching from your personal profile to this business. It's separate from your personal passcode.
              </Text>
            </>
          )}

          {/* Privacy & Data Sharing */}
          <Text style={styles.sectionTitle}>PRIVACY & DATA SHARING</Text>
          <View style={styles.infoCard}>
            <SettingItem theme={theme} icon="flash-outline" title="Entity Relationship Access" description="Control access between connected accounts" hasNavigation onPress={handleEntityAccess} />
          </View>

          {/* Transaction Security */}
          <Text style={styles.sectionTitle}>TRANSACTION SECURITY</Text>
          <View style={styles.infoCard}>
            <SettingItem theme={theme} icon="wallet-outline" title="Transaction Verification" description="Verify all transactions above $100" hasToggle initialToggleValue={true} onToggleChange={handleTransactionVerification} />
          </View>

          {/* Device Management */}
          <Text style={styles.sectionTitle}>DEVICE MANAGEMENT</Text>
          <View style={styles.infoCard}>
            <View style={styles.deviceList}>
              <DeviceItem theme={theme} icon="phone-portrait-outline" name="iPhone 13 Pro" details="iOS 15.4 • Singapore" lastActive="Last active: Just now" isCurrent />
              <DeviceItem theme={theme} icon="laptop-outline" name="MacBook Pro" details="macOS 12.3 • Singapore" lastActive="Last active: 2 hours ago" onSignOut={() => handleSignOut('MacBook Pro')} />
              <DeviceItem theme={theme} icon="phone-portrait-outline" name="Google Pixel 6" details="Android 12 • Kuala Lumpur" lastActive="Last active: 3 days ago" onRemove={() => handleRemoveDevice('Google Pixel 6')} />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SecurityPrivacyScreen; 
 