// Created: BusinessKycFlowStart orchestrator for managing business KYC flow - 2025-11-11

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../../navigation/profileNavigator';
import { useTheme } from '../../../../theme/ThemeContext';
import logger from '../../../../utils/logger';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

/**
 * BusinessKycFlowStart Component
 *
 * Orchestrates the business KYC verification flow:
 * 1. Beneficial Owners Management (add/edit/remove)
 * 2. Review Beneficial Owners (owners complete KYC on their personal profiles)
 * 3. Business Information (name, legal name, type, industry)
 * 4. Business Country Selection
 * 5. Business Address Entry
 * 6. Review Business Information
 * 7. Upload Business Registration Documents
 * 8. Verification Complete
 *
 * Note: Business profiles use the personal profile's PIN (shared auth_user),
 * so there is no separate passcode setup step for business KYC.
 *
 * This component acts as the entry point and determines which step
 * to start from based on existing progress.
 */
const BusinessKycFlowStart: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'BusinessKycFlowStart'>>();
  const { theme } = useTheme();

  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkFlowProgress();
  }, []);

  const checkFlowProgress = async () => {
    try {
      // TODO: Check KYC progress from API
      // - Check if beneficial owners exist
      // - Check if business info completed
      // - Check if business documents uploaded
      // - Determine which step to start from

      // For now, always start from beneficial owners list
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API check

      // Navigate to first step: Beneficial Owners Management
      navigation.replace('BeneficialOwnersList', {
        returnToTimeline,
        sourceRoute,
      });
    } catch (error) {
      logger.error('Error checking flow progress', error, 'kyc');

      // On error, start from beginning
      navigation.replace('BeneficialOwnersList', {
        returnToTimeline,
        sourceRoute,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      alignItems: 'center',
      gap: theme.spacing.lg,
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.card} />

      <View style={styles.content}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.title}>Setting up Business KYC</Text>
        <Text style={styles.subtitle}>
          Please wait while we prepare your verification process...
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default BusinessKycFlowStart;

/**
 * Business KYC Flow Sequence (for reference):
 *
 * Entry: BusinessKycFlowStart (this component)
 *   ↓
 * Step 1: BeneficialOwnersList
 *   - Add/Edit/Remove beneficial owners
 *   - Navigate to BeneficialOwnerForm for each owner
 *   - Each owner requires BeneficialOwnerAddress
 *   - "Continue" navigates to BeneficialOwnersReview
 *   ↓
 * Step 2: BeneficialOwnersReview
 *   - Review all beneficial owners
 *   - Edit if needed
 *   - Owners complete their own KYC on personal profiles
 *   - "Continue" navigates to BusinessInfoFlow
 *   ↓
 * Step 3: BusinessInfoFlow
 *   - Business name, legal name, type, industry
 *   - "Continue" navigates to BusinessCountryOfResidence
 *   ↓
 * Step 4: BusinessCountryOfResidence
 *   - Select country (defaults to Haiti)
 *   - "Continue" navigates to BusinessAddress with selectedCountry
 *   ↓
 * Step 5: BusinessAddress
 *   - Address line 1, line 2, city, postal code
 *   - Country pre-filled from previous step
 *   - "Continue" navigates to BusinessReview
 *   ↓
 * Step 6: BusinessReview
 *   - Review all business information
 *   - Edit sections if needed
 *   - "Continue" navigates to BusinessRegistrationDocuments
 *   ↓
 * Step 7: BusinessRegistrationDocuments
 *   - Upload business registration certificate (required)
 *   - Upload tax certificate (optional)
 *   - Upload operating license (optional)
 *   - "Continue" navigates to VerificationComplete
 *   ↓
 * Complete: VerificationComplete
 *   - Show success message
 *   - Return to timeline or profile
 *   - Note: Business profiles use the personal profile's PIN (shared auth_user)
 */
