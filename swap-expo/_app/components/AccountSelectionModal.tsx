// Created: AccountSelectionModal component for selecting sender/recipient accounts - 2025-05-18
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export interface AccountItem {
  id: string;
  account_name: string;
  currency_id: string;
  currency_symbol?: string; // Currency symbol (e.g., $, €)
  currency_code?: string;   // Currency code (e.g., USD, EUR)
  balance: number;
  account_number_last4?: string; // Last 4 digits of account number for display
  account_type?: { name: string }; // Account type information
  is_recipient?: boolean;  // Flag to indicate if this is a recipient account (to hide balance)
}

interface AccountSelectionModalProps {
  visible: boolean;
  accounts: AccountItem[];
  onSelectAccount: (account: AccountItem) => void;
  onClose: () => void;
  title?: string;
  highlightCurrency?: string; // If provided, highlight rows matching this currency
}

const AccountSelectionModal: React.FC<AccountSelectionModalProps> = ({
  visible,
  accounts,
  onSelectAccount,
  onClose,
  title = 'Select Account',
  highlightCurrency,
}) => {
  const { theme } = useTheme();

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'flex-end',
        },
        container: {
          backgroundColor: theme.colors.card,
          borderTopLeftRadius: theme.borderRadius.xl,
          borderTopRightRadius: theme.borderRadius.xl,
          maxHeight: '60%',
          paddingBottom: theme.spacing.lg,
        },
        header: {
          padding: theme.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        headerText: {
          fontSize: theme.typography.fontSize.lg,
          fontWeight: '600',
          color: theme.colors.textPrimary,
        },
        accountRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm + 4,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        accountInfo: {
          flexDirection: 'column',
          flexShrink: 1,
        },
        accountName: { 
          fontSize: theme.typography.fontSize.md, 
          fontWeight: '600',
          color: theme.colors.textPrimary, 
          flexShrink: 1 
        },
        accountType: {
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textTertiary,
          marginTop: 2,
        },
        accountBalance: { 
          fontSize: theme.typography.fontSize.md, 
          fontWeight: '500',
          color: theme.colors.textSecondary 
        },
      }),
    [theme],
  );

  const renderItem = ({ item }: { item: AccountItem }) => {
    const isHighlight = highlightCurrency && item.currency_id === highlightCurrency;
    
    // Format account display
    const currencyDisplay = item.currency_code || item.currency_id;
    const currencySymbol = item.currency_symbol || '';
    
    // Show account type if available
    const accountTypeText = item.account_type?.name ? 
      ` • ${item.account_type.name}` : '';
    
    // Show either balance (for own accounts) or last4 (for recipient accounts)
    const balanceDisplay = item.is_recipient ? 
      (item.account_number_last4 ? `•••• ${item.account_number_last4}` : '') : 
      `${currencySymbol}${item.balance.toFixed(2)}`;
    
    // Remove redundant "Account" from display name
    const displayName = item.account_name.replace(/ Account$/, '');
      
    return (
      <TouchableOpacity
        style={[styles.accountRow, isHighlight && { backgroundColor: theme.colors.primaryUltraLight }]}
        onPress={() => onSelectAccount(item)}
      >
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>{displayName}</Text>
          <Text style={styles.accountType}>{currencyDisplay}{accountTypeText}</Text>
        </View>
        <Text style={styles.accountBalance}>{balanceDisplay}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        {/* Empty TouchableOpacity to capture taps outside */}
      </TouchableOpacity>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <FlatList data={accounts} keyExtractor={(item) => item.id} renderItem={renderItem} />
      </View>
    </Modal>
  );
};

export default AccountSelectionModal; 