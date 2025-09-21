import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../theme/ThemeContext';
import { Theme } from '../../../../theme/theme';
import { usePersonalInfoLoad } from '../../../../hooks-actions/usePersonalInfoLoad';

interface HomeAddressProps {
  onBack: () => void;
  onContinue: (addressLine1: string, addressLine2: string, city: string, postalCode: string) => void;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
}

const HomeAddress: React.FC<HomeAddressProps> = ({
  onBack,
  onContinue,
  addressLine1 = '',
  addressLine2 = '',
  city = '',
  postalCode = '',
}) => {
  const { theme } = useTheme();
  const { personalInfo } = usePersonalInfoLoad();
  
  const [line1, setLine1] = useState<string>(addressLine1);
  const [line2, setLine2] = useState<string>(addressLine2);
  const [cityInput, setCityInput] = useState<string>(city);
  const [postal, setPostal] = useState<string>(postalCode);

  // Pre-populate address fields when personal info is loaded
  useEffect(() => {
    if (personalInfo?.address && !addressLine1 && !city && !postalCode) {
      // Only pre-populate if no props were passed (not pre-filled)
      if (personalInfo.address.addressLine1) {
        setLine1(personalInfo.address.addressLine1);
      }
      if (personalInfo.address.addressLine2) {
        setLine2(personalInfo.address.addressLine2);
      }
      if (personalInfo.address.city) {
        setCityInput(personalInfo.address.city);
      }
      if (personalInfo.address.postalCode) {
        setPostal(personalInfo.address.postalCode);
      }
    }
  }, [personalInfo, addressLine1, city, postalCode]);

  const isFormValid = !!line1 && !!cityInput && !!postal;

  const handleContinue = () => {
    if (isFormValid) {
      onContinue(line1, line2, cityInput, postal);
    }
  };

  // Styles memoized with theme dependency
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
    formGroup: {
      marginBottom: theme.spacing.md,
    },
    label: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    input: {
      width: '100%',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
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
      fontWeight: '500',
    },
  }), [theme]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home address</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Home address</Text>
          <Text style={styles.subtitle}>
            Please enter your home address exactly as it appears on your official documents.
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Address line 1</Text>
            <TextInput
              style={styles.input}
              placeholder="Building, street"
              value={line1}
              onChangeText={setLine1}
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Address line 2 (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Apartment, suite, unit"
              value={line2}
              onChangeText={setLine2}
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="City"
              value={cityInput}
              onChangeText={setCityInput}
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Postal code</Text>
            <TextInput
              style={styles.input}
              placeholder="Postal code"
              value={postal}
              onChangeText={setPostal}
              keyboardType="number-pad"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>

          <TouchableOpacity
            style={[styles.continueButton, !isFormValid && styles.disabledButton]}
            onPress={handleContinue}
            disabled={!isFormValid}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default HomeAddress; 