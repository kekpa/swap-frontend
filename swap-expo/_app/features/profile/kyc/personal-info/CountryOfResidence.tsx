import React, { useState, useMemo, useEffect } from 'react';
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
import { Theme } from '../../../../theme/theme';
import { useCountries } from '../../../../query/hooks/useCountries';
import { usePersonalInfoLoad } from '../../../../hooks/usePersonalInfoLoad';

interface CountryOfResidenceProps {
  onBack: () => void;
  onContinue: (country: string) => void;
  selectedCountry?: string;
}

const CountryOfResidence: React.FC<CountryOfResidenceProps> = ({
  onBack,
  onContinue,
  selectedCountry = '',
}) => {
  const { theme } = useTheme();
  const [country, setCountry] = useState<string>(selectedCountry);
  const { countries, loading: countriesLoading, error, refetch } = useCountries();
  const { personalInfo, loading: personalInfoLoading } = usePersonalInfoLoad();
  
  // Pre-populate country when personal info is loaded
  useEffect(() => {
    if (personalInfo?.countryOfResidence && !selectedCountry) {
      setCountry(personalInfo.countryOfResidence);
    }
  }, [personalInfo, selectedCountry]);
  
  const handleContinue = () => {
    if (country) {
      onContinue(country);
    }
  };

  const handleRetry = () => {
    refetch();
  };

  // Show loading if either countries or personal info is loading
  const isLoading = countriesLoading || personalInfoLoading;

  const styles = useMemo(() => StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: theme.colors.background 
    },
    header: {
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md, 
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    backButton: { 
      width: 40, 
      height: 40, 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    headerTitle: { 
      fontSize: theme.typography.fontSize.lg, 
      fontWeight: '600', 
      color: theme.colors.textPrimary 
    },
    content: { 
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    formContainer: { 
      padding: theme.spacing.lg, 
      flex: 1 
    },
    title: { 
      fontSize: theme.typography.fontSize.xl, 
      fontWeight: '600', 
      color: theme.colors.textPrimary, 
      marginBottom: theme.spacing.xs 
    },
    subtitle: { 
      fontSize: theme.typography.fontSize.md, 
      color: theme.colors.textSecondary, 
      marginBottom: theme.spacing.xl 
    },
    formGroup: { 
      marginBottom: theme.spacing.lg 
    },
    label: { 
      fontSize: theme.typography.fontSize.md, 
      fontWeight: '500', 
      color: theme.colors.textPrimary, 
      marginBottom: theme.spacing.xs 
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
      fontWeight: '500',
    },
    termsText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: 'auto',
      paddingBottom: theme.spacing.sm,
    },
    termsLink: { 
      color: theme.colors.primary 
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
      backgroundColor: theme.colors.border 
    },
    continueButtonText: { 
      color: theme.colors.white, 
      fontSize: theme.typography.fontSize.md, 
      fontWeight: '500' 
    },
  }), [theme]);
  
  const renderCountryPicker = () => {
    if (isLoading) {
  return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading countries...</Text>
      </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Failed to load countries. Please check your internet connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={country}
                onValueChange={(itemValue) => setCountry(itemValue)}
                style={styles.picker}
                itemStyle={Platform.OS === 'ios' ? styles.iosPickerItem : {}}
                dropdownIconColor={theme.colors.textPrimary}
              >
                {countries.map((c, index) => (
                  <Picker.Item 
                    key={index} 
                    label={c.label} 
                    value={c.value} 
                    color={theme.colors.textPrimary}
                  />
                ))}
              </Picker>
            </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Country of residence</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Country of residence</Text>
          <Text style={styles.subtitle}>
            The country where you live. We will use this information to set up your account.
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Select country</Text>
            {renderCountryPicker()}
          </View>
          
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
          
          <TouchableOpacity 
            style={[styles.continueButton, (!country || isLoading) && styles.disabledButton]} 
            onPress={handleContinue}
            disabled={!country || isLoading}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default CountryOfResidence; 