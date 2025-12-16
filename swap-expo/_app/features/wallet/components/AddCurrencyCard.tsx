// AddCurrencyCard component - displays a card to add new currency wallets
// Matches WalletCard dimensions (140px height) and styling conventions
// Design: Neutral styling with theme support for light/dark mode
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

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
  const { theme } = useTheme();

  // Memoize styles to avoid recreating on every render
  // LAYOUT: Content at TOP so it's visible when peeking behind other cards in the stack
  const styles = useMemo(() => StyleSheet.create({
    card: {
      height: 140, // Match WalletCard height
      borderRadius: 20, // Match WalletCard border radius
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceVariant, // Theme-aware background
      borderWidth: 1.5,
      borderColor: theme.colors.border, // Theme-aware border
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
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)', // Theme-aware icon bg
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    label: {
      color: theme.colors.textSecondary, // Theme-aware text
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
  }), [theme]);

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
            color={theme.colors.textSecondary}
          />
        </View>
        <Text style={styles.label}>New Currency</Text>
      </View>
    </TouchableOpacity>
  );
});

AddCurrencyCard.displayName = 'AddCurrencyCard';

export default AddCurrencyCard;
