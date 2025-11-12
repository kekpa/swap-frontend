// Created: BeneficialOwnersList component for managing multiple business owners - 2025-11-11

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../../navigation/profileNavigator';
import { useTheme } from '../../../../theme/ThemeContext';
import apiClient from '../../../../_api/apiClient';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

interface BeneficialOwner {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  position: string;
  ownershipPercentage?: number;
  dateOfBirth?: string;
  nationality?: string;
  idType?: string;
  idNumber?: string;
  email?: string;
  phone?: string;
  address?: any;
}

const BeneficialOwnersList: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'BeneficialOwnersList'>>();
  const { theme } = useTheme();

  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  const [owners, setOwners] = useState<BeneficialOwner[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch owners from API on mount and when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchOwners();
    }, [])
  );

  const fetchOwners = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/kyc/beneficial-owners');
      console.log('[BeneficialOwnersList] API Response:', response);

      // Ensure ownersData is an array
      const ownersData = Array.isArray(response.data) ? response.data : [];

      // Map API response to component interface
      const mappedOwners: BeneficialOwner[] = ownersData.map((owner: any) => ({
        id: owner.id,
        firstName: owner.first_name,
        middleName: owner.middle_name,
        lastName: owner.last_name,
        position: owner.position,
        ownershipPercentage: owner.ownership_percentage,
        dateOfBirth: owner.date_of_birth,
        nationality: owner.nationality,
        idType: owner.id_type,
        idNumber: owner.id_number,
        email: owner.email,
        phone: owner.phone,
        address: owner.address,
      }));

      setOwners(mappedOwners);
      console.log('[BeneficialOwnersList] Fetched owners:', mappedOwners.length);
    } catch (error) {
      console.error('[BeneficialOwnersList] Failed to fetch owners:', error);
      // Don't show alert on fetch error, just log it
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOwner = () => {
    navigation.navigate('BeneficialOwnerFlow', {
      mode: 'add',
      returnToTimeline,
      sourceRoute,
    });
  };

  const handleEditOwner = (owner: BeneficialOwner) => {
    navigation.navigate('BeneficialOwnerFlow', {
      mode: 'edit',
      ownerId: owner.id,
      returnToTimeline,
      sourceRoute,
    });
  };

  const handleRemoveOwner = (ownerId: string) => {
    Alert.alert(
      'Remove Owner',
      'Are you sure you want to remove this beneficial owner?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/kyc/beneficial-owners/${ownerId}`);
              setOwners(prev => prev.filter(o => o.id !== ownerId));
              console.log('[BeneficialOwnersList] Owner removed:', ownerId);
            } catch (error) {
              console.error('[BeneficialOwnersList] Failed to remove owner:', error);
              Alert.alert('Error', 'Failed to remove owner. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    if (owners.length === 0) {
      Alert.alert('Required', 'Please add at least one beneficial owner before continuing.');
      return;
    }

    // Navigate to review
    navigation.navigate('BeneficialOwnersReview', {
      returnToTimeline,
      sourceRoute,
    });
  };

  const handleBack = () => {
    if (returnToTimeline) {
      navigation.navigate('VerifyYourIdentity', { sourceRoute });
    } else {
      navigation.goBack();
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
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
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl * 2,
    },
    emptyIcon: {
      marginBottom: theme.spacing.md,
    },
    emptyTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    emptyDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    ownerCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    ownerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },
    ownerInfo: {
      flex: 1,
    },
    ownerName: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs / 2,
    },
    ownerDetails: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs / 2,
    },
    ownerActions: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    actionButton: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addButton: {
      backgroundColor: theme.colors.card,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      borderStyle: 'dashed',
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    addButtonText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.primary,
      marginTop: theme.spacing.xs,
    },
    continueButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      marginTop: theme.spacing.lg,
    },
    disabledButton: {
      backgroundColor: theme.colors.border,
    },
    continueButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
    },
  }), [theme]);

  const renderOwnerCard = (owner: BeneficialOwner) => (
    <View key={owner.id} style={styles.ownerCard}>
      <View style={styles.ownerHeader}>
        <View style={styles.ownerInfo}>
          <Text style={styles.ownerName}>
            {owner.firstName} {owner.middleName ? `${owner.middleName} ` : ''}{owner.lastName}
          </Text>
          <Text style={styles.ownerDetails}>
            {owner.position}
            {owner.ownershipPercentage ? ` • ${owner.ownershipPercentage}% ownership` : ''}
          </Text>
          {owner.nationality && (
            <Text style={styles.ownerDetails}>Nationality: {owner.nationality}</Text>
          )}
        </View>
        <View style={styles.ownerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditOwner(owner)}
          >
            <Ionicons name="pencil" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRemoveOwner(owner.id)}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Beneficial Owners</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={styles.title}>Beneficial Owners</Text>
          <Text style={styles.subtitle}>
            Add all individuals who own or control 25% or more of the business.
          </Text>

          {owners.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="people-outline"
                size={64}
                color={theme.colors.textTertiary}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>No owners added yet</Text>
              <Text style={styles.emptyDescription}>
                Add at least one beneficial owner to continue with your business verification.
              </Text>
            </View>
          ) : (
            owners.map(renderOwnerCard)
          )}

          <TouchableOpacity style={styles.addButton} onPress={handleAddOwner}>
            <Ionicons name="add-circle-outline" size={32} color={theme.colors.primary} />
            <Text style={styles.addButtonText}>
              {owners.length === 0 ? 'Add First Owner' : 'Add Another Owner'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.continueButton, owners.length === 0 && styles.disabledButton]}
            onPress={handleContinue}
            disabled={owners.length === 0}
          >
            <Text style={styles.continueButtonText}>
              Continue to Review ({owners.length} {owners.length === 1 ? 'owner' : 'owners'})
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BeneficialOwnersList;
