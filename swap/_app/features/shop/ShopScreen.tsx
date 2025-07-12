import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/theme';

export default function ShopScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Shop</Text>
          <Text style={styles.subtitle}>
            Compare prices across Haiti
          </Text>
        </View>

        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>
            🛍️ Price comparison coming soon!
          </Text>
          <Text style={styles.description}>
            We're building a comprehensive price comparison tool to help you find the best deals across stores in Haiti.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    header: {
      paddingTop: 20,
      paddingBottom: 30,
    },
    title: {
      fontSize: theme.typography.fontSize.xxl,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
    },
    comingSoon: {
      backgroundColor: theme.colors.card,
      padding: 24,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
    },
    comingSoonText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    description: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });