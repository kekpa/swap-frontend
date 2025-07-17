// Updated: Fixed early return causing hooks violation - moved safety check after all hooks - 2025-06-30
// Updated: Fixed React Hooks violation - all hooks now called consistently - 2025-06-30
// Updated: Performance optimized with custom hooks and stable references - 2025-06-30
// Updated: Added smooth transitions for primary account switching and card reordering - 2025-06-28
// Updated: Added optimistic UI updates for smooth primary account switching - 2025-06-28
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  TouchableOpacity, 
  ScrollView,
  Platform 
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { AccountBalance } from '../../../types/wallet.types';
import AccountCard from './AccountCard';

interface AccountStackCardProps {
  accounts: AccountBalance[];
  selectedAccountId?: string;
  isBalanceVisible: boolean;
  onToggleVisibility: () => void;
  onAccountSelect: (account: AccountBalance) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Card dimensions and spacing
const CARD_HEIGHT = 140; // Reduced height to match AccountCard
const CARD_WIDTH = screenWidth - 32; // Account for margin

// Stacking constants - DOWNWARD fan from anchor point
const COLLAPSED_STACK_OFFSET = 6; // Smaller offset for tighter stacking
const EXPANDED_FAN_OFFSET = 50; // Spacing between cards when fanned out DOWNWARD
const STACK_SCALE_FACTOR = 0; // NO scale difference - only visual stacking at top
const MAX_EXPANSION_HEIGHT = screenHeight * 0.4; // Don't exceed 40% of screen

const AccountStackCard: React.FC<AccountStackCardProps> = ({
  accounts,
  selectedAccountId,
  isBalanceVisible,
  onToggleVisibility,
  onAccountSelect,
}) => {
  const theme = useTheme();
  
  // ALL hooks must be called at the top level consistently
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingAccountId, setLoadingAccountId] = useState<string | null>(null);
  const [optimisticPrimaryId, setOptimisticPrimaryId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Animated values - initialize once
  const heightAnimatedValue = useRef(new Animated.Value(0)).current;
  const transformAnimatedValue = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const cardAnimations = useRef<Map<string, Animated.Value>>(new Map());

  // Create optimistic accounts list for smooth UI updates
  const optimisticAccounts = useMemo(() => {
    if (!optimisticPrimaryId) return accounts;
    
    // Create optimistic version where the selected account is primary
    return accounts.map(account => ({
      ...account,
      isPrimary: account.id === optimisticPrimaryId
    }));
  }, [accounts, optimisticPrimaryId]);

  // Sort accounts to ensure PRIMARY account (from backend or optimistic) is first when collapsed, bottom when expanded
  const sortedAccounts = useMemo(() => {
    // Use optimistic accounts for sorting
    const accountsToSort = optimisticAccounts;
    
    // Find the account marked as primary
    const primary = accountsToSort.find(acc => acc.isPrimary);
    const others = accountsToSort.filter(acc => !acc.isPrimary);
    
    // Primary account should be first (top when collapsed, bottom when expanded)
    return primary ? [primary, ...others] : accountsToSort;
  }, [optimisticAccounts]);

  // Clear optimistic state when backend data confirms the change
  useEffect(() => {
    if (optimisticPrimaryId && !isTransitioning) {
      // Check if the backend data now matches our optimistic state
      const backendPrimary = accounts.find(acc => acc.isPrimary);
      if (backendPrimary && backendPrimary.id === optimisticPrimaryId) {
        // Backend confirmed our optimistic change - clear optimistic state
        setOptimisticPrimaryId(null);
      }
    }
  }, [accounts, optimisticPrimaryId, isTransitioning]);

  // Initialize animated values for new cards and animate position changes
  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];
    
