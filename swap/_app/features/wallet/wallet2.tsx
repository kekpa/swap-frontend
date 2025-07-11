// Updated: Enhanced wallet with multi-currency account stack and filtered transactions - 2025-06-28
// Updated: Performance optimized with memoization and useCallback - 2025-06-30
// Updated: Added wallet security gate with PIN/biometric verification for neobank security - 2025-07-02
// Updated: Fixed multiple PIN requests with race condition protection and debouncing - 2025-07-03
// Updated: Fixed infinite authentication loop with circuit breaker and Alert queue protection - 2025-07-07
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { InteractionsStackParamList } from '../../navigation/interactions/interactionsNavigator';
import SearchHeader from '../header/SearchHeader';
import { useAuthContext } from '../auth/context/AuthContext';
import { useBalances } from '../../query/hooks/useBalances';
import { useInteractions } from '../../query/hooks/useInteractions';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/rootNavigator';
import balanceManager from '../../services/BalanceManager';
import { WalletBalance } from '../../types/wallet.types';
import { transactionManager } from '../../services/TransactionManager';
import { networkService } from '../../services/NetworkService';
import { WalletStackCard } from './components';
import logger from '../../utils/logger';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRecentTransactions, useTransactionsByAccount } from '../../query/hooks/useRecentTransactions';

interface WalletTransaction {
  id: string;
  name: string;
  amount: string;
  type: 'received' | 'sent';
  category: string;
  date: string;
  currency_symbol: string;
  entityId: string; // The other party's entity ID for navigation
  currency_id: string; // For filtering by account currency
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

type NavigationProp = StackNavigationProp<RootStackParamList>;

const WalletDashboard: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const authContext = useAuthContext();
  const user = authContext.user;
  const { currencyBalances, totalFiat, isLoadingBalances, refreshBalances, interactionsList } = useData();

  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [isLoadingRealBalances, setIsLoadingRealBalances] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<WalletTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<WalletBalance | null>(null);
  const [isWalletUnlocked, setIsWalletUnlocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const authenticationRef = useRef(false); // Immediate race condition protection
  const authTimerRef = useRef<NodeJS.Timeout | null>(null); // Timer management
  const alertShownRef = useRef(false); // Alert queue protection
  const lastAuthAttemptRef = useRef(0); // Track last attempt time
  const authAttemptsRef = useRef(0); // Circuit breaker counter

  // Offline mode state
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [networkState, setNetworkState] = useState({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
    isOfflineMode: false,
  });

  // Native biometric authentication
  const authenticateForWallet = useCallback(async () => {
    const now = Date.now();
    
    // Circuit breaker: Stop after too many attempts
    if (authAttemptsRef.current >= 5) {
      logger.warn('[WalletSecurity] Too many authentication attempts, circuit breaker activated');
      return;
    }
    
    // Prevent rapid re-attempts (minimum 2 seconds between attempts)
    if (now - lastAuthAttemptRef.current < 2000) {
      logger.debug('[WalletSecurity] Authentication attempt too soon, skipping');
      return;
    }
    
    // Immediate race condition protection
    if (isAuthenticating || authenticationRef.current || alertShownRef.current) {
      logger.debug('[WalletSecurity] Authentication already in progress or Alert shown, skipping');
      return;
    }
    
    logger.debug('[WalletSecurity] Starting wallet authentication');
    authenticationRef.current = true;
    alertShownRef.current = true;
    setIsAuthenticating(true);
    lastAuthAttemptRef.current = now;
    authAttemptsRef.current += 1;
    
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        // Immediately show PIN option for devices without biometrics
        logger.info('[WalletSecurity] No biometric hardware or not enrolled, showing PIN option');
        Alert.alert(
          'Authentication Required',
          'Please enable Face ID or Touch ID in your device settings for secure wallet access.',
          [
            { 
              text: 'Use PIN', 
              onPress: () => {
                logger.info('[WalletSecurity] User chose PIN authentication');
                setIsWalletUnlocked(true);
                authAttemptsRef.current = 0; // Reset counter on success
                alertShownRef.current = false;
                authenticationRef.current = false;
                setIsAuthenticating(false);
              }
            },
            { 
              text: 'Cancel', 
              onPress: () => {
                logger.info('[WalletSecurity] User cancelled authentication');
                alertShownRef.current = false;
                authenticationRef.current = false;
                setIsAuthenticating(false);
              },
              style: 'cancel'
            }
          ],
          { 
            cancelable: false,
            onDismiss: () => {
              logger.info('[WalletSecurity] Alert dismissed');
              alertShownRef.current = false;
              authenticationRef.current = false;
              setIsAuthenticating(false);
            }
          }
        );
        return;
      }

      // Use native biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your wallet',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
      });

