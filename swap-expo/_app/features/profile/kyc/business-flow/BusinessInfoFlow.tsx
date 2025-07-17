// Created: BusinessInfoFlow component for business KYC information collection - 2025-06-28

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../../navigation/profileNavigator';
import { useTheme } from '../../../../theme/ThemeContext';
import { Theme } from '../../../../theme/theme';
import { useAuthContext } from '../../../auth/context/AuthContext';
import apiClient from '../../../../_api/apiClient';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

type BusinessInfoFlowRouteParams = {
  returnToTimeline?: boolean;
  sourceRoute?: string;
};

interface BusinessInformation {
  businessName: string;
  businessType: string;
  description: string;
  industry: string;
  registrationNumber?: string;
  legalName?: string;
}

// Business type options for informal economy
const BUSINESS_TYPES = [
  { value: 'sole_proprietorship', label: 'Individual Trader' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'small_business', label: 'Small Business' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'family_business', label: 'Family Business' },
  { value: 'other', label: 'Other' },
];

// Industry options for informal economy
const INDUSTRIES = [
  { value: 'agriculture', label: 'Agriculture & Farming' },
  { value: 'retail', label: 'Retail & Trading' },
  { value: 'services', label: 'Services' },
  { value: 'manufacturing', label: 'Manufacturing & Crafts' },
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'transport', label: 'Transportation' },
  { value: 'construction', label: 'Construction' },
  { value: 'textiles', label: 'Textiles & Clothing' },
  { value: 'technology', label: 'Technology' },
  { value: 'other', label: 'Other' },
];

