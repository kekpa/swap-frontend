import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import type { RoscaEnrollment } from '../../../types/rosca.types';
import { formatAmount, calculateProgress } from '../../../utils/roscaUtils';

interface RoscaCardProps {
  enrollment: RoscaEnrollment;
  onPress: () => void;
  onPayPress?: () => void;
}

/**
 * Professional RoscaCard component
 * - Clean white card design (like wallet page)
 * - Subtle "Your Turn" indicator with success accent
 * - Uses theme.commonStyles for button consistency
 */
export default function RoscaCard({
  enrollment,
  onPress,
  onPayPress,
}: RoscaCardProps) {
  const { theme } = useTheme();
  const progress = calculateProgress(enrollment);
  const isYourTurn = enrollment.isYourTurn;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={[styles.roscaName, { color: theme.colors.textPrimary }]}>
            {enrollment.poolName}
          </Text>
          {isYourTurn && (
            <View style={[styles.yourTurnBadge, { backgroundColor: theme.colors.successLight }]}>
              <Ionicons name="star" size={10} color={theme.colors.success} />
              <Text style={[styles.yourTurnBadgeText, { color: theme.colors.success }]}>
                Your Turn
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.positionBadge, { backgroundColor: theme.colors.grayUltraLight }]}>
          <Text style={[styles.positionText, { color: theme.colors.textSecondary }]}>
            #{enrollment.queuePosition} / {enrollment.totalMembers}
          </Text>
        </View>
      </View>

      {/* Payout highlight for "Your Turn" */}
      {isYourTurn && (
        <View style={[styles.payoutHighlight, { backgroundColor: theme.colors.successLight }]}>
          <Text style={[styles.payoutLabel, { color: theme.colors.success }]}>
            You will receive
          </Text>
          <Text style={[styles.payoutAmount, { color: theme.colors.success }]}>
            {formatAmount(enrollment.expectedPayout, enrollment.currencySymbol)}
          </Text>
        </View>
      )}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
            {formatAmount(enrollment.totalContributed, enrollment.currencySymbol)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Paid
          </Text>
        </View>
        {!isYourTurn && (
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {formatAmount(enrollment.expectedPayout, enrollment.currencySymbol)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Will Receive
            </Text>
          </View>
        )}
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
            {enrollment.daysUntilNextPayment}d
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Next
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: theme.colors.grayUltraLight }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: isYourTurn ? theme.colors.success : theme.colors.primary,
              width: `${progress}%`
            },
          ]}
        />
      </View>

      {/* Pay Button - only show for regular cards (not "Your Turn"), filled primary style */}
      {onPayPress && !isYourTurn && (
        <TouchableOpacity
          style={[
            styles.payButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={onPayPress}
          activeOpacity={0.8}
        >
          <Text style={[styles.payButtonText, { color: theme.colors.white }]}>
            Pay {formatAmount(enrollment.contributionAmount, enrollment.currencySymbol)}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    gap: 6,
  },
  roscaName: {
    fontSize: 17,
    fontWeight: '600',
  },
  yourTurnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  yourTurnBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  positionBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  positionText: {
    fontSize: 12,
  },
  payoutHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  payoutLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  stat: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  payButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
