// Updated: Enhanced wallet with multi-currency account stack and filtered transactions - 2025-06-28
// Updated: Performance optimized with memoization and useCallback - 2025-06-30
// Updated: Added wallet security gate with PIN/biometric verification for neobank security - 2025-07-02
// Updated: Fixed multiple PIN requests with race condition protection and debouncing - 2025-07-03
// Updated: Fixed infinite authentication loop with circuit breaker and Alert queue protection - 2025-07-07
// Updated: Migrated from DataContext to TanStack Query hooks - 2025-01-11
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import SearchHeader from '../header/SearchHeader';
import { useAuthContext } from '../auth/context/AuthContext';
import { useBalances, useSetPrimaryWallet, useWalletEligibility, useInitializeWallet } from '../../query/hooks/useBalances';
import { useInteractions } from '../../query/hooks/useInteractions';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/rootNavigator';
import { WalletBalance } from '../../types/wallet.types';
import { networkService } from '../../services/NetworkService';
import { WalletStackCard } from './components';
import WalletOnboarding from './components/WalletOnboarding';
import logger from '../../utils/logger';
import * as LocalAuthentication from 'expo-local-authentication';
import { useWalletTransactions } from '../../query/hooks/useRecentTransactions';

// 🚀 PROFESSIONAL: Add intelligent preloading for WhatsApp-style instant loading
import { queryClient } from '../../query/queryClient';
import { queryKeys } from '../../query/queryKeys';
import { transactionManager } from '../../services/TransactionManager';

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
  
  // TanStack Query hooks replacing useData()
  const entityId = user?.entityId || '';
  
  // Debug logging for entityId
  useEffect(() => {
    logger.debug(`[WalletDashboard] 🔍 ENTITY DEBUG: user=${!!user}, entityId="${entityId}", userEntityId="${user?.entityId}"`);
    if (user) {
      logger.debug(`[WalletDashboard] 🔍 USER DATA:`, JSON.stringify({
        id: user.id,
        entityId: user.entityId,
        profileId: user.profileId,
        firstName: user.firstName
      }, null, 2));
    }
  }, [user, entityId]);
  
  const { 
    data: currencyBalances = [], 
    isLoading: isLoadingBalances,
    error: balancesError,
    refetch: refreshBalances 
  } = useBalances(entityId);
  
  const { 
    interactions: interactionsList = [] 
  } = useInteractions({ enabled: !!user });

  // Debug logging for balance loading
  useEffect(() => {
    logger.debug(`[WalletDashboard] 🔍 BALANCE DEBUG: isLoading=${isLoadingBalances}, error=${!!balancesError}, dataLength=${currencyBalances.length}`);
    if (currencyBalances.length > 0) {
      const balanceData = currencyBalances.map(b => ({
        id: b.wallet_id,
        currency: b.currency_code,
        balance: b.balance,
        isPrimary: b.isPrimary
      }));
      logger.debug(`[WalletDashboard] 🔍 BALANCE DATA: ${JSON.stringify(balanceData)}`);
    }
    if (balancesError) {
      logger.error(`[WalletDashboard] 🔍 BALANCE ERROR: ${balancesError instanceof Error ? balancesError.message : String(balancesError)}`);
    }
  }, [currencyBalances, isLoadingBalances, balancesError]);

  // 🚀 PROFESSIONAL: Intelligent preloading of wallet transaction data (WhatsApp-style)
  useEffect(() => {
    if (currencyBalances && currencyBalances.length > 0 && user?.entityId) {
      // Find the primary wallet's account for preloading transactions
      const primaryWallet = currencyBalances.find(w => w.isPrimary);
      const accountIdToPreload = primaryWallet?.account_id || currencyBalances[0]?.account_id;
      
      if (accountIdToPreload) {
        logger.debug(`[WalletDashboard] 🚀 PRELOADING: Starting transaction preload for account: ${accountIdToPreload}`, "WalletDashboard");
        
        // Preload transactions in background with small delay to avoid overwhelming
        setTimeout(() => {
          // Check if we already have cached transaction data
          const existingData = queryClient.getQueryData(queryKeys.transactionsByAccount(accountIdToPreload, 4));
          if (!existingData) {
            logger.debug(`[WalletDashboard] 🔄 PRELOADING: No cached transactions found, prefetching for instant UX`, "WalletDashboard");
            
            // Prefetch transaction data for instant loading
            queryClient.prefetchQuery({
              queryKey: queryKeys.transactionsByAccount(accountIdToPreload, 4),
              queryFn: async () => {
                const result = await transactionManager.getTransactionsForAccount(accountIdToPreload, 4, 0);
                return result?.data || [];
              },
              staleTime: 10 * 60 * 1000, // 10 minutes
            }).catch(error => {
              logger.debug(`[WalletDashboard] ⚠️ PRELOADING: Transaction prefetch failed (non-critical): ${error}`, "WalletDashboard");
            });
          } else {
            logger.debug(`[WalletDashboard] ✅ PRELOADING: Cached transaction data exists, skipping prefetch`, "WalletDashboard");
          }
        }, 200); // 200ms delay for background preloading
      }
    }
  }, [currencyBalances, user?.entityId]);

  // State declarations
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletBalance | null>(null);

  // NEW: Wallet state machine for KYC-gated access
  const [walletState, setWalletState] = useState<
    'loading' | 'no-access' | 'needs-init' | 'ready' | 'locked'
  >('loading');

  // NEW: Hook for checking wallet eligibility
  const {
    data: eligibility,
    isLoading: isLoadingEligibility,
    error: eligibilityError,
  } = useWalletEligibility(entityId, { enabled: !!entityId });

  // NEW: Hook for wallet initialization
  const initializeWalletMutation = useInitializeWallet();

  // Professional wallet-specific transaction loading
  const { 
    transactions: allAccountTransactions = [], 
    isLoading: isLoadingWalletTransactions, 
    refetch: refetchWalletTransactions 
  } = useWalletTransactions(
    selectedWallet?.account_id || '', 
    !!selectedWallet?.account_id
  );

  // Filter transactions by selected wallet currency
  const walletTransactions = useMemo(() => {
    if (!selectedWallet || !allAccountTransactions.length) {
      logger.debug(`[WalletDashboard] 🎯 CURRENCY FILTER: No wallet selected or no transactions. Wallet: ${!!selectedWallet}, Transactions: ${allAccountTransactions.length}`);
      return [];
    }

    // Debug: Log the first transaction and wallet currency IDs for comparison
    if (allAccountTransactions.length > 0) {
      const firstTx = allAccountTransactions[0];
      logger.debug(`[WalletDashboard] 🔍 DEBUG CURRENCY FILTER:`);
      logger.debug(`[WalletDashboard] 🔍 Selected Wallet Currency ID: ${selectedWallet.currency_id}`);
      logger.debug(`[WalletDashboard] 🔍 Selected Wallet Currency Code: ${selectedWallet.currency_code}`);
      logger.debug(`[WalletDashboard] 🔍 First Transaction Currency ID: ${firstTx.currency_id}`);
      logger.debug(`[WalletDashboard] 🔍 First Transaction Currency Symbol: ${firstTx.currency_symbol}`);
      logger.debug(`[WalletDashboard] 🔍 Transaction Structure:`, JSON.stringify(firstTx, null, 2));
      logger.debug(`[WalletDashboard] 🔍 Wallet Structure:`, JSON.stringify(selectedWallet, null, 2));
    }

    // Filter transactions to only show those matching the selected wallet's currency
    const filteredTransactions = allAccountTransactions.filter(tx => {
      const matches = tx.currency_id === selectedWallet.currency_id;
      if (!matches) {
        logger.debug(`[WalletDashboard] 🔍 Transaction ${tx.id} currency_id '${tx.currency_id}' does NOT match wallet currency_id '${selectedWallet.currency_id}'`);
      }
      return matches;
    });

    logger.debug(`[WalletDashboard] 🎯 CURRENCY FILTER: Showing ${filteredTransactions.length} of ${allAccountTransactions.length} transactions for ${selectedWallet.currency_code} wallet`);
    
    return filteredTransactions;
  }, [allAccountTransactions, selectedWallet]);

  // NEW: Wallet state machine logic
  useEffect(() => {
    const checkWalletAccess = async () => {
      if (!entityId || !user) {
        setWalletState('loading');
        return;
      }

      // Wait for eligibility check to complete
      if (isLoadingEligibility) {
        setWalletState('loading');
        return;
      }

      if (eligibilityError) {
        logger.error('[WalletDashboard] Eligibility check failed:', eligibilityError);
        setWalletState('no-access');
        return;
      }

      if (!eligibility) {
        setWalletState('loading');
        return;
      }

      // Check eligibility
      if (!eligibility.eligible) {
        logger.debug(`[WalletDashboard] User not eligible for wallet access. Reason: ${eligibility.reason}`);
        setWalletState('no-access');
        return;
      }

      // User is eligible - check if they have wallets
      if (!eligibility.hasWallets) {
        logger.debug('[WalletDashboard] User eligible but has no wallets, needs initialization');
        setWalletState('needs-init');

        // Auto-initialize wallet for eligible users
        try {
          logger.debug('[WalletDashboard] Auto-initializing wallet...');
          await initializeWalletMutation.mutateAsync(entityId);
          setWalletState('locked'); // Show biometric prompt after initialization
        } catch (error) {
          logger.error('[WalletDashboard] Wallet initialization failed:', error);
          setWalletState('no-access');
        }
        return;
      }

      // User has wallets - show biometric lock
      setWalletState('locked');
    };

    checkWalletAccess();
  }, [entityId, user, eligibility, isLoadingEligibility, eligibilityError, initializeWalletMutation]);

  const [isWalletUnlocked, setIsWalletUnlocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const authenticationRef = useRef(false); // Immediate race condition protection
  const authTimerRef = useRef<NodeJS.Timeout | null>(null); // Timer management
  const alertShownRef = useRef(false); // Alert queue protection
  const lastAuthAttemptRef = useRef(0); // Track last attempt time
  const authAttemptsRef = useRef(0); // Circuit breaker counter

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

  // Trigger authentication when wallet screen is focused (ONLY for locked wallets)
  useFocusEffect(
    useCallback(() => {
      // Clear any existing timer first
        if (authTimerRef.current) {
          clearTimeout(authTimerRef.current);
        authTimerRef.current = null;
        }

      // CRITICAL FIX: Only trigger authentication when walletState is 'locked'
      // This prevents authentication from running when user needs to complete KYC
      if (walletState === 'locked' && !isWalletUnlocked && !isAuthenticating && !authenticationRef.current && !alertShownRef.current) {
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
    }, [walletState, isWalletUnlocked, isAuthenticating, authenticateForWallet])
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
      
      if (state.isOfflineMode) {
        logger.info('[WalletDashboard] 📱 OFFLINE MODE: Using cached data only');
      } else {
        logger.info('[WalletDashboard] 🌐 ONLINE MODE: Will sync with server');
        
        // When coming back online, refresh data via TanStack Query
        if (isWalletUnlocked && user) {
          logger.debug('[WalletDashboard] 🔄 Back online - refreshing data');
          refreshBalances().catch((error: any) => {
              logger.warn('[WalletDashboard] Background refresh failed after coming online:', error);
            });
        }
      }
    });
    
    // Get initial network state (for logging purposes)
    const initialState = networkService.getNetworkState();
    logger.debug('[WalletDashboard] Initial network state:', JSON.stringify(initialState));
    
    return networkUnsubscribe;
  }, [isWalletUnlocked, user]);

  // Enhanced wallet initialization with offline mode support
  useEffect(() => {
    if (!isWalletUnlocked || !user) {
      // Clear selected wallet when wallet is locked
      setSelectedWallet(null);
      return;
    }

    // 🚀 WHATSAPP-STYLE: Auto-select primary wallet from TanStack Query data
    if (currencyBalances.length > 0) {
      const primaryWallet = currencyBalances.find((w: WalletBalance) => w.isPrimary) || currencyBalances[0];
      
      // CRITICAL FIX: Always update selectedWallet to match the current primary from TanStack Query
      // This ensures optimistic updates are immediately reflected in the UI
      if (!selectedWallet || selectedWallet.wallet_id !== primaryWallet.wallet_id) {
        setSelectedWallet(primaryWallet);
        logger.debug(`[WalletDashboard] 🎯 INSTANT: Auto-selected ${primaryWallet.currency_code} wallet (${primaryWallet.isPrimary ? 'PRIMARY' : 'FALLBACK'})`, "WalletDashboard");
      } else {
        // Even if wallet_id matches, update the wallet object to get latest isPrimary status
        if (selectedWallet.isPrimary !== primaryWallet.isPrimary) {
          setSelectedWallet(primaryWallet);
          logger.debug(`[WalletDashboard] 🔄 SYNC: Updated ${primaryWallet.currency_code} wallet primary status to ${primaryWallet.isPrimary}`, "WalletDashboard");
        }
      }
    } else {
      // Clear selected wallet if no balances available
      if (selectedWallet) {
        setSelectedWallet(null);
        logger.debug(`[WalletDashboard] 📭 No wallets available, cleared selection`, "WalletDashboard");
      }
    }

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
  }, [isWalletUnlocked, user?.id, user?.entityId, currencyBalances, selectedWallet]);

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
  const formatTransactionDateTime = useCallback((isoString: string | null | undefined): string => {
    // Validate input
    if (!isoString || typeof isoString !== 'string' || isoString.trim() === '') {
      logger.debug(`[WalletDashboard] Invalid or missing date string: ${isoString}`);
      return 'Recent';
    }
    
    const date = new Date(isoString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      logger.debug(`[WalletDashboard] Invalid date created from: ${isoString}`);
      return 'Recent';
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
    if (!currencyBalances || currencyBalances.length === 0) {
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
    const matchingWallet = currencyBalances.find(wallet => {
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
    for (const wallet of currencyBalances) {
      const lowerCurrencyCode = wallet.currency_code.toLowerCase();
      if (currencyMap[lowerCurrencyCode]) {
        return wallet.currency_symbol || currencyMap[lowerCurrencyCode];
      }
    }
    
    return '?'; // Unknown currency
  }, [currencyBalances]);

  // Professional transaction transformation using TanStack Query data
  const displayTransactions = useMemo(() => {
    if (!walletTransactions || walletTransactions.length === 0) {
      return [];
    }

    logger.debug(`[WalletDashboard] 🎯 PROFESSIONAL: Transforming ${walletTransactions.length} wallet transactions`);

    const transformedTransactions: WalletTransaction[] = walletTransactions.map((tx: any) => {
      const isReceived = tx.to_entity_id === user?.entityId;
          const amount = parseFloat(tx.amount?.toString() || '0');
          
      // Use transaction's own currency symbol (from backend)
      const currency_symbol = tx.currency_symbol || getCurrencySymbolFromWallets(tx.currency_id);

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

    return transformedTransactions;
  }, [walletTransactions, user?.entityId, getCurrencySymbolFromWallets, getEntityNameFromInteractions, formatTransactionDateTime]);


  // NO FALLBACK: Clean, professional backend filtering only
  const filteredTransactions = displayTransactions;

  const handleActualRefresh = async () => {
    setRefreshing(true);
    try {
      logger.debug('[WalletDashboard] 🔄 LOCAL-FIRST: Manual refresh requested');
      
      // LOCAL-FIRST: Background refresh without blocking UI
      // UI already shows cached data, this just updates it
      await Promise.all([
        refreshBalances().catch((error: any) => logger.warn('[WalletDashboard] Balance refresh failed (non-critical):', error)),
        Promise.resolve(refetchWalletTransactions()).catch((error: any) => logger.warn('[WalletDashboard] Transaction refresh failed (non-critical):', error))
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
    // Search functionality can be implemented here if needed
    logger.debug('[WalletDashboard] Search requested:', text);
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
    navigation.navigate('NewInteraction');
  }, [navigation]);

  const toggleBalanceVisibility = useCallback(() => {
    setIsBalanceVisible(!isBalanceVisible);
  }, [isBalanceVisible]);

  const setPrimaryWalletMutation = useSetPrimaryWallet();

  const handleWalletSelect = async (wallet: WalletBalance) => {
    try {
      logger.debug(`[WalletDashboard] 🔄 Setting wallet ${wallet.wallet_id} as primary: ${wallet.currency_code} - ${wallet.currency_symbol}${wallet.balance}`, "WalletDashboard");
      
        // Update local selected wallet state immediately for UI consistency
        setSelectedWallet(wallet);
      logger.info(`[WalletDashboard] ✅ Selected ${wallet.currency_code} wallet (TanStack Query migration)`, "WalletDashboard");
      
      // Use the TanStack Query mutation to set primary wallet
      if (authContext.user?.entityId) {
        await setPrimaryWalletMutation.mutateAsync({
          walletId: wallet.wallet_id,
          entityId: authContext.user.entityId,
        });
        logger.info(`[WalletDashboard] ✅ Set ${wallet.currency_code} wallet as primary in database`, "WalletDashboard");
      }
    } catch (error) {
      logger.error(`[WalletDashboard] ❌ Error setting primary wallet:`, error);
      throw error; // Re-throw so WalletStackCard can handle the error
    }
  };

  // NEW: State-based rendering for KYC-gated wallet access
  if (walletState === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (walletState === 'no-access' && eligibility) {
    return (
      <WalletOnboarding
        reason={eligibility.reason || 'KYC_REQUIRED'}
        kycStatus={eligibility.kycStatus}
        profileComplete={eligibility.profileComplete}
      />
    );
  }

  if (walletState === 'needs-init') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
        <View style={styles.loadingContainer}>
          <Ionicons name="wallet-outline" size={64} color={theme.colors.primary} />
          <Text style={styles.loadingText}>Creating your wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Early return if wallet is not unlocked (existing biometric logic)
  if (walletState === 'locked' && !isWalletUnlocked) {
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
            wallets={currencyBalances}
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
            <TouchableOpacity onPress={() => navigation.navigate('TransactionList' as any, { selectedWallet })}>
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionsList}>
            {/* PROFESSIONAL: Clean backend filtering with no fallback */}
            {filteredTransactions.length > 0 ? (
              <>
                {filteredTransactions.map((item: WalletTransaction) => renderTransactionItem(item))}
              </>
            ) : isLoadingWalletTransactions ? (
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