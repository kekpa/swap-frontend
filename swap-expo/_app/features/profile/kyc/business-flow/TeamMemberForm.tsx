// Created: TeamMemberForm - Single-page form for adding/editing team members (Revolut/Mercury style)
// Replaces multi-step BeneficialOwnerFlow with a simpler, clearer UX
// 2025-12-11

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../../navigation/profileNavigator';
import { useTheme } from '../../../../theme/ThemeContext';
import apiClient from '../../../../_api/apiClient';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

// Access levels for team members (app access, NOT ownership)
type AccessLevel = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

interface FormData {
  // Basic Info
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  // App Access
  hasAppAccess: boolean;
  accessLevel: AccessLevel;
  // Ownership
  hasOwnership: boolean;
  ownershipPercentage: string;
}

const ACCESS_LEVELS: { value: AccessLevel; label: string; description: string }[] = [
  { value: 'ADMIN', label: 'Admin', description: 'Full access to manage everything' },
  { value: 'MANAGER', label: 'Manager', description: 'Can view and do transactions' },
  { value: 'EMPLOYEE', label: 'Employee', description: 'Limited view only' },
];

// Map legacy role values to AccessLevel
const mapRoleToAccessLevel = (role: string | null | undefined): AccessLevel => {
  if (!role) return 'ADMIN';
  const upperRole = role.toUpperCase();
  // Legacy 'owner' role maps to ADMIN (full access)
  if (upperRole === 'OWNER') return 'ADMIN';
  if (upperRole === 'ADMIN' || upperRole === 'MANAGER' || upperRole === 'EMPLOYEE') {
    return upperRole as AccessLevel;
  }
  return 'ADMIN'; // Default
};

