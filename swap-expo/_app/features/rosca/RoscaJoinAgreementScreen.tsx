import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useJoinPool } from '../../hooks-data/useRoscaEnrollments';
import logger from '../../utils/logger';
import { formatAmount, getFrequencyLabelFull, cleanPoolName } from '../../utils/roscaUtils';
import { format, parseISO, addDays, addWeeks, addMonths, isValid } from 'date-fns';
import type { RoscaPool } from '../../types/rosca.types';

type RoscaJoinAgreementScreenParams = {
  pool: RoscaPool;
};

/**
 * Generate all payment dates based on start date, frequency, and duration
 */
function generatePaymentDates(
  startDate: string | null,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly',
  durationPeriods: number | null
): Date[] {
  if (!startDate || !durationPeriods) return [];

  const dates: Date[] = [];
  const start = parseISO(startDate);

  if (!isValid(start)) return [];

  for (let i = 0; i < durationPeriods; i++) {
    let paymentDate: Date;
    switch (frequency) {
      case 'daily':
        paymentDate = addDays(start, i);
        break;
      case 'weekly':
        paymentDate = addWeeks(start, i);
        break;
      case 'biweekly':
        paymentDate = addWeeks(start, i * 2);
        break;
      case 'monthly':
        paymentDate = addMonths(start, i);
        break;
      default:
        paymentDate = addWeeks(start, i);
    }
    dates.push(paymentDate);
  }

  return dates;
}

/**
 * Get period label based on frequency
 */
function getPeriodLabel(frequency: string, index: number): string {
  switch (frequency) {
    case 'daily':
      return `Day ${index + 1}`;
    case 'weekly':
      return `Week ${index + 1}`;
    case 'biweekly':
      return `Period ${index + 1}`;
    case 'monthly':
      return `Month ${index + 1}`;
    default:
      return `Period ${index + 1}`;
  }
}

