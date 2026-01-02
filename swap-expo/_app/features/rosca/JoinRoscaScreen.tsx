import React, { useState, useMemo } from 'react';
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
import { formatAmount, getFrequencyLabelFull, cleanPoolName } from '../../utils/roscaUtils';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import type { RoscaPool } from '../../types/rosca.types';

// Transform backend frequency to display format
function transformFrequency(freq: string): 'day' | 'week' | 'month' {
  if (freq === 'daily') return 'day';
  if (freq === 'weekly') return 'week';
  if (freq === 'monthly') return 'month';
  return 'week';
}

// Get frequency unit for duration display
function getFrequencyUnit(freq: string): string {
  switch (freq) {
    case 'daily': return 'days';
    case 'weekly': return 'weeks';
    case 'biweekly': return 'bi-wks';
    case 'monthly': return 'months';
    default: return 'periods';
  }
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
          {cleanPoolName(pool.name)}
        </Text>
        <Text style={[styles.poolMembers, { color: theme.colors.textSecondary, backgroundColor: theme.colors.grayUltraLight }]}>
          {pool.memberCount || 0}/{pool.maxMembers || pool.durationPeriods || 10} members
        </Text>
      </View>

      {/* Stats row - now full width without Join button */}
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
        <View style={styles.poolStat}>
          <Text style={[styles.poolStatValue, { color: theme.colors.textPrimary }]}>
            {pool.durationPeriods} {getFrequencyUnit(pool.frequency)}
          </Text>
          <Text style={[styles.poolStatLabel, { color: theme.colors.textSecondary }]}>
            Duration
          </Text>
        </View>
      </View>

      {/* Bottom row: dates + Join button */}
      <View style={styles.poolBottomRow}>
        <View style={styles.cohortDates}>
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
                  ? `${daysUntilDeadline} day${daysUntilDeadline !== 1 ? 's' : ''} left`
                  : daysUntilDeadline === 0
                    ? 'Last day!'
                    : 'Closed'}
              </Text>
            </View>
          )}
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
    </View>
  );
}

// Frequency filter options
const FREQUENCY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Bi-weekly' },
  { key: 'monthly', label: 'Monthly' },
] as const;

// Sort options
const SORT_OPTIONS = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'payout', label: 'Highest Payout' },
  { key: 'contribution', label: 'Lowest Price' },
  { key: 'duration', label: 'Shortest Duration' },
  { key: 'popular', label: 'Most Popular' },
] as const;

type FrequencyFilter = typeof FREQUENCY_FILTERS[number]['key'];
type SortOption = typeof SORT_OPTIONS[number]['key'];

export default function JoinRoscaScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();

  // Filter and sort state
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [showSortPicker, setShowSortPicker] = useState(false);

  // Real data hooks - pass sort to API
  const { data: pools = [], isLoading } = useRoscaPools({ sort: sortBy });
  const joinPoolMutation = useJoinPool();

  // Filter pools by frequency and availability
  const availablePools = useMemo(() => {
    return pools.filter(p => {
      // Filter out full pools
      if (p.availableSlots !== null && p.availableSlots !== undefined && p.availableSlots <= 0) {
        return false;
      }
      // Filter by frequency
      if (frequencyFilter !== 'all' && p.frequency !== frequencyFilter) {
        return false;
      }
      return true;
    });
  }, [pools, frequencyFilter]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCalendarPress = () => {
    (navigation as any).navigate('RoscaCalendarScreen');
  };

  const handleJoinPool = (pool: RoscaPool) => {
    const poolDisplayName = cleanPoolName(pool.name);
    Alert.alert(
      'Join Rosca',
      `Join ${poolDisplayName} for ${formatAmount(pool.contributionAmount, pool.currencySymbol)}/${getFrequencyLabelFull(pool.frequency)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: async () => {
            try {
              logger.debug('Joining pool', 'rosca', { poolId: pool.id, poolName: poolDisplayName });
              await joinPoolMutation.mutateAsync({ poolId: pool.id });
              Alert.alert('Success', `You've joined ${poolDisplayName}!`);
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

      {/* Sticky Filter & Sort Section */}
      <View style={[styles.stickySection, { backgroundColor: theme.colors.background }]}>
        {/* Frequency Filter Bar */}
        <View style={styles.filterBar}>
          {FREQUENCY_FILTERS.map((filter) => {
            const isActive = frequencyFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setFrequencyFilter(filter.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? theme.colors.primary : theme.colors.card,
                    borderColor: isActive ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: isActive ? '#FFFFFF' : theme.colors.textSecondary },
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sort Row */}
        <View style={styles.sortRow}>
          <Text style={[styles.sortLabel, { color: theme.colors.textSecondary }]}>
            Sort by:
          </Text>
          <TouchableOpacity
            style={[styles.sortDropdown, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => setShowSortPicker(!showSortPicker)}
            activeOpacity={0.7}
          >
            <Text style={[styles.sortDropdownText, { color: theme.colors.textPrimary }]}>
              {SORT_OPTIONS.find(o => o.key === sortBy)?.label || 'Recommended'}
            </Text>
            <Ionicons
              name={showSortPicker ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Sort Picker Dropdown */}
        {showSortPicker && (
          <View style={[styles.sortPickerContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {SORT_OPTIONS.map((option) => {
              const isSelected = sortBy === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortPickerItem,
                    isSelected && { backgroundColor: theme.colors.grayUltraLight },
                  ]}
                  onPress={() => {
                    setSortBy(option.key);
                    setShowSortPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.sortPickerItemText,
                    { color: isSelected ? theme.colors.primary : theme.colors.textPrimary },
                  ]}>
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Scrollable Pool Cards */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
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
  stickySection: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingTop: 8,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sortLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  sortDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  sortDropdownText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sortPickerContainer: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sortPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  sortPickerItemText: {
    fontSize: 14,
  },
  poolCard: {
    borderRadius: 14,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 10,
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
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  poolStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  poolStat: {
    flex: 1,
  },
  poolStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  cohortDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    flex: 1,
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
  // Cohort item styles
  cohortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cohortText: {
    fontSize: 12,
  },
});
