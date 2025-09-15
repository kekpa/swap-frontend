// Created: WalletOnboarding component for KYC-gated wallet access - 2025-01-11
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../../theme/ThemeContext';
import { RootStackParamList } from '../../../navigation/rootNavigator';
import logger from '../../../utils/logger';

interface WalletOnboardingProps {
  reason: 'KYC_REQUIRED' | 'PROFILE_INCOMPLETE' | 'BLOCKED';
  kycStatus: 'none' | 'partial' | 'verified';
  profileComplete: boolean;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

const WalletOnboarding: React.FC<WalletOnboardingProps> = ({
  reason,
  kycStatus,
  profileComplete,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const content = useMemo(() => {
    if (reason === 'PROFILE_INCOMPLETE') {
      return {
        icon: 'person-outline' as const,
        iconColor: theme.colors.warning,
        title: 'Complete Your Profile First',
        subtitle: 'Just a few quick steps to unlock your wallet',
        benefits: [
          'Add your name and basic info',
          'Verify your identity securely',
          'Get instant access to HTG wallet',
        ],
        primaryCta: 'Complete Profile',
        primaryAction: () => {
          logger.debug('[WalletOnboarding] Navigating to complete profile');
          navigation.navigate('CompleteProfile' as any);
        },
        estimatedTime: '2 minutes',
      };
    }

    if (reason === 'KYC_REQUIRED') {
      return {
        icon: 'shield-checkmark-outline' as const,
        iconColor: theme.colors.primary,
        title: 'Verify Your Identity',
        subtitle: 'Required by Haitian Central Bank for financial services',
        benefits: [
          '💰 Send & receive money instantly',
          '💱 Multi-currency wallets (HTG & USD)',
          '🚀 Free transfers between Swap users',
          '📱 Request payments from anyone',
        ],
        primaryCta: 'Start Verification',
        primaryAction: () => {
          logger.debug('[WalletOnboarding] Navigating to KYC verification');
          navigation.navigate('VerifyYourIdentity' as any);
        },
        estimatedTime: '3-5 minutes',
      };
    }

    // BLOCKED case
    return {
      icon: 'lock-closed-outline' as const,
      iconColor: theme.colors.error,
      title: 'Wallet Access Restricted',
      subtitle: 'Please contact support for assistance',
      benefits: [
        'Your account requires additional verification',
        'Our support team can help resolve this',
        'Wallet access will be restored once cleared',
      ],
      primaryCta: 'Contact Support',
      primaryAction: () => {
        logger.debug('[WalletOnboarding] Opening support contact');
        // TODO: Add support contact functionality
      },
      estimatedTime: 'Support response in 24h',
    };
  }, [reason, theme.colors, navigation]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: `${content.iconColor}15`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: theme.typography.fontSize.xxl,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.lg,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: theme.spacing.xl,
    },
    estimatedTime: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
      marginBottom: theme.spacing.xl,
    },
    benefitsContainer: {
      width: '100%',
      marginBottom: theme.spacing.xl,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
      ...theme.shadows.small,
    },
    benefitIcon: {
      marginRight: theme.spacing.sm,
    },
    benefitText: {
      flex: 1,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
      lineHeight: 20,
    },
    primaryButton: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: content.iconColor,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      marginBottom: theme.spacing.md,
      ...theme.shadows.medium,
    },
    primaryButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      marginLeft: theme.spacing.sm,
    },
    secondaryButton: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    secondaryButtonText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
    },
  }), [theme, content]);

  const handleBackPress = () => {
    logger.debug('[WalletOnboarding] User pressed back, returning to previous screen');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={theme.name.includes('dark') ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background}
      />

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={content.icon}
            size={60}
            color={content.iconColor}
          />
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.subtitle}>{content.subtitle}</Text>
        <Text style={styles.estimatedTime}>⏱️ {content.estimatedTime}</Text>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          {content.benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={content.iconColor}
                style={styles.benefitIcon}
              />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* Primary Action */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={content.primaryAction}
          activeOpacity={0.9}
        >
          <Ionicons
            name="arrow-forward"
            size={24}
            color={theme.colors.white}
          />
          <Text style={styles.primaryButtonText}>{content.primaryCta}</Text>
        </TouchableOpacity>

        {/* Secondary Action */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Continue with Social Features</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default WalletOnboarding;