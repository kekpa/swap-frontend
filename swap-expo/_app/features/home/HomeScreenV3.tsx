import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useRefreshByUser } from '../../hooks/useRefreshByUser';
import { useRoscaPools } from '../../hooks-data/useRoscaPools';
import { useRoscaEnrollments } from '../../hooks-data/useRoscaEnrollments';
import { useCurrentEntityId } from '../../hooks/useCurrentEntityId';
import { useAuthContext } from '../auth/context/AuthContext';
import logger from '../../utils/logger';
import type { RoscaPool, RoscaEnrollment } from '../../types/rosca.types';

// Static announcement data (will be replaced with API later)
const STATIC_ANNOUNCEMENT = {
  id: '1',
  type: 'tip' as const,
  title: 'Welcome to Swap',
  message: 'Join a Rosca to start saving with friends and family. The more members, the bigger your payout!',
  actionLabel: 'Learn More',
};

// Transform RoscaEnrollment to UI format
interface RoscaUI {
  id: string;
  name: string;
  isPayoutTurn: boolean;
  payoutAmount: number;
  contributionAmount: number;
  frequency: string;
  daysLeft: number;
  totalContributed: number;
  progress: number;
  queuePosition?: number;
  totalMembers?: number;
}

// Transform RoscaPool to UI format
interface AvailableRoscaUI {
  id: string;
  name: string;
  contributionAmount: number;
  frequency: string;
}

// Transform backend frequency to UI format
function transformFrequency(freq: string): string {
  if (freq === 'daily') return 'day';
  if (freq === 'weekly') return 'week';
  if (freq === 'monthly') return 'month';
  return freq;
}

// Transform enrollment data to UI format
function transformEnrollment(enrollment: RoscaEnrollment): RoscaUI {
  return {
    id: enrollment.id,
    name: enrollment.poolName,
    isPayoutTurn: enrollment.isYourTurn,
    payoutAmount: enrollment.expectedPayout,
    contributionAmount: enrollment.contributionAmount,
    frequency: transformFrequency(enrollment.frequency),
    daysLeft: enrollment.daysUntilNextPayment,
    totalContributed: enrollment.totalContributed,
    progress: enrollment.totalMembers > 0
      ? enrollment.queuePosition / enrollment.totalMembers
      : 0,
    queuePosition: enrollment.queuePosition,
    totalMembers: enrollment.totalMembers,
  };
}

// Transform pool data to available rosca UI format
function transformPool(pool: RoscaPool): AvailableRoscaUI {
  return {
    id: pool.id,
    name: pool.name,
    contributionAmount: pool.contributionAmount,
    frequency: transformFrequency(pool.frequency),
  };
}

// Responsive scaling based on screen height
// iPhone SE: ~667, iPhone 16 Pro Max: ~932
const SMALL_SCREEN_HEIGHT = 700;
const useResponsiveScale = () => {
  const { height } = useWindowDimensions();
  const isLargeScreen = height > SMALL_SCREEN_HEIGHT;
  // Scale factor: 1.0 for small screens, up to 1.15 for large screens
  const scale = isLargeScreen ? Math.min(1 + (height - SMALL_SCREEN_HEIGHT) / 1500, 1.15) : 1;
  return { scale, isLargeScreen };
};

// Sort roscas: payout first, then by urgency (days left)
function sortRoscas(roscas: RoscaUI[]) {
  return [...roscas].sort((a, b) => {
    // Payout cards first
    if (a.isPayoutTurn && !b.isPayoutTurn) return -1;
    if (!a.isPayoutTurn && b.isPayoutTurn) return 1;
    // Then by days left (urgent first)
    return a.daysLeft - b.daysLeft;
  });
}

