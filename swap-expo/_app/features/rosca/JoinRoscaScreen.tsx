import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useRoscaPools } from '../../hooks-data/useRoscaPools';
import { useJoinPool } from '../../hooks-data/useRoscaEnrollments';
import logger from '../../utils/logger';
import { formatAmount, getFrequencyLabelFull } from '../../utils/roscaUtils';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import type { RoscaPool } from '../../types/rosca.types';

// Transform backend frequency to display format
function transformFrequency(freq: string): 'day' | 'week' | 'month' {
  if (freq === 'daily') return 'day';
  if (freq === 'weekly') return 'week';
  if (freq === 'monthly') return 'month';
  return 'week';
}

interface PoolCardProps {
  pool: RoscaPool;
  onJoin: () => void;
  isJoining?: boolean;
}

function PoolCard({ pool, onJoin, isJoining }: PoolCardProps) {
  const { theme } = useTheme();
  // Use expectedPayout from backend, fallback to multiplier calculation
  const expectedPayout = pool.expectedPayout || pool.contributionAmount * pool.payoutMultiplier;
  const frequency = transformFrequency(pool.frequency);

  // Calculate days until registration closes
  const daysUntilDeadline = pool.registrationDeadline
    ? differenceInDays(parseISO(pool.registrationDeadline), new Date())
    : null;

  // Format dates for display
  const startDateFormatted = pool.startDate && isValid(parseISO(pool.startDate))
    ? format(parseISO(pool.startDate), 'MMM d')
    : null;

  const deadlineFormatted = pool.registrationDeadline && isValid(parseISO(pool.registrationDeadline))
    ? format(parseISO(pool.registrationDeadline), 'MMM d')
    : null;

  return (
    <View style={[styles.poolCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.poolHeader}>
        <Text style={[styles.poolName, { color: theme.colors.textPrimary }]}>
          {pool.name}
        </Text>
        <Text style={[styles.poolMembers, { color: theme.colors.textSecondary, backgroundColor: theme.colors.grayUltraLight }]}>
          {pool.memberCount || 0}/{pool.maxMembers || pool.durationPeriods || 10} members
        </Text>
      </View>

      <View style={styles.poolBottomRow}>
        <View style={styles.poolStats}>
          <View style={styles.poolStat}>
            <Text style={[styles.poolStatValue, { color: theme.colors.textPrimary }]}>
              {formatAmount(pool.contributionAmount, pool.currencySymbol)}
            </Text>
            <Text style={[styles.poolStatLabel, { color: theme.colors.textSecondary }]}>
              {getFrequencyLabelFull(pool.frequency)}
            </Text>
          </View>
          <View style={styles.poolStat}>
            <Text style={[styles.poolStatValue, { color: theme.colors.textPrimary }]}>
              {formatAmount(expectedPayout, pool.currencySymbol)}
            </Text>
            <Text style={[styles.poolStatLabel, { color: theme.colors.textSecondary }]}>
              Payout
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.joinButton, { backgroundColor: theme.colors.primary, opacity: isJoining ? 0.6 : 1 }]}
          onPress={onJoin}
          activeOpacity={0.8}
          disabled={isJoining}
        >
          {isJoining ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.joinButtonText}>Join</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Cohort info: Start date and registration deadline */}
      {(startDateFormatted || deadlineFormatted) && (
        <View style={styles.cohortInfo}>
          {startDateFormatted && (
            <View style={styles.cohortItem}>
              <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.cohortText, { color: theme.colors.textSecondary }]}>
                Starts {startDateFormatted}
              </Text>
            </View>
          )}
          {deadlineFormatted && daysUntilDeadline !== null && (
            <View style={styles.cohortItem}>
              <Ionicons name="time-outline" size={14} color={daysUntilDeadline <= 3 ? theme.colors.warning : theme.colors.textSecondary} />
              <Text style={[styles.cohortText, { color: daysUntilDeadline <= 3 ? theme.colors.warning : theme.colors.textSecondary }]}>
                {daysUntilDeadline > 0
                  ? `${daysUntilDeadline} day${daysUntilDeadline !== 1 ? 's' : ''} left to join`
                  : daysUntilDeadline === 0
                    ? 'Last day to join!'
                    : 'Registration closed'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function JoinRoscaScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();

  // Real data hooks
  const { data: pools = [], isLoading } = useRoscaPools();
  const joinPoolMutation = useJoinPool();

  // Backend now handles registration window filtering and fill rate ranking
  // Only need to filter out full pools (availableSlots === 0)
  const availablePools = pools.filter(
    p => p.availableSlots === null || p.availableSlots === undefined || p.availableSlots > 0
  );

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCalendarPress = () => {
    (navigation as any).navigate('RoscaCalendarScreen');
  };

  const handleJoinPool = (pool: RoscaPool) => {
    Alert.alert(
      'Join Rosca',
      `Join ${pool.name} for ${formatAmount(pool.contributionAmount, pool.currencySymbol)}/${getFrequencyLabelFull(pool.frequency)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: async () => {
            try {
              logger.debug('Joining pool', 'rosca', { poolId: pool.id, poolName: pool.name });
              await joinPoolMutation.mutateAsync({ poolId: pool.id });
              Alert.alert('Success', `You've joined ${pool.name}!`);
              navigation.goBack();
            } catch (error) {
              logger.error('Failed to join pool', error, 'rosca');
              Alert.alert('Error', 'Failed to join the pool. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Available Roscas
        </Text>
        <TouchableOpacity onPress={handleCalendarPress} style={styles.calendarButton}>
          <Ionicons name="calendar-outline" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Join a savings group with friends and family. The more members, the bigger your payout!
          </Text>

          {/* Loading State */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          )}

          {/* Pool Cards */}
          {availablePools.map((pool) => (
            <PoolCard
              key={pool.id}
              pool={pool}
              onJoin={() => handleJoinPool(pool)}
              isJoining={joinPoolMutation.isPending}
            />
          ))}

          {/* Empty State */}
          {!isLoading && availablePools.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No available Roscas at the moment
              </Text>
            </View>
          )}
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
  calendarButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 14,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24,
  },
  poolCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  poolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  poolName: {
    fontSize: 17,
    fontWeight: '600',
  },
  poolMembers: {
    fontSize: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  poolBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  poolStats: {
    flexDirection: 'row',
    gap: 16,
  },
  poolStat: {},
  poolStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  poolStatLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  joinButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  // Cohort info styles
  cohortInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  cohortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cohortText: {
    fontSize: 12,
  },
});
