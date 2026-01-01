// Updated: Refactored to use global theme system - 2025-05-11
import React, { useMemo } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../theme/ThemeContext';
import logger from '../../utils/logger';
import { Theme } from '../../theme/theme';

// Define a navigation stack param list
type OffersStackParamList = {
  OffersList: undefined;
  OfferDetails: {
    offerId?: string;
    offerTitle?: string;
  };
};

// Define the navigation prop type
type OffersNavigationProp = StackNavigationProp<OffersStackParamList, 'OfferDetails'>;

// Define the route params type
type OfferDetailsRouteParams = {
  offerId?: string;
  offerTitle?: string;
};

type OfferDetailsRouteProp = RouteProp<{ OfferDetails: OfferDetailsRouteParams }, 'OfferDetails'>;

const OfferDetailsScreen: React.FC = () => {
  const navigation = useNavigation<OffersNavigationProp>();
  const route = useRoute<OfferDetailsRouteProp>();
  const { theme } = useTheme();
  
  // We'll use a default offer for demonstration, but normally you'd fetch this based on the offerId
  const offerDetails = {
    id: route.params?.offerId || '1',
    title: route.params?.offerTitle || '$5 Off Your Next Transfer',
    pointsCost: 500,
    description: 'Get $5 off your next money transfer fee when you send $50 or more.',
    validUntil: 'September 30, 2023',
    terms: [
      'One-time use only',
      'Minimum transfer amount: $50',
      'Cannot be combined with other offers',
      'Valid for 30 days after claiming',
    ],
    similarOffers: [
      {
        id: '2',
        title: 'Free Transfer',
        points: 300,
        icon: 'card-outline',
      },
      {
        id: '3',
        title: '20% Discount',
        points: 1000,
        icon: 'pricetag-outline',
      },
    ],
  };
  
  const handleBackPress = () => {
    navigation.goBack();
  };
  
  const handleRedeemPress = () => {
    // Handle offer redemption
    logger.debug("Redeeming offer", "data", { offerId: offerDetails.id, pointsCost: offerDetails.pointsCost });
    // Normally you would call an API here and show success/failure
    
    // For demo, we'll just go back to the offers list
    navigation.goBack();
  };
  
  const handleSimilarOfferPress = (offerId: string, offerTitle: string) => {
    // Navigate to the selected offer detail
    navigation.navigate('OfferDetails', {
      offerId,
      offerTitle,
    });
  };

  // Create memoized styles based on the current theme
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{offerDetails.title}</Text>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* Offer card with points badge */}
        <View style={styles.offerCard}>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsBadgeText}>{offerDetails.pointsCost} points</Text>
          </View>
          
          <View style={styles.offerIconContainer}>
            <View style={styles.offerIcon}>
              <Ionicons name="cash-outline" size={36} color={theme.colors.primary} />
            </View>
          </View>
        </View>
        
        {/* Offer description */}
        <View style={styles.sectionContainer}>
          <Text style={styles.descriptionText}>{offerDetails.description}</Text>
          
          <View style={styles.validityContainer}>
            <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} style={styles.validityIcon} />
            <Text style={styles.validityText}>Valid until {offerDetails.validUntil}</Text>
          </View>
        </View>
        
        {/* Terms and conditions */}
        <View style={styles.sectionContainer}>
          <View style={styles.termsHeader}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
          </View>
          
          <View style={styles.termsList}>
            {offerDetails.terms.map((term, index) => (
              <View key={index} style={styles.termItem}>
                <View style={styles.termBullet} />
                <Text style={styles.termText}>{term}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* Redeem button */}
        <TouchableOpacity 
          style={styles.redeemButton} 
          onPress={handleRedeemPress}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark" size={20} color={theme.colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.redeemButtonText}>Redeem for {offerDetails.pointsCost} points</Text>
        </TouchableOpacity>
        
        {/* Similar offers */}
        <View style={styles.sectionContainer}>
          <Text style={styles.similarOffersTitle}>Similar Offers</Text>
          
          <View style={styles.similarOffersContainer}>
            {offerDetails.similarOffers.map((offer) => (
              <TouchableOpacity 
                key={offer.id} 
                style={styles.similarOfferCard}
                onPress={() => handleSimilarOfferPress(offer.id, offer.title)}
              >
                <View style={styles.similarOfferIcon}>
                  <Ionicons name={offer.icon as any} size={28} color={theme.colors.primary} />
                </View>
                <Text style={styles.similarOfferTitle}>{offer.title}</Text>
                <Text style={styles.similarOfferPoints}>{offer.points} points</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Define styles as a function of the theme
const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  offerCard: {
    height: 150,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.xl,
  },
  pointsBadgeText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  offerIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContainer: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  descriptionText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: theme.typography.lineHeight.md,
  },
  validityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validityIcon: {
    marginRight: theme.spacing.sm,
  },
  validityText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  termsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  termsTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  termsList: {
    marginLeft: theme.spacing.sm,
  },
  termItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  termBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
    marginRight: theme.spacing.sm,
  },
  termText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  redeemButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
  },
  similarOffersTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  similarOffersContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  similarOfferCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },
  similarOfferIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.grayUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  similarOfferTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  similarOfferPoints: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
});

export default OfferDetailsScreen; 
 