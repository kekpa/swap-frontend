// Created: WalletStackCard for new wallet-centric architecture - displays wallets instead of accounts - 2025-01-03
// Updated: Fixed React Hooks violation - all hooks now called consistently - 2025-06-30
// Updated: Performance optimized with custom hooks and stable references - 2025-06-30
// Updated: Added smooth transitions for primary wallet switching and card reordering - 2025-06-28
// Updated: Added offline-aware functionality with NetworkService integration - 2025-01-10
// Updated: Added "New Currency" card for creating additional currency wallets - 2025-12-15
// Updated: Added swipe-to-delete for removing currency wallets (Revolut-style) - 2025-12-16
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
  Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { WalletBalance } from '../../../types/wallet.types';
import WalletCard from './WalletCard';
import WalletCardSkeleton from './WalletCardSkeleton';
import AddCurrencyCard from './AddCurrencyCard';
import PendingWalletCard from './PendingWalletCard';
import NewCurrencySheet, { AvailableCurrency } from './NewCurrencySheet';
import { networkService } from '../../../services/NetworkService';
import { useCreateCurrencyWallet, useDeactivateWallet } from '../../../hooks-data/useBalances';
import { useAuthContext } from '../../auth/context/AuthContext';
import logger from '../../../utils/logger';

interface WalletStackCardProps {
  wallets: WalletBalance[];
  selectedWalletId?: string;
  isBalanceVisible: boolean;
  onToggleVisibility: () => void;
  onWalletSelect: (wallet: WalletBalance) => void;
  isLoading?: boolean; // LOCAL-FIRST: Optional loading state for background sync
  isSyncing?: boolean; // LOCAL-FIRST: Background sync indicator
  onExpandChange?: (isExpanded: boolean) => void; // Notify parent when stack expands/collapses
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Card dimensions and spacing
const CARD_HEIGHT = 140; // Reduced height to match WalletCard
const CARD_WIDTH = screenWidth - 32; // Wallet for margin

// CARDS-BEHIND Animation Constants
// Cards peek at the TOP (behind primary), not below
const COLLAPSED_PEEK_OFFSET = 8; // How much each card peeks above when collapsed
const PRIMARY_SLIDE_DOWN = 150; // How far primary slides DOWN when expanded (uses freed space from hidden transactions)
const MAX_CARD_REVEAL_SPACING = 90; // Maximum spacing between cards (when few cards)
const MIN_CARD_REVEAL_SPACING = 50; // Minimum spacing (when many cards) - increased for better clickability
const AVAILABLE_SPACE_ABOVE = screenHeight * 0.15; // Reduced - cards stay below header, don't go too far up

// Calculate adaptive spacing based on number of cards
// More cards = tighter spacing, fewer cards = more spread
const calculateAdaptiveSpacing = (totalCards: number): number => {
  const cardsBehind = Math.max(1, totalCards - 1); // Cards behind the primary
  // Calculate spacing to fit all cards in available space
  const calculatedSpacing = Math.floor(AVAILABLE_SPACE_ABOVE / cardsBehind);
  // Clamp between min and max
  return Math.max(MIN_CARD_REVEAL_SPACING, Math.min(MAX_CARD_REVEAL_SPACING, calculatedSpacing));
};

const WalletStackCard: React.FC<WalletStackCardProps> = React.memo(({
  wallets,
  selectedWalletId,
  isBalanceVisible,
  onToggleVisibility,
  onWalletSelect,
  isLoading = false,
  isSyncing = false,
  onExpandChange,
}) => {
  const { theme } = useTheme();
  const authContext = useAuthContext();
  const createWalletMutation = useCreateCurrencyWallet();
  const deactivateWalletMutation = useDeactivateWallet();

  // Ref for Swipeable to close it programmatically
  const swipeableRef = useRef<Swipeable | null>(null);

  // State for "New Currency" feature
  const [showCurrencySheet, setShowCurrencySheet] = useState(false);
  // Pending wallet placeholder - shows in front while user selects currency
  const [pendingWallet, setPendingWallet] = useState<{
    currency?: AvailableCurrency;
    isLoading: boolean;
  } | null>(null);

  // Debug logging for local-first verification
  useEffect(() => {
    if (wallets && wallets.length > 0) {
      const primaryWallet = wallets.find(w => w?.isPrimary);
      const otherWallets = wallets.filter(w => w && !w.isPrimary);
      
      logger.debug('[WalletStackCard] 🔍 DEBUG WALLETS:', wallets.map(w => w ? `${w.currency_code}(${w.currency_symbol}${w.balance}) isPrimary: ${w.isPrimary}` : 'undefined').join(', '));
      logger.debug('[WalletStackCard] 🔍 DEBUG PRIMARY WALLET:', primaryWallet ? `${primaryWallet.currency_code}(${primaryWallet.currency_symbol}${primaryWallet.balance})` : 'NONE FOUND');
      logger.debug('[WalletStackCard] 🔍 DEBUG OTHER WALLETS:', otherWallets.map(w => w ? `${w.currency_code}(${w.currency_symbol}${w.balance})` : 'undefined').join(', '));
      logger.debug('[WalletStackCard] 🔍 DEBUG SORTED ORDER:', [primaryWallet, ...otherWallets].filter(Boolean).map(w => w ? `${w.currency_code}(${w.currency_symbol}${w.balance})` : 'undefined').join(', '));
    }
  }, [wallets]);
  
  // All hooks must be called at the top level consistently
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingWalletId, setLoadingWalletId] = useState<string | null>(null);
  // REMOVED: Optimistic state is now handled by TanStack Query mutation
  // const [optimisticPrimaryId, setOptimisticPrimaryId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // Animated values - initialize once
  const heightAnimatedValue = useRef(new Animated.Value(0)).current;
  const transformAnimatedValue = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const cardAnimations = useRef<Map<string, Animated.Value>>(new Map());

  // Monitor network state for offline mode
  useEffect(() => {
    // Get initial network state
    const initialState = networkService.getNetworkState();
    setIsOfflineMode(initialState.isOfflineMode);

    // Listen for network state changes
    const unsubscribe = networkService.onNetworkStateChange((state) => {
      logger.debug('[WalletStackCard] 🌐 Network state changed:', JSON.stringify(state));
      setIsOfflineMode(state.isOfflineMode);
      
      if (state.isOfflineMode) {
        logger.info('[WalletStackCard] 📱 OFFLINE MODE: Primary wallet switching will be local-only');
      } else {
        logger.info('[WalletStackCard] 🌐 ONLINE MODE: Primary wallet switching will sync with server');
      }
    });

    return unsubscribe;
  }, []);

  // REMOVED: Optimistic wallets list is no longer needed
  // const optimisticWallets = useMemo(() => { ... });

  // Sort wallets to ensure PRIMARY wallet is first when collapsed, bottom when expanded
  const sortedWallets = useMemo(() => {
    // Use the wallets prop directly - it's now optimistically updated by TanStack Query
    const walletsToSort = wallets;
    
    // DEBUG: Log wallet primary status
    console.log('[WalletStackCard] 🔍 DEBUG WALLETS:', walletsToSort.map(w => 
      `${w.currency_code}(${w.currency_symbol}${w.balance}) isPrimary: ${w.isPrimary}`
    ).join(', '));
    
    // Find the wallet marked as primary
    const primary = walletsToSort.find(wallet => wallet.isPrimary);
    const others = walletsToSort.filter(wallet => !wallet.isPrimary);
    
    console.log('[WalletStackCard] 🔍 DEBUG PRIMARY WALLET:', primary ? `${primary.currency_code}(${primary.currency_symbol}${primary.balance})` : 'NONE FOUND');
    console.log('[WalletStackCard] 🔍 DEBUG OTHER WALLETS:', others.map(w => `${w.currency_code}(${w.currency_symbol}${w.balance})`).join(', '));
    
    // Primary wallet should be first (top when collapsed, bottom when expanded)
    const sorted = primary ? [primary, ...others] : walletsToSort;
    console.log('[WalletStackCard] 🔍 DEBUG SORTED ORDER:', sorted.map(w => `${w.currency_code}(${w.currency_symbol}${w.balance})`).join(', '));
    
    return sorted;
  }, [wallets]);

  // REMOVED: Optimistic state clearing is no longer needed
  // useEffect(() => { ... });

  // Initialize animated values for new cards and animate position changes
  useEffect(() => {
    console.log('[WalletStackCard] 🔄 useEffect ANIMATION START', {
      sortedWalletsCount: sortedWallets.length,
      sortedWalletIds: sortedWallets.map(w => w.wallet_id),
      existingAnimationsCount: cardAnimations.current.size,
      existingAnimationKeys: Array.from(cardAnimations.current.keys()),
    });

    const animations: Animated.CompositeAnimation[] = [];

    sortedWallets.forEach((wallet, index) => {
      if (!cardAnimations.current.has(wallet.wallet_id)) {
        console.log('[WalletStackCard] ➕ CREATING animation for:', wallet.wallet_id, 'at index', index);
        cardAnimations.current.set(wallet.wallet_id, new Animated.Value(index));
      } else {
        console.log('[WalletStackCard] 🔄 ANIMATING existing card:', wallet.wallet_id, 'to index', index);
        const currentAnimation = cardAnimations.current.get(wallet.wallet_id)!;
        const staggerDelay = index * 50; // 50ms stagger between cards

        animations.push(
          Animated.timing(currentAnimation, {
            toValue: index,
            duration: 400, // Smooth reordering animation
            delay: staggerDelay,
            useNativeDriver: true,
          })
        );
      }
    });

    // Start all animations
    if (animations.length > 0) {
      console.log('[WalletStackCard] ▶️ STARTING', animations.length, 'animations');
      Animated.parallel(animations).start();
    }

    // Clean up animations for removed cards
    const currentWalletIds = new Set(sortedWallets.map(wallet => wallet.wallet_id));
    for (const [walletId] of cardAnimations.current.entries()) {
      if (!currentWalletIds.has(walletId)) {
        console.log('[WalletStackCard] 🗑️ REMOVING animation for deleted wallet:', walletId);
        cardAnimations.current.delete(walletId);
      }
    }

    console.log('[WalletStackCard] 🔄 useEffect ANIMATION END', {
      finalAnimationsCount: cardAnimations.current.size,
      finalAnimationKeys: Array.from(cardAnimations.current.keys()),
    });
  }, [sortedWallets]);

  // Define all callback functions AFTER all other hooks
  const toggleExpansion = useCallback(() => {
    const newExpanded = !isExpanded;
    console.log('[WalletStackCard] 🔄 TOGGLE EXPANSION', {
      currentState: isExpanded,
      newState: newExpanded,
      cardAnimationsSize: cardAnimations.current.size,
      cardAnimationsKeys: Array.from(cardAnimations.current.keys()),
    });
    setIsExpanded(newExpanded);

    // Notify parent of expansion state change (for disabling parent scroll)
    onExpandChange?.(newExpanded);

    // Reset scale animation when collapsing
    if (!newExpanded) {
      scaleAnimation.setValue(1);
    }

    // Run both animations in parallel with improved spring animation
    Animated.parallel([
      // Height animation (JS driver) - smooth timing
      Animated.timing(heightAnimatedValue, {
        toValue: newExpanded ? 1 : 0,
        duration: 350, // Slightly longer for smoother feel
        useNativeDriver: false, // Required for height
      }),
      // Transform animation (Native driver) - spring for natural feel
      Animated.spring(transformAnimatedValue, {
        toValue: newExpanded ? 1 : 0,
        tension: 100, // Moderate spring tension
        friction: 8,  // Good damping
        useNativeDriver: true, // Can use native driver for transforms
      }),
    ]).start();
  }, [isExpanded, heightAnimatedValue, transformAnimatedValue, scaleAnimation, onExpandChange]);

  const handleCardPress = useCallback(async (wallet: WalletBalance) => {
    if (isExpanded) {
      // Prevent multiple selections during transition
      if (isTransitioning || loadingWalletId) return;
      
      // If expanded, set loading state and call the mutation
      setIsTransitioning(true);
      setLoadingWalletId(wallet.wallet_id);
      
      // REMOVED: Optimistic update is now handled by the mutation
      // setOptimisticPrimaryId(wallet.wallet_id);
      
      // 2. Add scale animation for visual feedback
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 0.95, // Slight scale down
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1, // Back to normal
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      // 3. Start collapse animation immediately (with optimistic data)
      setTimeout(() => {
        toggleExpansion();
      }, 150);
      
      // 4. Handle API call with offline awareness
      try {
        if (isOfflineMode) {
          // OFFLINE MODE: Only do local optimistic update
          logger.info(`[WalletStackCard] 📱 OFFLINE MODE: Primary wallet set to ${wallet.currency_code} (local only)`);
          // Keep optimistic state - will sync when online
          // TODO: Queue for background sync when network returns
        } else {
          // ONLINE MODE: Call backend API
          logger.info(`[WalletStackCard] 🌐 ONLINE MODE: Syncing primary wallet ${wallet.currency_code} with server`);
        await onWalletSelect(wallet);
        // Backend succeeded - keep optimistic state until backend data arrives
        // The useEffect will clear it when backend confirms
        }
      } catch (error: any) {
        // Handle different types of errors gracefully
        if (error?.response?.status === 404) {
          logger.info(`[WalletStackCard] Wallet API not implemented yet, using local-only update for ${wallet.currency_code}`);
          // For 404, keep the optimistic state since it's just a missing endpoint
        } else if (isOfflineMode) {
          // In offline mode, errors are expected - keep optimistic state
          logger.info(`[WalletStackCard] 📱 OFFLINE MODE: API call failed as expected, keeping local update for ${wallet.currency_code}`);
        } else {
          // For other errors in online mode, revert optimistic state
          logger.warn('[WalletStackCard] Failed to update primary wallet:', error);
        // REMOVED: Rollback is handled by the mutation's onError
        // setOptimisticPrimaryId(null);
        }
      } finally {
        setIsTransitioning(false);
        setLoadingWalletId(null);
      }
    } else {
      // If collapsed, just expand the fan
      toggleExpansion();
    }
  }, [isExpanded, isTransitioning, loadingWalletId, isOfflineMode, scaleAnimation, toggleExpansion, onWalletSelect]);

  // Handler for "Add Currency" card press
  // UX: Two-click pattern (same as wallet cards)
  // CLICK 1 (collapsed): Just expand the stack
  // CLICK 2 (expanded): Show placeholder in front, collapse, then open modal
  const handleAddCurrencyPress = useCallback(() => {
    if (!isExpanded) {
      // CLICK 1: If collapsed, just expand the stack (same as wallet cards)
      toggleExpansion();
      return; // Don't open sheet - wait for second tap
    }

    // CLICK 2: Create placeholder, THEN collapse, THEN open modal
    // (Professional pattern: placeholder shows where new wallet will appear)

    // 1. Create pending wallet placeholder (appears in front)
    setPendingWallet({ currency: undefined, isLoading: false });

    // 2. Scale animation for visual feedback (same as wallet cards)
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // 3. After animation, collapse
    setTimeout(() => {
      toggleExpansion();

      // 4. After collapse, open modal (placeholder stays visible)
      setTimeout(() => {
        setShowCurrencySheet(true);
      }, 350);
    }, 150);
  }, [isExpanded, toggleExpansion, scaleAnimation]);

  // Handler for currency selection - creates new wallet
  const handleCurrencySelect = useCallback(async (currency: AvailableCurrency) => {
    if (!authContext?.user?.entityId) {
      logger.error('[WalletStackCard] Cannot create wallet: no entityId');
      return;
    }

    // Get account_id from the first wallet (all wallets share the same account)
    const accountId = wallets[0]?.account_id;
    if (!accountId) {
      logger.error('[WalletStackCard] Cannot create wallet: no accountId');
      return;
    }

    // Update placeholder to show selected currency with loading state
    setPendingWallet({ currency, isLoading: true });
    setShowCurrencySheet(false); // Close modal - placeholder shows loading state

    logger.info(`[WalletStackCard] 🆕 Creating ${currency.code} wallet...`);

    try {
      await createWalletMutation.mutateAsync({
        accountId,
        currencyId: currency.id,
        entityId: authContext.user.entityId,
      });

      logger.info(`[WalletStackCard] ✅ ${currency.code} wallet created successfully`);
      // Clear placeholder - real wallet now in list via TanStack Query cache update
      setPendingWallet(null);
    } catch (error) {
      logger.error(`[WalletStackCard] ❌ Failed to create ${currency.code} wallet:`, error);
      // Clear placeholder on error
      setPendingWallet(null);
      // Re-open sheet so user can try again
      setShowCurrencySheet(true);
    }
  }, [authContext?.user?.entityId, wallets, createWalletMutation]);

  /**
   * Handler for deleting (deactivating) a wallet
   * Shows confirmation alert, then calls the mutation
   */
  const handleDeleteWallet = useCallback(async (wallet: WalletBalance) => {
    if (!authContext?.user?.entityId) {
      logger.error('[WalletStackCard] Cannot delete wallet: no entityId');
      return;
    }

    // Close the swipeable
    swipeableRef.current?.close();

    // Show confirmation alert
    Alert.alert(
      'Remove Currency',
      `Remove ${wallet.currency_code} wallet?\n\nYou can add it back later and your transaction history will be preserved.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            logger.info(`[WalletStackCard] 🗑️ Removing ${wallet.currency_code} wallet...`);

            try {
              await deactivateWalletMutation.mutateAsync({
                walletId: wallet.wallet_id,
                entityId: authContext.user!.entityId,
              });
              logger.info(`[WalletStackCard] ✅ ${wallet.currency_code} wallet removed successfully`);
            } catch (error: any) {
              logger.error(`[WalletStackCard] ❌ Failed to remove ${wallet.currency_code} wallet:`, error);

              // Show user-friendly error message
              const errorMessage = error?.response?.data?.message || error?.message || 'Please try again.';
              Alert.alert('Error', `Failed to remove wallet. ${errorMessage}`);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [authContext?.user?.entityId, deactivateWalletMutation]);

  /**
   * Renders the delete action button for swipe gesture
   * Only shown when swiping left on the primary card
   */
  const renderDeleteAction = useCallback((wallet: WalletBalance) => {
    return (
      <TouchableOpacity
        style={deleteActionStyles.container}
        onPress={() => handleDeleteWallet(wallet)}
        activeOpacity={0.8}
      >
        <View style={deleteActionStyles.button}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    );
  }, [handleDeleteWallet]);

  // Memoize height calculations for CARDS-BEHIND animation
  // Collapsed: Primary card + peek offset for cards behind (they peek at the TOP)
  // Expanded: Primary slides down, cards behind spread with adaptive spacing
  const { collapsedHeight, expandedHeight } = useMemo(() => {
    // Include pending card in totalCards if it exists
    const hasPending = pendingWallet !== null;
    const totalCards = sortedWallets.length + 1 + (hasPending ? 1 : 0); // wallets + AddCurrency + pending

    // Collapsed: Primary card height + small peek offset at top for cards behind
    // Cards peek ABOVE the primary, so we need extra space at the top
    const peekSpace = (totalCards - 1) * COLLAPSED_PEEK_OFFSET;
    const collapsed = CARD_HEIGHT + peekSpace;

    // Expanded: Cards spread with adaptive spacing
    // Calculate using same adaptive spacing as the cards
    const adaptiveSpacing = calculateAdaptiveSpacing(totalCards);
    const cardsBehind = totalCards - 1;
    // Height needed: card height + space for all cards behind spreading
    const expanded = CARD_HEIGHT + PRIMARY_SLIDE_DOWN + (cardsBehind * adaptiveSpacing);

    return { collapsedHeight: collapsed, expandedHeight: expanded };
  }, [sortedWallets, pendingWallet]);

  // Memoize styles
  const styles = useMemo(() => StyleSheet.create({
    container: {
      marginHorizontal: 16,
      marginTop: 16, // REDUCED from 32 to 16 for better spacing
      marginBottom: 8, // REDUCED margin bottom to minimize gap
    },
    stackContainer: {
      position: 'relative',
      width: '100%',
      // Minimum height will be animated
    },
    cardPosition: {
      position: 'absolute',
      top: 0, // All cards start from same reference point
      left: 0,
      width: CARD_WIDTH, // Explicit width - Apple Wallet pattern for consistent sizing
    },
    cardTouchable: {
      width: CARD_WIDTH, // Explicit width to ensure Swipeable and TouchableOpacity behave identically
    },
    emptyCard: {
      padding: 20,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: 16,
      textAlign: 'center',
    },
    syncText: {
      fontSize: 14,
      marginTop: 5,
    },
    offlineIndicator: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(255, 107, 53, 0.9)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      zIndex: 1000,
    },
    offlineText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '600',
    },
    expandedOverlay: {
      position: 'absolute',
      top: -200, // Extend above the stack
      left: -100,
      right: -100,
      bottom: -500, // Extend below to cover rest of screen
      zIndex: -1, // BEHIND cards so they can receive touches
      backgroundColor: 'transparent',
    },
  }), []);

  // Styles for delete action (separate from main styles for clarity)
  const deleteActionStyles = useMemo(() => StyleSheet.create({
    container: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      height: CARD_HEIGHT, // Match card height
      marginRight: 8,
    },
    button: {
      backgroundColor: theme.colors.error || '#EF4444', // Red for destructive action
      width: 56,
      height: 56,
      borderRadius: 28, // Circular button
      justifyContent: 'center',
      alignItems: 'center',
      // Shadow for depth
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
  }), [theme.colors.error]);

  // Collapse handler for tap-outside-to-close - MUST be before early returns to follow React Hooks rules
  const handleCollapseStack = useCallback(() => {
    if (isExpanded) {
      toggleExpansion();
    }
  }, [isExpanded, toggleExpansion]);

  // SAFETY CHECK - MOVED TO AFTER ALL HOOKS ARE CALLED
  const primaryWallet = sortedWallets[0];
  const allWallets = sortedWallets;

  // Show professional skeleton loader if no wallets available yet (after all hooks have been called)
  if (!primaryWallet || !primaryWallet.wallet_id || allWallets.length === 0) {
    return <WalletCardSkeleton />;
  }

  // Additional safety check for wallet data integrity
  const safeWallets = allWallets.filter(wallet =>
    wallet &&
    wallet.wallet_id &&
    typeof wallet.wallet_id === 'string' &&
    wallet.currency_code &&
    typeof wallet.currency_code === 'string'
  );

  if (safeWallets.length === 0) {
    logger.warn('[WalletStackCard] No valid wallets found after safety filtering');
    return <WalletCardSkeleton />;
  }

  /**
   * Determines if a wallet can be deleted (Revolut-style rules)
   * - Must have balance = 0 and reserved_balance = 0
   * - Cannot be the only wallet
   */
  const canDeleteWallet = (wallet: WalletBalance): boolean => {
    // Must have zero balance
    if (wallet.balance > 0 || wallet.reserved_balance > 0) {
      return false;
    }
    // Cannot delete if it's the only wallet
    if (safeWallets.length <= 1) {
      return false;
    }
    return true;
  };

  return (
    <View style={styles.container}>
      {/* Overlay to capture taps outside the stack when expanded */}
      {isExpanded && (
        <TouchableWithoutFeedback onPress={handleCollapseStack}>
          <View style={styles.expandedOverlay} />
        </TouchableWithoutFeedback>
      )}

      {/* Show offline indicator when in offline mode */}
      {isOfflineMode && (
        <View style={styles.offlineIndicator}>
          <Text style={styles.offlineText}>📱 Offline</Text>
        </View>
      )}

      <Animated.View style={[
        styles.stackContainer,
        {
          height: heightAnimatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [collapsedHeight, expandedHeight],
          })
        }
      ]}>
        {/* Render all wallet cards with smooth position transitions */}
        {(() => {
          console.log('[WalletStackCard] 🎬 RENDER WALLET CARDS', {
            safeWalletsCount: safeWallets.length,
            isExpanded,
            cardAnimationsSize: cardAnimations.current.size,
            cardAnimationsKeys: Array.from(cardAnimations.current.keys()),
          });
          return null;
        })()}
        {safeWallets.map((wallet, targetIndex) => {
            // FIX: Initialize animation synchronously if not exists (fixes timing issue)
            if (!cardAnimations.current.has(wallet.wallet_id)) {
              console.log('[WalletStackCard] ⚡ SYNC INIT animation for:', wallet.wallet_id, 'at index', targetIndex);
              cardAnimations.current.set(wallet.wallet_id, new Animated.Value(targetIndex));
            }

            const isPrimaryCard = targetIndex === 0; // Primary is always first (index 0)
            const positionAnimation = cardAnimations.current.get(wallet.wallet_id)!;

            console.log('[WalletStackCard] 🎴 RENDERING CARD:', wallet.wallet_id, 'at index', targetIndex, 'isPrimary:', isPrimaryCard);

            // CARDS-BEHIND Animation:
            // - Primary (index 0): Stays at base, slides DOWN when expanded
            // - Cards behind (index > 0): Peek above primary, slide UP when expanded
            // IMPORTANT: When pendingWallet exists, it takes position 0, so all wallet cards shift back by 1
            const hasPending = pendingWallet !== null;
            const totalCards = safeWallets.length + 1 + (hasPending ? 1 : 0); // +1 for AddCurrency, +1 if pending
            const peekSpace = (totalCards - 1) * COLLAPSED_PEEK_OFFSET; // Space for cards behind primary
            // When pending exists, wallets shift back: index 0 becomes index 1, etc.
            const effectiveIndex = hasPending ? targetIndex + 1 : targetIndex;
            // Calculate adaptive spacing based on total cards
            const adaptiveSpacing = calculateAdaptiveSpacing(totalCards);

            return (
              <Animated.View
                key={wallet.wallet_id}
                style={[
                  styles.cardPosition,
                  {
                    transform: [
                      {
                        // When pending exists, ALL wallet cards shift back (pending takes front position)
                        // effectiveIndex: 0 = front (pending), 1 = primary wallet, 2+ = other wallets
                        translateY: effectiveIndex === 0
                          ? // FRONT CARD (no pending): At peekSpace, slides down when expanded
                            transformAnimatedValue.interpolate({
                              inputRange: [0, 1],
                              outputRange: [peekSpace, peekSpace + PRIMARY_SLIDE_DOWN],
                            })
                          : // CARDS BEHIND: Peek above front card, spread relative to primary when expanded
                            transformAnimatedValue.interpolate({
                              inputRange: [0, 1],
                              outputRange: [
                                // Collapsed: Peek above (smaller effectiveIndex = closer to front)
                                peekSpace - effectiveIndex * COLLAPSED_PEEK_OFFSET,
                                // Expanded: Spread UP from primary's expanded position, but stay on screen
                                // Primary moves to peekSpace + PRIMARY_SLIDE_DOWN, cards spread UP from there
                                Math.max(10, peekSpace + PRIMARY_SLIDE_DOWN - effectiveIndex * adaptiveSpacing),
                              ],
                            }),
                      },
                      { scale: scaleAnimation },
                    ],
                    // Z-INDEX: Front card highest, others descending
                    // (pendingWallet uses z-index 3100 to appear above all)
                    zIndex: 3000 - effectiveIndex * 100,

                    // Consistent shadows when collapsed, depth variance when expanded
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: isExpanded ? (isPrimaryCard ? 8 : 4) : 4 },
                    shadowOpacity: isExpanded ? (isPrimaryCard ? 0.2 : 0.15) : 0.15,
                    shadowRadius: isExpanded ? (isPrimaryCard ? 12 : 6) : 6,
                    elevation: isExpanded ? (isPrimaryCard ? 12 : 6) : 6,
                  },
                ]}
              >
                {/* Swipe-to-delete: Only wrap PRIMARY card when:
                  1. Stack is collapsed (!isExpanded)
                  2. No pending wallet (!hasPending)
                  3. Wallet can be deleted (balance = 0 and not only wallet) */}
                {isPrimaryCard && !isExpanded && !hasPending && canDeleteWallet(wallet) ? (
                  <Swipeable
                    ref={swipeableRef}
                    renderRightActions={() => renderDeleteAction(wallet)}
                    friction={1.5}
                    rightThreshold={40}
                    overshootRight={false}
                    containerStyle={styles.cardTouchable}
                    childrenContainerStyle={styles.cardTouchable}
                  >
                    <TouchableOpacity
                      activeOpacity={0.95}
                      onPress={() => handleCardPress(wallet)}
                      disabled={isOfflineMode && isTransitioning}
                    >
                      <WalletCard
                        wallet={wallet}
                        isPrimary={wallet.isPrimary}
                        isSelected={selectedWalletId === wallet.wallet_id}
                        isStacked={!isExpanded}
                        stackIndex={targetIndex}
                        isBalanceVisible={isBalanceVisible}
                        onToggleVisibility={wallet.isPrimary ? onToggleVisibility : () => {}}
                      />
                    </TouchableOpacity>
                  </Swipeable>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.95}
                    onPress={() => handleCardPress(wallet)}
                    style={styles.cardTouchable}
                    disabled={isOfflineMode && isTransitioning}
                    pointerEvents={isExpanded && isPrimaryCard ? 'none' : 'auto'}
                  >
                    <WalletCard
                      wallet={wallet}
                      isPrimary={wallet.isPrimary}
                      isSelected={selectedWalletId === wallet.wallet_id}
                      isStacked={!isExpanded}
                      stackIndex={targetIndex}
                      isBalanceVisible={isBalanceVisible}
                      onToggleVisibility={wallet.isPrimary ? onToggleVisibility : () => {}}
                    />
                  </TouchableOpacity>
                )}
              </Animated.View>
            );
          })}

        {/* Pending Wallet Card - Shows in FRONT while adding new currency */}
        {pendingWallet && (() => {
          // Pending card takes position 0 (front), so include it in totalCards
          const totalCards = safeWallets.length + 1 + 1; // wallets + AddCurrency + pending
          const peekSpace = (totalCards - 1) * COLLAPSED_PEEK_OFFSET;

          return (
            <Animated.View
              style={[
                styles.cardPosition,
                {
                  transform: [
                    {
                      // Pending is at front (index 0) = peekSpace position
                      translateY: transformAnimatedValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [peekSpace, peekSpace + PRIMARY_SLIDE_DOWN],
                      }),
                    },
                    { scale: scaleAnimation },
                  ],
                  // Z-INDEX: Always in FRONT (above all wallet cards)
                  zIndex: 3100,
                  // Shadow for depth (gray to match AddCurrencyCard)
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 6,
                },
              ]}
            >
              <PendingWalletCard
                currency={pendingWallet.currency}
                isLoading={pendingWallet.isLoading}
              />
            </Animated.View>
          );
        })()}

        {/* Add Currency Card - BEHIND all wallet cards (at the top) */}
        {(() => {
          // Use SAME calculation as wallet cards for consistency
          const hasPending = pendingWallet !== null;
          const totalCards = safeWallets.length + 1 + (hasPending ? 1 : 0); // wallets + AddCurrency + pending if exists
          const peekSpace = (totalCards - 1) * COLLAPSED_PEEK_OFFSET; // Space for cards behind front
          // AddCurrency is always last: after pending (if exists) + all wallets
          const addCurrencyIndex = safeWallets.length + (hasPending ? 1 : 0);
          // Use same adaptive spacing as wallet cards
          const adaptiveSpacing = calculateAdaptiveSpacing(totalCards);

          return (
            <Animated.View
              style={[
                styles.cardPosition,
                {
                  transform: [
                    {
                      // CARDS-BEHIND: Peek above primary, spread relative to primary when expanded
                      translateY: transformAnimatedValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          // Collapsed: Peek at the very top (behind all wallet cards)
                          peekSpace - addCurrencyIndex * COLLAPSED_PEEK_OFFSET,
                          // Expanded: Spread UP from primary's position, clamped to stay visible
                          Math.max(10, peekSpace + PRIMARY_SLIDE_DOWN - addCurrencyIndex * adaptiveSpacing),
                        ],
                      }),
                    },
                    { scale: scaleAnimation },
                  ],
                  // Z-INDEX: Always behind wallet cards (pendingWallet appears in front now)
                  zIndex: 3000 - addCurrencyIndex * 100,
                  // Subtle shadow (gray to match AddCurrencyCard styling)
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
            >
              <AddCurrencyCard
                onPress={handleAddCurrencyPress}
                disabled={createWalletMutation.isPending}
              />
            </Animated.View>
          );
        })()}
      </Animated.View>

      {/* Currency Selection Bottom Sheet */}
      <NewCurrencySheet
        visible={showCurrencySheet}
        existingCurrencyCodes={safeWallets.map(w => w.currency_code)}
        onSelectCurrency={handleCurrencySelect}
        onClose={() => {
          setShowCurrencySheet(false);
          // Clear placeholder if user cancels without selecting
          // (only if not already loading - don't clear while creating wallet)
          if (!pendingWallet?.isLoading) {
            setPendingWallet(null);
          }
        }}
        isLoading={createWalletMutation.isPending}
      />
    </View>
  );
});

WalletStackCard.displayName = 'WalletStackCard';

export default WalletStackCard; 