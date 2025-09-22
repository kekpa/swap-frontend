import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, StatusBar,
  Image, RefreshControl, FlatList, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OffersStackParamList } from '../../navigation/offersNavigator';
import SearchHeader from '../header/SearchHeader';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/theme';
import { useAuthContext } from '../auth/context/AuthContext';

interface Bundle {
  name: string;
  description: string;
  points: number;
  originalPrice: number;
  icon?: string;
  period: 'daily' | 'weekly' | 'monthly';
}

interface Merchant {
  id: string;
  name: string;
  logo: string;
  points: number;
  backgroundColor?: string;
  discount?: string;
  category: string;
  description?: string;
  originalPrice?: number;
  discountPercentage?: number;
  timeLeft?: string;
  hasBundles?: boolean;
  bundles?: Bundle[];
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

type OffersTab = 'discover' | 'myOffers';

const OffersDiscoveryRedesignedScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<OffersStackParamList>>();
  const { theme } = useTheme();
  const authContext = useAuthContext();
  const user = authContext.user;

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);
  const [selectedBundles, setSelectedBundles] = useState<{ [merchantId: string]: number | null }>({});
  const [pressedCard, setPressedCard] = useState<string | null>(null);

  const categories: Category[] = [
    { id: 'all', name: 'All', icon: 'grid-outline' },
    { id: 'recent', name: 'Recent', icon: 'time-outline' },
    { id: 'food', name: 'Food', icon: 'restaurant-outline' },
    { id: 'transport', name: 'Transport', icon: 'car-outline' },
    { id: 'shopping', name: 'Shopping', icon: 'bag-outline' },
    { id: 'tech', name: 'Tech', icon: 'phone-portrait-outline' },
    { id: 'lifestyle', name: 'Lifestyle', icon: 'fitness-outline' },
  ];

  const merchants: Merchant[] = [
    {
      id: '1',
      name: 'Moto Taxi Rides',
      logo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format',
      points: 150,
      discount: '40% OFF',
      category: 'transport',
      description: 'Convenient transportation around Port-au-Prince',
      originalPrice: 500,
      discountPercentage: 40,
      timeLeft: '2 days left',
      hasBundles: true,
      bundles: [
        {
          name: 'Daily Pass',
          description: '2 rides per day',
          points: 50,
          originalPrice: 150,
          icon: '☀️',
          period: 'daily'
        },
        {
          name: 'Weekly Pass',
          description: '10 rides per week',
          points: 200,
          originalPrice: 600,
          icon: '📅',
          period: 'weekly'
        },
        {
          name: 'Monthly Pass',
          description: '40 rides per month',
          points: 600,
          originalPrice: 2000,
          icon: '🗓️',
          period: 'monthly'
        }
      ]
    },
    {
      id: '2',
      name: 'Hot Meals Combo',
      logo: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&auto=format',
      points: 200,
      discount: '33% OFF',
      category: 'food',
      description: 'Traditional Haitian meal subscriptions',
      originalPrice: 750,
      discountPercentage: 33,
      hasBundles: true,
      bundles: [
        {
          name: 'Daily Meal',
          description: '1 meal per day',
          points: 120,
          originalPrice: 300,
          icon: '🍽️',
          period: 'daily'
        },
        {
          name: 'Weekly Plan',
          description: '5 meals per week',
          points: 450,
          originalPrice: 1200,
          icon: '📦',
          period: 'weekly'
        },
        {
          name: 'Monthly Plan',
          description: '20 meals per month',
          points: 1500,
          originalPrice: 4000,
          icon: '🗂️',
          period: 'monthly'
        }
      ]
    },
    {
      id: '3',
      name: 'Premium Rides',
      logo: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop&auto=format',
      points: 120,
      backgroundColor: '#000000',
      discount: '25% OFF',
      category: 'transport',
      description: 'Premium ride service',
      originalPrice: 400,
      discountPercentage: 25,
    },
    {
      id: '4',
      name: 'Sports Gear',
      logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop&auto=format',
      points: 300,
      discount: '50% OFF',
      category: 'shopping',
      description: 'Sports apparel and footwear',
      originalPrice: 1000,
      discountPercentage: 50,
      timeLeft: '5 days left'
    },
    {
      id: '5',
      name: 'License Renewal Express',
      logo: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=300&fit=crop&auto=format',
      points: 300,
      discount: '50% OFF',
      category: 'lifestyle',
      description: 'Fast-track your driver\'s license renewal',
      originalPrice: 600,
      discountPercentage: 50,
      timeLeft: '5 days left'
    },
    {
      id: '6',
      name: 'Digital Library',
      logo: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop&auto=format',
      points: 100,
      discount: '20% OFF',
      category: 'tech',
      description: 'E-books and digital reading',
      originalPrice: 200,
      discountPercentage: 20,
    },
  ];

  const featuredOffers = merchants.filter(m => m.discountPercentage && m.discountPercentage >= 40);
  const filteredMerchants = selectedCategory === 'all'
    ? merchants
    : merchants.filter(m => m.category === selectedCategory);

  const handleSearch = (text: string) => setSearchQuery(text);
  const handleInfoPress = () => navigation.navigate('OffersHome'); // Navigate to points dashboard
  const handleMerchantPress = (merchant: Merchant) => navigation.navigate('OfferDetails', { merchantId: merchant.id, merchantName: merchant.name });
  const handleEarnPress = () => navigation.navigate('Challenges');
  const handleMyPointsPress = () => navigation.navigate('OffersHome');

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => { console.log('Refreshing offers data'); setRefreshing(false); }, 1500);
  }, []);

  const getHeaderInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "UA";
  };


  const StatsCards = () => (
    <View style={styles.statsContainer}>
      <TouchableOpacity style={styles.statCard} onPress={handleMyPointsPress}>
        <Text style={styles.statLabel}>Your Points</Text>
        <Text style={styles.statValue}>2,450</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.statCard} onPress={handleMyPointsPress}>
        <Text style={styles.statLabel}>This Month Saved</Text>
        <Text style={styles.statValue}>1,240 HTG</Text>
      </TouchableOpacity>
    </View>
  );

  const CategoryFilter = () => (
    <View style={styles.categoryContainer}>
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === item.id && styles.activeCategoryChip
            ]}
            onPress={() => setSelectedCategory(item.id)}
          >
            <Ionicons
              name={item.icon as any}
              size={16}
              color={selectedCategory === item.id ? theme.colors.white : theme.colors.textSecondary}
              style={styles.categoryIcon}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === item.id && styles.activeCategoryText
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const FeaturedOfferCard = ({ merchant }: { merchant: Merchant }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => handleMerchantPress(merchant)}
      activeOpacity={0.85}
    >
      <View style={styles.featuredImageBackground}>
        <Image source={{ uri: merchant.logo }} style={styles.featuredBackgroundImage} resizeMode="cover" />
        <View style={styles.featuredOverlay}>
          {merchant.discount && (
            <View style={styles.featuredDiscountBadge}>
              <Text style={styles.featuredDiscountText}>{merchant.discount}</Text>
            </View>
          )}
          <View style={styles.featuredCardContent}>
            <View style={styles.featuredCardInfo}>
              <Text style={styles.featuredCardTitle} numberOfLines={1}>{merchant.name}</Text>
              <Text style={styles.featuredCardDescription} numberOfLines={1} ellipsizeMode="tail">{merchant.description}</Text>
            </View>
            <View style={styles.featuredCardFooter}>
              <View style={styles.featuredPointsInfo}>
                <Text style={styles.featuredSwapsText}>{merchant.points} SWAPS</Text>
                {merchant.originalPrice && (
                  <Text style={styles.featuredOriginalPriceText}>{merchant.originalPrice} HTG</Text>
                )}
              </View>
              {merchant.timeLeft && (
                <View style={styles.featuredTimeContainer}>
                  <Ionicons name="time-outline" size={14} color={theme.colors.warning} />
                  <Text style={styles.featuredTimeText}>{merchant.timeLeft}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const ExpandedDrawer = ({ merchant, isExpanded }: { merchant: Merchant; isExpanded: boolean }) => {
    const selectedBundleIndex = selectedBundles[merchant.id];

    const handleBundleSelect = (index: number) => {
      setSelectedBundles(prev => ({
        ...prev,
        [merchant.id]: index
      }));
      // Navigate after selection
      setTimeout(() => {
        handleMerchantPress(merchant);
      }, 150);
    };

    if (!isExpanded) return null;

    return (
      <View style={styles.expandedDrawer}>
        {merchant.bundles?.map((bundle, index) => {
          const isLast = index === (merchant.bundles?.length || 0) - 1;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.bundleRow,
                isLast && styles.lastBundleRow,
                selectedBundleIndex === index && styles.selectedBundleRow
              ]}
              onPress={() => handleBundleSelect(index)}
              activeOpacity={0.8}
            >
              <View style={styles.bundleRowContent}>
                <View style={styles.bundleInfo}>
                  <Text style={[
                    styles.bundleName,
                    selectedBundleIndex === index && styles.selectedBundleText
                  ]}>
                    {bundle.name}
                  </Text>
                  <Text style={[
                    styles.bundleDescription,
                    selectedBundleIndex === index && styles.selectedBundleText
                  ]}>
                    {bundle.description}
                  </Text>
                </View>
                <Text style={[
                  styles.bundlePointsText,
                  selectedBundleIndex === index && styles.selectedBundleText
                ]}>
                  {bundle.points} SWAPS
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const HorizontalOfferCard = ({ merchant }: { merchant: Merchant }) => {
    const isExpanded = expandedOfferId === merchant.id;

    const handleCardPress = () => {
      if (merchant.hasBundles) {
        setExpandedOfferId(isExpanded ? null : merchant.id);
      } else {
        handleMerchantPress(merchant);
      }
    };

    return (
      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={[
            styles.horizontalCard,
            isExpanded && styles.horizontalCardExpanded
          ]}
          onPress={handleCardPress}
          activeOpacity={0.85}
        >
          <View style={styles.cardImageBackground}>
            <Image source={{ uri: merchant.logo }} style={styles.cardBackgroundImage} resizeMode="cover" />
            <View style={styles.cardOverlay}>
              {merchant.discount && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{merchant.discount}</Text>
                </View>
              )}
              <View style={styles.cardContentOverlay}>
                <Text style={styles.cardTitle}>{merchant.name}</Text>
                <Text style={styles.cardDescription} numberOfLines={2}>{merchant.description}</Text>
                <View style={styles.cardFooter}>
                  <View style={styles.pointsInfo}>
                    <Text style={styles.swapsText}>{merchant.points} SWAPS</Text>
                    {merchant.originalPrice && (
                      <Text style={styles.originalPriceText}>{merchant.originalPrice} HTG</Text>
                    )}
                  </View>
                  <View style={styles.cardRightSection}>
                    {merchant.timeLeft && (
                      <View style={styles.timeContainer}>
                        <Ionicons name="time-outline" size={12} color={theme.colors.warning} />
                        <Text style={styles.timeText}>{merchant.timeLeft}</Text>
                      </View>
                    )}
                    {merchant.hasBundles && (
                      <View style={styles.expandIndicator}>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={16}
                          color={theme.colors.white}
                        />
                        <Text style={styles.bundleIndicatorText}>
                          {merchant.bundles?.length} options
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        {merchant.bundles && (
          <ExpandedDrawer merchant={merchant} isExpanded={isExpanded} />
        )}
      </View>
    );
  };

  const SectionHeader = ({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAllText}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollView: { flex: 1 },



    // Stats cards
    statsContainer: {
      flexDirection: 'row',
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md, // Same as horizontal margins for consistency
      marginBottom: 12, // Tighter gap for better flow (12px)
      gap: theme.spacing.sm,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.grayUltraLight, // Changed to light gray for visibility
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: 12, // More professional tight padding
      paddingVertical: 10, // Reduced vertical padding for sleeker look
      // Removed shadow - cleaner look with gray background
    },
    statLabel: {
      fontSize: 11, // Smaller label for better hierarchy
      color: theme.colors.textSecondary,
      marginBottom: 2, // Tighter spacing
      opacity: 0.8,
      textTransform: 'uppercase', // Professional touch
      letterSpacing: 0.5,
    },
    statValue: {
      fontSize: theme.typography.fontSize.lg, // Slightly smaller for better proportion
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
    },

    // Category filter
    categoryContainer: {
      marginTop: theme.spacing.xs, // Even tighter to featured offers (4px)
      marginBottom: 10, // Much smaller gap below filters (10px) - fixes the big gap issue
    },
    categoryList: {
      paddingHorizontal: theme.spacing.md,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.grayUltraLight,
      borderRadius: theme.borderRadius.xl,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginRight: theme.spacing.sm,
    },
    activeCategoryChip: {
      backgroundColor: theme.colors.primary,
    },
    categoryIcon: {
      marginRight: theme.spacing.xs,
    },
    categoryText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    activeCategoryText: {
      color: theme.colors.white,
    },

    // Section headers
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginHorizontal: theme.spacing.md,
      marginTop: 10, // Reduced for All Offers section to feel connected to filters (10px)
      marginBottom: 8, // Tighter connection to content (8px)
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
    },
    seeAllText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: '600',
    },

    // Featured offers
    featuredOffersList: {
      paddingLeft: theme.spacing.md,
      paddingRight: theme.spacing.md,
      paddingBottom: 12, // Reduced for tighter flow (12px)
    },
    featuredCard: {
      borderRadius: theme.borderRadius.md,
      marginRight: theme.spacing.sm,
      width: 280, // Wider for better content
      height: 140, // Much taller for all content visibility
      overflow: 'hidden',
      ...theme.shadows.small,
    },
    featuredImageBackground: {
      width: '100%',
      height: '100%',
      position: 'relative',
    },
    featuredBackgroundImage: {
      width: '100%',
      height: '100%',
      position: 'absolute',
    },
    featuredOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dark overlay for text readability
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md, // More bottom padding to prevent cutoff
    },
    featuredDiscountBadge: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.error,
      borderRadius: theme.borderRadius.xs,
      paddingHorizontal: 6,
      paddingVertical: 3,
      marginBottom: theme.spacing.xs,
    },
    featuredDiscountText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: theme.colors.white,
    },
    featuredCardContent: {
      flex: 1,
      justifyContent: 'space-between',
    },
    featuredCardInfo: {
      maxHeight: 45, // Limit text area height
    },
    featuredCardTitle: {
      fontSize: theme.typography.fontSize.lg, // Larger title for prominence
      fontWeight: 'bold',
      color: theme.colors.white, // White for contrast over image
      marginBottom: 4,
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 3,
    },
    featuredCardDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.white, // White for contrast
      marginTop: 2,
      opacity: 0.95,
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
      lineHeight: 18, // Tighter line height
    },
    featuredCardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    featuredPointsInfo: {
      flex: 1,
    },
    featuredSwapsText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: 'bold',
      color: theme.colors.white, // White for contrast
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    featuredOriginalPriceText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.white,
      opacity: 0.7,
      textDecorationLine: 'line-through',
      marginTop: 2,
    },
    featuredTimeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    featuredTimeText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.warning,
      marginLeft: 2,
      fontWeight: '600',
    },

    // Horizontal offer cards
    cardContainer: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    horizontalCard: {
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
      ...theme.shadows.small,
    },
    horizontalCardExpanded: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    cardImageBackground: {
      height: 100, // Fixed height for consistency
      position: 'relative',
    },
    cardBackgroundImage: {
      width: '100%',
      height: '100%',
      position: 'absolute',
    },
    cardOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Slightly darker overlay for better text readability
      padding: theme.spacing.md,
      justifyContent: 'space-between',
    },
    cardContentOverlay: {
      flex: 1,
      justifyContent: 'space-between',
    },
    discountBadge: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.error,
      borderRadius: theme.borderRadius.xs,
      paddingHorizontal: 6,
      paddingVertical: 3,
      marginBottom: theme.spacing.xs,
    },
    discountText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: theme.colors.white,
    },
    cardTitle: {
      fontSize: theme.typography.fontSize.xl, // Larger for better readability
      fontWeight: 'bold',
      color: theme.colors.white,
      marginBottom: 4,
      textShadowColor: 'rgba(0, 0, 0, 0.75)', // Text shadow for better contrast
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 3,
    },
    cardDescription: {
      fontSize: theme.typography.fontSize.md, // Larger description text
      color: theme.colors.white,
      opacity: 0.95, // Slightly more opaque
      marginBottom: theme.spacing.sm,
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.xs,
    },
    pointsInfo: {
      flex: 1,
    },
    swapsText: {
      fontSize: theme.typography.fontSize.lg, // Larger SWAPS text
      fontWeight: 'bold',
      color: theme.colors.white,
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    originalPriceText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.white,
      opacity: 0.7,
      textDecorationLine: 'line-through',
      marginTop: 2,
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    timeText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.warning,
      marginLeft: 2,
    },
    cardRightSection: {
      alignItems: 'flex-end',
    },
    expandIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    bundleIndicatorText: {
      fontSize: 10,
      color: theme.colors.white,
      marginLeft: 4,
      opacity: 0.8,
    },

    // Seamless expandable drawer
    expandedDrawer: {
      backgroundColor: theme.colors.white,
      borderBottomLeftRadius: theme.borderRadius.md,
      borderBottomRightRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: theme.colors.border,
      ...theme.shadows.small,
    },
    bundleRow: {
      paddingVertical: 8,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.white,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    lastBundleRow: {
      borderBottomWidth: 0,
    },
    selectedBundleRow: {
      backgroundColor: theme.colors.primaryLight,
    },
    bundleRowContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bundleInfo: {
      flex: 1,
    },
    bundleName: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 1,
    },
    bundleDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    bundlePointsText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    selectedBundleText: {
      color: theme.colors.primary,
    },

  }), [theme, selectedCategory]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      <SearchHeader
        onSearch={handleSearch}
        placeholder="Search offers"
        rightIcons={[{ name: "information-circle-outline", onPress: handleInfoPress, color: theme.colors.primary }]}
        showProfile={true}
        avatarUrl={user?.avatarUrl}
        initials={getHeaderInitials()}
        onProfilePress={() => {
          const source = 'Offers';
          console.log(`[OffersDiscoveryRedesigned] Navigating to ProfileModal, sourceRoute: ${source}`);
          navigation.navigate("ProfileModal" as any, { sourceRoute: source });
        }}
      />
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
      >
        <StatsCards />

        {/* Featured offers section - not affected by filters */}
        {featuredOffers.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 12 }]}>
              <Text style={styles.sectionTitle}>Featured Offers</Text>
              <TouchableOpacity onPress={() => console.log('See all featured')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={featuredOffers}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.featuredOffersList}
              renderItem={({ item }) => <FeaturedOfferCard merchant={item} />}
            />
          </>
        )}

        {/* Category filter - only affects the all offers below */}
        <CategoryFilter />

        {/* All offers section - filtered based on category selection */}
        <SectionHeader title={selectedCategory === 'all' ? 'All Offers' : `${categories.find(c => c.id === selectedCategory)?.name} Offers`} />
        {filteredMerchants.map((merchant) => (
          <HorizontalOfferCard key={merchant.id} merchant={merchant} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default OffersDiscoveryRedesignedScreen;