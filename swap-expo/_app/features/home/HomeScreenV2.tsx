import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthContext } from '../auth/context/AuthContext';
import { useRefreshByUser } from '../../hooks/useRefreshByUser';
import { useRoscaEnrollments } from '../../hooks-data/useRoscaEnrollments';
import { useCurrentEntityId } from '../../hooks/useCurrentEntityId';
import logger from '../../utils/logger';
import QuickActionsRowV2 from './components/QuickActionsRowV2';
import AnnouncementCard, { Announcement } from './components/AnnouncementCard';
import RoscaSection from '../rosca/components/RoscaSection';
import type { RoscaEnrollment } from '../../types/rosca.types';

// TODO: Replace with actual announcements from API
const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    type: 'tip',
    title: 'Welcome to Swap',
    message: 'Join a Rosca to start saving with friends and family. The more members, the bigger your payout!',
    actionLabel: 'Learn More',
  },
];

export default function HomeScreenV2() {
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Real data from backend
  const entityId = useCurrentEntityId();
  const { data: enrollments = [], refetch: refetchEnrollments } = useRoscaEnrollments(entityId ?? '', {
    enabled: !!entityId,
  });

  // Filter active enrollments for display
  const activeEnrollments = enrollments.filter(e => e.status === 'active');
  const completedCount = enrollments.filter(e => e.status === 'completed').length;

  // Announcement state
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);
  const visibleAnnouncements = MOCK_ANNOUNCEMENTS.filter(a => !dismissedAnnouncements.includes(a.id));
  const currentAnnouncement = visibleAnnouncements[0];

  const handleDismissAnnouncement = (id: string) => {
    setDismissedAnnouncements(prev => [...prev, id]);
  };

  // Pull-to-refresh
  const { refreshing, onRefresh } = useRefreshByUser(async () => {
    logger.debug("Pull-to-refresh triggered", "data");
    await refetchEnrollments();
    logger.debug("Refresh complete", "data");
  });

  // Quick action handlers
  const handleAdd = () => {
    (navigation as any).navigate('AddMoneyModal');
  };

  const handleSend = () => {
    (navigation as any).navigate('NewInteraction');
  };

  const handleQR = () => {
    Alert.alert(
      'Coming Soon',
      'QR Code scanning will be available in a future update.',
      [{ text: 'OK' }]
    );
  };

  // TODO: Update to handleSettings when Settings page is ready
  const handleProfile = () => {
    (navigation as any).navigate('ProfileModal');
  };

  // Rosca handlers
  const handleRoscaCardPress = (enrollment: RoscaEnrollment) => {
    (navigation as any).navigate('RoscaDetailScreen', { enrollment });
  };

  const handleRoscaPayPress = (enrollment: RoscaEnrollment) => {
    // Navigate to payment screen
    (navigation as any).navigate('RoscaPaymentScreen', { enrollment });
  };

  const handleJoinRosca = () => {
    (navigation as any).navigate('JoinRoscaScreen');
  };

  const handleCompletedRoscas = () => {
    // Navigate to MyRoscasScreen with completed tab
    (navigation as any).navigate('MyRoscasScreen', { tab: 'completed' });
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
        {/* Announcement Card - single priority card */}
        {currentAnnouncement && (
          <View style={styles.announcementContainer}>
            <AnnouncementCard
              announcement={currentAnnouncement}
              onDismiss={() => handleDismissAnnouncement(currentAnnouncement.id)}
              totalCount={visibleAnnouncements.length}
              currentIndex={0}
            />
          </View>
        )}

        <RoscaSection
          enrollments={activeEnrollments}
          onCardPress={handleRoscaCardPress}
          onPayPress={handleRoscaPayPress}
          onJoinPress={handleJoinRosca}
          onCompletedPress={handleCompletedRoscas}
          completedCount={completedCount}
        />
      </ScrollView>

      <QuickActionsRowV2
        onAddPress={handleAdd}
        onSendPress={handleSend}
        onQRPress={handleQR}
        onJoinRoscaPress={handleJoinRosca}
        onProfilePress={handleProfile}
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
  scrollContent: {
    flexGrow: 1,
  },
  announcementContainer: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
});
