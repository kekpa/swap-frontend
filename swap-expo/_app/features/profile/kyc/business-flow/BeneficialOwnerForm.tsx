// Created: BeneficialOwnerForm component for adding/editing beneficial owner details - 2025-11-11

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Picker } from '@react-native-picker/picker';
import { ProfileStackParamList } from '../../../../navigation/profileNavigator';
import { useTheme } from '../../../../theme/ThemeContext';
import { useCountries } from '../../../../hooks-data/useCountries';
import apiClient from '../../../../_api/apiClient';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

const BeneficialOwnerForm: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'BeneficialOwnerForm'>>();
  const { theme } = useTheme();
  const { countries, loading: countriesLoading } = useCountries();

  const mode = route.params?.mode || 'add';
  const ownerId = route.params?.ownerId;
  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  const [ownerInfo, setOwnerInfo] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: 'HT', // Default to Haiti
    position: '',
    ownershipPercentage: '',
    idType: 'national_id',
    idNumber: '',
    email: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Load existing owner data if editing
  useEffect(() => {
    if (mode === 'edit' && ownerId) {
      // Load owner data from API
      console.log('[BeneficialOwnerForm] Loading owner data:', ownerId);
    }
  }, [mode, ownerId]);

  const handleContinue = async () => {
    // Validation
    if (!ownerInfo.firstName.trim() || !ownerInfo.lastName.trim()) {
      Alert.alert('Required Fields', 'Please enter first and last name.');
      return;
    }

    if (!ownerInfo.dateOfBirth.trim()) {
      Alert.alert('Required Fields', 'Please enter date of birth.');
      return;
    }

    if (!ownerInfo.position.trim()) {
      Alert.alert('Required Fields', 'Please enter position in company.');
      return;
    }

    if (!ownerInfo.idType || !ownerInfo.idNumber.trim()) {
      Alert.alert('Required Fields', 'Please enter ID type and number.');
      return;
    }

    setIsLoading(true);
    try {
      // Save owner info to API
      console.log('[BeneficialOwnerForm] Saving owner:', ownerInfo);

      const ownerData = {
        first_name: ownerInfo.firstName.trim(),
        middle_name: ownerInfo.middleName?.trim() || null,
        last_name: ownerInfo.lastName.trim(),
        date_of_birth: ownerInfo.dateOfBirth, // Format: YYYY-MM-DD
        nationality: ownerInfo.nationality,
        position: ownerInfo.position.trim(),
        ownership_percentage: ownerInfo.ownershipPercentage ? parseFloat(ownerInfo.ownershipPercentage) : null,
        id_type: ownerInfo.idType,
        id_number: ownerInfo.idNumber.trim(),
        email: ownerInfo.email?.trim() || null,
        phone: ownerInfo.phone?.trim() || null,
      };

      const response = await apiClient.post('/kyc/beneficial-owners', ownerData);
      const savedOwner = response.data;

      console.log('[BeneficialOwnerForm] Owner saved successfully:', savedOwner.id);

      // Navigate to address screen for this owner
      navigation.navigate('BeneficialOwnerAddress', {
        ownerId: savedOwner.id,
        returnToTimeline,
        sourceRoute,
      });
    } catch (error: any) {
      console.error('[BeneficialOwnerForm] Failed to save owner:', error);
      Alert.alert('Error', error.response?.data?.message || 'Unable to save owner information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
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
    content: { padding: theme.spacing.lg },
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
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    inputGroup: { marginBottom: theme.spacing.md },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.card,
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.card,
      overflow: 'hidden',
    },
    picker: {
      height: 50,
      color: theme.colors.textPrimary,
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    halfWidth: {
      flex: 1,
    },
    helperText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
      marginTop: theme.spacing.xs,
    },
    continueButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      marginTop: theme.spacing.xl,
    },
    continueButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
    },
  }), [theme]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'edit' ? 'Edit Owner' : 'Add Owner'}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={styles.title}>Owner Information</Text>
          <Text style={styles.subtitle}>
            Enter the details of the person who owns or controls this business.
          </Text>

          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={ownerInfo.firstName}
                onChangeText={(text) => setOwnerInfo(prev => ({ ...prev, firstName: text }))}
                placeholder="Enter first name"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Middle Name</Text>
              <TextInput
                style={styles.input}
                value={ownerInfo.middleName}
                onChangeText={(text) => setOwnerInfo(prev => ({ ...prev, middleName: text }))}
                placeholder="Enter middle name"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={ownerInfo.lastName}
                onChangeText={(text) => setOwnerInfo(prev => ({ ...prev, lastName: text }))}
                placeholder="Enter last name"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput
                style={styles.input}
                value={ownerInfo.dateOfBirth}
                onChangeText={(text) => setOwnerInfo(prev => ({ ...prev, dateOfBirth: text }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <Text style={styles.helperText}>Format: YYYY-MM-DD (e.g., 1990-01-15)</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nationality</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={ownerInfo.nationality}
                  onValueChange={(value) => setOwnerInfo(prev => ({ ...prev, nationality: value }))}
                  style={styles.picker}
                  dropdownIconColor={theme.colors.textPrimary}
                  enabled={!countriesLoading}
                >
                  {countries.map((c, index) => (
                    <Picker.Item key={index} label={c.label} value={c.value} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Business Role */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Role</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Position in Company</Text>
              <TextInput
                style={styles.input}
                value={ownerInfo.position}
                onChangeText={(text) => setOwnerInfo(prev => ({ ...prev, position: text }))}
                placeholder="e.g., CEO, Director, Partner"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ownership Percentage (optional)</Text>
              <TextInput
                style={styles.input}
                value={ownerInfo.ownershipPercentage}
                onChangeText={(text) => setOwnerInfo(prev => ({ ...prev, ownershipPercentage: text }))}
                placeholder="e.g., 50"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
              <Text style={styles.helperText}>Enter percentage (0-100)</Text>
            </View>
          </View>

          {/* Identification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Identification</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ID Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={ownerInfo.idType}
                  onValueChange={(value) => setOwnerInfo(prev => ({ ...prev, idType: value }))}
                  style={styles.picker}
                  dropdownIconColor={theme.colors.textPrimary}
                >
                  <Picker.Item label="National ID" value="national_id" />
                  <Picker.Item label="Passport" value="passport" />
                  <Picker.Item label="Driver's License" value="drivers_license" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ID Number</Text>
              <TextInput
                style={styles.input}
                value={ownerInfo.idNumber}
                onChangeText={(text) => setOwnerInfo(prev => ({ ...prev, idNumber: text }))}
                placeholder="Enter ID number"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </View>

          {/* Contact Information (Optional) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information (Optional)</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={ownerInfo.email}
                onChangeText={(text) => setOwnerInfo(prev => ({ ...prev, email: text }))}
                placeholder="email@example.com"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={ownerInfo.phone}
                onChangeText={(text) => setOwnerInfo(prev => ({ ...prev, phone: text }))}
                placeholder="+1 234 567 8900"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Text style={styles.continueButtonText}>Continue to Address</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default BeneficialOwnerForm;
