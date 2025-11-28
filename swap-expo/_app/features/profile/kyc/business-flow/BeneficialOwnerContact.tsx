// Created: BeneficialOwnerContact - Step 4: Contact Information (Required for Login) - 2025-11-11

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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../theme/ThemeContext';
import { BeneficialOwnerData } from './BeneficialOwnerFlow';

interface BeneficialOwnerContactProps {
  onBack: () => void;
  onContinue: (data: Partial<BeneficialOwnerData>) => void;
  initialData?: Partial<BeneficialOwnerData>;
  ownerName: string;
  isLoading?: boolean;
}

const BeneficialOwnerContact: React.FC<BeneficialOwnerContactProps> = ({
  onBack,
  onContinue,
  initialData = {},
  ownerName,
  isLoading = false,
}) => {
  const { theme } = useTheme();

  const [email, setEmail] = useState(initialData.email || '');
  const [phone, setPhone] = useState(initialData.phone || '');

  // Basic email validation (only if provided)
  const isValidEmail = (email: string) => {
    if (!email.trim()) return true; // Empty is valid (optional)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Only phone is required, email is optional
  const isFormValid = !!phone.trim() && isValidEmail(email);

  const handleContinue = () => {
    if (isFormValid && !isLoading) {
      onContinue({
        email: email.trim() || undefined, // Only send if provided
        phone: phone.trim(),
      });
    }
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
        infoBox: {
          backgroundColor: theme.colors.primary + '10',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.xl,
          flexDirection: 'row',
          alignItems: 'flex-start',
        },
        infoIcon: {
          marginRight: theme.spacing.sm,
          marginTop: 2,
        },
        infoText: {
          flex: 1,
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textPrimary,
          lineHeight: 20,
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
        requiredBadge: {
          backgroundColor: '#FEF3C7',
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: 3,
          borderRadius: theme.borderRadius.sm,
          marginLeft: theme.spacing.xs,
        },
        requiredText: {
          fontSize: theme.typography.fontSize.xs,
          fontWeight: '700',
          color: '#F59E0B',
          letterSpacing: 0.5,
        },
        labelRow: {
          flexDirection: 'row',
          alignItems: 'center',
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
          flexDirection: 'row',
          justifyContent: 'center',
        },
        disabledButton: {
          backgroundColor: theme.colors.border,
        },
        continueButtonText: {
          color: theme.colors.white,
          fontSize: theme.typography.fontSize.md,
          fontWeight: '600',
          marginRight: theme.spacing.xs,
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
        <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={isLoading}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Information</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>
          Enter contact details for <Text style={styles.ownerNameInline}>{ownerName}</Text> (required for account login and verification)
        </Text>

        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle"
            size={20}
            color={theme.colors.primary}
            style={styles.infoIcon}
          />
          <Text style={styles.infoText}>
            Phone number is required for login. Email is optional - they can add it to their profile later.
          </Text>
        </View>

        {/* Phone Number - FIRST (Required) */}
        <View style={styles.formGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>REQUIRED</Text>
            </View>
          </View>
          <TextInput
            style={styles.input}
            placeholder="+1 (555) 123-4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={theme.colors.textTertiary}
            editable={!isLoading}
          />
          <Text style={styles.helperText}>Will be used for login and account verification</Text>
        </View>

        {/* Email Address - SECOND (Optional) */}
        <View style={styles.formGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.requiredBadge, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.requiredText, { color: theme.colors.textSecondary }]}>OPTIONAL</Text>
            </View>
          </View>
          <TextInput
            style={styles.input}
            placeholder="owner@example.com (optional)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={theme.colors.textTertiary}
            editable={!isLoading}
          />
          <Text style={styles.helperText}>Can be added later by the team member</Text>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, (!isFormValid || isLoading) && styles.disabledButton]}
          onPress={handleContinue}
          disabled={!isFormValid || isLoading}
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? 'Saving...' : 'Save Owner'}
          </Text>
          {isLoading && <ActivityIndicator size="small" color={theme.colors.white} />}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default BeneficialOwnerContact;
