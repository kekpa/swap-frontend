import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
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
  type: 'payment_due' | 'registration_deadline' | 'pool_starts';
  name: string;
  amount: number;
  frequency: string;
  color: string;
  poolId?: string;
}

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

export default function RoscaCalendarScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const entityId = useCurrentEntityId();

  // Data hooks - use 'upcoming' scope for calendar to show all future pools
  const { data: pools = [] } = useRoscaPools({ scope: 'upcoming', months: 6, sort: 'recommended' });
  const { data: enrollments = [] } = useRoscaEnrollments(entityId ?? '', {
    enabled: !!entityId,
  });

  // State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Calculate calendar events from rosca data
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const extendedStart = addDays(monthStart, -7);
    const extendedEnd = addDays(monthEnd, 7);

    // Add enrolled rosca events (payment due dates)
    enrollments
      .filter(e => e.status === 'active')
      .forEach((enrollment) => {
        if (enrollment.nextPaymentDue) {
          const baseDate = parseISO(enrollment.nextPaymentDue);
          if (isValid(baseDate)) {
            // Generate recurring dates based on frequency
            const freq = enrollment.frequency || 'monthly';
            const dates = generateRecurrenceDates(baseDate, freq, monthStart, monthEnd);

            dates.forEach(date => {
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

  // Navigation handlers
  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleBack = () => navigation.goBack();

  const handleDatePress = (date: Date) => {
    setSelectedDate(date);
  };

  const handleEventPress = (event: CalendarEvent) => {
    if (event.type === 'payment_due') {
      // Find the enrollment and navigate to detail
      const enrollmentId = event.id.replace('payment-', '').split('-')[0];
      const enrollment = enrollments.find(e => e.id === enrollmentId);
      if (enrollment) {
        (navigation as any).navigate('RoscaDetailScreen', { enrollment });
      }
    } else {
      // Navigate to join rosca screen for registration deadlines and pool starts
      (navigation as any).navigate('JoinRoscaScreen');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Calendar
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: theme.colors.textPrimary }]}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textPrimary} />
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
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            // Group events by type for colored dots
            const hasPaymentDue = events.some(e => e.type === 'payment_due');
            const hasDeadline = events.some(e => e.type === 'registration_deadline');
            const hasPoolStart = events.some(e => e.type === 'pool_starts');

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
                    { color: isCurrentMonth ? theme.colors.textPrimary : theme.colors.textTertiary },
                    isToday && { fontWeight: '700' },
                  ]}
                >
                  {format(day, 'd')}
                </Text>

                {/* Event Dots - show different colors for different event types */}
                {(hasPaymentDue || hasDeadline || hasPoolStart) && (
                  <View style={styles.dotsContainer}>
                    {hasPaymentDue && (
                      <View style={[styles.eventDot, { backgroundColor: theme.colors.primary }]} />
                    )}
                    {hasDeadline && (
                      <View style={[styles.eventDot, { backgroundColor: theme.colors.warning }]} />
                    )}
                    {hasPoolStart && (
                      <View style={[styles.eventDot, { backgroundColor: theme.colors.success }]} />
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
            <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
            <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
              Payment Due
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
            <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
              Last Day to Join
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
            <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
              Pool Starts
            </Text>
          </View>
        </View>

        {/* Selected Date Events */}
        {selectedDate && selectedDateEvents.length > 0 && (
          <View style={[styles.eventsList, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.eventsTitle, { color: theme.colors.textPrimary }]}>
              {format(selectedDate, 'EEEE, MMMM d')}
            </Text>
            {selectedDateEvents.map(event => {
              // Get event type label
              const typeLabel = event.type === 'payment_due'
                ? 'Payment Due'
                : event.type === 'registration_deadline'
                  ? 'Last Day to Join'
                  : 'Pool Starts';

              return (
                <TouchableOpacity
                  key={event.id}
                  style={[styles.eventItem, { borderColor: theme.colors.border }]}
                  onPress={() => handleEventPress(event)}
                >
                  <View style={[styles.eventColor, { backgroundColor: event.color }]} />
                  <View style={styles.eventInfo}>
                    <Text style={[styles.eventName, { color: theme.colors.textPrimary }]}>
                      {event.name}
                    </Text>
                    <Text style={[styles.eventDetails, { color: theme.colors.textSecondary }]}>
                      {typeLabel} • G{event.amount.toLocaleString()}/{event.frequency}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Empty state when no events on selected date */}
        {selectedDate && selectedDateEvents.length === 0 && (
          <View style={styles.hintContainer}>
            <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
              No pool events on this day
            </Text>
          </View>
        )}

        {/* Hint when no date selected */}
        {!selectedDate && (
          <View style={styles.hintContainer}>
            <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
              Tap a date to see details
            </Text>
          </View>
        )}
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
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  navButton: {
    padding: 4,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
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
    marginTop: 2,
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
  eventsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
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
});
