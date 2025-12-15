// AddCurrencyCard component - displays a card to add new currency wallets
// Matches WalletCard dimensions (140px height) and styling conventions
// Design: Neutral gray styling to distinguish from actual wallet cards
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AddCurrencyCardProps {
  onPress: () => void;
  style?: any;
  disabled?: boolean;
}

const AddCurrencyCard: React.FC<AddCurrencyCardProps> = React.memo(({
  onPress,
  style,
  disabled = false,
}) => {
  // Memoize styles to avoid recreating on every render
  // LAYOUT: Content at TOP so it's visible when peeking behind other cards in the stack
  const styles = useMemo(() => StyleSheet.create({
    card: {
      height: 140, // Match WalletCard height
      borderRadius: 20, // Match WalletCard border radius
      overflow: 'hidden',
      backgroundColor: '#F0F0F0', // Light gray background
      borderWidth: 1.5,
      borderColor: '#D0D0D0', // Subtle gray border (solid, not dashed)
      // Content at TOP, not centered - so text is visible when peeking
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
    cardDisabled: {
      opacity: 0.5,
    },
    content: {
      flexDirection: 'row', // Horizontal layout: icon + text side by side
      alignItems: 'center',
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(100, 100, 100, 0.15)', // Light gray circle
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    label: {
      color: '#555555', // Slightly darker gray for better visibility
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
  }), []);

  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.cardDisabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="add"
            size={20}
            color="#555555"
          />
        </View>
        <Text style={styles.label}>New Currency</Text>
      </View>
    </TouchableOpacity>
  );
});

AddCurrencyCard.displayName = 'AddCurrencyCard';

export default AddCurrencyCard;
