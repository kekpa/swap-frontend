// Created: Added TransferCompletedScreen for transaction confirmation - 2025-03-22
// Updated: Refactored to use slide-up modal and fixed undefined amount error - 2025-05-21
// Updated: Fixed undefined recipientName.split error - 2025-05-22
// Updated: Changed to use navigation-based slide-up similar to NewInteraction2 - 2025-05-22
// Updated: Fixed navigation back to ContactInteractionHistory to preserve context - 2025-05-23
// Updated: Changed to CommonActions.reset for guaranteed stack state (Revolut/Stripe pattern) - 2025-12-17
import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../../theme/ThemeContext';
import { Theme } from '../../../theme/theme';
import logger from '../../../utils/logger';

interface TransferCompletedScreenProps {
  route?: {
    params: {
      amount: number;
      recipientName: string;
      recipientInitial: string;
      recipientColor: string;
      message: string;
      transactionId: string;
      status?: string;
      createdAt?: string;
      contactId?: string;
      interactionId?: string;
      currencyCode?: string; // Currency code for display (e.g., "HTG", "USD")
    };
  };
}

const TransferCompletedScreen: React.FC<TransferCompletedScreenProps> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { theme } = useTheme();
  
  // Provide fallback values if route params are not available (shouldn't happen in normal flow)
  const params = route?.params || {
    amount: 0,
    recipientName: 'Unknown',
    recipientInitial: 'U',
    recipientColor: theme.colors.secondary,
    message: '',
    transactionId: 'UNKNOWN',
  };
  
  const {
    amount = 0, // Provide default value to prevent the toFixed error
    recipientName = 'Unknown', // Add default value to prevent undefined errors
    recipientInitial = 'U',
    recipientColor = theme.colors.secondary,
    message = '',
    transactionId = 'UNKNOWN',
    status = 'Completed',
    createdAt,
    contactId,
    interactionId,
    currencyCode = 'HTG', // Default to HTG for Haiti
  } = params;
  
  // Get recipient's first name safely
  const recipientFirstName = recipientName ? recipientName.split(' ')[0] : 'recipient';
  
  const txDate = createdAt ? new Date(createdAt) : new Date();
  const hours = txDate.getHours().toString().padStart(2, '0');
  const minutes = txDate.getMinutes().toString().padStart(2, '0');
  const timeString = `${hours}:${minutes}`;
  
  useEffect(() => {
    // Log parameters for debugging
    logger.debug(
      `TransferCompletedScreen mounted with params: ${JSON.stringify({
        recipientName,
        amount,
        transactionId,
        contactId,
        interactionId
      })}`,
      "TransferCompletedScreen"
    );
  }, [recipientName, amount, transactionId, contactId, interactionId]);
  
  const handleClose = () => {
    // Use CommonActions.reset to guarantee clean navigation stack
    // This is the industry standard approach (Revolut/Stripe pattern)
    // Stack becomes: App → ContactInteractionHistory2
    // Back button will go to App (home), not through SendMoney flow
    logger.debug(
      `Resetting navigation stack to App → ContactInteractionHistory2`,
      "TransferCompletedScreen"
    );

    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: "App" },
          {
            name: "ContactInteractionHistory2",
            params: {
              contactId,
              contactName: recipientName,
              contactInitials: recipientInitial,
              contactAvatarColor: recipientColor,
              interactionId,
              forceRefresh: true,
              timestamp: Date.now(),
            },
          },
        ],
      })
    );
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
      height: 56, 
      paddingHorizontal: theme.spacing.md, 
      borderBottomWidth: 1, 
      borderBottomColor: theme.colors.border, 
      backgroundColor: theme.colors.card 
    },
    headerTitle: { 
      fontSize: theme.typography.fontSize.lg, 
      fontWeight: '600', 
      color: theme.colors.textPrimary 
    },
    closeButton: { 
      width: 32, 
      height: 32, 
      alignItems: 'center', 
      justifyContent: 'center' 
    },
    emptySpace: { width: 40 },
    summaryContainer: {
      paddingTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    amountText: {
      fontSize: 32,
      fontWeight: '600',
      marginBottom: theme.spacing.sm,
      color: theme.colors.primary,
    },
    recipientText: {
      fontSize: theme.typography.fontSize.lg,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    transactionIdText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    section: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    sectionLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      marginBottom: theme.spacing.sm,
    },
    messageText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
    },
    statusCard: {
      backgroundColor: theme.colors.card,
      marginHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    statusTitle: {
      fontWeight: '600',
      marginBottom: theme.spacing.lg,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
    },
    timelineItem: {
      display: 'flex',
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    timelineIconContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: 24,
    },
    timelineIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    timelineLine: {
      width: 2,
      height: 24,
      backgroundColor: theme.colors.primary,
      flex: 1,
    },
    timelineContent: {
      flex: 1,
    },
    timelineText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
    },
    timelineTime: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
    },
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transfer Details</Text>
        <View style={styles.emptySpace} />
      </View>
      
      {/* Transaction Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.amountText}>-{Math.round(amount)} {currencyCode}</Text>
        <Text style={styles.recipientText}>{recipientName}</Text>
        <Text style={styles.transactionIdText}>Transaction ID: {transactionId}</Text>
        <Text style={styles.transactionIdText}>Status: {status}</Text>
      </View>

      {/* Message Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Message</Text>
        <Text style={styles.messageText}>{message}</Text>
      </View>

      {/* Transfer Status Section */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Transfer completed</Text>

        {/* Status Timeline */}
        <View style={styles.timelineItem}>
          <View style={styles.timelineIconContainer}>
            <View style={styles.timelineIcon}>
              <Ionicons name="checkmark" size={14} color={theme.colors.white} />
            </View>
            <View style={styles.timelineLine} />
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineText}>Transaction initiated</Text>
            <Text style={styles.timelineTime}>Today, {timeString}</Text>
          </View>
        </View>

        <View style={styles.timelineItem}>
          <View style={styles.timelineIconContainer}>
            <View style={styles.timelineIcon}>
              <Ionicons name="checkmark" size={14} color={theme.colors.white} />
            </View>
            <View style={styles.timelineLine} />
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineText}>Money deducted from your account</Text>
            <Text style={styles.timelineTime}>{timeString}</Text>
          </View>
        </View>

        <View style={styles.timelineItem}>
          <View style={styles.timelineIconContainer}>
            <View style={styles.timelineIcon}>
              <Ionicons name="checkmark" size={14} color={theme.colors.white} />
            </View>
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineText}>Money credited to {recipientFirstName}'s account</Text>
            <Text style={styles.timelineTime}>{timeString}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default TransferCompletedScreen; 