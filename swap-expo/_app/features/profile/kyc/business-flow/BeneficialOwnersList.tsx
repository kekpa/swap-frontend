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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../../navigation/profileNavigator';
import { useTheme } from '../../../../theme/ThemeContext';
import apiClient from '../../../../_api/apiClient';
import contactsService, { ContactMatch } from '../../../../services/ContactsService';
import logger from '../../../../utils/logger';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

interface TeamMember {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  // Admin team fields
  isAdminTeam: boolean;
  role?: string; // OWNER, ADMIN, MANAGER
  adminStatus?: string;
  // Beneficial owner fields
  isBeneficialOwner: boolean;
  ownershipPercentage?: number;
  position?: string;
  verificationStatus?: string;
  dateOfBirth?: string;
  nationality?: string;
  idType?: string;
  idNumber?: string;
  address?: any;
  // Metadata
  autoPopulated?: boolean;
}

const BeneficialOwnersList: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'BeneficialOwnersList'>>();
  const { theme } = useTheme();

  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  const [owners, setOwners] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contacts, setContacts] = useState<ContactMatch[]>([]);

  // Fetch owners from API on mount and when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchOwners();
    }, [])
  );

  const fetchOwners = async () => {
    setIsLoading(true);
    try {
      // NEW: Use unified team-members endpoint
      const response = await apiClient.get('/kyc/team-members');
      logger.debug('API Response', 'kyc', { response: response.data });

      // BUGFIX: API returns { result: [...], meta: {...} }, not direct array
      const membersData = Array.isArray(response.data.result) ? response.data.result : (Array.isArray(response.data) ? response.data : []);

      // Map API response to component interface (camelCase)
      const mappedMembers: TeamMember[] = membersData.map((member: any) => ({
        id: member.id,
        firstName: member.firstName,
        middleName: member.middleName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        // Admin team fields
        isAdminTeam: member.isAdminTeam || false,
        role: member.role,
        adminStatus: member.adminStatus,
        // Beneficial owner fields
        isBeneficialOwner: member.isBeneficialOwner || false,
        ownershipPercentage: member.ownershipPercentage,
        position: member.position,
        verificationStatus: member.verificationStatus,
        dateOfBirth: member.dateOfBirth,
        nationality: member.nationality,
        idType: member.idType,
        idNumber: member.idNumber,
        address: member.address,
        // Metadata
        autoPopulated: member.autoPopulated,
      }));

      setOwners(mappedMembers);
      logger.debug('Fetched members', 'kyc', { count: mappedMembers.length });
    } catch (error) {
      logger.error('Failed to fetch members', error, 'kyc');
      // Don't show alert on fetch error, just log it
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOwner = () => {
    // Use new single-page form
    navigation.navigate('TeamMemberForm', {
      mode: 'add',
      returnToTimeline,
      sourceRoute,
    });
  };

  const handleEditOwner = (owner: TeamMember) => {
    // Use new single-page form
    navigation.navigate('TeamMemberForm', {
      mode: 'edit',
      ownerId: owner.id,
      returnToTimeline,
      sourceRoute,
    });
  };

  const handleRemoveOwner = (ownerId: string) => {
    // BUSINESS LOGIC: Prevent deleting the only team member (account lockout protection)
    if (owners.length === 1) {
      Alert.alert(
        'Cannot Remove Last Member',
        'You cannot remove the only team member. Add another admin before removing yourself to prevent account lockout.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      'Remove Team Member',
      'Are you sure you want to remove this team member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/kyc/team-members/${ownerId}`);
              setOwners(prev => prev.filter(o => o.id !== ownerId));
              logger.debug('Team member removed', 'kyc', { ownerId });
            } catch (error) {
              logger.error('Failed to remove team member', error, 'kyc');
              Alert.alert('Error', 'Failed to remove team member. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    if (owners.length === 0) {
      Alert.alert('Required', 'Please add at least one team member before continuing.');
      return;
    }

    // Check if ANY member has ownership (beneficial owner)
    const hasOwners = owners.some(o => o.isBeneficialOwner && o.ownershipPercentage);

    if (hasOwners) {
      // Go to Beneficial Owners Review (legal compliance step)
      navigation.navigate('BeneficialOwnersReview', {
        returnToTimeline,
        sourceRoute,
      });
    } else {
      // Skip review - no owners to review, go directly to next step
      navigation.navigate('BusinessInfoFlow', {
        returnToTimeline,
        sourceRoute,
      });
    }
  };

  const handleBack = () => {
    if (returnToTimeline) {
      navigation.navigate('VerifyYourIdentity', { sourceRoute });
    } else {
      navigation.goBack();
    }
  };

  const handleSelectFromContacts = async () => {
    try {
      // Load contacts from device
      const platformContacts = await contactsService.getMatchedPlatformContacts();
      setContacts(platformContacts);
      setShowContactPicker(true);
    } catch (error) {
      logger.error('Error loading contacts', error, 'kyc');
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
    }
  };

  const handleContactSelect = (contact: ContactMatch) => {
    setShowContactPicker(false);

    // Navigate to new single-page form with pre-filled contact data
    // Note: Pre-fill data is handled via params in TeamMemberForm
    navigation.navigate('TeamMemberForm', {
      mode: 'add',
      returnToTimeline,
      sourceRoute,
    });
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
    content: { flex: 1, padding: theme.spacing.lg, backgroundColor: theme.colors.background },
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
      paddingVertical: theme.spacing.md,
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
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    addButtonText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    contactsButton: {
      backgroundColor: theme.colors.card,
      borderWidth: 2,
      borderColor: theme.colors.success,
      borderStyle: 'dashed',
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    contactsButtonText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.success,
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
    roleBadgesContainer: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs / 2,
      flexWrap: 'wrap',
    },
    roleBadge: {
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    roleBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    ownershipBadge: {
      backgroundColor: theme.colors.success + '20',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.success,
    },
    ownershipBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: '600',
      color: theme.colors.success,
    },
    helperText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    modalContent: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      width: '100%',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    modalBody: {
      padding: theme.spacing.lg,
    },
    infoRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing.md,
      alignItems: 'flex-start',
    },
    infoIcon: {
      fontSize: 24,
      marginRight: theme.spacing.sm,
    },
    infoTextContainer: {
      flex: 1,
    },
    infoTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs / 2,
    },
    infoDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    // Contact picker modal styles
    contactPickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    contactPickerContainer: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      maxHeight: '70%',
    },
    contactPickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    contactPickerTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    contactAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    contactAvatarText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
    },
    contactName: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
    },
    contactPhone: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
  }), [theme]);

  const renderOwnerCard = (owner: TeamMember) => (
    <View key={owner.id} style={styles.ownerCard}>
      <View style={styles.ownerHeader}>
        <View style={styles.ownerInfo}>
          <Text style={styles.ownerName}>
            {owner.firstName} {owner.middleName ? `${owner.middleName} ` : ''}{owner.lastName}
          </Text>

          {/* Role badges - Clear labels */}
          <View style={styles.roleBadgesContainer}>
            {owner.isAdminTeam && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {owner.role === 'OWNER' ? 'Admin' : (owner.role || 'Admin')}
                </Text>
              </View>
            )}
            {owner.isBeneficialOwner && owner.ownershipPercentage && (
              <View style={styles.ownershipBadge}>
                <Text style={styles.ownershipBadgeText}>
                  Owner {owner.ownershipPercentage}%
                </Text>
              </View>
            )}
          </View>

          {/* Additional details - only show nationality if external user (no admin team access) */}
          {owner.nationality && !owner.isAdminTeam && (
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
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.card} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team & Ownership</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => setShowHelpModal(true)}>
          <Ionicons name="help-circle-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Add people who manage your business or own part of it.
          </Text>

          {owners.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No team members added yet</Text>
              <Text style={styles.emptyDescription}>
                Add employees, admins, managers, and legal owners to your business.
              </Text>
            </View>
          ) : (
            owners.map(renderOwnerCard)
          )}

          <TouchableOpacity style={styles.addButton} onPress={handleAddOwner}>
            <Ionicons name="add-circle-outline" size={28} color={theme.colors.textSecondary} />
            <Text style={styles.addButtonText}>
              {owners.length === 0 ? 'Add Manually' : 'Add Another Team Member'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.continueButton, owners.length === 0 && styles.disabledButton]}
            onPress={handleContinue}
            disabled={owners.length === 0}
          >
            <Text style={styles.continueButtonText}>
              Continue to Review ({owners.length} {owners.length === 1 ? 'member' : 'members'})
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Help Modal */}
      <Modal
        visible={showHelpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowHelpModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Team & Ownership Info</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>💼</Text>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Can manage business</Text>
                  <Text style={styles.infoDescription}>
                    People who can use the Swap app for your business (admins, managers, employees)
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📊</Text>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Owns part of business</Text>
                  <Text style={styles.infoDescription}>
                    People who have ownership stake in your company (any percentage)
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Contact Picker Modal */}
      <Modal
        visible={showContactPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowContactPicker(false)}
      >
        <View style={styles.contactPickerOverlay}>
          <View style={styles.contactPickerContainer}>
            <View style={styles.contactPickerHeader}>
              <Text style={styles.contactPickerTitle}>Select Contact</Text>
              <TouchableOpacity onPress={() => setShowContactPicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {contacts.map((contact, index) => {
                const displayName = contact.matchedUser?.displayName || contact.contact.displayName;
                const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.contactItem}
                    onPress={() => handleContactSelect(contact)}
                  >
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactName}>{displayName}</Text>
                      <Text style={styles.contactPhone}>{contact.contact.phoneNumber}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default BeneficialOwnersList;
