// Created: BeneficialOwnersReview component for reviewing all beneficial owners - 2025-11-11

import React, { useMemo, useState, useEffect } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../../navigation/profileNavigator';
import { useTheme } from '../../../../theme/ThemeContext';
import apiClient from '../../../../_api/apiClient';
import { useKycCompletion } from '../../../../hooks-actions/useKycCompletion';
import logger from '../../../../utils/logger';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

interface BeneficialOwner {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  position: string;
  ownershipPercentage?: number;
  idType: string;
  idNumber: string;
  email?: string;
  phone?: string;
  address?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postalCode?: string;
    country: string;
  };
}

const BeneficialOwnersReview: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'BeneficialOwnersReview'>>();
  const { theme } = useTheme();

  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  const [owners, setOwners] = useState<BeneficialOwner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { completeStep } = useKycCompletion();

  // Fetch owners from API on mount
  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/kyc/beneficial-owners');
      logger.debug('API Response', 'kyc', { response: response.data });

      // Ensure ownersData is an array
      const ownersData = Array.isArray(response.data) ? response.data : [];

      const mappedOwners: BeneficialOwner[] = ownersData.map((owner: any) => ({
        id: owner.id,
        firstName: owner.first_name,
        middleName: owner.middle_name,
        lastName: owner.last_name,
        dateOfBirth: owner.date_of_birth,
        nationality: owner.nationality,
        position: owner.position,
        ownershipPercentage: owner.ownership_percentage,
        idType: owner.id_type,
        idNumber: owner.id_number,
        email: owner.email,
        phone: owner.phone,
        address: owner.address,
      }));

      setOwners(mappedOwners);
      logger.debug('Fetched owners', 'kyc', { count: mappedOwners.length });
    } catch (error) {
      logger.error('Failed to fetch owners', error, 'kyc');
      Alert.alert('Error', 'Failed to load beneficial owners. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (ownerId: string) => {
    navigation.navigate('BeneficialOwnerForm', {
      mode: 'edit',
      ownerId,
      returnToTimeline,
      sourceRoute,
    });
  };

  const handleContinue = async () => {
    try {
      setIsLoading(true);

      // Complete the beneficial_owners step
      await completeStep('beneficial_owners', { owners_count: owners.length }, {
        returnToTimeline: false,
        sourceRoute,
        showSuccessAlert: false,
      });

      logger.debug('KYC step completed: beneficial_owners', 'kyc');

      // Navigate back to business info flow
      navigation.navigate('BusinessInfoFlow', {
        returnToTimeline,
        sourceRoute,
      });
    } catch (error) {
      logger.error('Failed to complete KYC step', error, 'kyc');
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
      paddingVertical: theme.spacing.sm,
      height: 56,
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
    ownerSection: {
      marginBottom: theme.spacing.xl,
    },
    ownerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    ownerName: {
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

  const renderOwner = (owner: BeneficialOwner, index: number) => (
    <View key={owner.id} style={styles.ownerSection}>
      <View style={styles.ownerHeader}>
        <Text style={styles.ownerName}>
          Owner {index + 1}: {owner.firstName} {owner.middleName ? `${owner.middleName} ` : ''}{owner.lastName}
        </Text>
        <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(owner.id)}>
          <Ionicons name="pencil" size={16} color={theme.colors.primary} />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Date of Birth</Text>
        <Text style={styles.infoValue}>{owner.dateOfBirth}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Nationality</Text>
        <Text style={styles.infoValue}>{owner.nationality}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Position</Text>
        <Text style={styles.infoValue}>
          {owner.position}
          {owner.ownershipPercentage ? ` (${owner.ownershipPercentage}% ownership)` : ''}
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Identification</Text>
        <Text style={styles.infoValue}>
          {owner.idType.replace('_', ' ').toUpperCase()}: {owner.idNumber}
        </Text>
      </View>

      {owner.address && (
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Address</Text>
          <Text style={styles.infoValue}>
            {owner.address.addressLine1}
            {owner.address.addressLine2 ? `, ${owner.address.addressLine2}` : ''}
            {'\n'}{owner.address.city}
            {owner.address.postalCode ? `, ${owner.address.postalCode}` : ''}
            {'\n'}{owner.address.country}
          </Text>
        </View>
      )}

      {(owner.email || owner.phone) && (
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Contact</Text>
          {owner.email && <Text style={styles.infoValue}>{owner.email}</Text>}
          {owner.phone && <Text style={styles.infoValue}>{owner.phone}</Text>}
        </View>
      )}

      {index < owners.length - 1 && <View style={styles.divider} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.card} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Owners</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={styles.title}>Review Beneficial Owners</Text>
          <Text style={styles.subtitle}>
            Please review the information for all beneficial owners. You can edit any details before continuing.
          </Text>

          {owners.map((owner, index) => renderOwner(owner, index))}

          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Continue to Documents</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BeneficialOwnersReview;
