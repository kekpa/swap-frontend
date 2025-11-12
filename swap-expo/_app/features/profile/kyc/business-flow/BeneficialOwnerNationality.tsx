// Created: BeneficialOwnerNationality - Step 2: Country of Residence - 2025-11-11

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../../../theme/ThemeContext';
import { useCountries } from '../../../../hooks-data/useCountries';

interface BeneficialOwnerNationalityProps {
  onBack: () => void;
  onContinue: (nationality: string) => void;
  selectedNationality?: string;
  ownerName: string;
}

const BeneficialOwnerNationality: React.FC<BeneficialOwnerNationalityProps> = ({
  onBack,
  onContinue,
  selectedNationality = 'HT',
  ownerName,
}) => {
  const { theme } = useTheme();
  const [nationality, setNationality] = useState<string>(selectedNationality);
  const { countries, loading: countriesLoading, error, refetch } = useCountries();

  const handleContinue = () => {
    if (nationality) {
      onContinue(nationality);
    }
  };

  const handleRetry = () => {
    refetch();
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        content: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        formContainer: {
          padding: theme.spacing.lg,
          flex: 1,
        },
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
        ownerNameInline: {
          fontWeight: '700',
          color: theme.colors.textPrimary,
        },
        formGroup: {
          marginBottom: theme.spacing.lg,
        },
        label: {
          fontSize: theme.typography.fontSize.md,
          fontWeight: '500',
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing.xs,
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
        loadingContainer: {
          padding: theme.spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 100,
        },
        loadingText: {
          fontSize: theme.typography.fontSize.md,
          color: theme.colors.textSecondary,
          marginTop: theme.spacing.sm,
        },
        errorContainer: {
          padding: theme.spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 100,
        },
        errorText: {
          fontSize: theme.typography.fontSize.md,
          color: theme.colors.error,
          textAlign: 'center',
          marginBottom: theme.spacing.md,
        },
        retryButton: {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.borderRadius.md,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
        },
        retryButtonText: {
          color: theme.colors.white,
          fontSize: theme.typography.fontSize.sm,
          fontWeight: '600',
        },
        continueButton: {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.borderRadius.md,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          alignItems: 'center',
          marginTop: 'auto',
        },
        continueButtonText: {
          color: theme.colors.white,
          fontSize: theme.typography.fontSize.md,
          fontWeight: '600',
        },
      }),
    [theme]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Country of Residence</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.formContainer}>
          <Text style={styles.subtitle}>
            Select the country of residence for <Text style={styles.ownerNameInline}>{ownerName}</Text>
          </Text>

          {countriesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading countries...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load countries. Please try again.</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Country</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={nationality}
                    onValueChange={(itemValue) => setNationality(itemValue)}
                    style={styles.picker}
                    itemStyle={Platform.OS === 'ios' ? styles.iosPickerItem : undefined}
                  >
                    {countries.map((country) => (
                      <Picker.Item key={country.value} label={country.label} value={country.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

export default BeneficialOwnerNationality;
