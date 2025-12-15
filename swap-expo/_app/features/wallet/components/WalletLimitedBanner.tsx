// Created: Banner component for users with limited wallet access (KYC under review) - 2025-01-XX
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../../theme/ThemeContext';
import { RootStackParamList } from '../../../navigation/rootNavigator';
import { TransactionLimits, formatLimit } from '../../../hooks-data/useTransactionLimits';

interface WalletLimitedBannerProps {
  limits?: TransactionLimits;
  primaryCurrency?: string;
  onViewLimits?: () => void;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

/**
 * Banner shown to users with limited wallet access (KYC under review)
 *
 * Displays:
 * - Status message (Account Under Review)
 * - Current daily limit
 * - Link to view full limits or check KYC status
 */
const WalletLimitedBanner: React.FC<WalletLimitedBannerProps> = ({
  limits,
  primaryCurrency = 'USD',
  onViewLimits,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  // Get the daily send limit for display
  const dailyLimit = useMemo(() => {
    if (!limits || !limits[primaryCurrency]) {
      // Default fallback for under_review free tier
      return primaryCurrency === 'HTG' ? 'G65,000' : '$500';
    }

    const sendLimit = limits[primaryCurrency]?.send;
    if (!sendLimit || sendLimit.daily_limit === null) {
      return 'Unlimited';
    }

    return formatLimit(sendLimit.daily_limit, primaryCurrency);
  }, [limits, primaryCurrency]);

  const handleViewLimits = () => {
    if (onViewLimits) {
      onViewLimits();
    } else {
      // Default: navigate to profile to check KYC status
      (navigation as any).navigate('ProfileModal', {
        sourceRoute: 'Wallet',
      });
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: `${theme.colors.warning}15`,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginHorizontal: theme.spacing.md,
          marginBottom: theme.spacing.md,
          borderLeftWidth: 4,
          borderLeftColor: theme.colors.warning,
        },
        iconContainer: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: `${theme.colors.warning}20`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.sm,
        },
        textContainer: {
          flex: 1,
        },
        title: {
          fontSize: theme.typography.fontSize.sm,
          fontWeight: '600',
          color: theme.colors.textPrimary,
          marginBottom: 2,
        },
        subtitle: {
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.textSecondary,
          lineHeight: 16,
        },
        limitText: {
          fontWeight: '600',
          color: theme.colors.warning,
        },
        linkButton: {
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
        },
        linkText: {
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.primary,
          fontWeight: '600',
        },
      }),
    [theme]
  );

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name="time-outline"
          size={20}
          color={theme.colors.warning}
        />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>Account Under Review</Text>
        <Text style={styles.subtitle}>
          Daily limit: <Text style={styles.limitText}>{dailyLimit}</Text> while we verify your documents
        </Text>
      </View>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={handleViewLimits}
        activeOpacity={0.7}
      >
        <Text style={styles.linkText}>View</Text>
      </TouchableOpacity>
    </View>
  );
};

export default WalletLimitedBanner;