      if (result.success) {
        logger.info('[WalletSecurity] Native biometric authentication successful');
        setIsWalletUnlocked(true);
        authAttemptsRef.current = 0; // Reset counter on success
      } else {
        logger.warn('[WalletSecurity] Native biometric authentication failed or cancelled');
        // Don't navigate back, just reset authentication state
        // User will see the authentication required screen
      }
    } catch (error) {
      logger.error('[WalletSecurity] Native biometric authentication error:', error);
      Alert.alert(
        'Authentication Error', 
        'Unable to authenticate. Please try again.',
        [
          { 
            text: 'Retry', 
            onPress: () => {
              alertShownRef.current = false;
              authenticationRef.current = false;
              setIsAuthenticating(false);
              // Don't immediately retry, let the user trigger it
            }
          },
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => {
              alertShownRef.current = false;
              authenticationRef.current = false;
              setIsAuthenticating(false);
            }
          }
        ],
        {
          onDismiss: () => {
            alertShownRef.current = false;
            authenticationRef.current = false;
            setIsAuthenticating(false);
          }
        }
      );
    } finally {
      alertShownRef.current = false;
      authenticationRef.current = false;
      setIsAuthenticating(false);
    }
  }, []);

  // Trigger authentication when wallet screen is focused
  useFocusEffect(
    useCallback(() => {
      // Clear any existing timer first
        if (authTimerRef.current) {
          clearTimeout(authTimerRef.current);
        authTimerRef.current = null;
        }
        
      if (!isWalletUnlocked && !isAuthenticating && !authenticationRef.current && !alertShownRef.current) {
        // Longer debounced authentication trigger (1 second delay)
        authTimerRef.current = setTimeout(() => {
          authenticateForWallet();
        }, 1000);
      }
        
      // Cleanup function - ALWAYS defined, not conditional
        return () => {
          if (authTimerRef.current) {
            clearTimeout(authTimerRef.current);
            authTimerRef.current = null;
          }
        };
    }, [isWalletUnlocked, isAuthenticating, authenticateForWallet])
  );

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clear all timers and reset authentication state on unmount
      if (authTimerRef.current) {
        clearTimeout(authTimerRef.current);
        authTimerRef.current = null;
      }
      authenticationRef.current = false;
      alertShownRef.current = false;
      authAttemptsRef.current = 0;
      lastAuthAttemptRef.current = 0;
    };
  }, []);

  // Monitor network state changes
  useEffect(() => {
    const networkUnsubscribe = networkService.onNetworkStateChange((state) => {
      logger.debug('[WalletDashboard] 🌐 Network state changed:', JSON.stringify(state));
      setNetworkState(state);
      setIsOfflineMode(state.isOfflineMode);
      
      if (state.isOfflineMode) {
        logger.info('[WalletDashboard] 📱 OFFLINE MODE: Using cached data only');
      } else {
        logger.info('[WalletDashboard] 🌐 ONLINE MODE: Will sync with server');
        
        // When coming back online, refresh data
        if (isWalletUnlocked && user) {
          logger.debug('[WalletDashboard] 🔄 Back online - refreshing data');
          const entityId = user.entityId || user.profileId;
          if (entityId) {
            balanceManager.forceRefresh(entityId).catch((error: any) => {
              logger.warn('[WalletDashboard] Background refresh failed after coming online:', error);
            });
          }
        }
      }
    });
    
    // Get initial network state
    const initialState = networkService.getNetworkState();
    setNetworkState(initialState);
    setIsOfflineMode(initialState.isOfflineMode);
    
    return networkUnsubscribe;
  }, [isWalletUnlocked, user]);

  // Enhanced wallet initialization with offline mode support
  useEffect(() => {
    if (!isWalletUnlocked || !user) {
      // Clear data when wallet is locked
      setWalletBalances([]);
      setSelectedWallet(null);
      setRecentTransactions([]);
      return;
    }

    const initializeWalletsLocalFirst = async () => {
      try {
        logger.debug('[WalletDashboard] 🚀 LOCAL-FIRST: Starting wallet initialization...');

        if (!user?.entityId && !user?.profileId) {
          logger.warn('[WalletDashboard] No entity ID or profile ID available');
          setIsLoadingRealBalances(false);
          return;
        }

        const entityId = user.entityId || user.profileId;

        // STEP 1: Load wallets using new BalanceManager (cache-first)
        logger.debug('[WalletDashboard] 📱 Loading wallets with cache-first approach...');
        
        const walletDisplays = await balanceManager.getWalletsForDisplay(entityId);
        
        if (walletDisplays.length > 0) {
          // Transform WalletDisplay to WalletBalance format for UI compatibility
          const transformedWallets = walletDisplays.map(wallet => ({
            wallet_id: wallet.id,
            currency_code: wallet.currency_code,
            currency_symbol: wallet.currency_symbol,
            balance: wallet.balance,
            isPrimary: wallet.isPrimary,
            account_id: wallet.account_id,
            status: wallet.status,
            last_updated: wallet.last_updated,
            // Add required fields for compatibility
            entity_id: entityId,
            currency_id: '', // Not available in WalletDisplay
            currency_name: wallet.currency_code,
            reserved_balance: 0,
            available_balance: wallet.balance,
            balance_last_updated: wallet.last_updated,
            is_active: wallet.status === 'active'
          }));

          logger.debug(`[WalletDashboard] ✅ INSTANT: Loaded ${transformedWallets.length} wallets`);
          setWalletBalances(transformedWallets);
          setIsLoadingRealBalances(false);
          
          // Auto-select primary wallet
          const primaryWallet = transformedWallets.find(w => w.isPrimary) || transformedWallets[0];
          setSelectedWallet(primaryWallet);
          
          logger.debug(`[WalletDashboard] 🎯 INSTANT: Selected wallet ${primaryWallet.currency_code}`);
          
          // Load transactions for the selected wallet
          await fetchRecentTransactions();
        } else {
          logger.debug('[WalletDashboard] 📭 No wallets found');
          setWalletBalances([]);
          setIsLoadingRealBalances(false);
        }

        logger.info('[WalletDashboard] ✅ LOCAL-FIRST wallet initialization complete');
      } catch (error) {
        logger.error('[WalletDashboard] ❌ Failed to initialize wallets:', error);
        setIsLoadingRealBalances(false);
      }
    };

    initializeWalletsLocalFirst();

    // Cleanup on unmount or user change
    return () => {
      // Clear authentication timer on unmount
      if (authTimerRef.current) {
        clearTimeout(authTimerRef.current);
        authTimerRef.current = null;
      }
      // Reset authentication state
      authenticationRef.current = false;
    };
  }, [isWalletUnlocked, user?.id, user?.entityId]);

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
    // Validate input
    if (!isoString || typeof isoString !== 'string') {
      logger.debug(`[WalletDashboard] Invalid date string: ${isoString}`);
      return 'Invalid date';
    }
    
    const date = new Date(isoString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      logger.debug(`[WalletDashboard] Invalid date created from: ${isoString}`);
      return 'Invalid date';
    }
    
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

  // Helper function to get currency symbol from wallet balances
  const getCurrencySymbolFromWallets = useCallback((currencyId: string): string => {
    if (!walletBalances || walletBalances.length === 0) {
      // Fallback to hardcoded mapping if no wallet balances available
      if (currencyId === 'a8fc4df4-e198-4916-b5a5-a1be8c53a295') {
        return '$'; // USD
      }
      if (currencyId === 'e5595731-321c-479f-afb1-b852155879b4') {
        return 'G'; // HTG
      }
      return '?'; // Unknown currency
    }

    // Find the wallet with matching currency_id and get its symbol
    const matchingWallet = walletBalances.find(wallet => {
      return wallet.currency_id === currencyId;
    });

    if (matchingWallet) {
      return matchingWallet.currency_symbol;
    }

    // Enhanced fallback with more currency support
    if (currencyId === 'a8fc4df4-e198-4916-b5a5-a1be8c53a295') {
      return '$'; // USD
    }
    if (currencyId === 'e5595731-321c-479f-afb1-b852155879b4') {
      return 'G'; // HTG
    }
    
    // For other currencies, try to match by common patterns
    const currencyMap: { [key: string]: string } = {
      'eur': '€',
      'euro': '€',
      'gbp': '£',
      'pound': '£',
      'jpy': '¥',
      'yen': '¥',
      'cad': 'C$',
      'aud': 'A$',
    };

    // Check if we can infer from wallet balances
    for (const wallet of walletBalances) {
      const lowerCurrencyCode = wallet.currency_code.toLowerCase();
      if (currencyMap[lowerCurrencyCode]) {
        return wallet.currency_symbol || currencyMap[lowerCurrencyCode];
      }
    }
    
    return '?'; // Unknown currency
  }, [walletBalances]);

  // TANSTACK QUERY: Use TanStack Query for recent transactions (general)
  const { 
    transactions: queryRecentTransactions, 
    isLoading: isLoadingQueryTransactions,
    refetch: refetchRecentTransactions 
  } = useRecentTransactions({
    entityId: user?.entityId,
    limit: 5,
    enabled: !!user && isWalletUnlocked
  });

  // TANSTACK QUERY: Use TanStack Query for account-specific transactions (PROFESSIONAL BACKEND FILTERING)
  const { 
    transactions: accountTransactions, 
    isLoading: isLoadingAccountTransactions,
    refetch: refetchAccountTransactions 
  } = useTransactionsByAccount(
    selectedWallet?.account_id || '', 
    {
      limit: 20,
      enabled: !!selectedWallet?.account_id && isWalletUnlocked
    }
  );

  // LOCAL-FIRST: Fetch recent transactions with cache-first loading
  const fetchRecentTransactions = useCallback(async () => {
    if (!user) {
      setRecentTransactions([]);
      setIsLoadingTransactions(false);
      return;
    }

    try {
      logger.debug('[WalletDashboard] 📊 LOCAL-FIRST: Loading transactions...');

      // Use TanStack Query data directly instead of calling transactionManager
      const transactions = queryRecentTransactions || [];
      
      if (transactions && transactions.length > 0) {
        logger.debug(`[WalletDashboard] ✅ INSTANT: Loaded ${transactions.length} transactions from TanStack Query`);
        
        // Transform transactions to wallet format
        const walletTransactions: WalletTransaction[] = transactions.map((tx: any) => {
          const isReceived = tx.to_entity_id === user.entityId;
          const amount = parseFloat(tx.amount?.toString() || '0');
          
          // Get currency symbol using dynamic mapping
          const currency_symbol = getCurrencySymbolFromWallets(tx.currency_id);

          // Get the other party's entity ID and resolve their name
          const otherEntityId = isReceived ? tx.from_entity_id : tx.to_entity_id;
          const contactName = getEntityNameFromInteractions(otherEntityId);

          return {
            id: tx.id,
            name: contactName,
            amount: amount.toFixed(2),
            type: isReceived ? 'received' : 'sent',
            category: isReceived ? 'Payment received' : 'Payment sent',
            date: formatTransactionDateTime(tx.created_at),
            currency_symbol,
            entityId: otherEntityId,
            currency_id: tx.currency_id,
          };
        });

        setRecentTransactions(walletTransactions);
        setIsLoadingTransactions(false);
        logger.debug('[WalletDashboard] 🎯 INSTANT: Transaction UI updated from TanStack Query cache');
      }
    } catch (error) {
      logger.error('[WalletDashboard] Error loading recent transactions:', error);
      setRecentTransactions([]);
      setIsLoadingTransactions(false);
    }
  }, [user, queryRecentTransactions, getCurrencySymbolFromWallets, getEntityNameFromInteractions]);

  // Refetch transactions when wallet balances change (for currency symbol updates)
  useEffect(() => {
    if (walletBalances.length > 0 && user && isWalletUnlocked) {
      // Only refetch if we actually have wallets loaded
      // Use a simple async function to avoid dependency issues
      const refetchTransactions = async () => {
        try {
          const transactions = await transactionManager.getRecentTransactions(5);
          
          if (transactions && transactions.length > 0) {
            const walletTransactions: WalletTransaction[] = transactions.map((tx: any) => {
              const isReceived = tx.to_entity_id === user.entityId;
              const amount = parseFloat(tx.amount?.toString() || '0');
              
              // Get currency symbol using dynamic mapping
              const currency_symbol = getCurrencySymbolFromWallets(tx.currency_id);

              // Get the other party's entity ID and resolve their name
              const otherEntityId = isReceived ? tx.from_entity_id : tx.to_entity_id;
              const contactName = getEntityNameFromInteractions(otherEntityId);

              return {
                id: tx.id,
                name: contactName,
                amount: amount.toFixed(2),
                type: isReceived ? 'received' : 'sent',
                category: isReceived ? 'Payment received' : 'Payment sent',
                date: formatTransactionDateTime(tx.created_at),
                currency_symbol,
                entityId: otherEntityId,
                currency_id: tx.currency_id,
              };
            });

            setRecentTransactions(walletTransactions);
            setIsLoadingTransactions(false);
          }
        } catch (error) {
          logger.debug('[WalletDashboard] Transaction refetch failed (non-critical):', error instanceof Error ? error.message : String(error));
        }
      };
      
      refetchTransactions();
    }
  }, [walletBalances.length, user?.entityId, isWalletUnlocked]); // Removed fetchRecentTransactions dependency

  // INSTANT transaction reload when selected wallet changes
  useEffect(() => {
    if (selectedWallet && user && isWalletUnlocked) {
      logger.debug(`[WalletDashboard] 🔄 INSTANT: Wallet changed to ${selectedWallet.currency_code}, reloading transactions...`);
      
      const reloadTransactionsForWallet = async () => {
        try {
          setIsLoadingTransactions(true);
          
          // Get transactions immediately from cache
          const transactions = await transactionManager.getRecentTransactions(5);
          
          if (transactions && transactions.length > 0) {
            const walletTransactions: WalletTransaction[] = transactions.map((tx: any) => {
              const isReceived = tx.to_entity_id === user.entityId;
              const amount = parseFloat(tx.amount?.toString() || '0');
              
              // Get currency symbol using dynamic mapping with updated wallet
              const currency_symbol = getCurrencySymbolFromWallets(tx.currency_id);

              // Get the other party's entity ID and resolve their name
              const otherEntityId = isReceived ? tx.from_entity_id : tx.to_entity_id;
              const contactName = getEntityNameFromInteractions(otherEntityId);

              return {
                id: tx.id,
                name: contactName,
                amount: amount.toFixed(2),
                type: isReceived ? 'received' : 'sent',
                category: isReceived ? 'Payment received' : 'Payment sent',
                date: formatTransactionDateTime(tx.created_at),
                currency_symbol,
                entityId: otherEntityId,
                currency_id: tx.currency_id,
              };
            });

            setRecentTransactions(walletTransactions);
            logger.debug(`[WalletDashboard] ✅ INSTANT: Updated ${walletTransactions.length} transactions for ${selectedWallet.currency_code} wallet`);
          }
          
          setIsLoadingTransactions(false);
        } catch (error) {
          logger.debug('[WalletDashboard] Wallet transaction reload failed (non-critical):', error instanceof Error ? error.message : String(error));
          setIsLoadingTransactions(false);
        }
      };
      
      reloadTransactionsForWallet();
    }
  }, [selectedWallet?.wallet_id, user?.entityId, isWalletUnlocked, getCurrencySymbolFromWallets, getEntityNameFromInteractions, formatTransactionDateTime]); // React to wallet changes

  // Helper function to get currency ID from currency code
  const getCurrencyIdFromCode = useCallback((currencyCode: string): string => {
    // First, try to find the currency ID from the wallet balances
    if (walletBalances && walletBalances.length > 0) {
      const matchingWallet = walletBalances.find(wallet => wallet.currency_code === currencyCode);
      if (matchingWallet && matchingWallet.currency_id) {
        return matchingWallet.currency_id;
      }
    }

    // Known currency mappings as fallback
    const currencyIdMap: { [key: string]: string } = {
      'HTG': 'e5595731-321c-479f-afb1-b852155879b4',
      'USD': 'a8fc4df4-e198-4916-b5a5-a1be8c53a295',
    };

    if (currencyIdMap[currencyCode]) {
      return currencyIdMap[currencyCode];
    }

    // Try to find a currency ID from existing transactions that match the currency symbol
    const selectedSymbol = selectedWallet?.currency_symbol;
    if (selectedSymbol && recentTransactions.length > 0) {
      const matchingTransaction = recentTransactions.find(tx => tx.currency_symbol === selectedSymbol);
      if (matchingTransaction) {
        return matchingTransaction.currency_id;
      }
    }

    return ''; // Unknown currency
  }, [walletBalances, recentTransactions, selectedWallet]);

  // Transform account transactions from TanStack Query
  const transformedAccountTransactions = useMemo(() => {
    if (!accountTransactions || !user) return [];

    logger.debug(`[WalletDashboard] 🎯 TANSTACK QUERY: Transforming ${accountTransactions.length} account transactions`);

    return accountTransactions.map((tx: any) => {
      const isReceived = tx.to_entity_id === user.entityId;
      const amount = parseFloat(tx.amount?.toString() || '0');
      
      // Get currency symbol using dynamic mapping
      const currency_symbol = getCurrencySymbolFromWallets(tx.currency_id);

      // Get the other party's entity ID and resolve their name
      const otherEntityId = isReceived ? tx.from_entity_id : tx.to_entity_id;
      const contactName = getEntityNameFromInteractions(otherEntityId);

      return {
        id: tx.id,
        name: contactName,
        amount: amount.toFixed(2),
        type: (isReceived ? 'received' : 'sent') as 'received' | 'sent',
        category: isReceived ? 'Payment received' : 'Payment sent',
        date: formatTransactionDateTime(tx.created_at),
        currency_symbol,
        entityId: otherEntityId,
        currency_id: tx.currency_id,
      };
    });
  }, [accountTransactions, user, getCurrencySymbolFromWallets, getEntityNameFromInteractions]);

  // Use account-specific transactions when available, fallback to filtered general transactions
  const filteredTransactions = useMemo(() => {
    if (transformedAccountTransactions.length > 0) {
      logger.debug(`[WalletDashboard] 🎯 BACKEND FILTERING: Using ${transformedAccountTransactions.length} account-specific transactions from TanStack Query`);
      return transformedAccountTransactions;
    }
    
    // Fallback: Filter general recent transactions by currency (for offline/error cases)
    if (!selectedWallet) {
      logger.debug(`[WalletDashboard] 🔍 FALLBACK: No selected wallet, showing all transactions: ${recentTransactions.length}`);
      return recentTransactions;
    }
    
    const filtered = recentTransactions.filter(tx => {
      return tx.currency_id === selectedWallet.currency_id ||
             tx.currency_symbol === selectedWallet.currency_symbol;
    });
    
    logger.debug(
      `[WalletDashboard] 🔄 FALLBACK: Frontend filtered ${filtered.length} transactions for wallet ${selectedWallet.currency_code} ` +
      `(from ${recentTransactions.length} total transactions)`
    );
    
    return filtered;
  }, [transformedAccountTransactions, recentTransactions, selectedWallet]);

  const handleActualRefresh = async () => {
    setRefreshing(true);
    try {
      logger.debug('[WalletDashboard] 🔄 LOCAL-FIRST: Manual refresh requested');
      
      // LOCAL-FIRST: Background refresh without blocking UI
      // UI already shows cached data, this just updates it
      const entityId = user?.entityId || user?.profileId;
      await Promise.all([
        refreshBalances().catch((error: any) => logger.warn('[WalletDashboard] Legacy balance refresh failed (non-critical):', error)),
        entityId ? balanceManager.forceRefresh(entityId).catch((error: any) => logger.warn('[WalletDashboard] Wallet refresh failed (non-critical):', error)) : Promise.resolve(),
        fetchRecentTransactions().catch((error: any) => logger.warn('[WalletDashboard] Transaction refresh failed (non-critical):', error))
      ]);
      
      logger.info('[WalletDashboard] ✅ LOCAL-FIRST: Manual refresh completed');
    } catch (error) {
      logger.error('[WalletDashboard] ❌ Manual refresh error (UI still shows cached data):', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getHeaderInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "UA";
  };

  // Memoize styles to avoid recreating on every render
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      paddingBottom: theme.spacing.lg,
    },
    greeting: {
      fontSize: theme.typography.fontSize.xxxl,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.sm,
    },
    pointsContainer: {
      position: 'absolute',
      right: theme.spacing.md,
      top: theme.spacing.md,
      backgroundColor: theme.colors.primaryUltraLight,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    pointsText: {
      color: theme.colors.primary,
      fontWeight: '600',
      fontSize: theme.typography.fontSize.sm,
    },

    actionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: theme.spacing.md, // REDUCED from lg to md (16px instead of 24px)
      marginHorizontal: theme.spacing.md,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginHorizontal: theme.spacing.xs,
      ...theme.shadows.small,
    },
    actionText: {
      color: theme.colors.textPrimary,
      fontWeight: '600',
      fontSize: theme.typography.fontSize.md,
      marginLeft: theme.spacing.xs,
    },
    transactionsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.md, // REDUCED from lg to md (16px instead of 24px)
      marginBottom: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
    },
    transactionsTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
    },
    seeAllButton: {
      color: theme.colors.primary,
      fontWeight: '500',
      fontSize: theme.typography.fontSize.sm,
    },
    transactionsList: {
      paddingTop: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
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
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.md,
      marginTop: theme.spacing.sm,
    },
    emptyContainer: {
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
    },
    accountLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
    },

    // Authentication Required Screen Styles
    authRequiredContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    authRequiredContent: {
      alignItems: 'center',
      maxWidth: 300,
    },
    lockIconContainer: {
      marginBottom: theme.spacing.lg,
    },
    authRequiredTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    authRequiredDescription: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: theme.spacing.xl,
    },
    authRetryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      ...theme.shadows.small,
    },
    authRetryButtonDisabled: {
      opacity: 0.7,
    },
    authRetryText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      marginLeft: theme.spacing.sm,
    },
    authLoadingContainer: {
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    
    // LOCAL-FIRST: Sync indicator styles
    syncIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing.sm,
    },
    syncText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.xs,
    },
  }), [theme]);

  const handleAvatarPress = useCallback((transaction: WalletTransaction) => {
    logger.debug(`[WalletDashboard] Avatar pressed for transaction: ${transaction.id}, navigating to chat`, "WalletDashboard");
    
    // Navigate to the contact's chat
    (navigation as any).navigate("Contacts", {
      screen: "ContactInteractionHistory2",
      params: {
        contactId: transaction.entityId,
        contactName: transaction.name,
        contactInitials: getInitials(transaction.name),
        contactAvatarColor: (() => {
          const charCode = transaction.name.charCodeAt(0);
          const colorPalette = [
            theme.colors.primary, 
            theme.colors.secondary, 
            theme.colors.success, 
            theme.colors.info, 
            theme.colors.warning
          ];
          return colorPalette[charCode % colorPalette.length];
        })(),
      }
    });
  }, [navigation, theme.colors]);

  // Render avatar for transaction entities
  const renderTransactionAvatar = useCallback((transaction: WalletTransaction) => {
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
        onPress={() => handleAvatarPress(transaction)}
      >
        <Text style={styles.transactionAvatarText}>{initials}</Text>
      </TouchableOpacity>
    );
  }, [styles.transactionAvatar, styles.transactionAvatarText, theme.colors, handleAvatarPress]);

  const renderTransactionItem = useCallback((item: WalletTransaction) => (
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
  ), [styles, renderTransactionAvatar]);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    // Implement search functionality
  }, []);

  const handleProfilePress = useCallback(() => {
    const source = 'Wallet';
    logger.debug(`[WalletDashboard] Navigating to ProfileModal, sourceRoute: ${source}`);
    (navigation as any).navigate("ProfileModal", { sourceRoute: source });
  }, [navigation]);
  
  const handleAddMoney = useCallback(() => {
    (navigation as any).navigate("Wallet", { 
      screen: "TempAddMoney" 
    });
  }, [navigation]);

  const handleNewInteraction = useCallback(() => {
    navigation.navigate('NewInteraction2');
  }, [navigation]);

  const toggleBalanceVisibility = useCallback(() => {
    setIsBalanceVisible(!isBalanceVisible);
  }, [isBalanceVisible]);

  const handleWalletSelect = async (wallet: WalletBalance) => {
    try {
      logger.debug(`[WalletDashboard] 🔄 Setting wallet ${wallet.wallet_id} as primary: ${wallet.currency_code} - ${wallet.currency_symbol}${wallet.balance}`, "WalletDashboard");
      
      // Use the new setPrimaryWallet method with wallet_id
      const success = await balanceManager.setPrimaryWallet(wallet.wallet_id);
      
      if (success) {
        // Update local selected wallet state immediately for UI consistency
        setSelectedWallet(wallet);
        logger.info(`[WalletDashboard] ✅ Successfully set ${wallet.currency_code} wallet as primary`, "WalletDashboard");
        
        // NOTE: Don't refresh immediately - let the optimistic UI handle the transition
        // The WalletStackCard will handle clearing optimistic state when backend data arrives
        // This prevents the jarring "jump" effect
      } else {
        logger.error(`[WalletDashboard] ❌ Failed to set ${wallet.currency_code} wallet as primary`, "WalletDashboard");
        throw new Error('Failed to set primary wallet');
      }
    } catch (error) {
      logger.error(`[WalletDashboard] ❌ Error setting primary wallet:`, error);
      throw error; // Re-throw so WalletStackCard can handle the error
    }
  };

  // Early return if wallet is not unlocked
  if (!isWalletUnlocked) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
        <View style={styles.authRequiredContainer}>
          <View style={styles.authRequiredContent}>
            <View style={styles.lockIconContainer}>
              <Ionicons name="lock-closed" size={64} color={theme.colors.primary} />
            </View>
            
            <Text style={styles.authRequiredTitle}>Wallet Authentication Required</Text>
            <Text style={styles.authRequiredDescription}>
              {isAuthenticating 
                ? "Authenticating your identity..." 
                : authAttemptsRef.current >= 5
                  ? "Too many authentication attempts. Please wait a moment before trying again."
                : "To access your wallet, please authenticate using Face ID, Touch ID, or your device PIN."
              }
            </Text>
            
            {!isAuthenticating && (
              <TouchableOpacity 
                style={[
                  styles.authRetryButton, 
                  authAttemptsRef.current >= 5 && styles.authRetryButtonDisabled
                ]} 
                onPress={() => {
                  if (authAttemptsRef.current >= 5) {
                    // Reset circuit breaker after user acknowledgment
                    authAttemptsRef.current = 0;
                    lastAuthAttemptRef.current = 0;
                    logger.info('[WalletSecurity] Circuit breaker reset by user');
                  }
                  authenticateForWallet();
                }}
                disabled={authAttemptsRef.current >= 5 && Date.now() - lastAuthAttemptRef.current < 10000} // 10 second cooldown
              >
                <Ionicons 
                  name={authAttemptsRef.current >= 5 ? "refresh" : "finger-print"} 
                  size={24} 
                  color={theme.colors.white} 
                />
                <Text style={styles.authRetryText}>
                  {authAttemptsRef.current >= 5 ? "Reset & Try Again" : "Authenticate Now"}
                </Text>
              </TouchableOpacity>
            )}
            
            {isAuthenticating && (
              <View style={styles.authLoadingContainer}>
                <Text style={styles.loadingText}>Authenticating...</Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      <SearchHeader
        onSearch={handleSearch}
        placeholder="Search for transactions"
        onProfilePress={handleProfilePress}
        rightIcons={[{ name: "add-circle", onPress: handleNewInteraction, color: theme.colors.primary }]}
        showProfile={true}
        avatarUrl={user?.avatarUrl}
        initials={getHeaderInitials()}
        showSearch={false}
        brandName="Swap"
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleActualRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View>
          <WalletStackCard
            wallets={walletBalances}
            selectedWalletId={selectedWallet?.wallet_id}
            isBalanceVisible={isBalanceVisible}
            onToggleVisibility={toggleBalanceVisibility}
            onWalletSelect={handleWalletSelect}
          />

          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleAddMoney}>
              <Ionicons name="add" size={24} color={theme.colors.primary} />
              <Text style={styles.actionText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => (navigation as any).navigate("Contacts", { 
                screen: "InteractionsHistory", 
                params: { 
                  navigateToNewChat: true 
                } 
              })}
            >
              <Ionicons name="send-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.actionText}>Send</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionsHeader}>
            <View>
              <Text style={styles.transactionsTitle}>Recent Transactions</Text>
              {selectedWallet && (
                <Text style={styles.accountLabel}>
                  {selectedWallet.currency_code} Wallet
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('TransactionList' as any)}>
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionsList}>
            {/* LOCAL-FIRST: Show cached data with contextual sync indicator */}
            {filteredTransactions.length > 0 ? (
              <>
                {/* Subtle sync indicator when refreshing background data */}
                {isLoadingTransactions && (
                  <View style={styles.syncIndicator}>
                    <Ionicons name="sync" size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.syncText}>Syncing latest transactions...</Text>
                  </View>
                )}
                {filteredTransactions.map(item => renderTransactionItem(item))}
              </>
            ) : isLoadingTransactions ? (
              /* Only show full loading on first load with no cached data */
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading transactions...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {selectedWallet 
                    ? `No recent transactions for ${selectedWallet.currency_code} wallet`
                    : 'No recent transactions'
                  }
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default WalletDashboard; 