    sortedAccounts.forEach((account, index) => {
      if (!cardAnimations.current.has(account.id)) {
        // Initialize new card animation
        cardAnimations.current.set(account.id, new Animated.Value(index));
      } else {
        // Animate existing card to new position with stagger
        const currentAnimation = cardAnimations.current.get(account.id)!;
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
    const currentAccountIds = new Set(sortedAccounts.map(acc => acc.id));
    for (const [accountId, animation] of cardAnimations.current.entries()) {
      if (!currentAccountIds.has(accountId)) {
        cardAnimations.current.delete(accountId);
      }
    }
  }, [sortedAccounts]);

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

  const handleCardPress = useCallback(async (account: AccountBalance) => {
    if (isExpanded) {
      // Prevent multiple selections during transition
      if (isTransitioning || loadingAccountId) return;
      
      // If expanded, implement optimistic UI for smooth transition
      setIsTransitioning(true);
      setLoadingAccountId(account.id);
      
      // 1. IMMEDIATELY update optimistic state for instant UI feedback
      setOptimisticPrimaryId(account.id);
      
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
      
      // 4. Call backend API (this will eventually update the real data)
      try {
        await onAccountSelect(account);
        // Backend succeeded - keep optimistic state until backend data arrives
        // The useEffect will clear it when backend confirms
      } catch (error) {
        // Backend failed - revert optimistic state immediately
        console.warn('Failed to update primary account:', error);
        setOptimisticPrimaryId(null);
        // TODO: Show error message to user
      } finally {
        setIsTransitioning(false);
        setLoadingAccountId(null);
      }
    } else {
      // If collapsed, just expand the fan
      toggleExpansion();
    }
  }, [isExpanded, isTransitioning, loadingAccountId, scaleAnimation, toggleExpansion, onAccountSelect]);

  // Memoize height calculations
  const { collapsedHeight, expandedHeight } = useMemo(() => {
    const allAccounts = sortedAccounts;
    // Calculate minimum height for collapsed state (just primary card + small stacking offsets)
    const collapsed = CARD_HEIGHT + (allAccounts.length - 1) * COLLAPSED_STACK_OFFSET;
    
    // Calculate expanded height (all cards spaced out)
    const expanded = Math.min(
      CARD_HEIGHT + (allAccounts.length - 1) * EXPANDED_FAN_OFFSET,
      MAX_EXPANSION_HEIGHT
    );

    return { collapsedHeight: collapsed, expandedHeight: expanded };
  }, [sortedAccounts]);

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
  }), []);

  // SAFETY CHECK - MOVED TO AFTER ALL HOOKS ARE CALLED
  const primaryAccount = sortedAccounts[0];
  const allAccounts = sortedAccounts;

  // Now we can safely return null if needed (after all hooks have been called)
  if (!primaryAccount || !primaryAccount.id) {
    return null;
  }

  return (
    <View style={styles.container}>
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
        {allAccounts.map((account, targetIndex) => {
          // Use the actual isPrimary field from backend data
          const isPrimaryCard = account.isPrimary;
          
          // Get the animated position for this card
          const positionAnimation = cardAnimations.current.get(account.id);
          if (!positionAnimation) return null; // Skip if animation not ready
          
          // REVERSED DECK LOGIC: Last card is ANCHOR, primary card MOVES DOWN
          return (
            <Animated.View
              key={account.id}
              style={[
                styles.cardPosition,
                {
                  transform: [
                    {
                      // Smooth position interpolation based on animated index
                      translateY: Animated.add(
                        // Base position animation for reordering
                        positionAnimation.interpolate({
                          inputRange: [0, allAccounts.length - 1],
                          outputRange: [0, (allAccounts.length - 1) * COLLAPSED_STACK_OFFSET],
                          extrapolate: 'clamp',
                        }),
                        // Expansion animation
                        transformAnimatedValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [
                            0, // No additional offset when collapsed
                            // When expanded, fan out based on reversed order
                            (allAccounts.length - 1 - targetIndex) * EXPANDED_FAN_OFFSET - 
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
                    ? 2000 + (allAccounts.length - 1 - targetIndex) // Higher z-index for cards at the bottom
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
                onPress={() => handleCardPress(account)}
                style={styles.cardTouchable}
              >
                <AccountCard
                  account={account}
                  isPrimary={isPrimaryCard}
                  isSelected={selectedAccountId === account.id}
                  isStacked={!isExpanded}
                  stackIndex={targetIndex}
                  isBalanceVisible={isBalanceVisible}
                  onToggleVisibility={isPrimaryCard ? onToggleVisibility : () => {}}
                  onPress={() => handleCardPress(account)}
                />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.View>
    </View>
  );
};

export default AccountStackCard; 