// Created: Added MyOffers screen component for points dashboard - 2025-03-22
import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/theme';

// Activity Item Component - Props updated to accept theme
interface ActivityItemProps {
  type: 'earn' | 'redeem';
  title: string;
  date: string;
  points: string;
  theme: Theme;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ type, title, date, points, theme }) => {
  const isEarn = type === 'earn';
  // Styles for ActivityItem, dependent on theme
  const activityItemStyles = useMemo(() => StyleSheet.create({
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    activityIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    earnIcon: {
      backgroundColor: theme.colors.success === '#10B981' ? '#dcfce7' : theme.colors.primaryUltraLight, // Example theming for earn icon bg
    },
    redeemIcon: {
      backgroundColor: theme.colors.error === '#EF4444' ? '#fee2e2' : theme.colors.grayUltraLight, // Example theming for redeem icon bg
    },
    activityInfo: {
      flex: 1,
    },
    activityItemTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs / 2,
    },
    activityItemDate: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    activityItemPoints: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
    },
    earnPoints: {
      color: theme.colors.success,
    },
    redeemPoints: {
      color: theme.colors.error,
    },
  }), [theme]);

  return (
    <View style={activityItemStyles.activityItem}>
      <View style={[activityItemStyles.activityIcon, isEarn ? activityItemStyles.earnIcon : activityItemStyles.redeemIcon]}>
        <Ionicons 
          name={isEarn ? "add" : "remove"} 
          size={18} 
          color={isEarn ? theme.colors.success : theme.colors.error} 
        />
      </View>
      <View style={activityItemStyles.activityInfo}>
        <Text style={activityItemStyles.activityItemTitle}>{title}</Text>
        <Text style={activityItemStyles.activityItemDate}>{date}</Text>
      </View>
      <Text style={[activityItemStyles.activityItemPoints, isEarn ? activityItemStyles.earnPoints : activityItemStyles.redeemPoints]}>
        {points}
      </Text>
    </View>
  );
};

const MyOffersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const handleEarnPress = () => {
    navigation.navigate('Challenges' as never);
  };
  
  const handleRedeemPress = () => {
    navigation.goBack();
  };
  
  const handleViewAllPress = () => {
    // Navigate to all activity history
    console.log('View all activity pressed');
  };
  
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Implement search functionality
  };

  // Memoize styles for MyOffersScreen
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
    },
    pointsCard: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.medium, 
    },
    pointsCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    pointsCardLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.colors.white,
      opacity: 0.8,
      marginBottom: theme.spacing.xs / 2,
    },
    pointsCardBalance: {
      fontSize: 36,
      fontWeight: 'bold',
      color: theme.colors.white,
    },
    pointsCardSubtext: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.white,
      opacity: 0.7,
      marginTop: theme.spacing.xs / 2,
    },
    pointsIconContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pointsStatsContainer: {
      flexDirection: 'row',
      marginBottom: theme.spacing.md,
      gap: theme.spacing.md,
    },
    pointsStat: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
    },
    pointsStatLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.white,
      opacity: 0.7,
      marginBottom: theme.spacing.xs / 2,
    },
    pointsStatValue: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: 'bold',
      color: theme.colors.white,
    },
    levelProgressContainer: {
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    levelProgressLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xs / 2,
    },
    levelProgressLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.white,
    },
    levelProgressMiddle: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.white,
    },
    progressBarBg: {
      height: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: theme.borderRadius.xs,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.xs,
    },
    membershipContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.xs / 2,
    },
    membershipText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.white,
      opacity: 0.8,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.white,
      opacity: 0.8,
      marginRight: theme.spacing.xs / 2,
    },
    actionButtonsContainer: {
      flexDirection: 'row',
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: theme.colors.grayUltraLight,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.small,
    },
    actionButtonIcon: {
      marginRight: theme.spacing.sm,
    },
    actionButtonText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
    },
    platinumBanner: {
      marginHorizontal: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primaryUltraLight,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.primaryLight,
      flexDirection: 'row',
      marginBottom: theme.spacing.lg,
    },
    platinumBannerIcon: {
      marginRight: theme.spacing.sm,
    },
    platinumBannerContent: {
      flex: 1,
    },
    platinumBannerTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs / 2,
    },
    platinumBannerSubtitle: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    activityContainer: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    activityHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    activityTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    viewAllText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: '500',
    },
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.pointsCard}>
          <View style={styles.pointsCardHeader}>
            <View>
              <Text style={styles.pointsCardLabel}>Your Points Balance</Text>
              <Text style={styles.pointsCardBalance}>2,450</Text>
              <Text style={styles.pointsCardSubtext}>1 point / 10 € spent</Text>
            </View>
            <View style={styles.pointsIconContainer}>
              <Ionicons name="cash-outline" size={24} color={theme.colors.white} />
            </View>
          </View>
          
          <View style={styles.pointsStatsContainer}>
            <View style={styles.pointsStat}>
              <Text style={styles.pointsStatLabel}>This Month</Text>
              <Text style={styles.pointsStatValue}>+350 pts</Text>
            </View>
            <View style={styles.pointsStat}>
              <Text style={styles.pointsStatLabel}>Expiring Soon</Text>
              <Text style={styles.pointsStatValue}>200 pts</Text>
            </View>
          </View>
          
          <View style={styles.levelProgressContainer}>
            <View style={styles.levelProgressLabels}>
              <Text style={styles.levelProgressLabel}>Gold</Text>
              <Text style={styles.levelProgressMiddle}>2450/5000</Text>
              <Text style={styles.levelProgressLabel}>Platinum</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '49%' }]} />
            </View>
          </View>
          
          <View style={styles.membershipContainer}>
            <Text style={styles.membershipText}>Member Since Aug 2023</Text>
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>Gold Status</Text>
              <Ionicons name="star" size={16} color="#FFCA28" />
            </View>
          </View>
        </View>
        
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleEarnPress}>
            <Ionicons name="add" size={20} color={theme.colors.textSecondary} style={styles.actionButtonIcon} />
            <Text style={styles.actionButtonText}>Earn</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleRedeemPress}>
            <Ionicons name="cash-outline" size={20} color={theme.colors.textSecondary} style={styles.actionButtonIcon} />
            <Text style={styles.actionButtonText}>Redeem</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.platinumBanner}>
          <Ionicons name="time-outline" size={20} color={theme.colors.primary} style={styles.platinumBannerIcon} />
          <View style={styles.platinumBannerContent}>
            <Text style={styles.platinumBannerTitle}>Earn 2550 more points to reach Platinum</Text>
            <Text style={styles.platinumBannerSubtitle}>Platinum members get 2x points and exclusive offers</Text>
          </View>
        </View>
        
        <View style={styles.activityContainer}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={handleViewAllPress}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <ActivityItem 
            type="earn" 
            title="Payment Bonus" 
            date="Aug 10, 2023" 
            points="+150 pts" 
            theme={theme} 
          />
          
          <ActivityItem 
            type="earn" 
            title="Referral Reward" 
            date="Aug 5, 2023" 
            points="+200 pts" 
            theme={theme} 
          />
          
          <ActivityItem 
            type="redeem" 
            title="$5 Discount Reward" 
            date="Jul 29, 2023" 
            points="-500 pts" 
            theme={theme} 
          />
          
          <ActivityItem 
            type="earn" 
            title="Transaction Bonus" 
            date="Jul 22, 2023" 
            points="+75 pts" 
            theme={theme} 
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MyOffersScreen; 