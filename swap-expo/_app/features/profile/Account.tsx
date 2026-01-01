import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../navigation/profileNavigator';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthContext } from '../auth/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../_api/apiClient';
import logger from '../../utils/logger';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

const AccountScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [activating, setActivating] = useState(false);

  // Fetch profile data
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', user?.profileId],
    queryFn: async () => {
      const response = await apiClient.get(`/profiles/${user?.profileId}`);
      return response.data;
    },
    enabled: !!user?.profileId,
  });

  const handleBack = () => {
    navigation.goBack();
  };

  const handlePersonalInfo = () => {
    navigation.navigate('PersonalInfo');
  };

  const handleDocuments = () => {
    logger.debug("Navigate to Documents & Statements", "navigation");
    // Add navigation when the screen is available
  };

  const handleUpgradeAccount = () => {
    logger.debug("Upgrade Account Tier", "navigation");
    // Implement upgrade account action
  };

  const handleCloseAccount = () => {
    logger.debug("Close Account", "navigation");
    // Implement close account action with confirmation
  };

  const handleActivatePersonalProfile = () => {
    Alert.alert(
      'Activate Personal Profile',
      'This will make your profile visible to other users and enable personal features like chat and P2P payments. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            try {
              setActivating(true);
              await apiClient.put('/profiles/activate');
              await queryClient.invalidateQueries({ queryKey: ['profile'] });
              Alert.alert('Success', 'Your personal profile is now active!');
            } catch (error: any) {
              logger.error("Failed to activate profile", error, "data");
              Alert.alert('Error', error.response?.data?.message || 'Failed to activate profile');
            } finally {
              setActivating(false);
            }
          },
        },
      ],
    );
  };

  // Memoize styles
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.card },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: '600', color: theme.colors.textPrimary },
    scrollView: { flex: 1 },
    accountContainer: { padding: theme.spacing.lg },
    statusCard: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, backgroundColor: theme.colors.primaryUltraLight, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md },
    statusIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.sm },
    statusContent: { flex: 1 },
    statusTitle: { fontWeight: '600', fontSize: theme.typography.fontSize.sm, color: theme.colors.textPrimary },
    statusSubtitle: { fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary },
    sectionTitle: { fontSize: theme.typography.fontSize.md, fontWeight: '600', color: theme.colors.primary, marginBottom: theme.spacing.sm, marginTop: theme.spacing.lg, letterSpacing: 0.5, textTransform: 'uppercase' },
    infoCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, overflow: 'hidden', ...theme.shadows.small, borderWidth: 1, borderColor: theme.colors.border },
    infoList: { paddingHorizontal: 0 },
    infoItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.md - 2, paddingHorizontal: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
    infoLabel: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, flex: 4 },
    infoValueContainer: { flexDirection: 'row', alignItems: 'center', flex: 6, justifyContent: 'flex-end' },
    infoValue: { fontSize: theme.typography.fontSize.sm, fontWeight: '500', color: theme.colors.textPrimary, textAlign: 'right' },
    accountNumber: { fontFamily: 'Courier', letterSpacing: 0.5, backgroundColor: theme.colors.primaryUltraLight, paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.sm, borderRadius: theme.borderRadius.xs, color: theme.colors.primary, fontWeight: '600', fontSize: theme.typography.fontSize.sm },
    copyButton: { marginLeft: theme.spacing.xs, padding: theme.spacing.xs },
    navItem: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
    navIcon: { width: 36, height: 36, backgroundColor: theme.colors.primaryUltraLight, borderRadius: theme.borderRadius.sm, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
    navContent: { flex: 1 },
    navTitle: { fontWeight: '500', fontSize: theme.typography.fontSize.md, color: theme.colors.textPrimary },
    navDescription: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary },
    actionButton: { backgroundColor: theme.colors.primaryUltraLight, borderRadius: theme.borderRadius.sm, paddingVertical: theme.spacing.md - 2, paddingHorizontal: theme.spacing.md, alignItems: 'center', marginTop: theme.spacing.md },
    actionButtonText: { color: theme.colors.primary, fontWeight: '500', fontSize: theme.typography.fontSize.md },
    actionButtonDanger: { backgroundColor: theme.colors.error === '#EF4444' ? '#fee2e2' : theme.colors.grayUltraLight },
    actionButtonTextDanger: { color: theme.colors.error, fontWeight: '500', fontSize: theme.typography.fontSize.md },
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.accountContainer}>
          {/* Account Verification Status */}
          {/* <View style={styles.statusCard}>
            <View style={styles.statusIcon}>
              <Ionicons name="shield-checkmark" size={18} color={theme.colors.white} />
            </View>
            <View style={styles.statusContent}>
              <Text style={styles.statusTitle}>Level 3 Verified Account</Text>
              <Text style={styles.statusSubtitle}>Your account has full access to all features</Text>
            </View>
          </View> */}

          {/* Account Information */}
          <View style={styles.infoCard}>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Account ID</Text>
                <View style={styles.infoValueContainer}>
                  <Text style={styles.accountNumber}>SWAP-2023-086542</Text>
                  <TouchableOpacity style={styles.copyButton}>
                    <Ionicons name="copy-outline" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Username</Text>
                <View style={styles.infoValueContainer}>
                  <Text style={styles.infoValue}>@frantz</Text>
                  <TouchableOpacity style={styles.copyButton}>
                    <Ionicons name="copy-outline" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Account Type</Text>
                <Text style={styles.infoValue}>Individual</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>March 15, 2023</Text>
              </View>
            </View>
          </View>

          {/* Profile Status & Activation */}
          {profile && (
            <>
              <Text style={styles.sectionTitle}>PROFILE STATUS</Text>
              <View style={styles.infoCard}>
                <View style={styles.navItem}>
                  <View style={styles.navIcon}>
                    <Ionicons
                      name={profile.status === 'inactive' ? 'lock-closed' : 'person'}
                      size={20}
                      color={profile.status === 'inactive' ? theme.colors.error : theme.colors.success || '#4CAF50'}
                    />
                  </View>
                  <View style={styles.navContent}>
                    <Text style={styles.navTitle}>Personal Profile</Text>
                    <Text style={[
                      styles.navDescription,
                      { color: profile.status === 'inactive' ? theme.colors.error : theme.colors.success || '#4CAF50' }
                    ]}>
                      {profile.status === 'inactive'
                        ? 'Inactive (Business-only mode)'
                        : 'Active & Discoverable'}
                    </Text>
                  </View>
                </View>

                {/* Info text */}
                <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md }}>
                  <Text style={[styles.navDescription, { lineHeight: 20 }]}>
                    {profile.status === 'inactive'
                      ? 'Your profile is currently in business-only mode. Activate to use personal features like chat and P2P payments.'
                      : 'Your profile is discoverable by other users. You can chat and receive money personally.'}
                  </Text>
                </View>

                {/* Activation Button for inactive profiles */}
                {profile.status === 'inactive' && profile.discovery_settings?.searchable_by === 'none' && (
                  <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md }}>
                    <TouchableOpacity
                      style={[styles.actionButton, { marginTop: 0 }]}
                      onPress={handleActivatePersonalProfile}
                      disabled={activating}
                    >
                      {activating ? (
                        <ActivityIndicator color={theme.colors.primary} />
                      ) : (
                        <Text style={styles.actionButtonText}>Activate Personal Profile</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Account Details */}
          <Text style={styles.sectionTitle}>ACCOUNT DETAILS</Text>
          <View style={styles.infoCard}>
            <TouchableOpacity style={styles.navItem} onPress={handlePersonalInfo}>
              <View style={styles.navIcon}>
                <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.navContent}>
                <Text style={styles.navTitle}>Personal Information</Text>
                <Text style={styles.navDescription}>Name, contact, and personal details</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.grayLight} />
            </TouchableOpacity>
            
            {/* <TouchableOpacity style={styles.navItem} onPress={handleDocuments}>
              <View style={styles.navIcon}>
                <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.navContent}>
                <Text style={styles.navTitle}>Documents & Statements</Text>
                <Text style={styles.navDescription}>ID verification and account statements</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.grayLight} />
            </TouchableOpacity> */}
          </View>

          {/* Recent Account Activity */}
          <Text style={styles.sectionTitle}>RECENT ACCOUNT ACTIVITY</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Last Login</Text>
                <Text style={styles.infoValue}>Today, 10:45 AM</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Last Transaction</Text>
                <Text style={styles.infoValue}>Yesterday, 4:30 PM</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Active Devices</Text>
                <Text style={styles.infoValue}>2 devices</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          {/* <TouchableOpacity style={styles.actionButton} onPress={handleUpgradeAccount}>
            <Text style={styles.actionButtonText}>Upgrade Account Tier</Text>
          </TouchableOpacity> */}
          
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={handleCloseAccount}>
            <Text style={styles.actionButtonTextDanger}>Close Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountScreen; 
 