export default function RoscaJoinAgreementScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ RoscaJoinAgreementScreen: RoscaJoinAgreementScreenParams }, 'RoscaJoinAgreementScreen'>>();

  const pool = route.params?.pool;
  const joinPoolMutation = useJoinPool();

  // Scroll tracking for scroll-to-agree
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const contentHeight = useRef(0);
  const scrollViewHeight = useRef(0);
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Check if user has scrolled to bottom (with small threshold)
  const checkIfScrolledToBottom = useCallback((scrollY: number) => {
    const threshold = 50; // Allow 50px tolerance
    const isAtBottom = scrollY + scrollViewHeight.current >= contentHeight.current - threshold;

    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
      // Animate buttons appearing
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [hasScrolledToBottom, buttonOpacity]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    checkIfScrolledToBottom(contentOffset.y);
  }, [checkIfScrolledToBottom]);

  const handleContentSizeChange = useCallback((_width: number, height: number) => {
    contentHeight.current = height;
  }, []);

  const handleLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    scrollViewHeight.current = event.nativeEvent.layout.height;
  }, []);

  // Generate payment dates
  const paymentDates = useMemo(() => {
    if (!pool) return [];
    return generatePaymentDates(pool.startDate, pool.frequency, pool.durationPeriods);
  }, [pool]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleAgree = async () => {
    if (!pool) return;

    try {
      logger.debug('Joining pool from agreement screen', 'rosca', { poolId: pool.id });
      await joinPoolMutation.mutateAsync({ poolId: pool.id });
      Alert.alert('Success', `You've joined ${cleanPoolName(pool.name)}!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      logger.error('Failed to join pool from agreement', error, 'rosca');
      Alert.alert('Error', 'Failed to join the pool. Please try again.');
    }
  };

  const handleDisagree = () => {
    navigation.goBack();
  };

  if (!pool) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.textPrimary }}>Pool not found</Text>
      </SafeAreaView>
    );
  }

  // Calculate expected payout
  const expectedPayout = pool.expectedPayout || pool.contributionAmount * pool.payoutMultiplier;

  // Format dates
  const startDateFormatted = pool.startDate && isValid(parseISO(pool.startDate))
    ? format(parseISO(pool.startDate), 'MMM d, yyyy')
    : 'TBD';

  const endDateFormatted = pool.endDate && isValid(parseISO(pool.endDate))
    ? format(parseISO(pool.endDate), 'MMM d, yyyy')
    : 'TBD';

  const registrationDeadlineFormatted = pool.registrationDeadline && isValid(parseISO(pool.registrationDeadline))
    ? format(parseISO(pool.registrationDeadline), 'MMM d, yyyy')
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Join Agreement
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          {/* Pool Title */}
          <Text style={[styles.poolTitle, { color: theme.colors.textPrimary }]}>
            {cleanPoolName(pool.name)}
          </Text>
          <Text style={[styles.poolSubtitle, { color: theme.colors.textSecondary }]}>
            {formatAmount(pool.contributionAmount, pool.currencySymbol)}/{getFrequencyLabelFull(pool.frequency).toLowerCase()} - {pool.durationPeriods} {pool.frequency === 'monthly' ? 'months' : pool.frequency === 'weekly' ? 'weeks' : 'periods'}
          </Text>

          {/* Payment Schedule Card */}
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                Payment Schedule
              </Text>
            </View>

            <View style={styles.scheduleRow}>
              <Text style={[styles.scheduleLabel, { color: theme.colors.textSecondary }]}>Contribution</Text>
              <Text style={[styles.scheduleValue, { color: theme.colors.textPrimary }]}>
                {formatAmount(pool.contributionAmount, pool.currencySymbol)} / {getFrequencyLabelFull(pool.frequency).toLowerCase()}
              </Text>
            </View>

            <View style={styles.scheduleRow}>
              <Text style={[styles.scheduleLabel, { color: theme.colors.textSecondary }]}>Expected Payout</Text>
              <Text style={[styles.scheduleValue, { color: theme.colors.success }]}>
                {formatAmount(expectedPayout, pool.currencySymbol)}
              </Text>
            </View>

            <View style={styles.scheduleRow}>
              <Text style={[styles.scheduleLabel, { color: theme.colors.textSecondary }]}>Duration</Text>
              <Text style={[styles.scheduleValue, { color: theme.colors.textPrimary }]}>
                {pool.durationPeriods} {pool.frequency === 'monthly' ? 'months' : pool.frequency === 'weekly' ? 'weeks' : 'periods'}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.scheduleRow}>
              <Text style={[styles.scheduleLabel, { color: theme.colors.textSecondary }]}>Start Date</Text>
              <Text style={[styles.scheduleValue, { color: theme.colors.textPrimary }]}>{startDateFormatted}</Text>
            </View>

            <View style={styles.scheduleRow}>
              <Text style={[styles.scheduleLabel, { color: theme.colors.textSecondary }]}>End Date</Text>
              <Text style={[styles.scheduleValue, { color: theme.colors.textPrimary }]}>{endDateFormatted}</Text>
            </View>

            {registrationDeadlineFormatted && (
              <View style={styles.scheduleRow}>
                <Text style={[styles.scheduleLabel, { color: theme.colors.textSecondary }]}>Registration Closes</Text>
                <Text style={[styles.scheduleValue, { color: theme.colors.warning }]}>{registrationDeadlineFormatted}</Text>
              </View>
            )}
          </View>

          {/* Payment Dates Card */}
          {paymentDates.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="list-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                  Your Payment Dates
                </Text>
              </View>

              {paymentDates.map((date, index) => (
                <View key={index} style={styles.dateRow}>
                  <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>
                    {getPeriodLabel(pool.frequency, index)}
                  </Text>
                  <Text style={[styles.dateValue, { color: theme.colors.textPrimary }]}>
                    {format(date, 'MMM d, yyyy')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Warning Card */}
          <View style={[styles.warningCard, { backgroundColor: `${theme.colors.warning}15`, borderColor: theme.colors.warning }]}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning-outline" size={22} color={theme.colors.warning} />
              <Text style={[styles.warningTitle, { color: theme.colors.warning }]}>
                Important - Please Read
              </Text>
            </View>

            <View style={styles.warningContent}>
              <View style={styles.warningItem}>
                <Ionicons name="lock-closed" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.warningText, { color: theme.colors.textPrimary }]}>
                  Missing payments may lock your Swap account
                </Text>
              </View>

              <View style={styles.warningItem}>
                <Ionicons name="document-text" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.warningText, { color: theme.colors.textPrimary }]}>
                  By joining, you commit to ALL payments in the schedule
                </Text>
              </View>

              <View style={styles.warningItem}>
                <Ionicons name="calendar" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.warningText, { color: theme.colors.textPrimary }]}>
                  Use the Rosca Calendar to track your payment dates
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Section */}
      <View style={[styles.buttonContainer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
        {!hasScrolledToBottom ? (
          // Scroll hint when not at bottom
          <View style={styles.scrollHint}>
            <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.scrollHintText, { color: theme.colors.textSecondary }]}>
              Scroll down to read the full agreement
            </Text>
          </View>
        ) : (
          // Buttons appear after scrolling to bottom
          <Animated.View style={{ opacity: buttonOpacity }}>
            <TouchableOpacity
              style={[styles.agreeButton, { backgroundColor: theme.colors.primary, opacity: joinPoolMutation.isPending ? 0.6 : 1 }]}
              onPress={handleAgree}
              disabled={joinPoolMutation.isPending}
              activeOpacity={0.8}
            >
              {joinPoolMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.agreeButtonText}>I Agree - Join Rosca</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.disagreeButton, { borderColor: theme.colors.border, marginTop: 10 }]}
              onPress={handleDisagree}
              disabled={joinPoolMutation.isPending}
              activeOpacity={0.8}
            >
              <Text style={[styles.disagreeButtonText, { color: theme.colors.textSecondary }]}>
                I Do Not Agree
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
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
    paddingBottom: 24,
  },
  poolTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  poolSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scheduleLabel: {
    fontSize: 14,
  },
  scheduleValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dateLabel: {
    fontSize: 13,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  warningCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  warningContent: {
    gap: 10,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  scrollHintText: {
    fontSize: 14,
    fontWeight: '500',
  },
  agreeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  agreeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disagreeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  disagreeButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
