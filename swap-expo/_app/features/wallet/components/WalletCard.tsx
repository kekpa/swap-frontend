// Created: WalletCard component for new wallet-centric architecture - 2025-01-03
// Based on AccountCard but displays WalletBalance instead of AccountBalance
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { WalletBalance } from '../../../types/wallet.types';

// Explicit card width for consistent sizing (Apple Wallet pattern)
const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 32;

interface WalletCardProps {
  wallet: WalletBalance;
  isSelected?: boolean;
  isPrimary?: boolean;
  isStacked?: boolean;
  stackIndex?: number;
  isBalanceVisible: boolean;
  onToggleVisibility: () => void;
  style?: any;
  isExpanded?: boolean;
  isInBackground?: boolean;
}

// Helper function to convert hex to RGB - moved outside component for better performance
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * Validates that a wallet object has all required properties for safe rendering
 * This prevents React Native crashes from undefined/null values in Text components
 */
const isValidWallet = (wallet: any): wallet is WalletBalance => {
  return (
    wallet &&
    typeof wallet === 'object' &&
    !Array.isArray(wallet) &&
    typeof wallet.wallet_id === 'string' &&
    wallet.wallet_id.length > 0 &&
    typeof wallet.currency_code === 'string' &&
    wallet.currency_code.length > 0
  );
};

/**
 * Ensures numeric values are valid numbers, with fallbacks
 */
