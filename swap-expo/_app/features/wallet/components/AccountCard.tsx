// Updated: Fixed hexToRgb function order - moved before usage - 2025-06-30
// Updated: Optimized with React.memo and performance improvements - 2025-06-30
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { AccountBalance } from '../../../types/wallet.types';

interface AccountCardProps {
  account: AccountBalance;
  isSelected?: boolean;
  isPrimary?: boolean;
  isStacked?: boolean;
  stackIndex?: number;
  isBalanceVisible: boolean;

  onToggleVisibility: () => void;
  onPress?: () => void;
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

const AccountCard: React.FC<AccountCardProps> = React.memo(({
  account,
  isSelected = false,
  isPrimary = false,
  isStacked = false,
  stackIndex = 0,
  isBalanceVisible,

  onToggleVisibility,
  onPress,
  style,
  isExpanded = false,
  isInBackground = false,
}) => {
  const { theme } = useTheme();

  // Memoize card color calculation to avoid recalculating on every render
  const cardColor = useMemo(() => {
    // Get base color first
    let baseColor;
    switch (account.currency_code) {
      case 'HTG':
        baseColor = '#8B5CF6'; // Enhanced purple for HTG
        break;
      case 'USD':
        baseColor = '#10B981'; // Enhanced emerald for USD
        break;
      case 'EUR':
        baseColor = '#F59E0B'; // Enhanced amber for EUR
        break;
      case 'GBP':
        baseColor = '#8B5CF6'; // Purple for GBP
        break;
      case 'CAD':
        baseColor = '#EF4444'; // Red for CAD
        break;
      case 'JPY':
        baseColor = '#3B82F6'; // Blue for JPY
        break;
      case 'AUD':
        baseColor = '#06B6D4'; // Cyan for AUD
        break;
      default:
        // Generate a consistent color based on currency code hash
        const hash = account.currency_code.split('').reduce((a, b) => {
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
  }, [account.currency_code, isStacked, stackIndex]);

  // Smart content layout based on card position
  const getCardTitle = () => {
    if (isExpanded && !isPrimary) {
      // When expanded and not primary, show currency prominently
      return account.currency_code;
    }
    return isPrimary ? 'Primary Account' : 'Account';
  };

  const getCardSubtitle = () => {
    if (isExpanded && !isPrimary) {
      // When expanded and not primary, show "Account" as subtitle
      return 'Account';
    }
    return 'Current Balance';
  };

  // Memoize styles to avoid recreating StyleSheet on every render
  const styles = useMemo(() => StyleSheet.create({
    card: {
      height: 140,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: cardColor,
      padding: 20,
      justifyContent: 'space-between',
      // Enhanced professional shadow system - let AccountStackCard handle stacking shadows
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4, // Standard shadow - stacking shadows handled by parent
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4, // Standard elevation - stacking handled by parent
      // No transform here - parent handles all positioning
    },
    topSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
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
  }), [cardColor]);

  // Memoize balance amount rendering
  const balanceAmountText = useMemo(() => {
    if (!isBalanceVisible) {
      return '••••.••';
    }
    return account.balance.toFixed(2);
  }, [isBalanceVisible, account.balance]);

  return (
    <View style={[styles.card, style]}>
      {/* Top Section: Balance Display and Visibility Icon */}
      <View style={styles.topSection}>
        <View style={styles.balanceDisplay}>
          <Text style={styles.balanceSymbol}>{account.currency_symbol}</Text>
          <Text style={styles.balanceAmount}>{balanceAmountText}</Text>
          <Text style={styles.balanceCurrencyCode}>{account.currency_code}</Text>
        </View>
        <TouchableOpacity 
          style={styles.visibilityButton}
          onPress={onToggleVisibility}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isBalanceVisible ? "eye-outline" : "eye-off-outline"}
            size={24} // Slightly larger icon
            color="rgba(255, 255, 255, 0.9)"
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Section: "Current Balance" label and Primary Badge */}
      <View style={styles.bottomSection}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        {isPrimary && (
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryText}>PRIMARY</Text>
          </View>
        )}
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if these specific props change
  return (
    prevProps.account.id === nextProps.account.id &&
    prevProps.account.balance === nextProps.account.balance &&
    prevProps.account.currency_code === nextProps.account.currency_code &&
    prevProps.account.currency_symbol === nextProps.account.currency_symbol &&
    prevProps.isPrimary === nextProps.isPrimary &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isBalanceVisible === nextProps.isBalanceVisible &&
    prevProps.isStacked === nextProps.isStacked &&
    prevProps.stackIndex === nextProps.stackIndex &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.isInBackground === nextProps.isInBackground
  );
});

// Add display name for debugging
AccountCard.displayName = 'AccountCard';

export default AccountCard; 