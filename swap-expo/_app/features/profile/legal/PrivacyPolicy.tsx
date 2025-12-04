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

const PrivacyPolicyScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const handleBack = () => {
    navigation.goBack();
  };

  const handleOpenWebsite = () => {
    Linking.openURL('https://swap.ht/privacy');
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.lastUpdated}>Last updated: December 2024</Text>

          <Text style={styles.paragraph}>
            Swap ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.
          </Text>

          <Text style={styles.sectionTitle}>Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect information that you provide directly to us, including:
          </Text>
          <View style={styles.bulletList}>
            <BulletPoint text="Personal information (name, email address, phone number)" />
            <BulletPoint text="Identity verification documents (government-issued ID, proof of address)" />
            <BulletPoint text="Financial information (bank account details, transaction history)" />
            <BulletPoint text="Device information (device type, operating system, unique identifiers)" />
            <BulletPoint text="Usage data (how you interact with our services)" />
          </View>

          <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use the information we collect to:
          </Text>
          <View style={styles.bulletList}>
            <BulletPoint text="Provide, maintain, and improve our services" />
            <BulletPoint text="Process transactions and send related information" />
            <BulletPoint text="Verify your identity and prevent fraud" />
            <BulletPoint text="Comply with legal and regulatory requirements" />
            <BulletPoint text="Send you technical notices and support messages" />
            <BulletPoint text="Respond to your comments and questions" />
          </View>

          <Text style={styles.sectionTitle}>Information Sharing</Text>
          <Text style={styles.paragraph}>
            We may share your information with:
          </Text>
          <View style={styles.bulletList}>
            <BulletPoint text="Service providers who assist in our operations" />
            <BulletPoint text="Financial institutions to process transactions" />
            <BulletPoint text="Law enforcement when required by law" />
            <BulletPoint text="Other parties with your consent" />
          </View>

          <Text style={styles.sectionTitle}>Data Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security assessments.
          </Text>

          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to:
          </Text>
          <View style={styles.bulletList}>
            <BulletPoint text="Access your personal information" />
            <BulletPoint text="Correct inaccurate data" />
            <BulletPoint text="Request deletion of your data (subject to legal requirements)" />
            <BulletPoint text="Opt-out of marketing communications" />
            <BulletPoint text="Data portability where applicable" />
          </View>

          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions about this Privacy Policy or our privacy practices, please contact us at contact@swap.ht
          </Text>

          {/* Link to full policy */}
          <TouchableOpacity style={styles.linkCard} onPress={handleOpenWebsite}>
            <View style={styles.linkIcon}>
              <Ionicons name="globe-outline" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.linkTextContainer}>
              <Text style={styles.linkTitle}>Read Full Policy Online</Text>
              <Text style={styles.linkUrl}>swap.ht/privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrivacyPolicyScreen;
