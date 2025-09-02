// Created: WalletStackCard for new wallet-centric architecture - displays wallets instead of accounts - 2025-01-03
// Updated: Fixed React Hooks violation - all hooks now called consistently - 2025-06-30
// Updated: Performance optimized with custom hooks and stable references - 2025-06-30
// Updated: Added smooth transitions for primary wallet switching and card reordering - 2025-06-28
// Updated: Added offline-aware functionality with NetworkService integration - 2025-01-10
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  TouchableOpacity, 
  ScrollView,
  Platform,
  Text
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { WalletBalance } from '../../../types/wallet.types';
import { WalletCard } from './index';
import { networkService } from '../../../services/NetworkService';
import logger from '../../../utils/logger';

interface WalletStackCardProps {
  wallets: WalletBalance[];
  selectedWalletId?: string;
  isBalanceVisible: boolean;
  onToggleVisibility: () => void;
  onWalletSelect: (wallet: WalletBalance) => void;
  isLoading?: boolean; // LOCAL-FIRST: Optional loading state for background sync
  isSyncing?: boolean; // LOCAL-FIRST: Background sync indicator
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Card dimensions and spacing
const CARD_HEIGHT = 140; // Reduced height to match WalletCard
const CARD_WIDTH = screenWidth - 32; // Wallet for margin

// Stacking constants - DOWNWARD fan from anchor point
const COLLAPSED_STACK_OFFSET = 6; // Smaller offset for tighter stacking
const EXPANDED_FAN_OFFSET = 50; // Spacing between cards when fanned out DOWNWARD
const STACK_SCALE_FACTOR = 0; // NO scale difference - only visual stacking at top
const MAX_EXPANSION_HEIGHT = screenHeight * 0.4; // Don't exceed 40% of screen

const WalletStackCard: React.FC<WalletStackCardProps> = React.memo(({
  wallets,
  selectedWalletId,
  isBalanceVisible,
  onToggleVisibility,
  onWalletSelect,
  isLoading = false,
  isSyncing = false,
}) => {
  const { theme } = useTheme();
  
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
  const scrollViewRef = useRef<ScrollView>(null);
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
    const animations: Animated.CompositeAnimation[] = [];
    
    sortedWallets.forEach((wallet, index) => {
      if (!cardAnimations.current.has(wallet.wallet_id)) {
        // Initialize new card animation
        cardAnimations.current.set(wallet.wallet_id, new Animated.Value(index));
      } else {
        // Animate existing card to new position with stagger
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
      Animated.parallel(animations).start();
    }

    // Clean up animations for removed cards
    const currentWalletIds = new Set(sortedWallets.map(wallet => wallet.wallet_id));
    for (const [walletId, animation] of cardAnimations.current.entries()) {
      if (!currentWalletIds.has(walletId)) {
        cardAnimations.current.delete(walletId);
      }
    }
  }, [sortedWallets]);

  // Define all callback functions AFTER all other hooks
  const toggleExpansion = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

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
  }, [isExpanded, heightAnimatedValue, transformAnimatedValue, scaleAnimation]);

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

  // Memoize height calculations
  const { collapsedHeight, expandedHeight } = useMemo(() => {
    const allWallets = sortedWallets;
    // Calculate minimum height for collapsed state (just primary card + small stacking offsets)
    const collapsed = CARD_HEIGHT + (allWallets.length - 1) * COLLAPSED_STACK_OFFSET;
    
    // Calculate expanded height (all cards spaced out)
    const expanded = Math.min(
      CARD_HEIGHT + (allWallets.length - 1) * EXPANDED_FAN_OFFSET,
      MAX_EXPANSION_HEIGHT
    );

    return { collapsedHeight: collapsed, expandedHeight: expanded };
  }, [sortedWallets]);

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
      right: 0,
      // Cards maintain full width - no width scaling
    },
    cardTouchable: {
      width: '100%', // Ensure full width for touch area
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
  }), []);

  // SAFETY CHECK - MOVED TO AFTER ALL HOOKS ARE CALLED
  const primaryWallet = sortedWallets[0];
  const allWallets = sortedWallets;

  // Now we can safely return null if needed (after all hooks have been called)
  if (!primaryWallet || !primaryWallet.wallet_id || allWallets.length === 0) {
    return null;
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
    console.warn('[WalletStackCard] No valid wallets found after safety filtering');
    return null;
  }

  return (
    <View style={styles.container}>
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
        {/* Render all cards with smooth position transitions */}
        {safeWallets
          .filter((wallet) => {
            // Filter out wallets that don't have animations ready
            const positionAnimation = cardAnimations.current.get(wallet.wallet_id);
            return positionAnimation !== undefined;
          })
          .map((wallet, targetIndex) => {
          // Use the actual isPrimary field from backend data
          const isPrimaryCard = wallet.isPrimary;
          
          // Get the animated position for this card (we know it exists because of filter)
          const positionAnimation = cardAnimations.current.get(wallet.wallet_id)!;
          
          // REVERSED DECK LOGIC: Last card is ANCHOR, primary card MOVES DOWN
          return (
            <Animated.View
              key={wallet.wallet_id}
              style={[
                styles.cardPosition,
                {
                  transform: [
                    {
                      // Smooth position interpolation based on animated index
                      translateY: Animated.add(
                        // Base position animation for reordering
                        positionAnimation.interpolate({
                          inputRange: [0, safeWallets.length - 1],
                          outputRange: [0, (safeWallets.length - 1) * COLLAPSED_STACK_OFFSET],
                          extrapolate: 'clamp',
                        }),
                        // Expansion animation
                        transformAnimatedValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [
                            0, // No additional offset when collapsed
                            // When expanded, fan out based on reversed order
                            (safeWallets.length - 1 - targetIndex) * EXPANDED_FAN_OFFSET - 
                            targetIndex * COLLAPSED_STACK_OFFSET
                          ],
                        })
                      ),
                    },
                    {
                      // Add scale animation for selection feedback
                      scale: scaleAnimation,
                    },
                  ],
                  // Z-index: primary card needs to be tappable at the bottom when expanded
                  zIndex: isExpanded
                    ? 2000 + (allWallets.length - 1 - targetIndex) // Higher z-index for cards at the bottom
                    : 3000 - targetIndex, // Primary card on top when collapsed
                  
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: isExpanded ? 4 : 2 + targetIndex * 2,
                  },
                  shadowOpacity: isExpanded ? 0.15 : 0.1 + targetIndex * 0.05,
                  shadowRadius: isExpanded ? 8 : 6 + targetIndex * 2,
                  elevation: isExpanded ? 8 : 4 + targetIndex * 2,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => handleCardPress(wallet)}
                style={styles.cardTouchable}
                disabled={isOfflineMode && isTransitioning} // Prevent rapid taps in offline mode
              >
                <WalletCard
                  wallet={wallet}
                  isPrimary={isPrimaryCard}
                  isSelected={selectedWalletId === wallet.wallet_id}
                  isStacked={!isExpanded}
                  stackIndex={targetIndex}
                  isBalanceVisible={isBalanceVisible}
                  onToggleVisibility={isPrimaryCard ? onToggleVisibility : () => {}}
                />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.View>
    </View>
  );
});

WalletStackCard.displayName = 'WalletStackCard';

export default WalletStackCard; 