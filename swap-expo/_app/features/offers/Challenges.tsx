// Created: Added Challenges screen component for earning points - 2025-03-22
// Updated: Refactored to use global theme system - 2025-05-11
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/theme';

// Define types for the challenge state
type ChallengeStatus = 'active' | 'completed';

// Define types for challenge data
interface Challenge {
  id: string;
  title: string;
  description: string;
  progress?: {
    current: number;
    total: number;
    daysLeft?: number;
  };
  points: number;
  icon: keyof typeof Ionicons.glyphMap;
}

// --- ChallengeCard Sub-Component --- 
interface ChallengeCardProps { challenge: Challenge; theme: Theme; }

const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, theme }) => {
  const hasProgress = challenge.progress !== undefined;
  const progressPercentage = hasProgress && challenge.progress
    ? (challenge.progress.current / challenge.progress.total) * 100 
    : 0;

  const cardStyles = useMemo(() => StyleSheet.create({
    challengeCard: { width: '47%', backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.small, marginBottom: theme.spacing.md },
    challengeIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primaryUltraLight, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm },
    challengeTitle: { fontSize: theme.typography.fontSize.md, fontWeight: '600', color: theme.colors.textPrimary, textAlign: 'center', marginBottom: theme.spacing.xs, minHeight: 40 },
    challengeProgressInfo: { alignItems: 'center', marginBottom: theme.spacing.xs },
    challengeProgressText: { fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 2 },
    progressBarContainer: { width: '100%', height: 4, backgroundColor: theme.colors.inputBorder, borderRadius: theme.borderRadius.xs, overflow: 'hidden', marginVertical: theme.spacing.sm },
    progressBarFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.xs },
    challengePointsContainer: { marginTop: 'auto', paddingTop: theme.spacing.sm },
    challengePoints: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.sm, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs },
    challengePointsText: { color: theme.colors.white, fontSize: theme.typography.fontSize.sm, fontWeight: '600' },
  }), [theme]);

  return (
    <View style={cardStyles.challengeCard}>
      <View style={cardStyles.challengeIconContainer}><Ionicons name={challenge.icon} size={24} color={theme.colors.primary} /></View>
      <Text style={cardStyles.challengeTitle}>{challenge.title}</Text>
      {hasProgress && challenge.progress && (
        <View style={cardStyles.challengeProgressInfo}>
          <Text style={cardStyles.challengeProgressText}>{challenge.progress.current} / {challenge.progress.total} transactions</Text>
          {challenge.progress.daysLeft !== undefined && (<Text style={cardStyles.challengeProgressText}>days left: {challenge.progress.daysLeft}</Text>)}
        </View>
      )}
      {hasProgress && challenge.progress && (<View style={cardStyles.progressBarContainer}><View style={[cardStyles.progressBarFill, { width: `${progressPercentage}%` }]} /></View>)}
      <View style={cardStyles.challengePointsContainer}><View style={cardStyles.challengePoints}><Ionicons name="ellipsis-horizontal" size={12} color={theme.colors.white} style={{ marginRight: 4 }} /><Text style={cardStyles.challengePointsText}>{challenge.points}</Text></View></View>
    </View>
  );
};
// --- End ChallengeCard --- 

const ChallengesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<ChallengeStatus>('active');
  
  // Sample challenge data
  const activeChallenges: Challenge[] = [
    {
      id: '1',
      title: 'Welcome bonus',
      description: 'Complete transactions to earn bonus points',
      icon: 'gift-outline',
      progress: {
        current: 9,
        total: 150,
        daysLeft: 17,
      },
      points: 3000,
    },
    {
      id: '2',
      title: 'Budgeting goal',
      description: 'Keep your spend within your target amount',
      icon: 'shield-checkmark-outline',
      points: 10,
    },
    {
      id: '3',
      title: 'Pay from Pocket',
      description: 'Pay recurring bills from your Pocket',
      icon: 'document-text-outline',
      points: 10,
    },
  ];
  
  const completedChallenges: Challenge[] = [
    {
      id: '4',
      title: 'First Transfer',
      description: 'Complete your first transaction',
      icon: 'checkmark-circle-outline',
      progress: {
        current: 1,
        total: 1,
      },
      points: 100,
    },
  ];
  
  const handleBackPress = () => {
    navigation.goBack();
  };
  
  const handleTabChange = (tab: ChallengeStatus) => {
    setActiveTab(tab);
  };
  
  // Get the appropriate challenges based on active tab
  const challenges = activeTab === 'active' ? activeChallenges : completedChallenges;

  // Styles memoized with theme dependency
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingHorizontal: theme.spacing.md, 
      paddingVertical: theme.spacing.md, 
      backgroundColor: theme.colors.card, 
      borderBottomWidth: 1, 
      borderBottomColor: theme.colors.border,
      paddingBottom: Platform.OS === 'ios' ? theme.spacing.lg : theme.spacing.md,
    },
    backButton: { marginRight: theme.spacing.md, padding: theme.spacing.xs },
    headerTitle: { fontSize: theme.typography.fontSize.xl, fontWeight: 'bold', color: theme.colors.textPrimary },
    tabContainer: { 
      flexDirection: 'row', 
      marginHorizontal: theme.spacing.md, 
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.lg, 
      backgroundColor: theme.colors.inputBackground, 
      borderRadius: theme.borderRadius.xl, 
      padding: theme.spacing.xs 
    },
    tabButton: { flex: 1, paddingVertical: theme.spacing.sm, alignItems: 'center', borderRadius: theme.borderRadius.lg },
    activeTabButton: { backgroundColor: theme.colors.primary },
    tabButtonText: { fontSize: theme.typography.fontSize.sm, fontWeight: '500', color: theme.colors.textSecondary },
    activeTabButtonText: { color: theme.colors.white },
    scrollView: { flex: 1 },
    earningInfoCard: { marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg, padding: theme.spacing.md, backgroundColor: theme.colors.primaryUltraLight, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.primaryLight, flexDirection: 'row' },
    earningInfoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.sm },
    earningInfoContent: { flex: 1 },
    earningInfoTitle: { fontSize: theme.typography.fontSize.md, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 2 },
    earningInfoSubtitle: { fontSize: theme.typography.fontSize.sm -1, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
    earningInfoNote: { fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
    challengeGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: theme.spacing.md, gap: theme.spacing.md },
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Challenges</Text>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* Filter tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'active' && styles.activeTabButton]}
            onPress={() => handleTabChange('active')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'active' && styles.activeTabButtonText]}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'completed' && styles.activeTabButton]}
            onPress={() => handleTabChange('completed')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'completed' && styles.activeTabButtonText]}>
              Completed
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Basic Earning Info Card */}
        <View style={styles.earningInfoCard}>
          <View style={styles.earningInfoIcon}>
            <Ionicons name="card-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.earningInfoContent}>
            <Text style={styles.earningInfoTitle}>Earn with every transaction</Text>
            <Text style={styles.earningInfoSubtitle}>1 point for every 10€ spent</Text>
            <Text style={styles.earningInfoNote}>
              Complete challenges below to earn even more points!
            </Text>
          </View>
        </View>
        
        {/* Challenge grid */}
        <View style={styles.challengeGrid}>
          {challenges.map(challenge => (
            <ChallengeCard key={challenge.id} challenge={challenge} theme={theme} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChallengesScreen; 
 