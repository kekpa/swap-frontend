import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  SectionList,
  SectionListData,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useRoscaPools } from '../../hooks-data/useRoscaPools';
import { useRoscaEnrollments } from '../../hooks-data/useRoscaEnrollments';
import { useCurrentEntityId } from '../../hooks/useCurrentEntityId';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameDay,
  startOfWeek,
  endOfWeek,
  parseISO,
  isValid,
  addDays,
  addWeeks,
} from 'date-fns';
import type { RoscaEnrollment, RoscaPool } from '../../types/rosca.types';
import { cleanPoolName } from '../../utils/roscaUtils';

// Types for calendar events
interface CalendarEvent {
  id: string;
  date: Date;
  type: 'payment_due' | 'registration_deadline' | 'pool_starts' | 'pools_available' | 'pools_expired' | 'payout' | 'joined';
  name: string;
  amount: number;
  frequency: string;
  color: string;
  poolId?: string;
  count?: number; // For pools_available type
}

// Pool with expiry flag for display
type PoolWithExpiry = RoscaPool & { isExpired: boolean };

// Section types for SectionList
type CalendarSection = {
  key: 'calendar' | 'events';
  data: PoolWithExpiry[];
};

// Generate recurrence dates for a frequency
function generateRecurrenceDates(
  startDate: Date,
  frequency: string,
  monthStart: Date,
  monthEnd: Date
): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);

  // Go back to find first occurrence before monthStart
  while (currentDate > monthStart) {
    if (frequency === 'daily') {
      currentDate = addDays(currentDate, -1);
    } else if (frequency === 'weekly') {
      currentDate = addWeeks(currentDate, -1);
    } else if (frequency === 'biweekly') {
      currentDate = addWeeks(currentDate, -2);
    } else {
      currentDate = addMonths(currentDate, -1);
    }
  }

  // Generate all occurrences within the month view
  const extendedEnd = addDays(monthEnd, 7); // Include overflow
  while (currentDate <= extendedEnd) {
    if (currentDate >= addDays(monthStart, -7) && currentDate <= extendedEnd) {
      dates.push(new Date(currentDate));
    }
    if (frequency === 'daily') {
      currentDate = addDays(currentDate, 1);
    } else if (frequency === 'weekly') {
      currentDate = addWeeks(currentDate, 1);
    } else if (frequency === 'biweekly') {
      currentDate = addWeeks(currentDate, 2);
    } else {
      currentDate = addMonths(currentDate, 1);
    }
  }

  return dates;
}

// Get color based on frequency (for list items)
function getFrequencyColor(frequency: string): string {
  switch (frequency) {
    case 'daily': return '#E74C3C';      // Red
    case 'weekly': return '#F39C12';     // Orange
    case 'biweekly': return '#F1C40F';   // Yellow
    case 'monthly': return '#3498DB';    // Blue
    default: return '#888888';
  }
}

