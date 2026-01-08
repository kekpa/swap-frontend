import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useRefreshByUser } from '../../hooks/useRefreshByUser';
import { useRoscaEnrollments } from '../../hooks-data/useRoscaEnrollments';
import { useCurrentEntityId } from '../../hooks/useCurrentEntityId';
import logger from '../../utils/logger';
import { formatAmount, cleanPoolName } from '../../utils/roscaUtils';
import type { RoscaEnrollment } from '../../types/rosca.types';

// UI format for active roscas
interface ActiveRoscaUI {
  id: string;
  name: string;
  isPayoutTurn: boolean;
  payoutAmount: number;
  contributionAmount: number;
  frequency: string;
  daysLeft: number;
  queuePosition: number;
  totalMembers: number;
  totalContributed: number;
  progress: number;
  currencySymbol: string;
}

// UI format for completed roscas
interface CompletedRoscaUI {
  id: string;
  name: string;
  payoutReceived: number;
  totalContributed: number;
  completedDate: string;
  currencySymbol: string;
}

// Transform backend frequency to UI format
function transformFrequency(freq: string): string {
  if (freq === 'daily') return 'day';
  if (freq === 'weekly') return 'week';
  if (freq === 'monthly') return 'month';
  return freq;
}

// Transform active enrollment to UI format
function transformActiveEnrollment(enrollment: RoscaEnrollment): ActiveRoscaUI {
  return {
    id: enrollment.id,
    name: cleanPoolName(enrollment.poolName),
    isPayoutTurn: enrollment.isYourTurn,
    payoutAmount: enrollment.expectedPayout,
    contributionAmount: enrollment.contributionAmount,
    frequency: transformFrequency(enrollment.frequency),
    daysLeft: enrollment.daysUntilNextPayment,
    queuePosition: enrollment.queuePosition,
    totalMembers: enrollment.totalMembers,
    totalContributed: enrollment.totalContributed,
    progress: enrollment.totalMembers > 0
      ? enrollment.queuePosition / enrollment.totalMembers
      : 0,
    currencySymbol: enrollment.currencySymbol,
  };
}

// Transform completed enrollment to UI format
function transformCompletedEnrollment(enrollment: RoscaEnrollment): CompletedRoscaUI {
  return {
    id: enrollment.id,
    name: cleanPoolName(enrollment.poolName),
    payoutReceived: enrollment.expectedPayout,
    totalContributed: enrollment.totalContributed,
    completedDate: enrollment.joinedAt, // Using joinedAt as fallback, ideally we'd have completedAt
    currencySymbol: enrollment.currencySymbol,
  };
}

type TabType = 'active' | 'completed';

// --- Tab Bar ---
function TabBar({
  activeTab,
  onTabChange,
  activeCount,
  completedCount,
}: {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  activeCount: number;
  completedCount: number;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.tabBar, { backgroundColor: theme.colors.background }]}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'active' && [styles.activeTab, { borderColor: theme.colors.primary }],
        ]}
        onPress={() => onTabChange('active')}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'active' ? theme.colors.primary : theme.colors.textSecondary },
          ]}
        >
          Active ({activeCount})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'completed' && [styles.activeTab, { borderColor: theme.colors.primary }],
        ]}
        onPress={() => onTabChange('completed')}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'completed' ? theme.colors.primary : theme.colors.textSecondary },
          ]}
        >
          Completed ({completedCount})
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// --- Summary Card (Neutral colored) ---
function SummaryCard({
  isActive,
  activeData,
  completedData,
  currencySymbol,
}: {
  isActive: boolean;
  activeData: { totalActive: number; totalContributed: number; nextPayout: number };
  completedData: { totalCompleted: number; totalContributed: number; totalReceived: number };
  currencySymbol: string;
}) {
  const { theme } = useTheme();

  if (isActive) {
    return (
      <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
              {activeData.totalActive}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Active</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
              {formatAmount(activeData.totalContributed, currencySymbol)}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Contributed</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
              {formatAmount(activeData.nextPayout, currencySymbol)}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Next Payout</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryStat}>
          <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
            {completedData.totalCompleted}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Completed</Text>
        </View>
        <View style={styles.summaryStat}>
          <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
            {formatAmount(completedData.totalContributed, currencySymbol)}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Contributed</Text>
        </View>
        <View style={styles.summaryStat}>
          <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
            {formatAmount(completedData.totalReceived, currencySymbol)}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Received</Text>
        </View>
      </View>
    </View>
  );
}

