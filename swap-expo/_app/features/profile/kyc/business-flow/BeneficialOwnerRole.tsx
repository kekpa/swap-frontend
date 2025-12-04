// Created: BeneficialOwnerRole - Step 3: Business Role and Ownership - 2025-11-11

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
import { useTheme } from '../../../../theme/ThemeContext';
import { BeneficialOwnerData } from './BeneficialOwnerFlow';

interface BeneficialOwnerRoleProps {
  onBack: () => void;
  onContinue: (data: Partial<BeneficialOwnerData>) => void;
  initialData?: Partial<BeneficialOwnerData>;
  ownerName: string;
}

const BeneficialOwnerRole: React.FC<BeneficialOwnerRoleProps> = ({
  onBack,
  onContinue,
  initialData = {},
  ownerName,
}) => {
  const { theme } = useTheme();

  const [position, setPosition] = useState(initialData.position || '');
  const [ownershipPercentage, setOwnershipPercentage] = useState(
    initialData.ownershipPercentage || ''
  );

  const isFormValid = !!position.trim();

  const handleContinue = () => {
    if (isFormValid) {
      onContinue({
        position: position.trim(),
        ownershipPercentage: ownershipPercentage.trim(),
      });
    }
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
        helperText: {
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
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
        <Text style={styles.headerTitle}>Business Role</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>
          Specify the position and ownership percentage for <Text style={styles.ownerNameInline}>{ownerName}</Text>
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Position in Company</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., CEO, Director, Partner"
            value={position}
            onChangeText={setPosition}
            autoCapitalize="words"
            placeholderTextColor={theme.colors.textTertiary}
          />
          <Text style={styles.helperText}>Official title or role in the company</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Ownership Percentage (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 50"
            value={ownershipPercentage}
            onChangeText={setOwnershipPercentage}
            keyboardType="numeric"
            placeholderTextColor={theme.colors.textTertiary}
          />
          <Text style={styles.helperText}>Enter percentage (0-100)</Text>
        </View>

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

export default BeneficialOwnerRole;
