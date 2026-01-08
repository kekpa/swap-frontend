import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useMakePayment } from '../../hooks-data/useRoscaEnrollments';
import { useBalances } from '../../hooks-data/useBalances';
import { useCurrentEntityId } from '../../hooks/useCurrentEntityId';
import { Toast } from '../../components/Toast';
import type { RoscaEnrollment } from '../../types/rosca.types';
import { formatAmount } from '../../utils/roscaUtils';
import logger from '../../utils/logger';

type RoscaPaymentRouteParams = {
  RoscaPaymentScreen: {
    enrollment: RoscaEnrollment;
  };
};

export default function RoscaPaymentScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RoscaPaymentRouteParams, 'RoscaPaymentScreen'>>();
  const { enrollment } = route.params;

  const entityId = useCurrentEntityId();
  const { data: balances } = useBalances(entityId || '');
  const { mutateAsync: makePayment, isPending } = useMakePayment();

  const [error, setError] = useState<string | null>(null);

  // Find the HTG wallet balance
  const htgWallet = balances?.find(w => w.currency_code === 'HTG');
  const availableBalance = htgWallet?.available_balance ?? 0;
  const hasInsufficientFunds = availableBalance < enrollment.contributionAmount;

  // Format the next payment due date
  const formatDueDate = () => {
    if (!enrollment.nextPaymentDue) return 'N/A';
    const date = new Date(enrollment.nextPaymentDue);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate period info
  const currentPeriod = enrollment.contributionsCount + 1;
  const totalPeriods = enrollment.totalMembers; // In rosca, total periods = total members

  const handlePay = async () => {
    if (hasInsufficientFunds) {
      setError('Insufficient wallet balance');
      return;
    }

    setError(null);

    try {
      logger.debug('[RoscaPayment] Initiating payment', 'rosca', {
        enrollmentId: enrollment.id,
        amount: enrollment.contributionAmount,
      });

      await makePayment({
        enrollmentId: enrollment.id,
        amount: enrollment.contributionAmount,
        paymentMethod: 'wallet',
      });

      logger.debug('[RoscaPayment] Payment successful', 'rosca');

      Toast.show({
        type: 'success',
        text1: 'Payment successful!',
        text2: `${formatAmount(enrollment.contributionAmount, enrollment.currencySymbol)} contributed to ${enrollment.poolName}`,
      });

      navigation.goBack();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      logger.error('[RoscaPayment] Payment failed', err, 'rosca');
      setError(errorMessage);
      Toast.show({
        type: 'error',
        text1: 'Payment failed',
        text2: errorMessage,
      });
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Pay Contribution
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pool Info */}
        <View style={styles.poolInfoSection}>
          <View style={[styles.poolIcon, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.poolIconText}>S</Text>
          </View>
          <Text style={[styles.poolName, { color: theme.colors.textPrimary }]}>
            {enrollment.poolName}
          </Text>
          <Text style={[styles.poolSubtitle, { color: theme.colors.textSecondary }]}>
            Position #{enrollment.queuePosition} of {enrollment.totalMembers}
          </Text>
        </View>

        {/* Contribution Details Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
            Contribution Details
          </Text>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Pool</Text>
            <Text style={[styles.cardValue, { color: theme.colors.textPrimary }]}>
              {enrollment.poolName}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Amount</Text>
            <Text style={[styles.cardValue, { color: theme.colors.textPrimary }]}>
              {formatAmount(enrollment.contributionAmount, enrollment.currencySymbol)}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Period</Text>
            <Text style={[styles.cardValue, { color: theme.colors.textPrimary }]}>
              {currentPeriod} of {totalPeriods}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Due Date</Text>
            <Text style={[styles.cardValue, { color: theme.colors.textPrimary }]}>
              {formatDueDate()}
            </Text>
          </View>
        </View>

        {/* Payment Source Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
            Payment Source
          </Text>
          <View style={styles.walletRow}>
            <View style={styles.walletInfo}>
              <Ionicons name="wallet-outline" size={24} color={theme.colors.primary} />
              <View style={styles.walletTextContainer}>
                <Text style={[styles.walletName, { color: theme.colors.textPrimary }]}>
                  Main Wallet
                </Text>
                <Text style={[styles.walletBalance, { color: theme.colors.textSecondary }]}>
                  Available: {formatAmount(availableBalance, 'G')}
                </Text>
              </View>
            </View>
            {hasInsufficientFunds && (
              <View style={[styles.insufficientBadge, { backgroundColor: theme.colors.error + '20' }]}>
                <Text style={[styles.insufficientText, { color: theme.colors.error }]}>
                  Insufficient
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Summary Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
            Summary
          </Text>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
              Contribution
            </Text>
            <Text style={[styles.cardValue, { color: theme.colors.textPrimary }]}>
              {formatAmount(enrollment.contributionAmount, enrollment.currencySymbol)}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
              Service Fee
            </Text>
            <Text style={[styles.cardValue, { color: theme.colors.textPrimary }]}>
              {formatAmount(0, enrollment.currencySymbol)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.cardRow}>
            <Text style={[styles.totalLabel, { color: theme.colors.textPrimary }]}>
              Total
            </Text>
            <Text style={[styles.totalValue, { color: theme.colors.textPrimary }]}>
              {formatAmount(enrollment.contributionAmount, enrollment.currencySymbol)}
            </Text>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: theme.colors.error + '20' }]}>
            <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Pay Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payButton,
            { backgroundColor: theme.colors.primary },
            (isPending || hasInsufficientFunds) && styles.payButtonDisabled,
          ]}
          onPress={handlePay}
          disabled={isPending || hasInsufficientFunds}
          activeOpacity={0.8}
        >
          {isPending ? (
            <ActivityIndicator color={theme.colors.white} size="small" />
          ) : (
            <Text style={[styles.payButtonText, { color: theme.colors.white }]}>
              Pay {formatAmount(enrollment.contributionAmount, enrollment.currencySymbol)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  poolInfoSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  poolIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  poolIconText: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
  },
  poolName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  poolSubtitle: {
    fontSize: 14,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    opacity: 0.7,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  cardLabel: {
    fontSize: 15,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletTextContainer: {
    gap: 2,
  },
  walletName: {
    fontSize: 15,
    fontWeight: '500',
  },
  walletBalance: {
    fontSize: 13,
  },
  insufficientBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  insufficientText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  payButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