// --- Active Rosca Card ---
function ActiveRoscaCard({
  rosca,
  onPress,
}: {
  rosca: ActiveRoscaUI;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.roscaCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.roscaCardHeader}>
        <View style={styles.roscaCardInfo}>
          <Text style={[styles.roscaCardName, { color: theme.colors.textPrimary }]}>{rosca.name}</Text>
          {rosca.isPayoutTurn && (
            <View style={[styles.yourTurnBadge, { backgroundColor: theme.colors.successLight }]}>
              <Ionicons name="star" size={10} color={theme.colors.success} />
              <Text style={[styles.yourTurnText, { color: theme.colors.success }]}>Your Turn</Text>
            </View>
          )}
        </View>
        <View style={[styles.positionBadge, { backgroundColor: theme.colors.grayUltraLight }]}>
          <Text style={[styles.positionText, { color: theme.colors.textSecondary }]}>
            #{rosca.queuePosition}/{rosca.totalMembers}
          </Text>
        </View>
      </View>

      <View style={styles.roscaCardStats}>
        <View style={styles.roscaCardStat}>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
            {formatAmount(rosca.isPayoutTurn ? rosca.payoutAmount : rosca.contributionAmount, rosca.currencySymbol)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            {rosca.isPayoutTurn ? 'Payout' : `/${rosca.frequency}`}
          </Text>
        </View>
        <View style={styles.roscaCardStat}>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
            {rosca.daysLeft}d
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Left</Text>
        </View>
        <View style={styles.roscaCardStat}>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
            {formatAmount(rosca.totalContributed, rosca.currencySymbol)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Paid</Text>
        </View>
      </View>

      <View style={[styles.progressBar, { backgroundColor: theme.colors.grayUltraLight }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: rosca.isPayoutTurn ? theme.colors.success : theme.colors.primary,
              width: `${rosca.progress * 100}%`,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

// --- Completed Rosca Card ---
function CompletedRoscaCard({
  rosca,
}: {
  rosca: CompletedRoscaUI;
}) {
  const { theme } = useTheme();
  const date = new Date(rosca.completedDate).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={[styles.roscaCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.roscaCardHeader}>
        <Text style={[styles.roscaCardName, { color: theme.colors.textPrimary }]}>{rosca.name}</Text>
        <View style={[styles.completedBadge, { backgroundColor: theme.colors.successLight }]}>
          <Ionicons name="checkmark-circle" size={12} color={theme.colors.success} />
          <Text style={[styles.completedText, { color: theme.colors.success }]}>Completed</Text>
        </View>
      </View>

      <View style={styles.roscaCardStats}>
        <View style={styles.roscaCardStat}>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
            {formatAmount(rosca.totalContributed, rosca.currencySymbol)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Contributed</Text>
        </View>
        <View style={styles.roscaCardStat}>
          <Text style={[styles.statValue, { color: theme.colors.success }]}>
            {formatAmount(rosca.payoutReceived, rosca.currencySymbol)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Received</Text>
        </View>
        <View style={styles.roscaCardStat}>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{date}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Date</Text>
        </View>
      </View>
    </View>
  );
}

// --- Main Screen ---
export default function MyRoscasScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  // Get initial tab from route params (if coming from "See all" link)
  const initialTab = (route.params as any)?.tab || 'active';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Real data hooks
  const entityId = useCurrentEntityId();
  const { data: enrollments = [], refetch: refetchEnrollments } = useRoscaEnrollments(entityId ?? '', {
    enabled: !!entityId,
  });

  // Transform and filter enrollments
  const activeRoscas: ActiveRoscaUI[] = enrollments
    .filter(e => e.status === 'active')
    .map(transformActiveEnrollment);
  const completedRoscas: CompletedRoscaUI[] = enrollments
    .filter(e => e.status === 'completed')
    .map(transformCompletedEnrollment);

  const { refreshing, onRefresh } = useRefreshByUser(async () => {
    logger.debug('MyRoscasScreen refresh triggered', 'rosca');
    await refetchEnrollments();
  });

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCalendarPress = () => {
    (navigation as any).navigate('RoscaCalendarScreen');
  };

  const handleRoscaPress = (rosca: ActiveRoscaUI) => {
    // Navigate to RoscaDetailScreen with enrollment data
    const enrollment = {
      id: rosca.id,
      roscaName: rosca.name,
      contributionAmount: rosca.contributionAmount,
      frequency: rosca.frequency,
      payoutAmount: rosca.payoutAmount,
      isPayoutTurn: rosca.isPayoutTurn,
      daysUntilNextPayment: rosca.daysLeft,
      totalContributed: rosca.totalContributed,
      progress: rosca.progress,
      queuePosition: rosca.queuePosition,
      totalMembers: rosca.totalMembers,
    };
    (navigation as any).navigate('RoscaDetailScreen', { enrollment });
  };

  const handleJoinRosca = () => {
    (navigation as any).navigate('JoinRoscaScreen');
  };

  // Calculate summary data from real data
  const activeSummary = {
    totalActive: activeRoscas.length,
    totalContributed: activeRoscas.reduce((sum, r) => sum + r.totalContributed, 0),
    nextPayout: activeRoscas.find((r) => r.isPayoutTurn)?.payoutAmount || 0,
  };

  const completedSummary = {
    totalCompleted: completedRoscas.length,
    totalContributed: completedRoscas.reduce((sum, r) => sum + r.totalContributed, 0),
    totalReceived: completedRoscas.reduce((sum, r) => sum + r.payoutReceived, 0),
  };

  // Get currency symbol from data (first available rosca)
  const currencySymbol = activeRoscas[0]?.currencySymbol || completedRoscas[0]?.currencySymbol || '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>My Roscas</Text>
        <TouchableOpacity onPress={handleCalendarPress} style={styles.calendarButton}>
          <Ionicons name="calendar-outline" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeCount={activeRoscas.length}
        completedCount={completedRoscas.length}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Summary Card */}
        <SummaryCard
          isActive={activeTab === 'active'}
          activeData={activeSummary}
          completedData={completedSummary}
          currencySymbol={currencySymbol}
        />

        {/* Rosca List */}
        {activeTab === 'active' ? (
          activeRoscas.map((rosca) => (
            <ActiveRoscaCard key={rosca.id} rosca={rosca} onPress={() => handleRoscaPress(rosca)} />
          ))
        ) : (
          completedRoscas.map((rosca) => <CompletedRoscaCard key={rosca.id} rosca={rosca} />)
        )}
      </ScrollView>

      {/* Floating Action Button - Join Rosca */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleJoinRosca}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={19} color="#FFFFFF" />
        <Text style={styles.fabText}>Join Rosca</Text>
      </TouchableOpacity>
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
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 30,
  },
  // Summary Card (Neutral)
  summaryCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  // Rosca Card
  roscaCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  roscaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roscaCardInfo: {
    flex: 1,
    gap: 6,
  },
  roscaCardName: {
    fontSize: 16,
    fontWeight: '600',
  },
  yourTurnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
  },
  yourTurnText: {
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
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Stats
  roscaCardStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  roscaCardStat: {},
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  // Progress
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
