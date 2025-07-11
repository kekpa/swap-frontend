// Created: Transactions list component for filtered transactions by account - 2025-06-28
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { AccountBalance } from '../../../services/BalanceManager';

interface WalletTransaction {
  id: string;
  name: string;
  amount: string;
  type: 'received' | 'sent';
  category: string;
  date: string;
  currency_symbol: string;
  entityId: string;
  currency_id?: string; // Add currency filtering
}

interface TransactionsListProps {
  transactions: WalletTransaction[];
  selectedAccount?: AccountBalance;
  isLoading: boolean;
  onTransactionPress: (transaction: WalletTransaction) => void;
  onSeeAllPress: () => void;
}

const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  selectedAccount,
  isLoading,
  onTransactionPress,
  onSeeAllPress,
}) => {
  const { theme } = useTheme();

  // Filter transactions by selected account currency
  const filteredTransactions = selectedAccount 
    ? transactions.filter(tx => tx.currency_id === selectedAccount.currencyId)
    : transactions;

  // Helper function to get name initials 
  const getInitials = (name: string): string => {
    if (!name) return '??';
    
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderTransactionAvatar = (transaction: WalletTransaction) => {
    const initials = getInitials(transaction.name);
    
    // Generate a deterministic color based on name
    const charCode = transaction.name.charCodeAt(0);
    const colorPalette = [
      theme.colors.primary, 
      theme.colors.secondary, 
      theme.colors.success, 
      theme.colors.info, 
      theme.colors.warning
    ];
    const avatarColor = colorPalette[charCode % colorPalette.length];

    return (
      <TouchableOpacity 
        style={[styles.transactionAvatar, { backgroundColor: avatarColor }]}
        onPress={() => onTransactionPress(transaction)}
      >
        <Text style={styles.transactionAvatarText}>{initials}</Text>
      </TouchableOpacity>
    );
  };

  const renderTransactionItem = (item: WalletTransaction) => (
    <View key={item.id} style={styles.transactionItem}>
      {renderTransactionAvatar(item)}
      <View style={styles.transactionContent}>
        <View>
          <Text style={styles.transactionName}>{item.name}</Text>
          <Text style={styles.transactionCategory}>{item.category}</Text>
        </View>
        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              item.type === 'received' ? styles.amountReceived : styles.amountSpent,
            ]}
          >
            {item.currency_symbol}{Math.abs(parseFloat(item.amount)).toFixed(2)}
          </Text>
          <Text style={styles.transactionDate}>{item.date}</Text>
        </View>
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      marginTop: theme.spacing.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
    },
    accountLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    seeAllButton: {
      color: theme.colors.primary,
      fontWeight: '500',
      fontSize: theme.typography.fontSize.sm,
    },
    listContainer: {
      paddingTop: theme.spacing.sm,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    transactionAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    transactionAvatarText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: 'bold',
    },
    transactionContent: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    transactionName: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    transactionCategory: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    transactionRight: {
      alignItems: 'flex-end',
    },
    transactionAmount: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
    },
    amountReceived: {
      color: theme.colors.success,
    },
    amountSpent: {
      color: theme.colors.textPrimary,
    },
    transactionDate: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    loadingContainer: {
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
    },
    emptyContainer: {
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Recent Transactions</Text>
          {selectedAccount && (
            <Text style={styles.accountLabel}>
              {selectedAccount.currency} Account
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={onSeeAllPress}>
          <Text style={styles.seeAllButton}>See All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : filteredTransactions.length > 0 ? (
          filteredTransactions.map(item => renderTransactionItem(item))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {selectedAccount 
                ? `No recent transactions for ${selectedAccount.currency} account`
                : 'No recent transactions'
              }
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default TransactionsList; 