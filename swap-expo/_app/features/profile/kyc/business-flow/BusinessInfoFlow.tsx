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
import { BUSINESS_TYPES, EMPLOYEE_COUNT_OPTIONS } from '../../../../constants/businessConstants';
import { useKycCompletion } from '../../../../hooks-actions/useKycCompletion';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

type BusinessInfoFlowRouteParams = {
  returnToTimeline?: boolean;
  sourceRoute?: string;
};

interface BusinessInformation {
  businessName: string;
  businessType: string;
  businessPhone?: string;
  description: string;
  industryIds: string[]; // Changed from industry to support multi-select
  industryOther?: string;
  registrationNumber?: string;
  legalName?: string;
  employeeCount?: string;
}

// Business type options imported from shared constants
// Industry options fetched from database

const BusinessInfoFlow: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'BusinessInfoFlow'>>();
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const { completeStep } = useKycCompletion(); // ✅ Updated to use completeStep (industry standard)

  const [businessInfo, setBusinessInfo] = useState<BusinessInformation>({
    businessName: '',
    businessType: '',
    businessPhone: '',
    description: '',
    industryIds: [], // Changed to array
    industryOther: '',
    registrationNumber: '',
    legalName: '',
    employeeCount: '',
  });
  const [currentScreen, setCurrentScreen] = useState<1 | 2>(1); // Track which screen is shown
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showBusinessTypes, setShowBusinessTypes] = useState(false);
  const [showIndustries, setShowIndustries] = useState(false);
  const [showEmployeeCount, setShowEmployeeCount] = useState(false);
  const [industries, setIndustries] = useState<Array<{value: string, label: string, code?: string}>>([]);
  const [isLoadingIndustries, setIsLoadingIndustries] = useState(true);

  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  // Load existing business information
  useEffect(() => {
    loadExistingBusinessInfo();
  }, []);

  // Load industries from database
  useEffect(() => {
    loadIndustries();
  }, []);

  const loadIndustries = async () => {
    try {
      console.log('[BusinessInfoFlow] Loading industries from database...');
      const response = await apiClient.get('/kyc/industries');
      setIndustries(response.data.result || []);
      console.log('[BusinessInfoFlow] ✅ Loaded', response.data?.result?.length || 0, 'industries');
    } catch (error) {
      console.error('[BusinessInfoFlow] Failed to load industries:', error);
      // Fallback to empty array
      setIndustries([]);
    } finally {
      setIsLoadingIndustries(false);
    }
  };

  const loadExistingBusinessInfo = async () => {
    try {
      console.log('[BusinessInfoFlow] Loading existing business information...');
      const response = await apiClient.get('/kyc/identity');

      if (response.data) {
        const existingInfo = response.data;
        setBusinessInfo({
          businessName: existingInfo.businessName || '',
          businessType: existingInfo.businessType || '',
          businessPhone: existingInfo.businessPhone || '',
          description: existingInfo.description || '',
          industryIds: existingInfo.industryIds || [], // Changed to array
          industryOther: existingInfo.industryOther || '',
          registrationNumber: existingInfo.registrationNumber || '',
          legalName: existingInfo.legalName || '',
          employeeCount: existingInfo.employeeCount || '',
        });
        console.log('[BusinessInfoFlow] ✅ Loaded existing business information with', existingInfo.industryIds?.length || 0, 'industries');
      }
    } catch (error) {
      console.log('[BusinessInfoFlow] No existing business information found or error loading:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Validate and move to screen 2
  const handleContinueToIndustries = () => {
    // Validate screen 1 fields
    if (!businessInfo.businessName.trim()) {
      Alert.alert('Required Field', 'Please enter your business name.');
      return;
    }

    if (!businessInfo.businessType) {
      Alert.alert('Required Field', 'Please select your business type.');
      return;
    }

    if (!businessInfo.legalName?.trim()) {
      Alert.alert('Required Field', 'Please enter your legal business name.');
      return;
    }

    if (!businessInfo.employeeCount) {
      Alert.alert('Required Field', 'Please select your employee count.');
      return;
    }

    // Move to industries screen
    setCurrentScreen(2);
  };

  const handleSave = async () => {
    // Validate industries (1-3 required)
    if (businessInfo.industryIds.length < 1 || businessInfo.industryIds.length > 3) {
      Alert.alert('Industry Selection', 'Please select 1-3 industries that best describe your business.');
      return;
    }

    // If "Other" is selected, require industryOther field
    const hasOther = businessInfo.industryIds.some(id => {
      const industry = industries.find(i => i.value === id);
      return industry?.code === 'other';
    });

    if (hasOther && !businessInfo.industryOther?.trim()) {
      Alert.alert('Required Field', 'Please specify your custom industry.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[BusinessInfoFlow] 🎯 Using KYC completion hook for instant cache update');
      console.log('[BusinessInfoFlow] Saving business information with', businessInfo.industryIds.length, 'industries...');

      const payload = {
        businessName: businessInfo.businessName.trim(),
        businessType: businessInfo.businessType,
        businessPhone: businessInfo.businessPhone?.trim() || null,
        description: businessInfo.description.trim(),
        industryIds: businessInfo.industryIds,
        industryOther: businessInfo.industryOther?.trim() || null,
        registrationNumber: businessInfo.registrationNumber?.trim() || null,
        legalName: businessInfo.legalName?.trim(),
        employeeCount: businessInfo.employeeCount,
      };

      // Use professional hook for completion (handles cache invalidation automatically)
      const result = await completeStep('business_info', payload, {
        returnToTimeline,
        sourceRoute,
        showSuccessAlert: false, // Checkmark provides sufficient visual feedback
      });

      if (result.success) {
        console.log('[BusinessInfoFlow] ✅ Business information saved with automatic cache invalidation');
      } else {
        // Error already handled by hook, just show alert
        Alert.alert(
          'Save Error',
          'Unable to save business information. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
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

  // Helper: Sort industries alphabetically, "Other" last (MUST be before early return)
  const sortedIndustries = useMemo(() => {
    if (!industries || industries.length === 0) return [];

    const otherIndustry = industries.find(i => i.code === 'other');
    const normalIndustries = industries.filter(i => i.code !== 'other').sort((a, b) => a.label.localeCompare(b.label));

    return otherIndustry ? [...normalIndustries, otherIndustry] : normalIndustries;
  }, [industries]);

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
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    chipSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    chipText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.colors.text,
    },
    chipTextSelected: {
      color: theme.colors.white,
      fontWeight: '600',
    },
  }), [theme]);

  if (isLoadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.sectionDescription, { marginTop: theme.spacing.md }]}>
            Loading business information...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Helper: Toggle industry selection
  const toggleIndustry = (industryId: string) => {
    setBusinessInfo(prev => {
      const currentIds = prev.industryIds;

      if (currentIds.includes(industryId)) {
        // Deselect
        return { ...prev, industryIds: currentIds.filter(id => id !== industryId) };
      } else {
        // Select (max 3)
        if (currentIds.length >= 3) {
          Alert.alert('Selection Limit', 'You can select up to 3 industries.');
          return prev;
        }
        return { ...prev, industryIds: [...currentIds, industryId] };
      }
    });
  };

  // Screen 1 validation
  const isScreen1Valid = businessInfo.businessName.trim() &&
    businessInfo.businessType &&
    businessInfo.legalName?.trim() &&
    businessInfo.employeeCount;

  // Screen 2 validation
  const isScreen2Valid = businessInfo.industryIds.length >= 1 && businessInfo.industryIds.length <= 3;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={currentScreen === 1 ? handleBack : () => setCurrentScreen(1)}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentScreen === 1 ? 'Business Information' : 'Select Industries'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {currentScreen === 1 ? (
            <>
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

          {/* Legal Name (REQUIRED) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Legal Name <Text style={styles.requiredLabel}>*</Text>
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

          {/* Business Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Phone</Text>
            <TextInput
              style={styles.input}
              value={businessInfo.businessPhone}
              onChangeText={(text) => setBusinessInfo(prev => ({ ...prev, businessPhone: text }))}
              placeholder="+509 1234 5678"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="phone-pad"
            />
            <Text style={styles.helperText}>Contact number for business inquiries</Text>
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

          {/* Employee Count (REQUIRED) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Employee Count <Text style={styles.requiredLabel}>*</Text>
            </Text>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowEmployeeCount(!showEmployeeCount)}
              >
                <Text style={[
                  styles.pickerText,
                  !businessInfo.employeeCount && styles.pickerPlaceholder
                ]}>
                  {businessInfo.employeeCount ? EMPLOYEE_COUNT_OPTIONS.find(opt => opt.value === businessInfo.employeeCount)?.label : 'Select employee count'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              {showEmployeeCount && (
                <ScrollView style={styles.dropdown} nestedScrollEnabled>
                  {EMPLOYEE_COUNT_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setBusinessInfo(prev => ({ ...prev, employeeCount: option.value }));
                        setShowEmployeeCount(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{option.label}</Text>
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
            style={[styles.continueButton, !isScreen1Valid && styles.continueButtonDisabled]}
            onPress={handleContinueToIndustries}
            disabled={!isScreen1Valid}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Screen 2: Industry Selection with Chips */}
              <Text style={styles.sectionDescription}>
                Choose 1-3 industries that best describe your business activities.
              </Text>

              <Text style={[styles.label, { marginTop: theme.spacing.sm }]}>
                Selected: {businessInfo.industryIds.length}/3
              </Text>

              <View style={styles.chipContainer}>
                {sortedIndustries.map((industry) => {
                  const isSelected = businessInfo.industryIds.includes(industry.value);

                  return (
                    <TouchableOpacity
                      key={industry.value}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected
                      ]}
                      onPress={() => toggleIndustry(industry.value)}
                    >
                      <Text style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected
                      ]}>
                        {industry.label}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={theme.colors.white}
                          style={{ marginLeft: theme.spacing.xs }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Industry Other (Conditional - only if "Other" selected) */}
              {businessInfo.industryIds.some(id => {
                const industry = industries.find(i => i.value === id);
                return industry?.code === 'other';
              }) && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Please specify your custom industry <Text style={styles.requiredLabel}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={businessInfo.industryOther}
                    onChangeText={(text) => setBusinessInfo(prev => ({ ...prev, industryOther: text }))}
                    placeholder="Enter your custom industry"
                    placeholderTextColor={theme.colors.textSecondary}
                    autoCapitalize="words"
                  />
                </View>
              )}

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.continueButton, (!isScreen2Valid || isLoading) && styles.continueButtonDisabled]}
                onPress={handleSave}
                disabled={!isScreen2Valid || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={styles.continueButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BusinessInfoFlow; 