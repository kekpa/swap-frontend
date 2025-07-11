// Created: Added TransactionDetailsScreen for viewing historical transaction details - 2025-05-27
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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/theme';
import logger from '../../utils/logger';

interface TransactionDetailsScreenProps {
  route?: {
    params: {
      transactionId: string;
      transaction?: any; // Full transaction object if available
      sourceScreen?: 'wallet' | 'transactionList' | 'chat'; // For analytics/navigation
      contactName?: string;
      contactInitials?: string;
      contactAvatarColor?: string;
    };
  };
}

const TransactionDetailsScreen: React.FC<TransactionDetailsScreenProps> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { theme } = useTheme();
  
  // Provide fallback values if route params are not available
  const params = route?.params || {
    transactionId: 'UNKNOWN',
    transaction: null,
    sourceScreen: 'wallet',
  };
  
  const { 
    transactionId,
    transaction,
    sourceScreen = 'wallet',
    contactName,
    contactInitials,
    contactAvatarColor,
  } = params;

  // Extract transaction details
  const amount = transaction?.amount || 0;
  const currency_symbol = transaction?.currency_symbol || '$';
  const isReceived = transaction?.type === 'received';
  const transactionDate = transaction?.timestamp ? new Date(transaction.timestamp) : new Date();
  const status = transaction?.status || 'Completed';
  const category = transaction?.category || (isReceived ? 'Payment received' : 'Payment sent');
  const entityName = transaction?.name || contactName || 'Unknown Contact';
  
  // Format date and time
  const dateString = transactionDate.toLocaleDateString([], { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeString = transactionDate.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  // Get contact initials for avatar
  const getInitials = (name: string): string => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const avatarInitials = contactInitials || getInitials(entityName);
  
  // Generate avatar color if not provided
  const avatarColor = contactAvatarColor || (() => {
    const charCode = entityName.charCodeAt(0);
    const colorPalette = [
      theme.colors.primary, 
      theme.colors.secondary, 
      theme.colors.success, 
      theme.colors.info, 
      theme.colors.warning
    ];
    return colorPalette[charCode % colorPalette.length];
  })();
  
  useEffect(() => {
    logger.debug(
      `TransactionDetailsScreen mounted with params: ${JSON.stringify({
        transactionId,
        sourceScreen,
        entityName,
        amount,
        isReceived
      })}`,
      "TransactionDetailsScreen"
    );
  }, [transactionId, sourceScreen, entityName, amount, isReceived]);
  
  const handleClose = () => {
    logger.debug(`Closing TransactionDetailsScreen, returning to ${sourceScreen}`, "TransactionDetailsScreen");
    navigation.goBack();
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
    
    // Transaction Summary Section
    summaryContainer: {
      paddingTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      alignItems: 'center',
    },
    amountText: {
      fontSize: 36,
      fontWeight: '700',
      marginBottom: theme.spacing.sm,
      color: isReceived ? theme.colors.success : theme.colors.primary,
    },
    directionText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
    },
    
    // Contact Section
    contactContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      marginHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    contactAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    contactAvatarText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: 'bold',
    },
    contactInfo: {
      flex: 1,
    },
    contactName: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    contactCategory: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    
    // Details Section
    detailsContainer: {
      backgroundColor: theme.colors.card,
      marginHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    detailsTitle: {
      fontWeight: '600',
      marginBottom: theme.spacing.md,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    lastDetailRow: {
      borderBottomWidth: 0,
    },
    detailLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    detailValue: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
      fontWeight: '500',
    },
    
    // Status Section
    statusContainer: {
      backgroundColor: theme.colors.card,
      marginHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    statusTitle: {
      fontWeight: '600',
      marginBottom: theme.spacing.md,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
    },
         statusBadge: {
       flexDirection: 'row',
       alignItems: 'center',
       backgroundColor: theme.colors.primaryUltraLight,
       paddingVertical: theme.spacing.xs,
       paddingHorizontal: theme.spacing.sm,
       borderRadius: theme.borderRadius.lg,
       alignSelf: 'flex-start',
     },
    statusIcon: {
      marginRight: theme.spacing.xs,
    },
    statusText: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '600',
    },
  }), [theme, isReceived]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <View style={styles.emptySpace} />
      </View>
      
      {/* Transaction Amount Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.amountText}>
          {isReceived ? '+' : '-'}{currency_symbol}{Math.abs(parseFloat(amount.toString())).toFixed(2)}
        </Text>
        <Text style={styles.directionText}>
          {isReceived ? 'Received from' : 'Sent to'} {entityName}
        </Text>
      </View>

      {/* Contact Information */}
      <View style={styles.contactContainer}>
        <View style={[styles.contactAvatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.contactAvatarText}>{avatarInitials}</Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{entityName}</Text>
          <Text style={styles.contactCategory}>{category}</Text>
        </View>
      </View>

      {/* Transaction Details */}
      <View style={styles.detailsContainer}>
        <Text style={styles.detailsTitle}>Transaction Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Transaction ID</Text>
          <Text style={styles.detailValue}>#{transactionId.slice(0, 8)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>{dateString}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Time</Text>
          <Text style={styles.detailValue}>{timeString}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.detailValue}>{currency_symbol}{Math.abs(parseFloat(amount.toString())).toFixed(2)}</Text>
        </View>
        
        <View style={[styles.detailRow, styles.lastDetailRow]}>
          <Text style={styles.detailLabel}>Type</Text>
          <Text style={styles.detailValue}>{isReceived ? 'Received' : 'Sent'}</Text>
        </View>
      </View>

      {/* Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>Status</Text>
        <View style={styles.statusBadge}>
          <Ionicons 
            name="checkmark-circle" 
            size={16} 
            color={theme.colors.success} 
            style={styles.statusIcon}
          />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default TransactionDetailsScreen; 