// WalletCardSkeleton - Professional loading skeleton with shimmer animation
// Industry standard approach used by Revolut, Cash App, Venmo
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');
const CARD_HEIGHT = 140;
const CARD_WIDTH = screenWidth - 32;

interface WalletCardSkeletonProps {
  style?: any;
}

const WalletCardSkeleton: React.FC<WalletCardSkeletonProps> = ({ style }) => {
  const { theme } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    shimmerLoop.start();

    return () => shimmerLoop.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-CARD_WIDTH, CARD_WIDTH],
  });

  const baseColor = theme.isDark ? '#2A2A2A' : '#E5E5E5';
  const shimmerColor = theme.isDark ? '#3A3A3A' : '#F0F0F0';

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.card, { backgroundColor: baseColor }]}>
        {/* Shimmer overlay */}
        <Animated.View
          style={[
            styles.shimmerOverlay,
            {
              transform: [{ translateX }],
              backgroundColor: shimmerColor,
            },
          ]}
        />

        {/* Top section - Currency code placeholder */}
        <View style={styles.topSection}>
          <View style={styles.leftContent}>
            <View style={[styles.currencyCodePlaceholder, { backgroundColor: shimmerColor }]} />
            <View style={[styles.labelPlaceholder, { backgroundColor: shimmerColor }]} />
          </View>
          <View style={[styles.iconPlaceholder, { backgroundColor: shimmerColor }]} />
        </View>

        {/* Bottom section - Balance placeholder */}
        <View style={styles.bottomSection}>
          <View style={[styles.balancePlaceholder, { backgroundColor: shimmerColor }]} />
          <View style={[styles.subBalancePlaceholder, { backgroundColor: shimmerColor }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    height: CARD_HEIGHT,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
    // Match WalletCard shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: CARD_WIDTH * 0.5,
    opacity: 0.3,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftContent: {
    gap: 8,
  },
  currencyCodePlaceholder: {
    width: 60,
    height: 20,
    borderRadius: 4,
  },
  labelPlaceholder: {
    width: 100,
    height: 14,
    borderRadius: 4,
  },
  iconPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  bottomSection: {
    gap: 6,
  },
  balancePlaceholder: {
    width: 140,
    height: 28,
    borderRadius: 6,
  },
  subBalancePlaceholder: {
    width: 80,
    height: 14,
    borderRadius: 4,
  },
});

export default WalletCardSkeleton;
