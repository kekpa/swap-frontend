// Business Setup Screen - Created 2025-01-12
// Purpose: Initial business creation for business-only users after phone verification
// Flow: Phone Verification → BusinessSetup → Business KYC Flow

import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import defaultTheme from '../../theme/theme';
import { useAuthContext } from '../auth/context/AuthContext';
import apiClient from '../../_api/apiClient';
import { API_PATHS } from '../../_api/apiPaths';
import { sanitizeName, sanitizeBusinessName } from '../../utils/inputSanitization';
import { BUSINESS_TYPES, EMPLOYEE_COUNT_OPTIONS } from '../../constants/businessConstants';

type NavigationProp = NativeStackNavigationProp<any>;

export const BusinessSetup = () => {
  const navigation = useNavigation<NavigationProp>();
  const themeContext = useTheme();
  const theme = themeContext?.theme || defaultTheme;
  const { user } = useAuthContext();

  const [loading, setLoading] = useState(false);

  // Business fields
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');

  // Owner fields (for business_admin_team)
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerMiddleName, setOwnerMiddleName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');

  // Dropdown state
  const [businessTypeDropdownVisible, setBusinessTypeDropdownVisible] = useState(false);

  const isFormValid =
    businessName.trim() !== '' &&
    businessType !== '' &&
    ownerFirstName.trim() !== '' &&
    ownerLastName.trim() !== '';

  const handleCreateBusiness = async () => {
    if (!isFormValid) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const businessData = {
        business_name: businessName.trim(),
        business_type: businessType,
        business_phone: businessPhone.trim() || undefined,
        business_email: businessEmail.trim() || undefined,
        owner_first_name: ownerFirstName.trim(),
        owner_middle_name: ownerMiddleName.trim() || undefined,
        owner_last_name: ownerLastName.trim(),
      };

      const response = await apiClient.post(API_PATHS.BUSINESS.CREATE, businessData);

      if (response.data && response.data.id) {
        Alert.alert(
          'Success',
          'Business created successfully! Complete KYC to start accepting payments.',
          [
            {
              text: 'Continue',
              onPress: () => {
                // Navigate to business KYC flow
                navigation.navigate('BusinessKycFlowStart', {
                  businessId: response.data.id,
                });
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Failed to create business:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to create business. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Create Your Business
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Business Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Business Information
          </Text>

          <View style={styles.formField}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Business Name *</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary
              }]}
              placeholder="Enter business name"
              placeholderTextColor={theme.colors.textSecondary}
              value={businessName}
              onChangeText={(text) => setBusinessName(sanitizeBusinessName(text))}
            />
          </View>

          <View style={styles.formField}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Business Type *</Text>
            <TouchableOpacity
              style={[styles.dropdown, {
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border
              }]}
              onPress={() => setBusinessTypeDropdownVisible(!businessTypeDropdownVisible)}
            >
              <Text style={[
                styles.dropdownText,
                { color: businessType ? theme.colors.textPrimary : theme.colors.textSecondary }
              ]}>
                {businessType ? BUSINESS_TYPES.find(t => t.value === businessType)?.label : 'Select business type'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            {businessTypeDropdownVisible && (
              <View style={[styles.dropdownList, {
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border
              }]}>
                {BUSINESS_TYPES.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.dropdownOption}
                    onPress={() => {
                      setBusinessType(option.value);
                      setBusinessTypeDropdownVisible(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, { color: theme.colors.textPrimary }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formField}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Business Phone</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary
              }]}
              placeholder="+509 1234 5678"
              placeholderTextColor={theme.colors.textSecondary}
              value={businessPhone}
              onChangeText={setBusinessPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formField}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Business Email</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary
              }]}
              placeholder="business@example.com"
              placeholderTextColor={theme.colors.textSecondary}
              value={businessEmail}
              onChangeText={setBusinessEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Owner Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Owner Information
          </Text>

          <View style={styles.formField}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>First Name *</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary
              }]}
              placeholder="Enter owner's first name"
              placeholderTextColor={theme.colors.textSecondary}
              value={ownerFirstName}
              onChangeText={(text) => setOwnerFirstName(sanitizeName(text))}
            />
          </View>

          <View style={styles.formField}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Middle Name (Optional)</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary
              }]}
              placeholder="Enter owner's middle name (optional)"
              placeholderTextColor={theme.colors.textSecondary}
              value={ownerMiddleName}
              onChangeText={(text) => setOwnerMiddleName(sanitizeName(text))}
            />
          </View>

          <View style={styles.formField}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Last Name *</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary
              }]}
              placeholder="Enter owner's last name"
              placeholderTextColor={theme.colors.textSecondary}
              value={ownerLastName}
              onChangeText={(text) => setOwnerLastName(sanitizeName(text))}
            />
          </View>
        </View>

        {/* Create Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.createButton, {
              backgroundColor: isFormValid ? theme.colors.primary : theme.colors.border,
              opacity: loading ? 0.7 : 1
            }]}
            onPress={handleCreateBusiness}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.createButtonText}>Create Business</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  formField: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  dropdown: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 16,
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
  },
  dropdownOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dropdownOptionText: {
    fontSize: 16,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  createButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BusinessSetup;
