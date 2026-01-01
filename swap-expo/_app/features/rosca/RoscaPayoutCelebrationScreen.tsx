import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import type { RoscaEnrollment } from '../../types/rosca.types';
import { formatAmount } from '../../utils/roscaUtils';

type RoscaPayoutCelebrationRouteParams = {
  RoscaPayoutCelebrationScreen: {
    enrollment: RoscaEnrollment;
  };
};

export default function RoscaPayoutCelebrationScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RoscaPayoutCelebrationRouteParams, 'RoscaPayoutCelebrationScreen'>>();
  const { enrollment } = route.params;

  const handleViewWallet = () => {
    // Navigate to wallet using reset to avoid navigation issues
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'App' }],
      })
    );
  };

  const handleRejoin = () => {
    // Navigate to join screen to rejoin a pool
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'App' },
          { name: 'JoinRoscaScreen' },
        ],
      })
    );
  };

  const today = new Date();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <View style={styles.content}>
        {/* Celebration Emoji */}
        <Text style={styles.emoji}>🎉</Text>

        {/* Title */}
        <Text style={styles.title}>Congratulations!</Text>
        <Text style={styles.subtitle}>It's Your Turn!</Text>

        {/* Payout Amount */}
        <Text style={styles.amount}>
          {formatAmount(enrollment.expectedPayout, enrollment.currencySymbol)}
        </Text>
        <Text style={styles.amountLabel}>added to your wallet</Text>

        {/* Details Box */}
        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Rosca</Text>
            <Text style={styles.detailValue}>{enrollment.poolName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Contributed</Text>
            <Text style={styles.detailValue}>
              {formatAmount(enrollment.totalContributed, enrollment.currencySymbol)}
            </Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>
              {today.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleViewWallet}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
              View Wallet
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleRejoin}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
              Rejoin Rosca
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 24,
  },
  amount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 32,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailRowLast: {},
  detailLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  detailValue: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#FFFFFF',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#FFFFFF',
  },
});
