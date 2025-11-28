// Created: BeneficialOwnerAddress component for owner address collection - 2025-11-11

import React, { useState, useMemo } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../../navigation/profileNavigator';
import { useTheme } from '../../../../theme/ThemeContext';
import { useCountries } from '../../../../hooks-data/useCountries';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

const BeneficialOwnerAddress: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'BeneficialOwnerAddress'>>();
  const { theme } = useTheme();
  const { countries, loading: countriesLoading } = useCountries();

  const ownerId = route.params?.ownerId;
  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  const [currentStep, setCurrentStep] = useState<'country' | 'address'>('country');
  const [country, setCountry] = useState<string>('HT'); // Default to Haiti
  const [address, setAddress] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleCountryContinue = () => {
    if (!country) {
      Alert.alert('Required', 'Please select a country.');
      return;
    }
    setCurrentStep('address');
  };

  const handleAddressContinue = async () => {
    if (!address.addressLine1.trim() || !address.city.trim()) {
      Alert.alert('Required Fields', 'Please fill in address line 1 and city.');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Save address to API (beneficial_owners.address JSONB field)
      const fullAddress = {
        ...address,
        country,
      };
      console.log('[BeneficialOwnerAddress] Saving address for owner:', ownerId, fullAddress);

      // Return to owners list
      navigation.navigate('BeneficialOwnersList', {
        returnToTimeline,
        sourceRoute,
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to save address.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'address') {
      setCurrentStep('country');
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
      paddingVertical: theme.spacing.sm + 2,
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
      borderWidth: 0,
      borderColor: 'transparent',
      borderRadius: 0,
      backgroundColor: 'transparent',
    },
    picker: {
      width: '100%',
      height: Platform.OS === 'ios' ? 180 : 50,
      color: theme.colors.textPrimary,
      backgroundColor: 'transparent',
    },
    iosPickerItem: {
      height: 180,
      color: theme.colors.textPrimary,
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
    disabledButton: {
      backgroundColor: theme.colors.border,
    },
    continueButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
    },
  }), [theme]);

  if (currentStep === 'country') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Owner Country</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Country of Residence</Text>
          <Text style={styles.subtitle}>
            Select the country where this beneficial owner resides.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select country</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={country}
                onValueChange={(value) => setCountry(value)}
                style={styles.picker}
                itemStyle={Platform.OS === 'ios' ? styles.iosPickerItem : {}}
                dropdownIconColor={theme.colors.textPrimary}
                enabled={!countriesLoading}
              >
                {countries.map((c, index) => (
                  <Picker.Item key={index} label={c.label} value={c.value} />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.continueButton, (!country || countriesLoading) && styles.disabledButton]}
            onPress={handleCountryContinue}
            disabled={!country || countriesLoading}
          >
            <Text style={styles.continueButtonText}>Continue to Address</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Address Step
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Owner Address</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={styles.title}>Residential Address</Text>
          <Text style={styles.subtitle}>
            Enter the residential address of this beneficial owner.
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

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleAddressContinue}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Text style={styles.continueButtonText}>Save and Return</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default BeneficialOwnerAddress;