const BusinessInfoFlow: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'BusinessInfoFlow'>>();
  const { theme } = useTheme();
  const { user } = useAuthContext();

  const [businessInfo, setBusinessInfo] = useState<BusinessInformation>({
    businessName: '',
    businessType: '',
    description: '',
    industry: '',
    registrationNumber: '',
    legalName: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showBusinessTypes, setShowBusinessTypes] = useState(false);
  const [showIndustries, setShowIndustries] = useState(false);

  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  // Load existing business information
  useEffect(() => {
    loadExistingBusinessInfo();
  }, []);

  const loadExistingBusinessInfo = async () => {
    try {
      console.log('[BusinessInfoFlow] Loading existing business information...');
      const response = await apiClient.get('/kyc/business-information');
      
      if (response.data && response.data.businessInfo) {
        const existingInfo = response.data.businessInfo;
        setBusinessInfo({
          businessName: existingInfo.business_name || '',
          businessType: existingInfo.business_type || '',
          description: existingInfo.description || '',
          industry: existingInfo.industry || '',
          registrationNumber: existingInfo.registration_number || '',
          legalName: existingInfo.legal_name || '',
        });
        console.log('[BusinessInfoFlow] ✅ Loaded existing business information');
      }
    } catch (error) {
      console.log('[BusinessInfoFlow] No existing business information found or error loading:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!businessInfo.businessName.trim()) {
      Alert.alert('Required Field', 'Please enter your business name.');
      return;
    }

    if (!businessInfo.businessType) {
      Alert.alert('Required Field', 'Please select your business type.');
      return;
    }

    if (!businessInfo.industry) {
      Alert.alert('Required Field', 'Please select your industry.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[BusinessInfoFlow] Saving business information...');
      
      const payload = {
        business_name: businessInfo.businessName.trim(),
        business_type: businessInfo.businessType,
        description: businessInfo.description.trim(),
        industry: businessInfo.industry,
        registration_number: businessInfo.registrationNumber?.trim() || null,
        legal_name: businessInfo.legalName?.trim() || null,
      };

      await apiClient.post('/kyc/business-information', payload);
      
      console.log('[BusinessInfoFlow] ✅ Business information saved successfully');
      
      // Navigate back to timeline
      if (returnToTimeline) {
        navigation.navigate('VerifyYourIdentity', { sourceRoute });
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('[BusinessInfoFlow] Error saving business information:', error);
      Alert.alert(
        'Save Error',
        'Unable to save business information. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (returnToTimeline) {
      navigation.navigate('VerifyYourIdentity', { sourceRoute });
    } else {
      navigation.goBack();
    }
  };

  const getBusinessTypeLabel = (value: string) => {
    const type = BUSINESS_TYPES.find(t => t.value === value);
    return type ? type.label : value;
  };

  const getIndustryLabel = (value: string) => {
    const industry = INDUSTRIES.find(i => i.value === value);
    return industry ? industry.label : value;
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
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
    saveButton: { 
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    saveButtonText: { 
      color: theme.colors.primary, 
      fontSize: theme.typography.fontSize.md, 
      fontWeight: '600' 
    },
    scrollView: { flex: 1 },
    content: { padding: theme.spacing.lg },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    sectionDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
      lineHeight: 20,
    },
    inputGroup: { marginBottom: theme.spacing.lg },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    requiredLabel: { color: theme.colors.error },
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
    textArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    picker: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      backgroundColor: theme.colors.card,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pickerText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
    },
    pickerPlaceholder: {
      color: theme.colors.textSecondary,
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderTopWidth: 0,
      borderRadius: theme.borderRadius.md,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      maxHeight: 200,
      zIndex: 1000,
    },
    dropdownItem: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    dropdownItemText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
    },
    continueButton: {
      ...theme.commonStyles.primaryButton,
      marginTop: theme.spacing.xl,
    },
    continueButtonDisabled: {
      backgroundColor: theme.colors.border,
    },
    continueButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    optionalText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
  }), [theme]);

  if (isLoadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.sectionDescription, { marginTop: theme.spacing.md }]}>
            Loading business information...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFormValid = businessInfo.businessName.trim() && businessInfo.businessType && businessInfo.industry;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Information</Text>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={[styles.saveButtonText, !isFormValid && { color: theme.colors.textSecondary }]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Tell us about your business</Text>
          <Text style={styles.sectionDescription}>
            Provide basic information about your business. This helps us understand your trading activities and comply with financial regulations.
          </Text>

          {/* Business Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Business Name <Text style={styles.requiredLabel}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={businessInfo.businessName}
              onChangeText={(text) => setBusinessInfo(prev => ({ ...prev, businessName: text }))}
              placeholder="Enter your business name"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="words"
            />
          </View>

          {/* Legal Name (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Legal Name <Text style={styles.optionalText}>(if different from business name)</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={businessInfo.legalName}
              onChangeText={(text) => setBusinessInfo(prev => ({ ...prev, legalName: text }))}
              placeholder="Enter legal business name"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="words"
            />
          </View>

          {/* Business Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Business Type <Text style={styles.requiredLabel}>*</Text>
            </Text>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowBusinessTypes(!showBusinessTypes)}
              >
                <Text style={[
                  styles.pickerText,
                  !businessInfo.businessType && styles.pickerPlaceholder
                ]}>
                  {businessInfo.businessType ? getBusinessTypeLabel(businessInfo.businessType) : 'Select business type'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              
              {showBusinessTypes && (
                <ScrollView style={styles.dropdown} nestedScrollEnabled>
                  {BUSINESS_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setBusinessInfo(prev => ({ ...prev, businessType: type.value }));
                        setShowBusinessTypes(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

          {/* Industry */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Industry <Text style={styles.requiredLabel}>*</Text>
            </Text>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowIndustries(!showIndustries)}
              >
                <Text style={[
                  styles.pickerText,
                  !businessInfo.industry && styles.pickerPlaceholder
                ]}>
                  {businessInfo.industry ? getIndustryLabel(businessInfo.industry) : 'Select industry'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              
              {showIndustries && (
                <ScrollView style={styles.dropdown} nestedScrollEnabled>
                  {INDUSTRIES.map((industry) => (
                    <TouchableOpacity
                      key={industry.value}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setBusinessInfo(prev => ({ ...prev, industry: industry.value }));
                        setShowIndustries(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{industry.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

          {/* Registration Number (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Registration Number <Text style={styles.optionalText}>(if you have one)</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={businessInfo.registrationNumber}
              onChangeText={(text) => setBusinessInfo(prev => ({ ...prev, registrationNumber: text }))}
              placeholder="Enter registration number"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="characters"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={businessInfo.description}
              onChangeText={(text) => setBusinessInfo(prev => ({ ...prev, description: text }))}
              placeholder="Describe what your business does..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, !isFormValid && styles.continueButtonDisabled]}
            onPress={handleSave}
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BusinessInfoFlow; 