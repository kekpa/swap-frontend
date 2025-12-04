// Created: BusinessCountryOfResidence component for business location country selection - 2025-11-11

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../../navigation/profileNavigator';
import { useTheme } from '../../../../theme/ThemeContext';
import { useCountries } from '../../../../hooks-data/useCountries';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

const BusinessCountryOfResidence: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'BusinessCountryOfResidence'>>();
  const { theme } = useTheme();
  const [country, setCountry] = useState<string>('HT'); // Default to Haiti
  const { countries, loading: countriesLoading, error, refetch } = useCountries();

  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  // Set default to Haiti when countries load
  useEffect(() => {
    if (countries.length > 0 && !country) {
      setCountry('HT'); // Haiti country code
    }
  }, [countries]);

  const handleContinue = () => {
    if (country) {
      // Navigate to Business Address with selected country
      navigation.navigate('BusinessAddress', {
        returnToTimeline,
        sourceRoute,
        selectedCountry: country,
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

  const handleRetry = () => {
    refetch();
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.card
    },
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
      padding: theme.spacing.lg,
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
    continueButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      marginTop: theme.spacing.xl,
    },
    disabledButton: {
      backgroundColor: theme.colors.border
    },
    continueButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600'
    },
  }), [theme]);

  const renderCountryPicker = () => {
    if (countriesLoading) {
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.card} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Country</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Business Country</Text>
        <Text style={styles.subtitle}>
          Select the country where your business is registered and operates.
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Select country</Text>
          {renderCountryPicker()}
        </View>

        <TouchableOpacity
          style={[styles.continueButton, (!country || countriesLoading) && styles.disabledButton]}
          onPress={handleContinue}
          disabled={!country || countriesLoading}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default BusinessCountryOfResidence;
