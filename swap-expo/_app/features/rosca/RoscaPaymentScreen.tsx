import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useMakePayment } from '../../hooks-data/useRoscaEnrollments';
import { useBalances } from '../../hooks-data/useBalances';
import { useCurrentEntityId } from '../../hooks/useCurrentEntityId';
import { Toast } from '../../components/Toast';
import AccountSelectionModal from '../../components/AccountSelectionModal';
import type { RoscaEnrollment } from '../../types/rosca.types';
import { formatAmount } from '../../utils/roscaUtils';
import logger from '../../utils/logger';

type RoscaPaymentRouteParams = {
  RoscaPaymentScreen: {
    enrollment: RoscaEnrollment;
  };
};

type PresetOption = 1 | 2 | 3 | 'other';

interface WalletAccount {
  id: string;
  currency_id: string;
  currency_code: string;
  currency_symbol: string;
  balance: number;
  account_name: string;
  entity_id: string;
  account_type: { name: string };
}

export default function RoscaPaymentScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RoscaPaymentRouteParams, 'RoscaPaymentScreen'>>();
  const { enrollment } = route.params;

  const entityId = useCurrentEntityId();
  const { data: balances } = useBalances(entityId || '');
  const { mutateAsync: makePayment, isPending } = useMakePayment();

  const [selectedPreset, setSelectedPreset] = useState<PresetOption>(1);
  const [customAmount, setCustomAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<WalletAccount | null>(null);
  const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);

  // Transform balances to Account format for modal
  const walletAccounts = useMemo(() => {
    if (!balances) return [];
    return balances.map(w => ({
      id: w.wallet_id,
      currency_id: w.currency_id,
      currency_code: w.currency_code,
      currency_symbol: w.currency_symbol,
      balance: w.available_balance,
      account_name: 'Main',
      entity_id: entityId || '',
      account_type: { name: 'wallet' },
    }));
  }, [balances, entityId]);

  // Auto-select HTG wallet on load (or first available)
  useEffect(() => {
    if (walletAccounts.length > 0 && !selectedWallet) {
      const htgWallet = walletAccounts.find(w => w.currency_code === 'HTG');
      setSelectedWallet(htgWallet || walletAccounts[0]);
    }
  }, [walletAccounts, selectedWallet]);

  // Use selected wallet balance
  const availableBalance = selectedWallet?.balance ?? 0;

  // Calculate payment amount based on selection
  const contributionAmount = enrollment.contributionAmount;
  const paymentAmount = selectedPreset === 'other'
    ? parseFloat(customAmount) || 0
    : contributionAmount * selectedPreset;

  const hasInsufficientFunds = availableBalance < paymentAmount;
  const isValidAmount = paymentAmount > 0;

  // Period presets
  const presets: { periods: PresetOption; amount: number; label: string }[] = [
    { periods: 1, amount: contributionAmount * 1, label: '1 Week' },
    { periods: 2, amount: contributionAmount * 2, label: '2 Weeks' },
    { periods: 3, amount: contributionAmount * 3, label: '3 Weeks' },
  ];

  const handlePresetSelect = (preset: PresetOption) => {
    setSelectedPreset(preset);
    if (preset !== 'other') {
      setCustomAmount('');
    }
    setError(null);
  };

  const handlePay = async () => {
    if (!isValidAmount) {
      setError('Please select or enter an amount');
      return;
    }

    if (hasInsufficientFunds) {
      setError('Insufficient wallet balance');
      return;
    }

    setError(null);

    try {
      logger.debug('[RoscaPayment] Initiating payment', 'rosca', {
        enrollmentId: enrollment.id,
        amount: paymentAmount,
        periods: selectedPreset,
        walletId: selectedWallet?.id,
      });

      await makePayment({
        enrollmentId: enrollment.id,
        amount: paymentAmount,
        paymentMethod: 'wallet',
      });

      logger.debug('[RoscaPayment] Payment successful', 'rosca');

      const periodsText = selectedPreset === 'other'
        ? ''
        : selectedPreset === 1 ? ' (1 week)' : ` (${selectedPreset} weeks)`;

      Toast.show({
        type: 'success',
        text1: 'Payment successful!',
        text2: `${formatAmount(paymentAmount, enrollment.currencySymbol)}${periodsText} contributed to ${enrollment.poolName}`,
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
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Pay Rosca Contribution
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pool Info - Compact */}
        <View style={styles.poolInfo}>
          <View style={[styles.poolIcon, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.poolIconText}>S</Text>
          </View>
          <Text style={[styles.poolName, { color: theme.colors.textPrimary }]}>
            {enrollment.poolName}
          </Text>
          <Text style={[styles.poolPosition, { color: theme.colors.textSecondary }]}>
            Position #{enrollment.queuePosition} of {enrollment.totalMembers}
          </Text>
        </View>

        {/* Amount Presets Grid */}
        <View style={styles.presetsGrid}>
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset.periods}
              style={[
                styles.presetCard,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                selectedPreset === preset.periods && { borderColor: theme.colors.primary, borderWidth: 2 },
              ]}
              onPress={() => handlePresetSelect(preset.periods)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.presetAmount,
                { color: theme.colors.textPrimary },
                selectedPreset === preset.periods && { color: theme.colors.primary },
              ]}>
                {formatAmount(preset.amount, enrollment.currencySymbol)}
              </Text>
              <Text style={[
                styles.presetLabel,
                { color: theme.colors.textSecondary },
                selectedPreset === preset.periods && { color: theme.colors.primary },
              ]}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Other Option */}
        <TouchableOpacity
          style={[
            styles.otherOption,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            selectedPreset === 'other' && { borderColor: theme.colors.primary, borderWidth: 2 },
          ]}
          onPress={() => handlePresetSelect('other')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.otherText,
            { color: theme.colors.textPrimary },
            selectedPreset === 'other' && { color: theme.colors.primary },
          ]}>
            Other
          </Text>
        </TouchableOpacity>

        {/* Custom Amount Input */}
        {selectedPreset === 'other' && (
          <View style={[styles.customAmountContainer, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.customAmountLabel, { color: theme.colors.textSecondary }]}>
              Enter custom amount:
            </Text>
            <View style={styles.customAmountRow}>
              <Text style={[styles.currencyPrefix, { color: theme.colors.textPrimary }]}>
                {enrollment.currencySymbol}
              </Text>
              <TextInput
                style={[styles.customAmountInput, { color: theme.colors.textPrimary }]}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.textTertiary}
                value={customAmount}
                onChangeText={setCustomAmount}
                autoFocus
              />
            </View>
          </View>
        )}

        {/* Wallet Row - Tappable */}
        <TouchableOpacity
          style={[styles.walletRow, { backgroundColor: theme.colors.card }]}
          onPress={() => setIsWalletModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.walletLeft}>
            <Text style={[styles.walletLabel, { color: theme.colors.textSecondary }]}>From</Text>
            <Ionicons name="wallet-outline" size={20} color={theme.colors.primary} style={styles.walletIcon} />
            <Text style={[styles.walletName, { color: theme.colors.textPrimary }]}>
              {selectedWallet?.account_name || 'Main'}{' '}
              <Text style={{ color: theme.colors.textSecondary }}>
                • {selectedWallet?.currency_code || 'HTG'}
              </Text>
            </Text>
          </View>
          <View style={styles.walletRight}>
            <View style={styles.walletBalanceRow}>
              <Text style={[styles.walletBalance, { color: theme.colors.textPrimary }]}>
                {formatAmount(availableBalance, selectedWallet?.currency_symbol || 'G')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
            </View>
            {hasInsufficientFunds && isValidAmount && (
              <Text style={[styles.insufficientText, { color: theme.colors.error }]}>
                Insufficient
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Error Message */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: theme.colors.error + '20' }]}>
            <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
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
            (!isValidAmount || isPending || hasInsufficientFunds) && styles.payButtonDisabled,
          ]}
          onPress={handlePay}
          disabled={!isValidAmount || isPending || hasInsufficientFunds}
          activeOpacity={0.8}
        >
          {isPending ? (
            <ActivityIndicator color={theme.colors.white} size="small" />
          ) : (
            <Text style={[styles.payButtonText, { color: theme.colors.white }]}>
              Pay {isValidAmount ? formatAmount(paymentAmount, enrollment.currencySymbol) : ''} Now
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Wallet Selection Modal */}
      <AccountSelectionModal
        visible={isWalletModalVisible}
        accounts={walletAccounts as any}
        onSelectAccount={(account) => {
          setSelectedWallet(account as any);
          setIsWalletModalVisible(false);
        }}
        onClose={() => setIsWalletModalVisible(false)}
        title="Select Wallet"
        highlightCurrency={selectedWallet?.currency_id}
      />
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
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  poolInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  poolIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  poolIconText: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
  },
  poolName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  poolPosition: {
    fontSize: 14,
  },
  presetsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  presetCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  presetAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  presetLabel: {
    fontSize: 13,
  },
  otherOption: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  otherText: {
    fontSize: 16,
    fontWeight: '600',
  },
  customAmountContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  customAmountLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  customAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefix: {
    fontSize: 24,
    fontWeight: '600',
    marginRight: 8,
  },
  customAmountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    padding: 0,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletLabel: {
    fontSize: 14,
    marginRight: 12,
  },
  walletIcon: {
    marginRight: 8,
  },
  walletName: {
    fontSize: 15,
    fontWeight: '500',
  },
  walletRight: {
    alignItems: 'flex-end',
  },
  walletBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  walletBalance: {
    fontSize: 15,
    fontWeight: '600',
  },
  insufficientText: {
    fontSize: 12,
    marginTop: 2,
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
