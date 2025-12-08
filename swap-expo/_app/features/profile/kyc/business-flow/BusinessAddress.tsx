// Created: BusinessAddress component for business location KYC - 2025-06-28
// Updated: Added pre-fill logic to load existing address data - 2025-11-09

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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../../navigation/profileNavigator';
import { useTheme } from '../../../../theme/ThemeContext';
import apiClient from '../../../../_api/apiClient';
import { useKycCompletion } from '../../../../hooks-actions/useKycCompletion';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

const BusinessAddress: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'BusinessAddress'>>();
  const { theme } = useTheme();
  const { completeStep } = useKycCompletion(); // ✅ FIXED: Use completeStep directly (industry standard)

  const selectedCountry = route.params?.selectedCountry || '';

  const [address, setAddress] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    countryCode: selectedCountry,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  // Load existing address on component mount
  useEffect(() => {
    loadExistingAddress();
  }, []);

  const loadExistingAddress = async () => {
    try {
      console.log('[BusinessAddress] Loading existing address...');
      const response = await apiClient.get('/kyc/address');

      if (response.data && response.data.address) {
        const existingAddress = response.data.address;
        setAddress({
          addressLine1: existingAddress.addressLine1 || '',
          addressLine2: existingAddress.addressLine2 || '',
          city: existingAddress.city || '',
          postalCode: existingAddress.postalCode || '',
          countryCode: existingAddress.countryCode || '',
        });
        console.log('[BusinessAddress] ✅ Loaded existing address');
      }
    } catch (error) {
      console.log('[BusinessAddress] No existing address found or error loading:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSave = async () => {
    if (!address.addressLine1.trim() || !address.city.trim() || !address.countryCode) {
      Alert.alert('Required Fields', 'Please fill in all required address details.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[BusinessAddress] 🎯 Using KYC completion hook for instant cache update');

      // ✅ FIXED: Use completeStep with correct step type 'business_address'
      // Previously called completeBusinessInfo which completed wrong step (business_info instead of business_address)
      const result = await completeStep('business_address', address, {
        returnToTimeline,
        sourceRoute,
        showSuccessAlert: false, // Checkmark provides sufficient visual feedback
      });

      if (result.success) {
        console.log('[BusinessAddress] ✅ Business address saved with automatic cache invalidation');
      } else {
        Alert.alert('Save Error', 'Unable to save address information.');
      }
    } catch (error) {
      Alert.alert('Save Error', 'Unable to save address information.');
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
    saveButton: { 
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    saveButtonText: { 
      color: theme.colors.primary, 
      fontSize: theme.typography.fontSize.md, 
      fontWeight: '600' 
    },
    content: { padding: theme.spacing.lg, flex: 1, backgroundColor: theme.colors.background },
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
    inputGroup: { marginBottom: theme.spacing.lg },
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
    readOnlyInput: {
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
    },
    readOnlyText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
    },
    continueButton: {
      ...theme.commonStyles.primaryButton,
      paddingVertical: theme.spacing.md,
      marginTop: theme.spacing.xl,
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
        <Text style={styles.headerTitle}>Business Address</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View style={styles.content}>
          <Text style={styles.title}>Business Address</Text>
          <Text style={styles.subtitle}>
            Enter the physical location where your business operates.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address Line 1</Text>
            <TextInput
              style={styles.input}
              value={address.addressLine1}
              onChangeText={(text) => setAddress(prev => ({ ...prev, addressLine1: text }))}
              placeholder="Street address, P.O. box"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address Line 2</Text>
            <TextInput
              style={styles.input}
              value={address.addressLine2}
              onChangeText={(text) => setAddress(prev => ({ ...prev, addressLine2: text }))}
              placeholder="Apartment, suite, building (optional)"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={address.city}
              onChangeText={(text) => setAddress(prev => ({ ...prev, city: text }))}
              placeholder="Enter city"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Postal Code</Text>
            <TextInput
              style={styles.input}
              value={address.postalCode}
              onChangeText={(text) => setAddress(prev => ({ ...prev, postalCode: text }))}
              placeholder="Enter postal code (optional)"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Country</Text>
            <View style={[styles.input, styles.readOnlyInput]}>
              <Text style={styles.readOnlyText}>{address.countryCode || 'Not selected'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default BusinessAddress; 