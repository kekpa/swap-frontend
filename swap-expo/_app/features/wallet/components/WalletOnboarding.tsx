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
import { useAuthContext } from '../../auth/context/AuthContext';
import logger from '../../../utils/logger';

interface WalletOnboardingProps {
  reason: 'KYC_REQUIRED' | 'PROFILE_INCOMPLETE' | 'KYC_REJECTED' | 'ACCOUNT_SUSPENDED' | 'BLOCKED';
  kycStatus: 'none' | 'partial' | 'verified';
  profileComplete: boolean;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

const WalletOnboarding: React.FC<WalletOnboardingProps> = ({
  reason,
  kycStatus: _kycStatus,
  profileComplete: _profileComplete,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthContext();

  // Determine if this is a business user
  const isBusinessUser = user?.profileType === 'business';

  const content = useMemo(() => {
    if (reason === 'PROFILE_INCOMPLETE') {
      return {
        icon: 'person-outline' as const,
        iconColor: theme.colors.warning,
        title: 'Complete Your Profile First',
        subtitle: 'Just a few quick steps to unlock your wallet',
        benefits: [
          '📝 Add your name and basic information',
          '✅ Quick identity verification process',
          '💳 Get instant access to HTG wallet',
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
      // Check if KYC is in progress/under review vs not started
      if (_kycStatus === 'partial') {
        // User has submitted KYC and it's under review
        logger.debug('[WalletOnboarding] KYC under review - showing waiting message');
        return {
          icon: 'time-outline' as const,
          iconColor: theme.colors.status?.pending || theme.colors.warning,
          title: 'Account Being Reviewed',
          subtitle: 'Your identity documents have been submitted and are being verified. This usually takes a few hours.',
          benefits: [
            '⏳ Verification typically takes 1-24 hours',
            '📧 We\'ll notify you once approved',
            '💰 Wallet access unlocks automatically after approval',
          ],
          primaryCta: 'Check Status',
          primaryAction: () => {
            logger.debug('[WalletOnboarding] Navigating to profile to check KYC status');
            (navigation as any).navigate('ProfileModal', {
              sourceRoute: 'Wallet'
            });
          },
          estimatedTime: 'Usually within 24 hours',
        };
      }

      // KYC not started yet - different messaging for business vs personal
      if (isBusinessUser) {
        return {
          icon: 'business-outline' as const,
          iconColor: theme.colors.primary,
          title: 'Verify Your Business',
          subtitle: 'Complete business verification to access financial services',
          benefits: [
            '🏢 Send & receive business payments',
            '💼 Professional financial management',
            '📊 Business transaction tracking',
          ],
          primaryCta: 'Start Business Verification',
          primaryAction: () => {
            logger.debug('[WalletOnboarding] Navigating to business KYC verification via ProfileModal');
            (navigation as any).navigate('ProfileModal', {
              sourceRoute: 'Wallet'
            });
          },
          estimatedTime: '5-10 minutes',
        };
      }

      // Personal user KYC messaging
      return {
        icon: 'shield-checkmark-outline' as const,
        iconColor: theme.colors.primary,
        title: 'Verify Your Identity',
        subtitle: 'In order to send money, verify your identity',
        benefits: [
          '💰 Send & receive money instantly',
          '🚀 Free transfers between Swap users',
          '📱 Request payments from anyone',
        ],
        primaryCta: 'Start Verification',
        primaryAction: () => {
          logger.debug('[WalletOnboarding] Navigating to KYC verification via ProfileModal');
          // Navigate to ProfileModal with sourceRoute, ProfileNavigator will handle the rest
          (navigation as any).navigate('ProfileModal', {
            sourceRoute: 'Wallet'
          });
        },
        estimatedTime: '3-5 minutes',
      };
    }

    // KYC_REJECTED case - user can resubmit documents
    if (reason === 'KYC_REJECTED') {
      return {
        icon: 'close-circle-outline' as const,
        iconColor: theme.colors.error,
        title: 'Verification Unsuccessful',
        subtitle: 'We couldn\'t verify your identity with the documents provided. You can submit new documents to try again.',
        benefits: [
          '📄 Upload clearer photos of your ID',
          '🔄 Make sure all details are visible',
          '✅ Resubmit for another review',
        ],
        primaryCta: 'Resubmit Documents',
        primaryAction: () => {
          logger.debug('[WalletOnboarding] Navigating to resubmit KYC documents');
          (navigation as any).navigate('ProfileModal', {
            sourceRoute: 'Wallet'
          });
        },
        estimatedTime: '3-5 minutes to resubmit',
      };
    }

    // ACCOUNT_SUSPENDED case - frozen, contact support
    if (reason === 'ACCOUNT_SUSPENDED') {
      return {
        icon: 'warning-outline' as const,
        iconColor: theme.colors.error,
        title: 'Account Suspended',
        subtitle: 'Your account has been temporarily suspended. Please contact our support team for assistance.',
        benefits: [
          '📞 Our support team is here to help',
          '🔍 We\'ll review your account status',
          '⏱️ Most issues resolved within 24-48 hours',
        ],
        primaryCta: 'Contact Support',
        primaryAction: () => {
          logger.debug('[WalletOnboarding] Opening support for suspended account');
          // Navigate to support or open support chat
          (navigation as any).navigate('ProfileModal', {
            sourceRoute: 'Wallet'
          });
        },
        estimatedTime: 'Support available 24/7',
      };
    }

    // BLOCKED case
    return {
      icon: 'lock-closed-outline' as const,
      iconColor: theme.colors.error,
      title: 'Wallet Access Restricted',
      subtitle: 'Please contact support for assistance',
      benefits: [
        '🔍 Account requires additional verification',
        '💬 Our support team can help resolve this',
        '⚡ Wallet access restored once cleared',
      ],
      primaryCta: 'Contact Support',
      primaryAction: () => {
        logger.debug('[WalletOnboarding] Opening support contact');
        // TODO: Add support contact functionality
      },
      estimatedTime: 'Support response in 24h',
    };
  }, [reason, theme.colors, navigation, isBusinessUser]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xl + 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: `${content.iconColor}15`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.fontSize.xxxl,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.lg,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: theme.spacing.sm,
    },
    estimatedTime: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
      marginBottom: theme.spacing.lg,
    },
    benefitsContainer: {
      width: '100%',
      marginBottom: theme.spacing.lg,
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
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      ...theme.shadows.small,
    },
    primaryButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      marginLeft: theme.spacing.sm,
    },
  }), [theme, content]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background}
      />

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={content.icon}
            size={32}
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
            size={20}
            color={theme.colors.white}
          />
          <Text style={styles.primaryButtonText}>{content.primaryCta}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default WalletOnboarding;