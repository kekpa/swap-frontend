// PendingWalletCard component - displays a placeholder card while a new wallet is being created
// Shows "Select a currency..." initially, then "Adding USD..." with loading spinner
// Matches WalletCard dimensions (140px height) and styling conventions
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AvailableCurrency } from './NewCurrencySheet';
import { useTheme } from '../../../theme/ThemeContext';

interface PendingWalletCardProps {
  currency?: AvailableCurrency;
  isLoading?: boolean;
  style?: any;
}

const PendingWalletCard: React.FC<PendingWalletCardProps> = React.memo(({
  currency,
  isLoading = false,
  style,
}) => {
  const { theme } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    card: {
      height: 140, // Match WalletCard height
      borderRadius: 20, // Match WalletCard border radius
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceVariant, // Theme-aware background
      borderWidth: 1.5,
      borderColor: theme.colors.border, // Theme-aware border
      borderStyle: 'dashed', // Dashed border to indicate "pending/placeholder"
      // Content at TOP so it's visible when peeking
      justifyContent: 'flex-start',
      paddingTop: 16,
      paddingHorizontal: 16,
      // Subtle shadow
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)', // Theme-aware icon bg
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    textContainer: {
      flex: 1,
    },
    label: {
      color: theme.colors.textSecondary, // Theme-aware text
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    sublabel: {
      color: theme.colors.textTertiary || theme.colors.textSecondary, // Theme-aware sublabel
      fontSize: 12,
      marginTop: 2,
    },
  }), [theme]);

  // Determine what to show based on state
  const getContent = () => {
    if (isLoading && currency) {
      // Loading state with currency selected
      return (
        <>
          <View style={styles.iconContainer}>
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.label}>Adding {currency.code}...</Text>
            <Text style={styles.sublabel}>{currency.name}</Text>
          </View>
        </>
      );
    } else if (currency) {
      // Currency selected but not yet loading
      return (
        <>
          <View style={styles.iconContainer}>
            <Text style={{ fontSize: 16 }}>{currency.flag}</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.label}>{currency.code}</Text>
            <Text style={styles.sublabel}>{currency.name}</Text>
          </View>
        </>
      );
    } else {
      // Initial placeholder - no currency selected yet
      return (
        <>
          <View style={styles.iconContainer}>
            <Ionicons name="wallet-outline" size={18} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.label}>Select a currency...</Text>
            <Text style={styles.sublabel}>New wallet</Text>
          </View>
        </>
      );
    }
  };

  return (
    <View style={[styles.card, style]}>
      <View style={styles.content}>
        {getContent()}
      </View>
    </View>
  );
});

PendingWalletCard.displayName = 'PendingWalletCard';

export default PendingWalletCard;