const TeamMemberForm: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'TeamMemberForm'>>();
  const { theme } = useTheme();

  const mode = route.params?.mode || 'add';
  const memberId = route.params?.ownerId;
  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    hasAppAccess: true, // Default to having app access
    accessLevel: 'ADMIN',
    hasOwnership: false,
    ownershipPercentage: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAccessDropdown, setShowAccessDropdown] = useState(false);

  // Load existing data when editing
  useEffect(() => {
    if (mode === 'edit' && memberId) {
      fetchMemberData();
    } else if (mode === 'add') {
      // Pre-fill from current user's profile for first member
      prefillFromProfile();
    }
  }, [mode, memberId]);

  const prefillFromProfile = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      const profile = response.data;

      if (profile) {
        setFormData(prev => ({
          ...prev,
          firstName: profile.firstName || profile.first_name || '',
          lastName: profile.lastName || profile.last_name || '',
          phone: profile.phone || '',
          email: profile.email || '',
        }));
      }
    } catch (error) {
      console.log('[TeamMemberForm] Could not prefill from profile:', error);
      // Not critical - user can fill manually
    }
  };

  const fetchMemberData = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/kyc/team-members/${memberId}`);
      const member = response.data;

      setFormData({
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        phone: member.phone || '',
        email: member.email || '',
        hasAppAccess: member.isAdminTeam || false,
        accessLevel: mapRoleToAccessLevel(member.role),
        hasOwnership: member.isBeneficialOwner || false,
        ownershipPercentage: member.ownershipPercentage?.toString() || '',
      });
    } catch (error) {
      console.error('[TeamMemberForm] Failed to load member:', error);
      Alert.alert('Error', 'Failed to load team member information.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    // Must have name and phone
    if (!formData.firstName.trim() || !formData.lastName.trim()) return false;
    if (!formData.phone.trim()) return false;

    // Must select at least one role type
    if (!formData.hasAppAccess && !formData.hasOwnership) return false;

    // If ownership, must have percentage
    if (formData.hasOwnership) {
      const percentage = parseFloat(formData.ownershipPercentage);
      if (isNaN(percentage) || percentage < 1 || percentage > 100) return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete', 'Please fill in all required fields.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        isAdminTeam: formData.hasAppAccess,
        role: formData.hasAppAccess ? formData.accessLevel : undefined,
        isBeneficialOwner: formData.hasOwnership,
        ownershipPercentage: formData.hasOwnership
          ? parseFloat(formData.ownershipPercentage)
          : undefined,
      };

      if (mode === 'edit' && memberId) {
        await apiClient.put(`/kyc/team-members/${memberId}`, payload);
        Alert.alert('Success', 'Team member updated successfully');
      } else {
        await apiClient.post('/kyc/team-members', payload);
        Alert.alert('Success', 'Team member added successfully');
      }

      navigation.navigate('BeneficialOwnersList', {
        returnToTimeline,
        sourceRoute,
      });
    } catch (error: any) {
      console.error('[TeamMemberForm] Save failed:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigation.navigate('BeneficialOwnersList', {
      returnToTimeline,
      sourceRoute,
    });
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      height: 56,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    placeholder: {
      width: 40,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Section styling
    section: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    // Input styling
    inputRow: {
      marginBottom: theme.spacing.md,
    },
    inputLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    requiredBadge: {
      color: theme.colors.error,
      fontWeight: '600',
    },
    input: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    // Checkbox card styling
    checkboxCard: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    checkboxCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '08',
    },
    checkboxHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.colors.border,
      marginRight: theme.spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary,
    },
    checkboxLabel: {
      flex: 1,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    checkboxDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginLeft: 40,
      marginTop: theme.spacing.xs,
    },
    // Dropdown styling
    dropdownContainer: {
      marginTop: theme.spacing.md,
      marginLeft: 40,
    },
    dropdownButton: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dropdownButtonText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
    },
    dropdownMenu: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      marginTop: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    dropdownOption: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    dropdownOptionLast: {
      borderBottomWidth: 0,
    },
    dropdownOptionSelected: {
      backgroundColor: theme.colors.primary + '15',
    },
    dropdownOptionLabel: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
    },
    dropdownOptionDescription: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    // Percentage input
    percentageContainer: {
      marginTop: theme.spacing.md,
      marginLeft: 40,
      flexDirection: 'row',
      alignItems: 'center',
    },
    percentageInput: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      width: 80,
      textAlign: 'center',
    },
    percentageLabel: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.sm,
    },
    // Info box
    infoBox: {
      backgroundColor: theme.colors.primary + '10',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
    },
    infoText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    // Save button
    saveButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    saveButtonDisabled: {
      backgroundColor: theme.colors.border,
    },
    saveButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
    },
    // Validation error
    errorText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.error,
      marginTop: theme.spacing.xs,
    },
  }), [theme]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{mode === 'edit' ? 'Edit Member' : 'Add Member'}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const selectedAccessLevel = ACCESS_LEVELS.find(l => l.value === formData.accessLevel);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mode === 'edit' ? 'Edit Member' : 'Add Member'}</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Info box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Add people who manage your business or own part of it. You can select both if applicable.
            </Text>
          </View>

          {/* Basic Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>
                First Name <Text style={styles.requiredBadge}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.firstName}
                onChangeText={(text) => updateField('firstName', text)}
                placeholder="Enter first name"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>
                Last Name <Text style={styles.requiredBadge}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.lastName}
                onChangeText={(text) => updateField('lastName', text)}
                placeholder="Enter last name"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>
                Phone Number <Text style={styles.requiredBadge}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => updateField('phone', text)}
                placeholder="+509 1234 5678"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Email (optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => updateField('email', text)}
                placeholder="email@example.com"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Role Selection Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What describes this person?</Text>
            <Text style={[styles.inputLabel, { marginBottom: theme.spacing.md }]}>
              Select all that apply
            </Text>

            {/* App Access Checkbox */}
            <TouchableOpacity
              style={[
                styles.checkboxCard,
                formData.hasAppAccess && styles.checkboxCardSelected,
              ]}
              onPress={() => updateField('hasAppAccess', !formData.hasAppAccess)}
              activeOpacity={0.7}
            >
              <View style={styles.checkboxHeader}>
                <View style={[styles.checkbox, formData.hasAppAccess && styles.checkboxSelected]}>
                  {formData.hasAppAccess && (
                    <Ionicons name="checkmark" size={16} color={theme.colors.white} />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Can manage this business</Text>
              </View>
              <Text style={styles.checkboxDescription}>
                Has access to the Swap app for your business
              </Text>

              {/* Access Level Dropdown */}
              {formData.hasAppAccess && (
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowAccessDropdown(!showAccessDropdown)}
                  >
                    <Text style={styles.dropdownButtonText}>
                      {selectedAccessLevel?.label || 'Select access level'}
                    </Text>
                    <Ionicons
                      name={showAccessDropdown ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {showAccessDropdown && (
                    <View style={styles.dropdownMenu}>
                      {ACCESS_LEVELS.map((level, index) => (
                        <TouchableOpacity
                          key={level.value}
                          style={[
                            styles.dropdownOption,
                            index === ACCESS_LEVELS.length - 1 && styles.dropdownOptionLast,
                            formData.accessLevel === level.value && styles.dropdownOptionSelected,
                          ]}
                          onPress={() => {
                            updateField('accessLevel', level.value);
                            setShowAccessDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownOptionLabel}>{level.label}</Text>
                          <Text style={styles.dropdownOptionDescription}>{level.description}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>

            {/* Ownership Checkbox */}
            <TouchableOpacity
              style={[
                styles.checkboxCard,
                formData.hasOwnership && styles.checkboxCardSelected,
              ]}
              onPress={() => updateField('hasOwnership', !formData.hasOwnership)}
              activeOpacity={0.7}
            >
              <View style={styles.checkboxHeader}>
                <View style={[styles.checkbox, formData.hasOwnership && styles.checkboxSelected]}>
                  {formData.hasOwnership && (
                    <Ionicons name="checkmark" size={16} color={theme.colors.white} />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Owns part of the business</Text>
              </View>
              <Text style={styles.checkboxDescription}>
                Has ownership stake in the company
              </Text>

              {/* Ownership Percentage Input */}
              {formData.hasOwnership && (
                <View style={styles.percentageContainer}>
                  <TextInput
                    style={styles.percentageInput}
                    value={formData.ownershipPercentage}
                    onChangeText={(text) => {
                      // Only allow numbers and one decimal point
                      const cleaned = text.replace(/[^0-9.]/g, '');
                      updateField('ownershipPercentage', cleaned);
                    }}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="decimal-pad"
                    maxLength={5}
                  />
                  <Text style={styles.percentageLabel}>% ownership</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Validation message */}
            {!formData.hasAppAccess && !formData.hasOwnership && (
              <Text style={styles.errorText}>
                Please select at least one option
              </Text>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, !isFormValid() && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!isFormValid() || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>
                {mode === 'edit' ? 'Save Changes' : 'Add Team Member'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default TeamMemberForm;
