// Updated: Migrated TempAddMoney component to use updated theme.ts system with proper typography and color tokens - 2025-05-27
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { WalletStackParamList } from '../../../../navigation/walletNavigator';
import { RootStackParamList } from '../../../../navigation/rootNavigator';
import { useTheme } from '../../../../theme/ThemeContext';
import { useAuthContext } from '../../../auth/context/AuthContext';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const TempAddMoney: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user } = useAuthContext();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
      flex: 1,
      textAlign: 'center',
      marginHorizontal: theme.spacing.md,
    },
    spacer: {
      width: 32, // Same width as close button to center the title
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    instructionsCard: {
      backgroundColor: theme.colors.primaryUltraLight,
      borderWidth: 1,
      borderColor: theme.colors.primaryLight,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
    },
    cardTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.primary,
      marginBottom: theme.spacing.md,
    },
    stepContainer: {
      flexDirection: 'row',
      marginBottom: theme.spacing.sm,
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: theme.borderRadius.circle,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    stepNumberText: {
      color: theme.colors.white,
      fontWeight: 'bold',
      fontSize: theme.typography.fontSize.xs,
    },
    stepContent: {
      flex: 1,
    },
    stepTitle: {
      fontWeight: '500',
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    stepDescription: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    feeNote: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      marginBottom: theme.spacing.md,
    },
    userInfoCard: {
      backgroundColor: theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    userInfoTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    userInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
    },
    userInfoLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    userInfoValue: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
      fontWeight: '600',
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.sm,
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    primaryButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
    },
  });

  const steps = [
    {
      number: 1,
      title: 'Locate an Agent',
      description: 'Find a Swap agent nearby using the map.',
    },
    {
      number: 2,
      title: 'Show Your ID',
      description: 'Present your government-issued ID for verification.',
    },
    {
      number: 3,
      title: 'Make Payment',
      description: 'Pay the agent the amount plus any fees.',
    },
    {
      number: 4,
      title: 'Verify Confirmation',
      description: 'Wait for confirmation code before leaving.',
    },
  ];

  const handleClose = () => {
    // Simply close the modal
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Money</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Information Card */}
        <View style={styles.userInfoCard}>
          <Text style={styles.userInfoTitle}>Your Information</Text>
          
          <View style={styles.userInfoRow}>
            <Text style={styles.userInfoLabel}>Username:</Text>
            <Text style={styles.userInfoValue}>
              {user?.username || user?.businessName || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'Not available')}
            </Text>
          </View>
          
          <View style={styles.userInfoRow}>
            <Text style={styles.userInfoLabel}>Phone Number:</Text>
            <Text style={styles.userInfoValue}>
              Not available
            </Text>
          </View>
          
          <View style={styles.userInfoRow}>
            <Text style={styles.userInfoLabel}>Email:</Text>
            <Text style={styles.userInfoValue}>
              {user?.email || 'Not available'}
            </Text>
          </View>
        </View>

        {/* Agent Instructions Card */}
        <View style={styles.instructionsCard}>
          <Text style={styles.cardTitle}>How to Add Money with an Agent</Text>
          
          {steps.map((step) => (
            <View key={step.number} style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.number}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            </View>
          ))}
          
          <Text style={styles.feeNote}>
            Agent fees typically range from 1-3% depending on location.
          </Text>
          
          {/* Close Button */}
          <TouchableOpacity style={styles.primaryButton} onPress={handleClose}>
            <Text style={styles.primaryButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TempAddMoney; 