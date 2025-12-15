// PendingWalletCard component - displays a placeholder card while a new wallet is being created
// Shows "Select a currency..." initially, then "Adding USD..." with loading spinner
// Matches WalletCard dimensions (140px height) and styling conventions
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AvailableCurrency } from './NewCurrencySheet';

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
  const styles = useMemo(() => StyleSheet.create({
    card: {
      height: 140, // Match WalletCard height
      borderRadius: 20, // Match WalletCard border radius
      overflow: 'hidden',
      backgroundColor: '#E8E0F0', // Light purple tint to indicate pending state
      borderWidth: 1.5,
      borderColor: '#C4B5DC', // Purple-tinted border
      borderStyle: 'dashed', // Dashed border to indicate "pending/placeholder"
      // Content at TOP so it's visible when peeking
      justifyContent: 'flex-start',
      paddingTop: 16,
      paddingHorizontal: 16,
      // Subtle shadow
      shadowColor: '#8B5CF6',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
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
      backgroundColor: 'rgba(139, 92, 246, 0.2)', // Purple tint
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    textContainer: {
      flex: 1,
    },
    label: {
      color: '#6B4FA0', // Purple text
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    sublabel: {
      color: '#8B7AAD',
      fontSize: 12,
      marginTop: 2,
    },
  }), []);

  // Determine what to show based on state
  const getContent = () => {
    if (isLoading && currency) {
      // Loading state with currency selected
      return (
        <>
          <View style={styles.iconContainer}>
            <ActivityIndicator size="small" color="#8B5CF6" />
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
            <Ionicons name="wallet-outline" size={18} color="#8B5CF6" />
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
