// Created: BeneficialOwnerBasicInfo - Step 1: Name and Date of Birth - 2025-11-11

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../../theme/ThemeContext';
import { BeneficialOwnerData } from './BeneficialOwnerFlow';

interface BeneficialOwnerBasicInfoProps {
  onBack: () => void;
  onContinue: (data: Partial<BeneficialOwnerData>) => void;
  initialData?: Partial<BeneficialOwnerData>;
}

const BeneficialOwnerBasicInfo: React.FC<BeneficialOwnerBasicInfoProps> = ({
  onBack,
  onContinue,
  initialData = {},
}) => {
  const { theme } = useTheme();

  const [firstName, setFirstName] = useState(initialData.firstName || '');
  const [middleName, setMiddleName] = useState(initialData.middleName || '');
  const [lastName, setLastName] = useState(initialData.lastName || '');

  // Initialize date to 18 years ago if we have existing data, otherwise null
  const initialDate = React.useMemo(() => {
    if (initialData.birthYear && initialData.birthMonth && initialData.birthDay) {
      return new Date(initialData.birthYear, initialData.birthMonth - 1, initialData.birthDay);
    }
    return null;
  }, [initialData]);

  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Date picker needs a Date object, default to 18 years ago for picker display
  const datePickerValue = React.useMemo(() => {
    if (selectedDate) return selectedDate;
    const today = new Date();
    return new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  }, [selectedDate]);

  const isFormValid = !!firstName.trim() && !!lastName.trim() && selectedDate !== null;

  // Create maximum date (must be at least 18 years old)
  const maxDate = React.useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  }, []);

  // Create minimum date
  const minDate = React.useMemo(() => {
    return new Date(1900, 0, 1);
  }, []);

  const handleContinue = () => {
    if (isFormValid && selectedDate) {
      const day = selectedDate.getDate();
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();

      onContinue({
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        birthDay: day,
        birthMonth: month,
        birthYear: year,
        dateOfBirth: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      });
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const formatDisplayDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.card,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          height: 56,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.card,
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
        scrollContent: {
          padding: theme.spacing.lg,
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
          backgroundColor: theme.colors.card,
        },
        dateInput: {
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.card,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 56,
        },
        dateInputFocused: {
          borderColor: theme.colors.primary,
          borderWidth: 2,
        },
        dateText: {
          fontSize: theme.typography.fontSize.md,
          color: theme.colors.textPrimary,
          fontWeight: '500',
        },
        placeholderText: {
          color: theme.colors.textTertiary,
          fontWeight: '400',
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
      }),
    [theme]
  );

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
        <Text style={styles.headerTitle}>Owner Information</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>
          Enter the beneficial owner's name and date of birth as they appear on their ID.
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            style={styles.input}
            placeholder="First name"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Middle name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Middle name"
            value={middleName}
            onChangeText={setMiddleName}
            autoCapitalize="words"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Last name</Text>
          <TextInput
            style={styles.input}
            placeholder="Last name"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity
            style={[styles.dateInput, showDatePicker && styles.dateInputFocused]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.dateText, !selectedDate && styles.placeholderText]}>
              {selectedDate ? formatDisplayDate(selectedDate) : 'Select date of birth'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={datePickerValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={maxDate}
            minimumDate={minDate}
          />
        )}

        <TouchableOpacity
          style={[styles.continueButton, !isFormValid && styles.disabledButton]}
          onPress={handleContinue}
          disabled={!isFormValid}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default BeneficialOwnerBasicInfo;
