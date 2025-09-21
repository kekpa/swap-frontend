// Updated: Removed avatar click functionality, entire transaction item now clickable for details - 2025-05-27

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthContext } from '../auth/context/AuthContext';
import { useTransactionList } from '../../hooks-data/useRecentTransactions';
import { useBalances } from '../../hooks-data/useBalances';
import logger from '../../utils/logger';

interface WalletTransaction {
  id: string;
  name: string;
  amount: string;
  type: 'received' | 'sent';
  category: string;
  date: string;
  currency_symbol: string;
  timestamp: string; // For sorting
  entityId: string; // The other party's entity ID for navigation
}

// Helper function to get name initials 
const getInitials = (name: string): string => {
  if (!name) return '??';
  
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

type NavigationProp = StackNavigationProp<any>;

const TransactionListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { theme } = useTheme();
  const authContext = useAuthContext();
  const user = authContext.user;

  // Get selected wallet from navigation params or use primary account as fallback
  const selectedWallet = (route.params as any)?.selectedWallet;

  // Get the primary account from balances as fallback
  const { 
    data: currencyBalances = [], 
    isLoading: isLoadingBalances 
  } = useBalances(user?.entityId || '');

  // Use selected wallet or find the primary account as fallback
  const targetAccount = useMemo(() => {
    if (selectedWallet) {
      return selectedWallet;
    }
    return currencyBalances.find(balance => balance.isPrimary);
  }, [selectedWallet, currencyBalances]);

  // Use the new useTransactionList hook for account-specific transactions
  const {
    transactions: allAccountTransactions,
    isLoading: isLoadingTransactions,
    refetch,
    hasMore,
    loadMore
  } = useTransactionList(
    targetAccount?.account_id || '', 
    50, // limit to 50 transactions
    0,  // offset
    !!targetAccount?.account_id // only enabled when we have an account ID
  );

  // Filter transactions by selected wallet currency
  const transactions = useMemo(() => {
    if (!targetAccount || !allAccountTransactions.length) {
      return [];
    }

    // Filter transactions to only show those matching the target wallet's currency
    const filteredTransactions = allAccountTransactions.filter(tx => 
      tx.currency_id === targetAccount.currency_id
    );

    logger.debug(`[TransactionListScreen] 🎯 CURRENCY FILTER: Showing ${filteredTransactions.length} of ${allAccountTransactions.length} transactions for ${targetAccount.currency_code} wallet`);
    
    return filteredTransactions;
  }, [allAccountTransactions, targetAccount]);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'received' | 'sent'>('all');

  // Get entity name from transactions - stable callback
  const getEntityNameFromTransactions = useCallback((entityId: string): string => {
    // For now, return a placeholder - in production, this would resolve from contacts/cache
    return `Contact ${entityId.slice(0, 8)}`;
  }, []);

  // Format transaction date time - stable callback
  const formatTransactionDateTime = useCallback((dateString: string): string => {
    if (!dateString) return 'Recent';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Recent';
      
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `Today, ${timeString}`;
      } else if (diffInHours < 48) {
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `Yesterday, ${timeString}`;
      } else {
        const dateString = date.toLocaleDateString();
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${dateString}, ${timeString}`;
      }
    } catch (error) {
      logger.debug('[TransactionListScreen] Error formatting date:', String(error));
      return 'Recent';
    }
  }, []);

  // Resolve contact name from entity IDs - stable callback
  const resolveContactName = useCallback((fromEntityId: string, toEntityId: string): string => {
    const contactEntityId = fromEntityId === user?.entityId ? toEntityId : fromEntityId;
    
    // For now, return a placeholder - in production, this should resolve from contacts/profiles
    // TODO: Implement proper contact name resolution from profiles table
    if (contactEntityId === 'c91f23d0-4e60-4a54-bf5b-18d87672041b') {
      return 'Frantz Paillant'; // From database query result
    }
    
    return `Contact ${contactEntityId.slice(0, 8)}`;
  }, [user?.entityId]);

  // Transform transactions with proper currency and contact resolution
  const transformedTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      logger.debug('[TransactionListScreen] 🎯 Transforming 0 transactions');
      return [];
    }
    
    logger.debug(`[TransactionListScreen] 🎯 Transforming ${transactions.length} transactions`);
    
    return transactions.map((tx: any) => {
      // Use currency data from the transaction itself, not from wallet
      const transactionCurrency = tx.currency_code || 'HTG';
      const transactionSymbol = tx.currency_symbol || 'G';
      
      // Resolve contact name from entity ID
      const contactName = resolveContactName(tx.from_entity_id, tx.to_entity_id);
      
      return {
        id: tx.id,
        name: contactName, // Keep original property name
        amount: parseFloat(tx.amount || '0').toFixed(2), // Keep as string
        type: (tx.from_entity_id === user?.entityId ? 'sent' : 'received') as 'received' | 'sent',
        category: tx.from_entity_id === user?.entityId ? 'Payment sent' : 'Payment received',
        date: formatTransactionDateTime(tx.created_at?.toString() || ''),
        currency_symbol: transactionSymbol, // Use transaction's symbol (HTG = 'G')
        timestamp: tx.created_at,
        entityId: tx.from_entity_id === user?.entityId ? tx.to_entity_id : tx.from_entity_id,
      };
    });
  }, [transactions, user?.entityId, formatTransactionDateTime, resolveContactName]);

  // Filter transactions based on search and filter - stable memoization
  const filteredTransactions = useMemo(() => {
    let filtered = transformedTransactions;

    // Apply type filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === selectedFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.name.toLowerCase().includes(query) ||
        tx.category.toLowerCase().includes(query) ||
        tx.amount.includes(query)
      );
    }

    return filtered;
  }, [transformedTransactions, searchQuery, selectedFilter]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };


  // Handle transaction press
  const handleTransactionPress = (transaction: WalletTransaction) => {
    logger.debug(`[TransactionListScreen] Transaction pressed: ${transaction.id}`, "TransactionListScreen");
    navigation.navigate('TransactionDetails' as any, {
      transactionId: transaction.id,
      transaction: transaction,
      sourceScreen: 'transactionList',
    });
  };



  // Memoized transaction item component for FlashList performance
  const TransactionItem = React.memo(({ item }: { item: WalletTransaction }) => {
    const initials = getInitials(item.name);
    const charCode = item.name.charCodeAt(0);
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
        style={styles.transactionItem}
        onPress={() => handleTransactionPress(item)}
      >
        <View style={[styles.transactionAvatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.transactionAvatarText}>{initials}</Text>
        </View>
        <View style={styles.transactionContent}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionName}>{item.name}</Text>
            <Text style={styles.transactionCategory}>{item.category}</Text>
            <Text style={styles.transactionDate}>{item.date}</Text>
          </View>
          <View style={styles.transactionRight}>
            <Text
              style={[
                styles.transactionAmount,
                { color: item.type === 'received' ? theme.colors.success : theme.colors.textPrimary }
              ]}
            >
              {item.currency_symbol}{item.amount}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  });

  // Render transaction item for FlashList
  const renderTransactionItem = useCallback(({ item }: { item: WalletTransaction }) => (
    <TransactionItem item={item} />
  ), []);



  // Render filter button
  const renderFilterButton = (filter: 'all' | 'received' | 'sent', label: string) => {
    const isActive = selectedFilter === filter;
    return (
      <TouchableOpacity
        style={[
          styles.filterButton,
          { backgroundColor: isActive ? theme.colors.primary : theme.colors.grayUltraLight }
        ]}
        onPress={() => setSelectedFilter(filter)}
      >
        <Text style={[
          styles.filterButtonText,
          { 
            color: isActive ? theme.colors.white : theme.colors.textSecondary,
            fontWeight: isActive ? '600' : '500'
          }
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const styles = useMemo(() => StyleSheet.create({
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
      marginRight: theme.spacing.md,
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
      flex: 1,
    },
    searchContainer: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.inputBackground,
      borderRadius: theme.borderRadius.xl,
      paddingHorizontal: theme.spacing.sm,
      height: 40,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
    },
    searchIcon: {
      marginRight: theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      height: 40,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.inputText,
    },
    filtersContainer: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      justifyContent: 'space-between',
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.xl,
      marginHorizontal: theme.spacing.xs,
      flex: 1,
    },
    filterButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    filterButtonText: {
      fontSize: theme.typography.fontSize.sm,
    },
    filterButtonTextActive: {
      color: theme.colors.white,
      fontWeight: '600',
    },

    transactionsList: {
      flex: 1,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
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
      alignItems: 'center',
    },

    transactionInfo: {
      flex: 1,
    },
    transactionName: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    transactionCategory: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    transactionDate: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    transactionRight: {
      alignItems: 'flex-end',
    },
    transactionAmount: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.md,
    },
  }), [theme, selectedFilter]);

  if (isLoadingBalances || (isLoadingTransactions && !targetAccount)) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? "light-content" : "dark-content"} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Transactions</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.emptyText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Transactions</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search-outline"
            size={18}
            color={theme.colors.textTertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('received', 'Received')}
        {renderFilterButton('sent', 'Sent')}
      </View>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>
            {searchQuery || selectedFilter !== 'all' 
              ? 'No transactions match your search criteria' 
              : 'No transactions found'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={filteredTransactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id}
          estimatedItemSize={80}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          getItemType={() => 'transaction'}
        />
      )}
    </SafeAreaView>
  );
};

export default TransactionListScreen; 