// --- Announcement Card (Full card like V2) ---
function AnnouncementCard({
  title,
  message,
  actionLabel,
  onAction,
  onDismiss,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.announcementCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.announcementHeader}>
        <View style={styles.announcementHeaderLeft}>
          <Ionicons name="bulb" size={18} color={theme.colors.info} />
          <Text style={[styles.announcementTitle, { color: theme.colors.textPrimary }]}>
            {title}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.announcementMessage, { color: theme.colors.textSecondary }]}>
        {message}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={[styles.announcementAction, { color: theme.colors.primary }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// --- Greeting Header ---
function GreetingHeader({
  firstName,
  activeCount,
  onSeeAll,
}: {
  firstName: string;
  activeCount: number;
  onSeeAll: () => void;
}) {
  const { theme } = useTheme();
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.greetingContainer}>
      <View style={styles.greetingTop}>
        <Text style={[styles.greetingText, { color: theme.colors.textPrimary }]}>
          Hello, {firstName}!
        </Text>
        <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
          {dateString}
        </Text>
      </View>
      <View style={styles.greetingBottom}>
        <Text style={[styles.activeCountText, { color: theme.colors.textSecondary }]}>
          {activeCount} active Rosca{activeCount !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
            See all →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- Payout Card (Green - Money sent to wallet, no action button) ---
function PayoutCard({
  name,
  payoutAmount,
  daysLeft,
  onPress,
  scale = 1,
}: {
  name: string;
  payoutAmount: number;
  daysLeft: number;
  onPress: () => void;
  scale?: number;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionCard,
        { backgroundColor: '#10B981', padding: 16 * scale },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardEmoji, { fontSize: 20 * scale }]}>🎉</Text>
          <Text style={[styles.cardName, { fontSize: 17 * scale }]}>{name}</Text>
        </View>
        <View style={styles.daysBadge}>
          <Text style={styles.daysBadgeText}>{daysLeft}d</Text>
        </View>
      </View>

      <Text style={[styles.cardSubtext, { fontSize: 13 * scale }]}>Your turn!</Text>
      <Text style={[styles.cardAmount, { fontSize: 32 * scale }]}>G{payoutAmount.toLocaleString()}</Text>

      <View style={styles.walletNotice}>
        <Ionicons name="checkmark-circle" size={16 * scale} color="rgba(255, 255, 255, 0.9)" />
        <Text style={[styles.walletNoticeText, { fontSize: 13 * scale }]}>Sent to your wallet</Text>
      </View>
    </TouchableOpacity>
  );
}

// --- Payment Card (Purple - Payment Due) ---
function PaymentCard({
  name,
  contributionAmount,
  frequency,
  daysLeft,
  totalContributed,
  progress,
  onPay,
  scale = 1,
}: {
  name: string;
  contributionAmount: number;
  frequency: string;
  daysLeft: number;
  totalContributed: number;
  progress: number;
  onPay: () => void;
  scale?: number;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.actionCard, { backgroundColor: theme.colors.primary, padding: 16 * scale }]}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardEmoji, { fontSize: 20 * scale }]}>💰</Text>
          <Text style={[styles.cardName, { fontSize: 17 * scale }]}>{name}</Text>
        </View>
        <View style={styles.daysBadge}>
          <Text style={styles.daysBadgeText}>{daysLeft}d</Text>
        </View>
      </View>

      <Text style={[styles.cardSubtext, { fontSize: 13 * scale }]}>Pay to continue</Text>

      <View style={styles.amountRow}>
        <Text style={[styles.cardAmount, { fontSize: 32 * scale }]}>G{contributionAmount.toLocaleString()}</Text>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { height: 5 * scale }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.actionButton, { paddingVertical: 12 * scale, marginTop: 10 * scale }]}
        onPress={onPay}
        activeOpacity={0.8}
      >
        <Text style={[styles.actionButtonText, { fontSize: 15 * scale }]}>Pay G{contributionAmount.toLocaleString()}</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- Empty State Card (for 0 roscas) ---
function EmptyStateCard({
  onBrowse,
  scale = 1,
}: {
  onBrowse: () => void;
  scale?: number;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.emptyStateCard, { backgroundColor: theme.colors.primary, padding: 20 * scale }]}>
      <Text style={[styles.emptyStateEmoji, { fontSize: 32 * scale }]}>👋</Text>
      <Text style={[styles.emptyStateTitle, { fontSize: 20 * scale }]}>Join Your First Rosca</Text>
      <Text style={[styles.emptyStateMessage, { fontSize: 14 * scale }]}>
        Start saving with friends & family!
      </Text>
      <TouchableOpacity
        style={[styles.emptyStateBrowseButton, { paddingVertical: 12 * scale, marginTop: 16 * scale }]}
        onPress={onBrowse}
        activeOpacity={0.8}
      >
        <Text style={[styles.emptyStateBrowseText, { fontSize: 15 * scale }]}>Browse All</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- Mini Rosca Card (for horizontal scroll) ---
