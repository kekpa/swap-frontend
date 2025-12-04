// Created: BusinessReview component for reviewing business information - 2025-11-11

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../../navigation/profileNavigator';
import { useTheme } from '../../../../theme/ThemeContext';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

interface BusinessInfo {
  businessName: string;
  legalName: string;
  businessType: string;
  businessPhone?: string;
  businessEmail?: string;
  industry: string;
  registrationNumber?: string;
  description?: string;
  address?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postalCode?: string;
    country: string;
  };
}

const BusinessReview: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'BusinessReview'>>();
  const { theme } = useTheme();

  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  // TODO: Fetch business info from API
  const businessInfo: BusinessInfo | null = null;

  const handleEditBasicInfo = () => {
    navigation.navigate('BusinessInfoFlow', {
      returnToTimeline,
      sourceRoute,
    });
  };

  const handleEditAddress = () => {
    navigation.navigate('BusinessCountryOfResidence', {
      returnToTimeline,
      sourceRoute,
    });
  };

  const handleContinue = () => {
    // Navigate to business documents upload
    navigation.navigate('BusinessRegistrationDocuments', {
      returnToTimeline,
      sourceRoute,
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.card },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: '600', color: theme.colors.textPrimary },
    content: { flex: 1, padding: theme.spacing.lg },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xl,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    editButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.colors.primary,
    },
    infoBox: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    infoLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: '500',
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs / 2,
      textTransform: 'uppercase',
    },
    infoValue: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.xl,
    },
    continueButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      marginTop: theme.spacing.lg,
    },
    continueButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
    },
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.card} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Business</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={styles.title}>Review Business Information</Text>
          <Text style={styles.subtitle}>
            Please review all business information. You can edit any details before continuing.
          </Text>

          {/* Basic Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <TouchableOpacity style={styles.editButton} onPress={handleEditBasicInfo}>
                <Ionicons name="pencil" size={16} color={theme.colors.primary} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Business Name</Text>
              <Text style={styles.infoValue}>
                {businessInfo?.businessName || 'Not provided'}
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Legal Name</Text>
              <Text style={styles.infoValue}>
                {businessInfo?.legalName || 'Not provided'}
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Business Type</Text>
              <Text style={styles.infoValue}>
                {businessInfo?.businessType?.replace('_', ' ').toUpperCase() || 'Not provided'}
              </Text>
            </View>

            {businessInfo?.businessPhone && (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Business Phone</Text>
                <Text style={styles.infoValue}>
                  {businessInfo.businessPhone}
                </Text>
              </View>
            )}

            {businessInfo?.businessEmail && (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Business Email</Text>
                <Text style={styles.infoValue}>
                  {businessInfo.businessEmail}
                </Text>
              </View>
            )}

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Industry</Text>
              <Text style={styles.infoValue}>
                {businessInfo?.industry || 'Not provided'}
              </Text>
            </View>

            {businessInfo?.registrationNumber && (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Registration Number</Text>
                <Text style={styles.infoValue}>
                  {businessInfo.registrationNumber}
                </Text>
              </View>
            )}

            {businessInfo?.description && (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={styles.infoValue}>
                  {businessInfo.description}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Business Address Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Business Address</Text>
              <TouchableOpacity style={styles.editButton} onPress={handleEditAddress}>
                <Ionicons name="pencil" size={16} color={theme.colors.primary} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {businessInfo?.address ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>
                  {businessInfo.address.addressLine1}
                  {businessInfo.address.addressLine2 ? `, ${businessInfo.address.addressLine2}` : ''}
                  {'\n'}{businessInfo.address.city}
                  {businessInfo.address.postalCode ? `, ${businessInfo.address.postalCode}` : ''}
                  {'\n'}{businessInfo.address.country}
                </Text>
              </View>
            ) : (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>Not provided</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Continue to Documents</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BusinessReview;
