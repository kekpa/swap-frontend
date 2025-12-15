import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchHeader from '../header/SearchHeader';
import SearchOverlay from '../header/SearchOverlay';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthContext } from '../auth/context/AuthContext';
import { useBalances } from '../../hooks-data/useBalances';
import { useTransactionLimits, formatLimit } from '../../hooks-data/useTransactionLimits';
import QuickActionsRow from './components/QuickActionsRow';
import DiscoveryCard from './components/DiscoveryCard';
import DiscoveryCardsSlider, { DiscoveryCardData } from './components/DiscoveryCardsSlider';

// Header content height: profile pic (40) + padding (6 bottom + 4 top) + spacing buffer (8)
const HEADER_CONTENT_HEIGHT = 58;

export default function HomeScreen() {
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Calculate dynamic header height based on device safe area
  const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;

  // Scroll tracking for SearchHeader blur effect
  const scrollY = useRef(new Animated.Value(0)).current;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Get primary wallet balance
  const { data: wallets = [], isLoading } = useBalances(user?.entityId);
  const primaryWallet = wallets.find(w => w.isPrimary) || wallets[0];

  // Get KYC status and transaction limits for Account Review card
  const { data: tierEligibility } = useTransactionLimits(user?.entityId || '', {
    enabled: !!user?.entityId,
  });
  const isUnderReview = tierEligibility?.kycStatus === 'under_review' || tierEligibility?.kycStatus === 'partial';
  const primaryCurrency = primaryWallet?.currency_code || 'USD';

  const handleSearch = (query: string) => {
    console.log('Search:', query);
  };

  // Search handlers
  const handleSearchPress = () => {
    setIsSearchActive(true);
  };

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleSearchCancel = () => {
    setIsSearchActive(false);
    setSearchQuery('');
  };

  const handleSearchItemSelect = (item: any) => {
    setIsSearchActive(false);
    setSearchQuery('');
    // Navigate to contact/chat based on item type
    if (item.type === 'contact' || item.type === 'interaction' || item.type === 'entity') {
      (navigation as any).navigate('ContactInteractionHistory2', {
        contactId: item.originalData?.contactEntityId || item.id,
        contactName: item.name,
        contactInitials: item.initials,
        contactAvatarColor: item.avatarColor,
      });
    }
  };

  // Get header initials for avatar
  const getHeaderInitials = () => {
    // DEBUG: Log user data when getting initials
    console.log('🏠 [HomeScreen] getHeaderInitials called, user:', {
      entityId: user?.entityId,
      profileId: user?.profileId,
      firstName: user?.firstName,
      lastName: user?.lastName,
      businessName: user?.businessName
    });

    // For business users, use business name initials
    if (user?.businessName) {
      const words = user.businessName.split(' ').filter(word => word.length > 0);
      if (words.length >= 2) {
        return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
      }
      if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
      }
    }

    // For personal users, use first/last name
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "UA";  // Fallback
  };

  const handleProfilePress = () => {
    const source = 'Home';
    console.log(`[HomeScreen] Navigating to ProfileModal, sourceRoute: ${source}`);
    (navigation as any).navigate("ProfileModal", { sourceRoute: source });
  };

  // Coming soon alert helper
  const showComingSoon = () => {
    Alert.alert('Coming Soon', 'This feature is coming soon!');
  };

  // Quick action handlers
  const handleAdd = () => {
    (navigation as any).navigate("AddMoneyModal");
  };

  const handleSend = () => {
    (navigation as any).navigate('NewInteraction');
  };

  const handleSol = () => showComingSoon();

  const handleWallet = () => {
    (navigation as any).navigate("Wallet");
  };

  const handleSupport = () => showComingSoon();

  // Camera icon handler (top right)
  const handleQRScan = () => showComingSoon();

  // Discovery card handlers
  const handleComingSoon = () => {
    Alert.alert(
      'Coming Soon',
      'We\'re working hard to bring you more features. Stay tuned!'
    );
  };
  const handleExploreSols = () => showComingSoon();
  const handleSecuritySetup = () => showComingSoon();
  const handleLearnMore = () => showComingSoon();

  // Account review card handler - navigate to profile to check KYC status
  const handleAccountReview = () => {
    (navigation as any).navigate('ProfileModal', { sourceRoute: 'Home' });
  };

  // Get daily limit for display (Account Review card)
  const getDailyLimit = () => {
    if (!tierEligibility?.limits || !tierEligibility.limits[primaryCurrency]) {
      // Default fallback for under_review free tier
      return primaryCurrency === 'HTG' ? 'G65,000' : '$500';
    }
    const sendLimit = tierEligibility.limits[primaryCurrency]?.send;
    if (!sendLimit || sendLimit.daily_limit === null) {
      return 'Unlimited';
    }
    return formatLimit(sendLimit.daily_limit, primaryCurrency);
  };

  // Format balance
  const formatBalance = (balance: number) => {
    return balance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Discovery cards data for slider
  const discoveryCards: DiscoveryCardData[] = [
    // Account Review card - only show when KYC is under review
    ...(isUnderReview ? [{
      id: 'account-review',
      component: (
        <DiscoveryCard
          icon="time-outline"
          iconColor={theme.colors.warning}
          title="Account Under Review"
          description={`Daily limit: ${getDailyLimit()} while we verify your documents`}
          onPress={handleAccountReview}
        />
      ),
    }] : []),
    {
      id: 'coming-soon',
      component: (
        <DiscoveryCard
          icon="construct"
          iconColor={theme.colors.primary}
          title="We're Building More"
          description="Some features are still in progress. Wallet, contacts & interactions are ready to use!"
          onPress={handleComingSoon}
        />
      ),
    },
    {
      id: 'rosca',
      component: (
        <DiscoveryCard
          icon="people-circle"
          iconColor={theme.colors.primary}
          title="Discover Sols"
          description="Join a savings circle (Sol) with people you trust."
          onPress={handleExploreSols}
        />
      ),
    },
    {
      id: 'security',
      component: (
        <DiscoveryCard
          icon="shield-checkmark"
          iconColor={theme.colors.success}
          title="Keep Your Account Safe"
          description="Enable Face ID or fingerprint to secure your account and transactions."
          onPress={handleSecuritySetup}
        />
      ),
    },
    {
      id: 'education',
      component: (
        <DiscoveryCard
          icon="bulb"
          iconColor={theme.colors.warning}
          title="How Sols Help You Save"
          description="Learn how rotating savings circles (Sols) can help you reach your financial goals faster."
          onPress={handleLearnMore}
        />
      ),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background}
      />

      <SearchHeader
        placeholder="Search interactions & contacts"
        onSearch={handleSearch}
        transparent={true}
        rightIcons={[{ name: "camera", onPress: handleQRScan }]}
        showProfile={true}
        avatarUrl={user?.avatarUrl}
        initials={getHeaderInitials()}
        onProfilePress={handleProfilePress}
        scrollY={scrollY}
        showSearch={true}
        isSearchActive={isSearchActive}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchQueryChange}
        onSearchCancel={handleSearchCancel}
        onSearchPress={handleSearchPress}
        entityId={user?.entityId}
      />

      {isSearchActive ? (
        <View style={[styles.searchOverlayContainer, { paddingTop: headerHeight }]}>
          <SearchOverlay
            searchQuery={searchQuery}
            onItemSelect={handleSearchItemSelect}
          />
        </View>
      ) : (
        <Animated.ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingTop: headerHeight }]}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={true}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {/* Quick Actions Grid */}
          <QuickActionsRow
            onAddPress={handleAdd}
            onSendPress={handleSend}
            onSolPress={handleSol}
            onWalletPress={handleWallet}
            onSupportPress={handleSupport}
            activeSolsCount={0}
          />

          {/* Discovery Cards Slider */}
          <DiscoveryCardsSlider cards={discoveryCards} />
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  searchOverlayContainer: {
    flex: 1,
  },
});
