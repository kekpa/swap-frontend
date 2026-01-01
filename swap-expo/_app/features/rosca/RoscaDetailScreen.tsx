import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextStyle,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { getAvatarColor } from '../../utils/avatarUtils';
import logger from '../../utils/logger';
import type { RoscaEnrollment, RoscaPayment, RoscaFriend } from '../../types/rosca.types';
import { formatAmount } from '../../utils/roscaUtils';

// TODO: Replace with real data hooks when available
const MOCK_PAYMENTS: RoscaPayment[] = [];
const MOCK_FRIENDS: RoscaFriend[] = [];

type RoscaDetailRouteParams = {
  RoscaDetailScreen: {
    enrollment: RoscaEnrollment;
  };
};

export default function RoscaDetailScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RoscaDetailRouteParams, 'RoscaDetailScreen'>>();
  const { enrollment } = route.params;

  const handleBack = () => {
    navigation.goBack();
  };

  const handlePay = () => {
    // Go directly to payment (no alert)
    (navigation as any).navigate('RoscaPaymentConfirmationScreen', { enrollment });
  };

  const handleInvite = () => {
    // TODO: Implement share/invite
    logger.debug('Invite feature not implemented yet', 'rosca');
  };

  // Calculate progress
  const progress = ((enrollment.totalMembers - enrollment.queuePosition + 1) / enrollment.totalMembers) * 100;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          {enrollment.poolName}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Payout Card - light cyan background like Add Money */}
        <View style={styles.content}>
          <View style={[
            styles.payoutCard,
            {
              backgroundColor: theme.colors.primaryUltraLight,
              borderColor: theme.colors.primaryLight,
              borderWidth: 1,
            }
          ]}>
            <Text style={[styles.payoutAmount, { color: theme.colors.primary }]}>
              {formatAmount(enrollment.expectedPayout, enrollment.currencySymbol)}
            </Text>
            <Text style={[styles.payoutLabel, { color: theme.colors.textSecondary }]}>
              Amount you will receive
            </Text>
            <View style={styles.positionInfo}>
              <Text style={[styles.positionText, { color: theme.colors.textPrimary }]}>
                Position #{enrollment.queuePosition}
              </Text>
              <View style={[styles.positionBar, { backgroundColor: theme.colors.primaryLight }]}>
                <View style={[styles.positionFill, { backgroundColor: theme.colors.primary, width: `${progress}%` }]} />
              </View>
              <Text style={[styles.positionText, { color: theme.colors.textPrimary }]}>
                / {enrollment.totalMembers}
              </Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                {formatAmount(enrollment.totalContributed, enrollment.currencySymbol)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Total Paid
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                {enrollment.contributionsCount}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Weeks
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                {enrollment.daysUntilNextPayment} days
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Next
              </Text>
            </View>
          </View>

          {/* Pay Button - uses theme.commonStyles.primaryButton */}
          <TouchableOpacity
            style={[theme.commonStyles.primaryButton, styles.payButton]}
            onPress={handlePay}
            activeOpacity={0.8}
          >
            <Text style={theme.commonStyles.primaryButtonText as TextStyle}>
              Pay {formatAmount(enrollment.contributionAmount, enrollment.currencySymbol)} Now
            </Text>
          </TouchableOpacity>

          {/* Payment History */}
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Payment History
          </Text>
          {MOCK_PAYMENTS.map((payment) => (
            <View
              key={payment.id}
              style={[styles.historyItem, { borderColor: theme.colors.divider }]}
            >
              <Text style={[styles.historyDate, { color: theme.colors.textPrimary }]}>
                {new Date(payment.paidAt).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <Text style={[styles.historyAmount, { color: theme.colors.success }]}>
                {formatAmount(payment.amount, payment.currencySymbol)} ✓
              </Text>
            </View>
          ))}

          {/* Friends in Rosca */}
          <View style={styles.friendsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Friends in this Rosca ({MOCK_FRIENDS.length})
            </Text>
            {MOCK_FRIENDS.map((friend) => (
              <View
                key={friend.id}
                style={[styles.friendItem, { borderColor: theme.colors.divider }]}
              >
                <View style={[styles.friendAvatar, { backgroundColor: getAvatarColor(friend.id) }]}>
                  <Text style={[styles.friendInitials, { color: '#FFFFFF' }]}>
                    {friend.initials}
                  </Text>
                </View>
                <View style={styles.friendInfo}>
                  <Text style={[styles.friendName, { color: theme.colors.textPrimary }]}>
                    {friend.name}
                  </Text>
                  <Text style={[styles.friendPosition, { color: theme.colors.textSecondary }]}>
                    #{friend.queuePosition} / {friend.totalMembers}
                  </Text>
                </View>
                {friend.hasPaid && (
                  <Text style={[styles.friendStatus, { color: theme.colors.success }]}>
                    ✓ paid
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Invite Button - uses theme.commonStyles.secondaryButton */}
          <TouchableOpacity
            style={[theme.commonStyles.secondaryButton, styles.inviteButton]}
            onPress={handleInvite}
            activeOpacity={0.8}
          >
            <Text style={theme.commonStyles.secondaryButtonText as TextStyle}>
              Invite Friends
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  payoutCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  payoutAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  payoutLabel: {
    fontSize: 13,
    marginBottom: 16,
  },
  positionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  positionText: {
    fontSize: 14,
  },
  positionBar: {
    flex: 1,
    maxWidth: 120,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  positionFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
  },
  payButton: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 10,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyDate: {
    fontSize: 13,
  },
  historyAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  friendsSection: {
    marginTop: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendInitials: {
    fontSize: 14,
    fontWeight: '600',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 13,
    fontWeight: '600',
  },
  friendPosition: {
    fontSize: 11,
  },
  friendStatus: {
    fontSize: 12,
  },
  inviteButton: {
    marginTop: 16,
  },
});
