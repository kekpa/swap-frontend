/**
 * AddAccountScreen
 *
 * Instagram-style account creation selector.
 * Allows users to either:
 * 1. Create a new business profile (stays logged in)
 * 2. Add a new personal account (signup with different phone)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const AddAccountScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        backButton: {
          padding: theme.spacing.xs,
        },
        headerTitle: {
          fontSize: theme.typography.fontSize.lg,
          fontWeight: '600',
          color: theme.colors.textPrimary,
          flex: 1,
          textAlign: 'center',
          marginRight: 40, // Balance back button
        },
        content: {
          flex: 1,
          padding: theme.spacing.lg,
          justifyContent: 'center',
        },
        titleText: {
          fontSize: theme.typography.fontSize.xl,
          fontWeight: '700',
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing.md,
          textAlign: 'center',
        },
        subtitleText: {
          fontSize: theme.typography.fontSize.md,
          color: theme.colors.textSecondary,
          marginBottom: theme.spacing.xl,
          textAlign: 'center',
        },
        optionButton: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.card,
          borderRadius: theme.borderRadius.lg,
          marginBottom: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        iconContainer: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.colors.primaryOpacity10,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: theme.spacing.md,
        },
        optionContent: {
          flex: 1,
        },
        optionTitle: {
          fontSize: theme.typography.fontSize.md,
          fontWeight: '600',
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing.xs,
        },
        optionDescription: {
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
        },
        chevronIcon: {
          marginLeft: theme.spacing.sm,
        },
      }),
    [theme],
  );

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCreateBusinessProfile = () => {
    console.log('[AddAccountScreen] Navigating to BusinessSetup');
    navigation.navigate('BusinessSetup' as never);
  };

  const handleAddPersonalAccount = () => {
    console.log('[AddAccountScreen] Navigating to signup flow with isAddingAccount flag');
    // Navigate to SignUpScreen with isAddingAccount flag
    // This tells signup to preserve current session and add new account
    navigation.navigate('SignUpScreen' as never, { isAddingAccount: true } as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Account</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.titleText}>Add Account</Text>
        <Text style={styles.subtitleText}>
          Choose how you'd like to expand your Swap experience
        </Text>

        {/* Option 1: Create Business Profile */}
        <TouchableOpacity
          style={styles.optionButton}
          onPress={handleCreateBusinessProfile}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="briefcase" size={28} color={theme.colors.primary} />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Create Business Profile</Text>
            <Text style={styles.optionDescription}>
              Add a business profile to your current account
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textSecondary}
            style={styles.chevronIcon}
          />
        </TouchableOpacity>

        {/* Option 2: Add Personal Account */}
        <TouchableOpacity
          style={styles.optionButton}
          onPress={handleAddPersonalAccount}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="person-add" size={28} color={theme.colors.primary} />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Add Personal Account</Text>
            <Text style={styles.optionDescription}>
              Create a new personal account with a different phone number
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textSecondary}
            style={styles.chevronIcon}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AddAccountScreen;
