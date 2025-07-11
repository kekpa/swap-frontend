// Updated: Removed avatar click functionality, entire transaction item now clickable for details - 2025-05-27

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthContext } from '../auth/context/AuthContext';
import { transactionManager } from '../../services/TransactionManager';
import { useData } from '../../contexts/DataContext';
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
  const { theme } = useTheme();
  const authContext = useAuthContext();
  const user = authContext.user;
  const { interactionsList } = useData();

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'received' | 'sent'>('all');

  // Helper function to resolve entity name from interactions
  const getEntityNameFromInteractions = useCallback((entityId: string): string => {
    if (!interactionsList || !Array.isArray(interactionsList)) {
      return 'Contact';
    }

    // Look through all interactions to find the entity
    for (const interaction of interactionsList) {
      if (interaction.members && Array.isArray(interaction.members)) {
        const member = interaction.members.find((m: any) => m.entity_id === entityId);
        if (member && member.display_name) {
          return member.display_name;
        }
      }
    }
    
    return 'Contact';
  }, [interactionsList]);

  // Helper function to format transaction date and time
  const formatTransactionDateTime = useCallback((isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const transactionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const timeString = date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    if (transactionDate.getTime() === today.getTime()) {
      return `Today, ${timeString}`;
    } else if (transactionDate.getTime() === yesterday.getTime()) {
      return `Yesterday, ${timeString}`;
    } else {
      // For older dates, show date and time
      const dateString = date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
      return `${dateString}, ${timeString}`;
    }
  }, []);

  // Fetch all transactions
  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    try {
      logger.debug('[TransactionListScreen] 📊 Fetching all transactions...');

      // Get all transactions from TransactionManager (increased limit)
      const allTransactions = await transactionManager.getRecentTransactions(100);
      
      // Transform transactions to wallet format
      const walletTransactions: WalletTransaction[] = allTransactions.map((tx: any) => {
        const isReceived = tx.to_entity_id === user.entityId;
        const amount = parseFloat(tx.amount?.toString() || '0');
        
        // Get currency symbol (simplified mapping)
        let currency_symbol = 'G';
        if (tx.currency_id === 'a8fc4df4-e198-4916-b5a5-a1be8c53a295') {
          currency_symbol = '$';
        }
        
        // Get the other party's entity ID and resolve their name
        const otherEntityId = isReceived ? tx.from_entity_id : tx.to_entity_id;
        const contactName = getEntityNameFromInteractions(otherEntityId);
        
        return {
          id: tx.id,
          name: contactName, // Show actual contact name
          amount: amount.toFixed(2),
          type: isReceived ? 'received' : 'sent',
          category: isReceived ? 'Payment received' : 'Payment sent',
          date: formatTransactionDateTime(tx.created_at),
          currency_symbol,
          timestamp: tx.created_at,
          entityId: otherEntityId, // Store the other party's entity ID for navigation
        };
      });

      // Sort by timestamp (newest first)
      walletTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setTransactions(walletTransactions);
      logger.debug(`[TransactionListScreen] ✅ Loaded ${walletTransactions.length} transactions`);
    } catch (error) {
      logger.error('[TransactionListScreen] ❌ Failed to fetch transactions:', error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, getEntityNameFromInteractions, formatTransactionDateTime]);

  // Filter transactions based on search and filter
  useEffect(() => {
    let filtered = transactions;

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

    setFilteredTransactions(filtered);
  }, [transactions, searchQuery, selectedFilter]);

  // Initial load
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  // Render avatar for transaction entities
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
      <View 
        style={[styles.transactionAvatar, { backgroundColor: avatarColor }]}
      >
        <Text style={styles.transactionAvatarText}>{initials}</Text>
      </View>
    );
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



  // Render transaction item
  const renderTransactionItem = ({ item }: { item: WalletTransaction }) => (
    <TouchableOpacity 
      style={styles.transactionItem}
      onPress={() => handleTransactionPress(item)}
    >
      {renderTransactionAvatar(item)}
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

  if (isLoading) {
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
        <FlatList
          style={styles.transactionsList}
          data={filteredTransactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default TransactionListScreen; 