const sanitizeNumericValue = (value: any, fallback: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

/**
 * Ensures string values are valid strings, with fallbacks
 */
const sanitizeStringValue = (value: any, fallback: string = ''): string => {
  return value && typeof value === 'string' ? value : fallback;
};

const WalletCard: React.FC<WalletCardProps> = React.memo(({
  wallet,
  isSelected = false,
  isPrimary = false,
  isStacked = false,
  stackIndex = 0,
  isBalanceVisible,
  onToggleVisibility,
  style,
  isExpanded = false,
  isInBackground = false,
}) => {
  const { theme } = useTheme();

  // Validate essential wallet properties before rendering
  if (!wallet || !wallet.wallet_id || !wallet.currency_code) {
    console.warn('[WalletCard] Invalid wallet data - missing required fields:', {
      hasWallet: !!wallet,
      hasWalletId: wallet?.wallet_id,
      hasCurrencyCode: wallet?.currency_code,
    });
    return null;
  }

  // Extract wallet properties with safe defaults
  const walletId = wallet.wallet_id;
  const currencyCode = wallet.currency_code;
  const walletCurrencySymbol = wallet.currency_symbol || '$';
  const currencyName = wallet.currency_name || currencyCode;
  const balance = typeof wallet.balance === 'number' ? wallet.balance : 0;
  const availableBalance = typeof wallet.available_balance === 'number' 
    ? wallet.available_balance 
    : balance;
  const reservedBalance = typeof wallet.reserved_balance === 'number' 
    ? wallet.reserved_balance 
    : 0;

  // Memoize card color calculation to avoid recalculating on every render
  const cardColor = useMemo(() => {
    let baseColor;

    // Use color from database if available
    if (wallet.currency_color) {
      baseColor = wallet.currency_color;
    } else {
      // Fallback: Generate a consistent color based on currency code hash
      const hash = currencyCode.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const colorPalette = [
        '#F59E0B', // Amber
        '#8B5CF6', // Purple
        '#EF4444', // Red
        '#10B981', // Emerald
        '#3B82F6', // Blue
        '#6366F1', // Indigo
        '#EC4899', // Pink
        '#06B6D4', // Cyan
      ];
      baseColor = colorPalette[Math.abs(hash) % colorPalette.length];
    }

    // Apply stacking brightness degradation for 3D effect
    if (isStacked && stackIndex > 0) {
      // Make cards progressively darker when stacked behind
      const darkenFactor = 1 - (stackIndex * 0.15); // Each card 15% darker
      const rgb = hexToRgb(baseColor);
      if (rgb) {
        return `rgb(${Math.floor(rgb.r * darkenFactor)}, ${Math.floor(rgb.g * darkenFactor)}, ${Math.floor(rgb.b * darkenFactor)})`;
      }
    }

    return baseColor;
  }, [wallet.currency_color, currencyCode, isStacked, stackIndex]);

  // Smart content layout based on card position
  const getCardTitle = () => {
    return currencyCode;
  };

  const getCardSubtitle = () => {
    return 'Available Balance';
  };

  // Memoize styles to avoid recreating StyleSheet on every render
  const styles = useMemo(() => StyleSheet.create({
    card: {
      width: CARD_WIDTH, // Explicit pixel width - Apple Wallet pattern for consistent sizing
      height: 140,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: cardColor,
      padding: 20,
      justifyContent: 'space-between',
      // Enhanced professional shadow system - let WalletStackCard handle stacking shadows
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4, // Standard shadow - stacking shadows handled by parent
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4, // Standard elevation - stacking handled by parent
    },
    topSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    accountInfo: {
      flex: 1,
    },
    accountTitle: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    accountSubtitle: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 12,
      fontWeight: '500',
    },
    balanceDisplay: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
    balanceSymbol: {
      color: '#fff',
      fontSize: 22, // Adjusted for balance
      fontWeight: '600',
    },
    balanceAmount: {
      color: '#fff',
      fontSize: 32, // Larger for emphasis
      fontWeight: '700',
    },
    balanceCurrencyCode: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 22, // Adjusted for balance
      fontWeight: '600',
    },
    bottomSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    primaryBadge: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    primaryText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    balanceLabel: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 14,
      fontWeight: '500',
    },
    visibilityButton: {
      padding: 8,
    },
    reservedInfo: {
      alignItems: 'flex-end',
    },
    reservedText: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: 10,
      fontWeight: '500',
    },
  }), [cardColor]);

  // Memoize balance amount rendering
  const balanceAmountText = useMemo(() => {
    if (!isBalanceVisible) {
      return '••••.••';
    }
    
    // Use available_balance instead of total balance to show what's actually spendable
    const amount = availableBalance;
    
    // Smart formatting based on amount
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 10000) {
      return (amount / 1000).toFixed(0) + 'K';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    } else {
      return amount.toFixed(2);
    }
  }, [availableBalance, isBalanceVisible, walletId]);

  // Show reserved balance info if there's a reserved amount
  const hasReservedBalance = reservedBalance && reservedBalance > 0;

  // Prepare display text values
  const displayTitle = getCardTitle();
  const displaySubtitle = getCardSubtitle();
  const displayBalanceAmount = balanceAmountText;

  return (
    <View
      style={[styles.card, style]}
    >
      {/* Top Section */}
      <View style={styles.topSection}>
        <View style={styles.accountInfo}>
          <Text style={styles.accountTitle}>{displayTitle}</Text>
          <Text style={styles.accountSubtitle}>{displaySubtitle}</Text>
        </View>
        
        {/* Visibility Toggle Button - Now just a View since parent handles touches */}
        <View
          style={styles.visibilityButton}
        >
          <Ionicons
            name={isBalanceVisible ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color="rgba(255, 255, 255, 0.8)"
          />
        </View>
      </View>

      {/* Balance Display */}
      <View style={styles.balanceDisplay}>
        <Text style={styles.balanceSymbol}>{walletCurrencySymbol}</Text>
        <Text style={styles.balanceAmount}>{displayBalanceAmount}</Text>
        {!isBalanceVisible && (
          <Text style={styles.balanceCurrencyCode}>{currencyCode}</Text>
        )}
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Primary Badge */}
        {isPrimary && (
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryText}>PRIMARY</Text>
          </View>
        )}
        
        {/* Reserved Balance Info */}
        {hasReservedBalance && isBalanceVisible ? (
          <View style={styles.reservedInfo}>
            <Text style={styles.reservedText}>
              {`Reserved: ${walletCurrencySymbol}${reservedBalance.toFixed(2)}`}
            </Text>
          </View>
        ) : null}
        
        {/* Balance Label (right aligned if no primary badge) */}
        {!isPrimary && !hasReservedBalance && (
          <Text style={styles.balanceLabel}>
            {displaySubtitle}
          </Text>
        )}
      </View>
    </View>
  );
});

WalletCard.displayName = 'WalletCard';

export default WalletCard; 