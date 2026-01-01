import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import type { RoscaEnrollment } from '../../types/rosca.types';
import { formatAmount } from '../../utils/roscaUtils';

type RoscaPaymentConfirmationRouteParams = {
  RoscaPaymentConfirmationScreen: {
    enrollment: RoscaEnrollment;
  };
};

export default function RoscaPaymentConfirmationScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RoscaPaymentConfirmationRouteParams, 'RoscaPaymentConfirmationScreen'>>();
  const { enrollment } = route.params;

  const handleReturnHome = () => {
    // Simply dismiss the modal - smooth transition back to home
    navigation.goBack();
  };

  // Calculate new totals after payment
  const newTotalPaid = enrollment.totalContributed + enrollment.contributionAmount;
  const nextPaymentDate = new Date();
  nextPaymentDate.setDate(nextPaymentDate.getDate() + 7); // Assuming weekly

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={[styles.successIcon, { backgroundColor: theme.colors.success }]}>
          <Ionicons name="checkmark" size={40} color={theme.colors.white} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Payment Successful!
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Your contribution has been recorded
        </Text>

        {/* Details Box */}
        <View style={[styles.detailsBox, { backgroundColor: theme.colors.card }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Rosca
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
              {enrollment.poolName}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Amount
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
              {formatAmount(enrollment.contributionAmount, enrollment.currencySymbol)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Total Paid
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
              {formatAmount(newTotalPaid, enrollment.currencySymbol)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Position
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
              #{enrollment.queuePosition} / {enrollment.totalMembers}
            </Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Next Payment
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
              {nextPaymentDate.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
        </View>

        {/* Return Button - uses theme.commonStyles.primaryButton */}
        <TouchableOpacity
          style={[theme.commonStyles.primaryButton, styles.returnButton]}
          onPress={handleReturnHome}
          activeOpacity={0.8}
        >
          <Text style={theme.commonStyles.primaryButtonText}>
            Return Home
          </Text>
        </TouchableOpacity>
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
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  detailsBox: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  returnButton: {
    width: '100%',
  },
});