const HORIZONTAL_ROW_HEIGHT = 52; // Same height for mini cards and + button (slightly taller)
const MAX_USER_ROSCAS_IN_ROW = 5; // Limit user roscas in row, rest shown via "See all"
const MAX_AVAILABLE_ROSCAS_IN_ROW = 5; // Limit available roscas, rest shown via "+" button
const MAX_TOTAL_IN_ROW = 10; // Total limit for horizontal row

function MiniRoscaCard({
  rosca,
  onPress,
}: {
  rosca: RoscaUI;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  // Format frequency
  const freqLabel = rosca.frequency === 'day' ? 'day' : rosca.frequency === 'week' ? 'week' : 'month';

  return (
    <TouchableOpacity
      style={[
        styles.miniCard,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
          height: HORIZONTAL_ROW_HEIGHT,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.miniCardAmount, { color: theme.colors.textPrimary }]}>
        G{rosca.contributionAmount}
      </Text>
      <Text style={[styles.miniCardFreq, { color: theme.colors.textSecondary }]}>
        /{freqLabel}
      </Text>
      <View style={[styles.miniDaysBadge, { backgroundColor: theme.colors.primary + '20' }]}>
        <Text style={[styles.miniDaysText, { color: theme.colors.primary }]}>
          {rosca.daysLeft}d
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// --- Available Rosca Mini Card (for horizontal scroll - dotted border) ---
function AvailableMiniCard({
  rosca,
  onPress,
}: {
  rosca: AvailableRoscaUI;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  // Format frequency
  const freqLabel = rosca.frequency === 'day' ? 'day' : rosca.frequency === 'week' ? 'week' : 'month';

  return (
    <TouchableOpacity
      style={[
        styles.availableMiniCard,
        {
          backgroundColor: theme.colors.card, // Lighter background
          borderColor: theme.colors.textSecondary + '50', // Subtle dotted border
          height: HORIZONTAL_ROW_HEIGHT,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Amount + frequency (default name format) */}
      <Text style={[styles.availableMiniAmount, { color: theme.colors.textPrimary }]}>
        G{rosca.contributionAmount}
      </Text>
      <Text style={[styles.availableMiniFreq, { color: theme.colors.textSecondary }]}>
        /{freqLabel}
      </Text>
      {/* Join badge in purple */}
      <View style={styles.availableJoinBadge}>
        <Text style={[styles.availableJoinText, { color: theme.colors.primary }]}>Join</Text>
        <Ionicons name="arrow-forward" size={10} color={theme.colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

// --- Horizontal Rosca Row ---
function RoscaHorizontalRow({
  roscas,
  displayedRoscaIds,
  availableRoscas,
  onRoscaPress,
  onAvailablePress,
  onAddPress,
}: {
  roscas: RoscaUI[];
  displayedRoscaIds: string[];
  availableRoscas: AvailableRoscaUI[];
  onRoscaPress: (rosca: RoscaUI) => void;
  onAvailablePress: (rosca: AvailableRoscaUI) => void;
  onAddPress: () => void;
}) {
  const { theme } = useTheme();
  // Show roscas that are not displayed as main cards
  const allRemainingRoscas = roscas.filter(r => !displayedRoscaIds.includes(r.id));

  // Limit user roscas shown in row - rest accessible via "See all"
  const remainingRoscas = allRemainingRoscas.slice(0, MAX_USER_ROSCAS_IN_ROW);

  // Calculate how many available roscas can fit
  // Total row limit minus user roscas shown
  const slotsForAvailable = Math.min(
    MAX_AVAILABLE_ROSCAS_IN_ROW,
    MAX_TOTAL_IN_ROW - remainingRoscas.length
  );
  const visibleAvailableRoscas = availableRoscas.slice(0, Math.max(0, slotsForAvailable));

  return (
    <View style={styles.horizontalRowWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalRowContent}
        style={styles.horizontalRow}
      >
        {/* User's remaining roscas first (up to MAX_USER_ROSCAS_IN_ROW) */}
        {remainingRoscas.map((rosca) => (
          <MiniRoscaCard
            key={rosca.id}
            rosca={rosca}
            onPress={() => onRoscaPress(rosca)}
          />
        ))}
        {/* Then available roscas (fills remaining slots up to MAX_TOTAL_IN_ROW) */}
        {visibleAvailableRoscas.map((rosca) => (
          <AvailableMiniCard
            key={rosca.id}
            rosca={rosca}
            onPress={() => onAvailablePress(rosca)}
          />
        ))}
      </ScrollView>

      {/* Fixed "+" button on the right, overlaying scroll */}
      <TouchableOpacity
        style={[
          styles.addButtonOverlay,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border, // Same as active roscas
            height: HORIZONTAL_ROW_HEIGHT,
            width: HORIZONTAL_ROW_HEIGHT,
          },
        ]}
        onPress={onAddPress}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={24} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

// --- Main Home Screen V3 ---
export default function HomeScreenV3() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { scale } = useResponsiveScale();
  const { user } = useAuthContext();

  const [showAnnouncement, setShowAnnouncement] = useState(true);

  // Real data hooks
  const entityId = useCurrentEntityId();
  const { data: pools = [], isLoading: poolsLoading, refetch: refetchPools } = useRoscaPools();
  const { data: enrollments = [], isLoading: enrollmentsLoading, refetch: refetchEnrollments } = useRoscaEnrollments(entityId ?? '', {
    enabled: !!entityId,
  });

  // Transform backend data to UI format
  const userRoscas: RoscaUI[] = enrollments
    .filter(e => e.status === 'active')
    .map(transformEnrollment);
  const availableRoscas: AvailableRoscaUI[] = pools
    .filter(p => p.status === 'active')
    .map(transformPool);

  // Pull-to-refresh with real refetch
  const { refreshing, onRefresh } = useRefreshByUser(async () => {
    logger.debug('Pull-to-refresh triggered', 'data');
    await Promise.all([refetchPools(), refetchEnrollments()]);
    logger.debug('Refresh complete', 'data');
  });

  // Sort roscas by priority
  const sortedRoscas = sortRoscas(userRoscas);

  // Card display logic: max 1 payout + 1 payment
  // If multiple payouts exist, only show the most urgent one
  const payoutRoscas = sortedRoscas.filter(r => r.isPayoutTurn);
  const paymentRoscas = sortedRoscas.filter(r => !r.isPayoutTurn);

  const displayedRoscas: RoscaUI[] = [];
  if (payoutRoscas.length > 0) {
    displayedRoscas.push(payoutRoscas[0]); // Only 1 payout (most urgent)
  }
  if (paymentRoscas.length > 0) {
    displayedRoscas.push(paymentRoscas[0]); // Only 1 payment (most urgent)
  }

  const handlePayPress = (rosca: RoscaUI) => {
    Alert.alert(
      'Pay',
      `Pay G${rosca.contributionAmount} for ${rosca.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pay Now', onPress: () => logger.debug('Payment initiated', 'rosca') },
      ]
    );
  };

  const handlePayoutCardPress = (rosca: RoscaUI) => {
    // Navigate to wallet tab to check balance
    // Use getParent to navigate to sibling tab from nested stack
    (navigation as any).getParent()?.navigate('Wallet');
  };

  const handleSeeAll = () => {
    (navigation as any).navigate('MyRoscasScreen');
  };

  const handleJoinRosca = () => {
    (navigation as any).navigate('JoinRoscaScreen');
  };

  const handleRoscaPress = (rosca: RoscaUI) => {
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

  const handleAvailableRoscaPress = (rosca: AvailableRoscaUI) => {
    // Navigate to JoinRoscaScreen with pre-selected rosca
    logger.debug('Available rosca pressed', 'rosca', { roscaId: rosca.id });
    (navigation as any).navigate('JoinRoscaScreen', { rosca });
  };

  const handleAnnouncementAction = () => {
    Alert.alert(
      'Learn More',
      'Roscas are a traditional savings system where members contribute regularly and take turns receiving the pooled funds.',
      [{ text: 'Got it' }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
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
        {/* Announcement Card (Full card like V2) */}
        {showAnnouncement && (
          <AnnouncementCard
            title={STATIC_ANNOUNCEMENT.title}
            message={STATIC_ANNOUNCEMENT.message}
            actionLabel={STATIC_ANNOUNCEMENT.actionLabel}
            onAction={handleAnnouncementAction}
            onDismiss={() => setShowAnnouncement(false)}
          />
        )}

        {/* Greeting Header */}
        <GreetingHeader
          firstName={user?.firstName || 'User'}
          activeCount={userRoscas.length}
          onSeeAll={handleSeeAll}
        />

        {/* Priority Cards (max 2) OR Empty State */}
        <View style={[styles.cardsContainer, { gap: 12 * scale }]}>
          {userRoscas.length === 0 ? (
            <EmptyStateCard onBrowse={handleJoinRosca} scale={scale} />
          ) : (
            displayedRoscas.map((rosca) =>
              rosca.isPayoutTurn ? (
                <PayoutCard
                  key={rosca.id}
                  name={rosca.name}
                  payoutAmount={rosca.payoutAmount}
                  daysLeft={rosca.daysLeft}
                  onPress={() => handlePayoutCardPress(rosca)}
                  scale={scale}
                />
              ) : (
                <PaymentCard
                  key={rosca.id}
                  name={rosca.name}
                  contributionAmount={rosca.contributionAmount}
                  frequency={rosca.frequency}
                  daysLeft={rosca.daysLeft}
                  totalContributed={rosca.totalContributed}
                  progress={rosca.progress}
                  onPay={() => handlePayPress(rosca)}
                  scale={scale}
                />
              )
            )
          )}
        </View>

        {/* Horizontal Rosca Row - hide scroll content when no enrollments, but keep Plus button */}
        <RoscaHorizontalRow
          roscas={userRoscas.length > 0 ? sortedRoscas : []}
          displayedRoscaIds={displayedRoscas.map(r => r.id)}
          availableRoscas={userRoscas.length > 0 ? availableRoscas : []}
          onRoscaPress={handleRoscaPress}
          onAvailablePress={handleAvailableRoscaPress}
          onAddPress={handleJoinRosca}
        />
      </ScrollView>
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
  scrollContent: {
    flexGrow: 0, // Don't stretch content
    paddingTop: 12,
    paddingBottom: 14,
    // Note: paddingHorizontal removed - applied individually to allow edge-to-edge horizontal row
  },
  // Announcement Card (Full like V2)
  announcementCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    marginHorizontal: 14, // Individual padding for edge-to-edge horizontal row
    borderWidth: 1,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  announcementHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  announcementMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  announcementAction: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Greeting Header
  greetingContainer: {
    marginBottom: 12,
    paddingHorizontal: 14, // Individual padding for edge-to-edge horizontal row
  },
  greetingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 13,
  },
  greetingBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeCountText: {
    fontSize: 13,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Empty State Card (for 0 roscas)
  emptyStateCard: {
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyStateEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  emptyStateBrowseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  emptyStateBrowseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Cards - Balanced design (fits iPhone SE, looks good on larger screens)
  cardsContainer: {
    gap: 12,
    marginBottom: 14,
    paddingHorizontal: 14, // Individual padding for edge-to-edge horizontal row
  },
  actionCard: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardEmoji: {
    fontSize: 20,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  daysBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  daysBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  cardAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 2,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 3,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Wallet notice (for payout card)
  walletNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    justifyContent: 'center',
  },
  walletNoticeText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  // Horizontal Row - Full width with overlaying "+" button
  horizontalRowWrapper: {
    position: 'relative',
  },
  horizontalRow: {
    flexGrow: 0,
    flexShrink: 0,
  },
  horizontalRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14, // Start from left edge with padding
    paddingRight: 70, // Space for the overlaying "+" button (button width + right margin + gap)
  },
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  miniCardAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  miniCardFreq: {
    fontSize: 12,
    fontWeight: '500',
  },
  miniDaysBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  miniDaysText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Available Rosca Mini Card (lighter bg, dotted border, Join in purple)
  availableMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 2,
  },
  availableMiniAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  availableMiniFreq: {
    fontSize: 12,
    fontWeight: '500',
  },
  availableJoinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 2,
  },
  availableJoinText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addButtonOverlay: {
    position: 'absolute',
    right: 14, // Match padding of other elements
    top: 0,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow: less depth, more contrast
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
