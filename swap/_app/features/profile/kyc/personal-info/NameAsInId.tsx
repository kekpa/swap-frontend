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
import { usePersonalInfoLoad } from '../../../../hooks/usePersonalInfoLoad';

interface NameAsInIdProps {
  onBack: () => void;
  onContinue: (firstName: string, middleName: string, lastName: string) => void;
  firstName?: string;
  middleName?: string;
  lastName?: string;
}

const NameAsInId: React.FC<NameAsInIdProps> = ({
  onBack,
  onContinue,
  firstName = '',
  middleName = '',
  lastName = '',
}) => {
  const { theme } = useTheme();
  const { personalInfo } = usePersonalInfoLoad();
  
  const [firstNameInput, setFirstNameInput] = useState<string>(firstName);
  const [middleNameInput, setMiddleNameInput] = useState<string>(middleName);
  const [lastNameInput, setLastNameInput] = useState<string>(lastName);

  // Pre-populate name fields when personal info is loaded
  useEffect(() => {
    if (personalInfo && !firstName && !lastName) {
      // Only pre-populate if no props were passed (not pre-filled)
      if (personalInfo.firstName) {
        setFirstNameInput(personalInfo.firstName);
      }
      if (personalInfo.lastName) {
        setLastNameInput(personalInfo.lastName);
      }
    }
  }, [personalInfo, firstName, lastName]);

  const isFormValid = !!firstNameInput && !!lastNameInput;

  const handleContinue = () => {
    if (isFormValid) {
      onContinue(firstNameInput, middleNameInput, lastNameInput);
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
      marginBottom: theme.spacing.lg,
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
        <Text style={styles.headerTitle}>Name as in ID</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Name as in ID</Text>
          <Text style={styles.subtitle}>
            Enter exactly as in your official documents.
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              style={styles.input}
              placeholder="First name"
              value={firstNameInput}
              onChangeText={setFirstNameInput}
              autoCapitalize="words"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Middle name (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Middle name"
              value={middleNameInput}
              onChangeText={setMiddleNameInput}
              autoCapitalize="words"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Last name</Text>
            <TextInput
              style={styles.input}
              placeholder="Last name"
              value={lastNameInput}
              onChangeText={setLastNameInput}
              autoCapitalize="words"
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

export default NameAsInId; 