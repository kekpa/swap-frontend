// Updated: Migrated to @gorhom/bottom-sheet for consistent UX - 2025-12-16
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
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
  const bottomSheetRef = React.useRef<BottomSheet>(null);

  // Programmatically control BottomSheet when visible changes
  // Note: BottomSheet's index prop only sets initial state - must use ref methods for updates
  React.useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  // Backdrop component with press to close
  const renderBackdrop = React.useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.card,
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
        emptyContainer: {
          padding: theme.spacing.xl,
          alignItems: 'center',
        },
        emptyText: {
          fontSize: theme.typography.fontSize.md,
          color: theme.colors.textSecondary,
        },
        contentContainer: {
          paddingBottom: theme.spacing.lg,
        },
      }),
    [theme],
  );

  const renderItem = React.useCallback(({ item }: { item: AccountItem }) => {
    return (
      <AccountItemRow
        item={item}
        onSelect={onSelectAccount}
        highlightCurrency={highlightCurrency}
        theme={theme}
      />
    );
  }, [onSelectAccount, highlightCurrency, theme]);

  const keyExtractor = React.useCallback((item: AccountItem) => item.id, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['50%']}
      enablePanDownToClose={true}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.card }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      onChange={(index) => {
        if (index === -1) {
          onClose();
        }
      }}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {accounts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No accounts available</Text>
          </View>
        ) : (
          <BottomSheetFlatList
            data={accounts}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.contentContainer}
          />
        )}
      </View>
    </BottomSheet>
  );
};

// Memoize the AccountItemRow component for better performance
const AccountItemRow = React.memo<{ item: AccountItem; onSelect: (account: AccountItem) => void; highlightCurrency?: string; theme: any }>(({ item, onSelect, highlightCurrency, theme }) => {
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

  const styles = {
    accountRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 4,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: isHighlight ? theme.colors.primaryUltraLight : 'transparent',
    },
    accountInfo: {
      flexDirection: 'column' as const,
      flexShrink: 1,
    },
    accountName: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600' as const,
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
      fontWeight: '500' as const,
      color: theme.colors.textSecondary
    },
  };

  return (
    <TouchableOpacity
      style={styles.accountRow}
      onPress={() => onSelect(item)}
    >
      <View style={styles.accountInfo}>
        <Text style={styles.accountName}>{displayName}</Text>
        <Text style={styles.accountType}>{currencyDisplay}{accountTypeText}</Text>
      </View>
      <Text style={styles.accountBalance}>{balanceDisplay}</Text>
    </TouchableOpacity>
  );
});

export default React.memo(AccountSelectionModal);