export default function RoscaCalendarScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const entityId = useCurrentEntityId();

  // State (must be before hooks that depend on them)
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Data hooks - use month-based pagination for calendar (~420 pools/month vs 4452 total)
  const monthStartStr = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEndStr = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
  const { data: pools = [] } = useRoscaPools({
    scope: 'upcoming',
    monthStart: monthStartStr,
    monthEnd: monthEndStr,
    sort: 'recommended',
  });
  const { data: enrollments = [] } = useRoscaEnrollments(entityId ?? '', {
    enabled: !!entityId,
  });

  // Calculate calendar events from rosca data
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const extendedStart = addDays(monthStart, -7);
    const extendedEnd = addDays(monthEnd, 7);

    // Add enrolled rosca events (joined date + payment due dates)
    enrollments
      .filter(e => e.status === 'active')
      .forEach((enrollment) => {
        const joinedDate = enrollment.joinedAt ? parseISO(enrollment.joinedAt) : null;
        const freq = enrollment.frequency || 'monthly';

        // Add "Joined" event on the join date (yellow)
        if (joinedDate && isValid(joinedDate) && joinedDate >= extendedStart && joinedDate <= extendedEnd) {
          events.push({
            id: `joined-${enrollment.id}`,
            date: joinedDate,
            type: 'joined',
            name: cleanPoolName(enrollment.poolName || 'Your Rosca'),
            amount: enrollment.contributionAmount,
            frequency: freq,
            color: '#F1C40F',
          });
        }

        // Add "Payment Due" events on the fixed schedule
        if (enrollment.nextPaymentDue) {
          const baseDate = parseISO(enrollment.nextPaymentDue);
          if (isValid(baseDate)) {
            const dates = generateRecurrenceDates(baseDate, freq, monthStart, monthEnd);

            dates
              .filter(date => !joinedDate || !isValid(joinedDate) || date >= joinedDate)
              .forEach(date => {
                // Don't show payment_due on the same day as joined (avoid duplicate)
                if (joinedDate && isSameDay(date, joinedDate)) return;

                events.push({
                  id: `payment-${enrollment.id}-${date.getTime()}`,
                  date,
                  type: 'payment_due',
                  name: cleanPoolName(enrollment.poolName || 'Your Rosca'),
                  amount: enrollment.contributionAmount,
                  frequency: freq,
                  color: theme.colors.primary,
                });
              });
          }
        }
      });

    // Add available pools' cohort dates (registration deadline + start date)
    pools
      .filter(p => p.status === 'active')
      .forEach((pool) => {
        // Registration deadline
        if (pool.registrationDeadline) {
          const deadlineDate = parseISO(pool.registrationDeadline);
          if (isValid(deadlineDate) && deadlineDate >= extendedStart && deadlineDate <= extendedEnd) {
            events.push({
              id: `deadline-${pool.id}`,
              date: deadlineDate,
              type: 'registration_deadline',
              name: cleanPoolName(pool.name),
              amount: pool.contributionAmount,
              frequency: pool.frequency,
              color: theme.colors.warning,
              poolId: pool.id,
            });
          }
        }

        // Pool start date
        if (pool.startDate) {
          const startDate = parseISO(pool.startDate);
          if (isValid(startDate) && startDate >= extendedStart && startDate <= extendedEnd) {
            events.push({
              id: `start-${pool.id}`,
              date: startDate,
              type: 'pool_starts',
              name: cleanPoolName(pool.name),
              amount: pool.contributionAmount,
              frequency: pool.frequency,
              color: theme.colors.success,
              poolId: pool.id,
            });
          }
        }
      });

    // Add payout events for active enrollments (using backend payout_date)
    enrollments
      .filter(e => e.status === 'active' && !e.payoutReceived && e.payoutDate)
      .forEach((enrollment) => {
        const payoutDate = parseISO(enrollment.payoutDate!);
        if (!isValid(payoutDate)) return;

        // Only add if within the calendar view range
        if (payoutDate >= extendedStart && payoutDate <= extendedEnd) {
          events.push({
            id: `payout-${enrollment.id}`,
            date: payoutDate,
            type: 'payout',
            name: cleanPoolName(enrollment.poolName || 'Your Rosca'),
            amount: enrollment.expectedPayout,
            frequency: enrollment.frequency || 'weekly',
            color: '#2ECC71', // Green for payout
          });
        }
      });

    // Add "pools available" events for each day in the calendar
    // This shows how many pools can be joined on any given day
    const activePools = pools.filter(p => p.status === 'active' && p.registrationDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate for each day in the month view
    const daysInView = eachDayOfInterval({ start: monthStart, end: monthEnd });
    daysInView.forEach(day => {
      // Count pools where registration window includes this day
      const availablePools = activePools.filter(pool => {
        const deadline = parseISO(pool.registrationDeadline!);
        const opens = pool.registrationOpens ? parseISO(pool.registrationOpens) : null;
        // Pool appears on day X if: opens <= X <= deadline
        return isValid(deadline) && day <= deadline && (!opens || !isValid(opens) || day >= opens);
      });

      if (availablePools.length > 0) {
        const isExpired = day < today;
        events.push({
          id: `available-${day.getTime()}`,
          date: day,
          type: isExpired ? 'pools_expired' : 'pools_available',
          name: `${availablePools.length} pools ${isExpired ? 'expired' : 'available'}`,
          amount: 0,
          frequency: '',
          color: isExpired ? '#999999' : (theme.colors.info || '#4A90D9'),
          count: availablePools.length,
        });
      }
    });

    return events;
  }, [enrollments, pools, currentMonth, theme.colors]);

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(event => isSameDay(event.date, date));
  };

  // Get selected date events
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Get available pools for selected date (for full list display)
  // Uses API's recommended sort order (fill rate 30%, affordability 25%, etc.)
  const availablePoolsForDate = useMemo(() => {
    if (!selectedDate) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter but keep API's recommended sort order (no custom .sort())
    // Now includes past dates with isExpired flag
    return pools
      .filter(pool => {
        if (pool.status !== 'active' || !pool.registrationDeadline) return false;
        const deadline = parseISO(pool.registrationDeadline);
        if (!isValid(deadline) || selectedDate > deadline) return false;

        // Check registrationOpens - pool must have started registration
        if (pool.registrationOpens) {
          const opens = parseISO(pool.registrationOpens);
          if (isValid(opens) && selectedDate < opens) return false;
        }
        return true;
      })
      .map(pool => ({
        ...pool,
        isExpired: selectedDate < today,
      }));
  }, [selectedDate, pools]);

  // Get Your Roscas events (payment_due and payout)
  const yourRoscaEvents = useMemo(() => {
    return selectedDateEvents.filter(
      event => event.type === 'payment_due' || event.type === 'payout' || event.type === 'joined'
    );
  }, [selectedDateEvents]);

  // Build sections for SectionList
  const sections: CalendarSection[] = useMemo(() => {
    const result: CalendarSection[] = [];

    // Section 0: Calendar (no data items, just header)
    result.push({
      key: 'calendar',
      data: [],
    });

    // Section 1: Events (sticky header with Date + Your Roscas, data = Available Pools)
    if (selectedDate && (yourRoscaEvents.length > 0 || availablePoolsForDate.length > 0)) {
      result.push({
        key: 'events',
        data: availablePoolsForDate,
      });
    }

    return result;
  }, [selectedDate, yourRoscaEvents, availablePoolsForDate]);

  // Navigation handlers
  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };
  const handleBack = () => navigation.goBack();

  // Check if we're viewing the current month
  const isCurrentMonth = format(currentMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  const handleDatePress = (date: Date) => {
    setSelectedDate(date);
  };

  const handleEventPress = (event: CalendarEvent) => {
    // Enrollment events (user's active roscas) should go to detail screen
    if (['payment_due', 'payout', 'joined'].includes(event.type)) {
      // Extract enrollment ID from event ID (format: payment-{id}, payout-{id}, joined-{id})
      const enrollmentId = event.id.replace(/^(payment|payout|joined)-/, '');
      const enrollment = enrollments.find(e => e.id === enrollmentId);
      if (enrollment) {
        (navigation as any).navigate('RoscaDetailScreen', { enrollment });
        return;
      }
    }
    // Pool events (registration deadlines, pool starts) go to join screen
    (navigation as any).navigate('JoinRoscaScreen');
  };

  // Render section header (calendar or sticky events header)
  const renderSectionHeader = useCallback(({ section }: { section: SectionListData<PoolWithExpiry, CalendarSection> }) => {
    if (section.key === 'calendar') {
      // Calendar section: Month nav + weekday headers + calendar grid + legend
      return (
        <View style={{ backgroundColor: theme.colors.background }}>
          {/* Month Navigation with Back + Today */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={handleBack} style={styles.navButton}>
              <Ionicons name="home-outline" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.monthNavCenter}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.chevronButton}>
                <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.monthText, { color: theme.colors.textPrimary }]}>
                {format(currentMonth, 'MMMM yyyy')}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.chevronButton}>
                <Ionicons name="chevron-forward" size={22} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={isCurrentMonth ? undefined : handleToday}
              style={styles.navButton}
              disabled={isCurrentMonth}
            >
              <Ionicons
                name="today-outline"
                size={22}
                color={isCurrentMonth ? theme.colors.textTertiary : theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Weekday Headers */}
          <View style={styles.weekdayRow}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <Text key={day} style={[styles.weekdayText, { color: theme.colors.textSecondary }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              const events = getEventsForDate(day);
              const isCurrentMonthDay = day.getMonth() === currentMonth.getMonth();
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              const hasPaymentDue = events.some(e => e.type === 'payment_due');
              const hasPayout = events.some(e => e.type === 'payout');
              const hasJoined = events.some(e => e.type === 'joined');

              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const dayNormalized = new Date(day);
              dayNormalized.setHours(0, 0, 0, 0);
              const isPastDate = dayNormalized < today;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    isToday && [styles.todayCell, { borderColor: theme.colors.primary }],
                    isSelected && [styles.selectedCell, { backgroundColor: theme.colors.primaryLight }],
                  ]}
                  onPress={() => handleDatePress(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isCurrentMonthDay ? theme.colors.textPrimary : theme.colors.textTertiary },
                      isToday && { fontWeight: '700' },
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>

                  {(hasPaymentDue || hasPayout || hasJoined) && (
                    <View style={styles.dotsContainer}>
                      {hasJoined && (
                        <View style={[styles.eventDot, { backgroundColor: isPastDate ? '#F1C40F50' : '#F1C40F' }]} />
                      )}
                      {hasPaymentDue && (
                        <View style={[styles.eventDot, { backgroundColor: isPastDate ? `${theme.colors.primary}50` : theme.colors.primary }]} />
                      )}
                      {hasPayout && (
                        <View style={[styles.eventDot, { backgroundColor: isPastDate ? '#27AE6050' : '#27AE60' }]} />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F1C40F' }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
                Date Joined
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
                Payment Due
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#27AE60' }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
                Payout
              </Text>
            </View>
          </View>

          {/* Hint when no date selected */}
          {!selectedDate && (
            <View style={styles.hintContainer}>
              <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
                Tap a date to see details
              </Text>
            </View>
          )}

          {/* Empty state when no events on selected date */}
          {selectedDate && selectedDateEvents.length === 0 && availablePoolsForDate.length === 0 && (
            <View style={styles.hintContainer}>
              <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
                No pool events on this day
              </Text>
            </View>
          )}
        </View>
      );
    }

    // Events section header (STICKY): Date + Your Roscas
    if (section.key === 'events' && selectedDate) {
      return (
        <View style={[styles.stickyEventsHeader, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {/* Date Title */}
          <Text style={[styles.eventsTitle, { color: theme.colors.textPrimary }]}>
            {format(selectedDate, 'EEEE, MMMM d')}
          </Text>

          {/* Your Roscas Section */}
          {yourRoscaEvents.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>
                Your Active Roscas
              </Text>
              {yourRoscaEvents.map(event => {
                const typeLabel = event.type === 'payment_due' ? 'Payment Due' : event.type === 'joined' ? 'Date Joined' : 'Payout';
                // Payout shows total amount, payment/joined shows amount per frequency
                const amountDisplay = event.type === 'payout'
                  ? `G${event.amount.toLocaleString()}`
                  : `G${event.amount.toLocaleString()}/${event.frequency}`;
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventItem, { borderColor: theme.colors.border }]}
                    onPress={() => handleEventPress(event)}
                  >
                    <View style={[styles.eventColor, { backgroundColor: getFrequencyColor(event.frequency) }]} />
                    <View style={styles.eventInfo}>
                      <Text style={[styles.eventName, { color: theme.colors.textPrimary }]}>
                        {event.name}
                      </Text>
                      <Text style={[styles.eventDetails, { color: theme.colors.textSecondary }]}>
                        {typeLabel} • {amountDisplay}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Available Pools Header */}
          {availablePoolsForDate.length > 0 && (
            <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary, marginTop: yourRoscaEvents.length > 0 ? 8 : 2 }]}>
              {availablePoolsForDate.length} Pools {availablePoolsForDate[0]?.isExpired ? 'Expired' : 'Available'}
            </Text>
          )}
        </View>
      );
    }

    return null;
  }, [theme.colors, currentMonth, calendarDays, selectedDate, selectedDateEvents, availablePoolsForDate, yourRoscaEvents, getEventsForDate, handlePrevMonth, handleNextMonth, handleDatePress, handleEventPress, handleBack, handleToday, isCurrentMonth]);

  // Render pool item
  const renderPoolItem = useCallback(({ item: pool }: { item: PoolWithExpiry }) => {
    return (
      <View style={[styles.poolItemContainer, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={[
            styles.eventItem,
            { borderColor: theme.colors.border },
            pool.isExpired && styles.expiredPoolItem,
          ]}
          onPress={() => {
            if (!pool.isExpired) {
              (navigation as any).navigate('RoscaJoinAgreementScreen', { pool });
            }
          }}
        >
          <View style={[
            styles.eventColor,
            { backgroundColor: getFrequencyColor(pool.frequency) },
            pool.isExpired && { opacity: 0.4 },
          ]} />
          <View style={styles.eventInfo}>
            <View style={styles.poolNameRow}>
              <Text style={[
                styles.eventName,
                { color: pool.isExpired ? theme.colors.textTertiary : theme.colors.textPrimary },
              ]}>
                {cleanPoolName(pool.name)}
              </Text>
              {pool.isExpired && (
                <View style={[styles.expiredBadge, { backgroundColor: theme.colors.border }]}>
                  <Text style={[styles.expiredBadgeText, { color: theme.colors.textTertiary }]}>
                    Closed
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.eventDetails, { color: theme.colors.textSecondary }]}>
              G{pool.contributionAmount.toLocaleString()}/{pool.frequency}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      </View>
    );
  }, [theme.colors, navigation]);

  // Key extractor for pool items
  const keyExtractor = useCallback((item: PoolWithExpiry) => item.id, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SectionList
        sections={sections}
        stickySectionHeadersEnabled={true}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderPoolItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  monthNavCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  navButton: {
    padding: 8,
  },
  chevronButton: {
    padding: 4,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 140,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  dayCell: {
    width: '14.28%',
    height: 28,  // Very compact to show more list
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 2,
    borderRadius: 4,
  },
  todayCell: {
    borderWidth: 2,
  },
  selectedCell: {
    opacity: 0.8,
  },
  dayText: {
    fontSize: 14,
  },
  dotsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 18,
    gap: 2,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,     // Reduced from 16
    paddingHorizontal: 16,
    marginTop: 4,           // Reduced from 8
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
  },
  eventsList: {
    margin: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  stickyEventsHeader: {
    padding: 10,
    paddingBottom: 0,
    marginHorizontal: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  poolItemContainer: {
    marginHorizontal: 10,
    paddingHorizontal: 10,
  },
  eventsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
    marginBottom: 4,
  },
  eventColor: {
    width: 3,
    height: 32,
    borderRadius: 2,
    marginRight: 10,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 14,
    fontWeight: '500',
  },
  eventDetails: {
    fontSize: 12,
    marginTop: 2,
  },
  hintContainer: {
    padding: 20,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 14,
    textAlign: 'center',
  },
  expiredPoolItem: {
    opacity: 0.6,
  },
  poolNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expiredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expiredBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
