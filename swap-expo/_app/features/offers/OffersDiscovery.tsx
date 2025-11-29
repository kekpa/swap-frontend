// Created: Added OffersDiscovery screen component for browsing available offers - 2025-03-22
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, StatusBar,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OffersStackParamList } from '../../navigation/offersNavigator';
import SearchHeader from '../header/SearchHeader';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/theme';
import { useAuthContext } from '../auth/context/AuthContext';

interface Merchant {
  id: string; name: string; logo: string; points: number; backgroundColor?: string; 
}
type OffersTab = 'discover' | 'myOffers';

const OffersDiscoveryScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<OffersStackParamList>>();
  const { theme } = useTheme();
  const authContext = useAuthContext();
  const user = authContext.user;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<OffersTab>('discover');
  const [refreshing, setRefreshing] = useState(false);
  
  const merchants: Merchant[] = [
    { id: '1', name: 'Amazon', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/1024px-Amazon_logo.svg.png', points: 1400, },
    { id: '2', name: 'Apple', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/1200px-Apple_logo_black.svg.png', points: 700, },
    { id: '3', name: 'Uber', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Uber_logo_2018.svg/2560px-Uber_logo_2018.svg.png', points: 3500, backgroundColor: '#000000', },
    { id: '4', name: 'Adidas', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Adidas_Logo.svg/1280px-Adidas_Logo.svg.png', points: 3500, },
    { id: '5', name: 'Airbnb', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Airbnb_Logo_B%C3%A9lo.svg/2560px-Airbnb_Logo_B%C3%A9lo.svg.png', points: 3500, },
    { id: '6', name: 'Kobo', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Kobo_logo.svg/1200px-Kobo_logo.svg.png', points: 1400, },
  ];
  
  const handleSearch = (text: string) => setSearchQuery(text);
  const handleInfoPress = () => console.log('Info pressed');
  const handleMerchantPress = (merchant: Merchant) => navigation.navigate('OfferDetails', { merchantId: merchant.id, merchantName: merchant.name });
  const handleTabChange = (tab: OffersTab) => setActiveTab(tab);
  const handleEarnPress = () => navigation.navigate('Challenges');
  const handleMyPointsPress = () => navigation.navigate('OffersHome');
  
  // TODO: Replace with real API call when offers backend is implemented
  // Currently uses mock data - refresh simulates API latency for demo purposes
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate API latency (replace with actual TanStack Query refetch)
    setTimeout(() => {
      console.log('[OffersDiscovery] Refresh triggered - mock data (no backend yet)');
      setRefreshing(false);
    }, 1500);
  }, []);

  const getHeaderInitials = () => {
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
    return "UA";
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollView: { flex: 1 },
    miniPointsCard: {
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.md,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      ...theme.shadows.medium,
    },
    miniPointsCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
    miniPointsCardLabel: { fontSize: theme.typography.fontSize.sm, fontWeight: '500', color: theme.colors.white, opacity: 0.8, marginBottom: theme.spacing.xs / 2 },
    miniPointsCardBalance: { fontSize: theme.typography.fontSize.xxl, fontWeight: 'bold', color: theme.colors.white },
    earnButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: theme.borderRadius.sm, paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.sm },
    earnButtonText: { fontSize: theme.typography.fontSize.sm, fontWeight: '600', color: theme.colors.white },
    miniProgressContainer: { marginTop: theme.spacing.xs },
    miniProgressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.xs / 2 },
    miniProgressLabel: { fontSize: theme.typography.fontSize.xs, color: theme.colors.white },
    miniProgressBarBg: { height: 4, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: theme.borderRadius.xs, overflow: 'hidden' },
    miniProgressBarFill: { height: '100%', backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.xs },
    miniProgressText: { fontSize: 10, color: theme.colors.white, opacity: 0.7, marginTop: theme.spacing.xs / 2, textAlign: 'center' },
    tabsContainer: { flexDirection: 'row', marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg, gap: theme.spacing.sm },
    tabButton: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.xl, backgroundColor: theme.colors.grayUltraLight },
    activeTabButton: { backgroundColor: theme.colors.primary },
    tabButtonText: { fontSize: theme.typography.fontSize.sm, fontWeight: '500', color: theme.colors.textSecondary },
    activeTabText: { color: theme.colors.white },
    merchantGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: theme.spacing.md, gap: theme.spacing.md },
    merchantCard: { width: '47%', marginBottom: theme.spacing.md, borderRadius: theme.borderRadius.sm, overflow: 'hidden', backgroundColor: theme.colors.card, ...theme.shadows.small },
    merchantLogoContainer: { height: 100, backgroundColor: theme.colors.white, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border, borderTopLeftRadius: theme.borderRadius.sm, borderTopRightRadius: theme.borderRadius.sm },
    logoImage: { width: '80%', height: '60%' },
    merchantDetails: { backgroundColor: theme.colors.primary, padding: theme.spacing.sm },
    merchantName: { fontSize: theme.typography.fontSize.sm, fontWeight: '500', color: theme.colors.white, marginBottom: theme.spacing.xs / 2 },
    pointsContainer: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs },
    pointsIcon: { marginRight: theme.spacing.xs, opacity: 0.7 },
    pointsValueText: { fontSize: theme.typography.fontSize.xs, color: theme.colors.white, opacity: 0.8 },
    pointsValueHighlight: { fontWeight: 'bold', marginLeft: 2 },
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      <SearchHeader
        onSearch={handleSearch}
        placeholder="Search offers"
        rightIcons={[{ name: "information-circle-outline", onPress: handleInfoPress, color: theme.colors.primary }]}
        showProfile={true}
        avatarUrl={user?.avatarUrl}
        initials={getHeaderInitials()}
        onProfilePress={() => {
          const source = 'Offers';
          console.log(`[OffersDiscovery] Navigating to ProfileModal, sourceRoute: ${source}`);
          navigation.navigate("ProfileModal" as any, { sourceRoute: source });
        }}
      />
      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
      >
        <TouchableOpacity style={styles.miniPointsCard} onPress={handleMyPointsPress} activeOpacity={0.9}>
          <View style={styles.miniPointsCardContent}>
            <View><Text style={styles.miniPointsCardLabel}>Your Points</Text><Text style={styles.miniPointsCardBalance}>2,450</Text></View>
            <TouchableOpacity style={styles.earnButton} onPress={handleEarnPress}><Ionicons name="add" size={16} color={theme.colors.white} style={{ marginRight: 4 }} /><Text style={styles.earnButtonText}>Earn</Text></TouchableOpacity>
          </View>
          <View style={styles.miniProgressContainer}>
            <View style={styles.miniProgressLabels}><Text style={styles.miniProgressLabel}>Gold</Text><Text style={styles.miniProgressLabel}>Platinum</Text></View>
            <View style={styles.miniProgressBarBg}><View style={[styles.miniProgressBarFill, { width: '49%' }]} /></View>
            <Text style={styles.miniProgressText}>2450/5000</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.tabsContainer}>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'discover' && styles.activeTabButton]} onPress={() => handleTabChange('discover')}><Text style={[styles.tabButtonText, activeTab === 'discover' && styles.activeTabText]}>Discover</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'myOffers' && styles.activeTabButton]} onPress={() => handleTabChange('myOffers')}><Text style={[styles.tabButtonText, activeTab === 'myOffers' && styles.activeTabText]}>My offers</Text></TouchableOpacity>
        </View>
        <View style={styles.merchantGrid}>
          {merchants.map((merchant) => (
            <TouchableOpacity key={merchant.id} style={styles.merchantCard} onPress={() => handleMerchantPress(merchant)}>
              <View style={[styles.merchantLogoContainer, merchant.backgroundColor && { backgroundColor: merchant.backgroundColor } ]}>
                <Image
                  source={{ uri: merchant.logo }}
                  style={styles.logoImage}
                  contentFit="contain"
                  transition={200}
                />
              </View>
              <View style={styles.merchantDetails}>
                <Text style={styles.merchantName}>{merchant.name}</Text>
                <View style={styles.pointsContainer}>
                  <Ionicons name="ellipsis-horizontal" size={12} color={theme.colors.white} style={styles.pointsIcon} />
                  <Text style={styles.pointsValueText}>From <Text style={styles.pointsValueHighlight}>{merchant.points}</Text></Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OffersDiscoveryScreen; 