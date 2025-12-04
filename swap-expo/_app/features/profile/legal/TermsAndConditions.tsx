import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../theme/ThemeContext';

const TermsAndConditionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const handleBack = () => {
    navigation.goBack();
  };

  const handleOpenWebsite = () => {
    Linking.openURL('https://swap.ht/terms');
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.lg,
    },
    lastUpdated: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
      fontStyle: 'italic',
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.primary,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    paragraph: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
      lineHeight: 22,
      marginBottom: theme.spacing.md,
    },
    bulletList: {
      marginBottom: theme.spacing.md,
    },
    bulletItem: {
      flexDirection: 'row',
      marginBottom: theme.spacing.sm,
      paddingLeft: theme.spacing.sm,
    },
    bullet: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      marginRight: theme.spacing.sm,
    },
    bulletText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
      lineHeight: 20,
    },
    linkCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      ...theme.shadows.small,
    },
    linkIcon: {
      width: 40,
      height: 40,
      backgroundColor: theme.colors.primaryUltraLight,
      borderRadius: theme.borderRadius.sm,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    linkTextContainer: {
      flex: 1,
    },
    linkTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    linkUrl: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
    },
  }), [theme]);

  const BulletPoint = ({ text }: { text: string }) => (
    <View style={styles.bulletItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms and Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.lastUpdated}>Last updated: December 2024</Text>

          <Text style={styles.paragraph}>
            Welcome to Swap. These Terms and Conditions ("Terms") govern your use of the Swap mobile application and services. By using our services, you agree to be bound by these Terms.
          </Text>

          <Text style={styles.sectionTitle}>1. Agreement to Terms</Text>
          <Text style={styles.paragraph}>
            By accessing or using Swap, you confirm that you are at least 18 years old and have the legal capacity to enter into these Terms. If you do not agree with any part of these Terms, you may not use our services.
          </Text>

          <Text style={styles.sectionTitle}>2. Services Description</Text>
          <Text style={styles.paragraph}>
            Swap provides digital financial services including:
          </Text>
          <View style={styles.bulletList}>
            <BulletPoint text="Digital wallet and account management" />
            <BulletPoint text="Peer-to-peer money transfers" />
            <BulletPoint text="Currency exchange services" />
            <BulletPoint text="Payment processing" />
            <BulletPoint text="Financial transaction history and reporting" />
          </View>

          <Text style={styles.sectionTitle}>3. Account Requirements</Text>
          <Text style={styles.paragraph}>
            To use our services, you must:
          </Text>
          <View style={styles.bulletList}>
            <BulletPoint text="Provide accurate and complete registration information" />
            <BulletPoint text="Complete identity verification as required" />
            <BulletPoint text="Maintain the security of your account credentials" />
            <BulletPoint text="Notify us immediately of any unauthorized access" />
          </View>

          <Text style={styles.sectionTitle}>4. Prohibited Activities</Text>
          <Text style={styles.paragraph}>
            You agree not to use our services for:
          </Text>
          <View style={styles.bulletList}>
            <BulletPoint text="Illegal activities or money laundering" />
            <BulletPoint text="Fraudulent transactions or scams" />
            <BulletPoint text="Violation of any applicable laws or regulations" />
            <BulletPoint text="Unauthorized access to other accounts" />
            <BulletPoint text="Any activity that could harm Swap or its users" />
          </View>

          <Text style={styles.sectionTitle}>5. Fees and Charges</Text>
          <Text style={styles.paragraph}>
            Certain services may be subject to fees as disclosed in our fee schedule. We reserve the right to modify fees with prior notice to users.
          </Text>

          <Text style={styles.sectionTitle}>6. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            All content, trademarks, and intellectual property in the Swap application are owned by us or our licensors. You may not copy, modify, or distribute our content without permission.
          </Text>

          <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            To the maximum extent permitted by law, Swap shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.
          </Text>

          <Text style={styles.sectionTitle}>8. Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Swap operates, without regard to conflict of law principles.
          </Text>

          <Text style={styles.sectionTitle}>9. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We may update these Terms from time to time. We will notify you of any material changes by posting the new Terms in the app. Your continued use of our services after such changes constitutes acceptance of the updated Terms.
          </Text>

          <Text style={styles.sectionTitle}>10. Contact</Text>
          <Text style={styles.paragraph}>
            For questions about these Terms, please contact us at contact@swap.ht
          </Text>

          {/* Link to full terms */}
          <TouchableOpacity style={styles.linkCard} onPress={handleOpenWebsite}>
            <View style={styles.linkIcon}>
              <Ionicons name="globe-outline" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.linkTextContainer}>
              <Text style={styles.linkTitle}>Read Full Terms Online</Text>
              <Text style={styles.linkUrl}>swap.ht/terms</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TermsAndConditionsScreen;
