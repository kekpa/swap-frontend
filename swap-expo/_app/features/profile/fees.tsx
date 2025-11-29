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
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';

const FeesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const handleBack = () => {
    navigation.goBack();
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
    feesContainer: {
      padding: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    infoCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.lg,
      ...theme.shadows.small,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    infoCardHeader: {
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
      flexDirection: 'row',
      alignItems: 'center',
    },
    infoCardIcon: {
      width: 32,
      height: 32,
      backgroundColor: theme.colors.primaryUltraLight,
      borderRadius: theme.borderRadius.sm,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    infoCardTitle: {
      fontWeight: '600',
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
    },
    feeList: {
      paddingHorizontal: 0,
    },
    feeItem: {
      flexDirection: 'row',
      paddingVertical: theme.spacing.md - 2,
      paddingHorizontal: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    feeName: {
      flex: 6,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
    },
    feeValue: {
      flex: 4,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      textAlign: 'right',
    },
    feeValueFree: {
      flex: 4,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '600',
      color: theme.colors.success,
      textAlign: 'right',
    },
    currencyGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm + 2,
      paddingBottom: theme.spacing.xs,
      justifyContent: 'space-between',
    },
    currencyCard: {
      backgroundColor: theme.colors.primaryUltraLight,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      width: '47%',
      marginBottom: theme.spacing.md,
      alignItems: 'center',
    },
    currencyName: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      marginBottom: theme.spacing.sm,
      color: theme.colors.textPrimary,
    },
    exchangeRate: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    rateTimestamp: {
      textAlign: 'center',
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: 0,
      marginBottom: theme.spacing.md,
      fontStyle: 'italic',
    },
    disclaimer: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      lineHeight: 18,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fees and Rates</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.feesContainer}>
          {/* Transaction Fees */}
          <Text style={styles.sectionTitle}>TRANSACTION FEES</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={styles.infoCardIcon}>
                <Ionicons name="cash-outline" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.infoCardTitle}>Swap to Swap</Text>
            </View>
            <View style={styles.feeList}>
              <View style={styles.feeItem}>
                <Text style={styles.feeName}>Send Money (Same Currency)</Text>
                <Text style={styles.feeValueFree}>Free</Text>
              </View>
              <View style={styles.feeItem}>
                <Text style={styles.feeName}>Send Money (Currency Conversion)</Text>
                <Text style={styles.feeValue}>0.5%</Text>
              </View>
              <View style={styles.feeItem}>
                <Text style={styles.feeName}>Request Money</Text>
                <Text style={styles.feeValueFree}>Free</Text>
              </View>
              <View style={styles.feeItem}>
                <Text style={styles.feeName}>Split Bills</Text>
                <Text style={styles.feeValueFree}>Free</Text>
              </View>
            </View>
          </View>

          {/* Withdrawal Fees */}
          <Text style={styles.sectionTitle}>WITHDRAWAL FEES</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={styles.infoCardIcon}>
                <Ionicons name="wallet-outline" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.infoCardTitle}>Withdrawal Options</Text>
            </View>
            <View style={styles.feeList}>
              <View style={styles.feeItem}>
                <Text style={styles.feeName}>ATM Withdrawal</Text>
                <Text style={styles.feeValue}>$2.50 + 1%</Text>
              </View>
              <View style={styles.feeItem}>
                <Text style={styles.feeName}>Bank Transfer (Standard)</Text>
                <Text style={styles.feeValue}>$1.00</Text>
              </View>
              <View style={styles.feeItem}>
                <Text style={styles.feeName}>Bank Transfer (Express)</Text>
                <Text style={styles.feeValue}>$5.00</Text>
              </View>
              <View style={styles.feeItem}>
                <Text style={styles.feeName}>International Wire Transfer</Text>
                <Text style={styles.feeValue}>$25.00</Text>
              </View>
            </View>
          </View>

          {/* Transaction Limits */}
          <Text style={styles.sectionTitle}>TRANSACTION LIMITS</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={styles.infoCardIcon}>
                <Ionicons name="shield-outline" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.infoCardTitle}>Standard Account Limits</Text>
            </View>
            <View style={styles.feeList}>
              <View style={styles.feeItem}>
                <Text style={styles.feeName}>Daily Withdrawal Limit</Text>
                <Text style={styles.feeValue}>$1,000</Text>
              </View>
              <View style={styles.feeItem}>
                <Text style={styles.feeName}>Monthly Withdrawal Limit</Text>
                <Text style={styles.feeValue}>$10,000</Text>
              </View>
              <View style={styles.feeItem}>
                <Text style={styles.feeName}>Single Transaction Limit</Text>
                <Text style={styles.feeValue}>$5,000</Text>
              </View>
              <View style={styles.feeItem}>
                <Text style={styles.feeName}>Annual Transaction Total</Text>
                <Text style={styles.feeValue}>$120,000</Text>
              </View>
            </View>
          </View>

          {/* Exchange Rates */}
          {/* <Text style={styles.sectionTitle}>CURRENT EXCHANGE RATES</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={styles.infoCardIcon}>
                <Ionicons name="swap-horizontal-outline" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.infoCardTitle}>Popular Currencies</Text>
            </View>
            <View style={styles.currencyGrid}>
              <View style={styles.currencyCard}>
                <Text style={styles.currencyName}>USD to SGD</Text>
                <Text style={styles.exchangeRate}>1.36</Text>
              </View>
              <View style={styles.currencyCard}>
                <Text style={styles.currencyName}>EUR to SGD</Text>
                <Text style={styles.exchangeRate}>1.47</Text>
              </View>
              <View style={styles.currencyCard}>
                <Text style={styles.currencyName}>GBP to SGD</Text>
                <Text style={styles.exchangeRate}>1.72</Text>
              </View>
              <View style={styles.currencyCard}>
                <Text style={styles.currencyName}>AUD to SGD</Text>
                <Text style={styles.exchangeRate}>0.90</Text>
              </View>
              <View style={styles.currencyCard}>
                <Text style={styles.currencyName}>JPY to SGD</Text>
                <Text style={styles.exchangeRate}>0.0091</Text>
              </View>
              <View style={styles.currencyCard}>
                <Text style={styles.currencyName}>CNY to SGD</Text>
                <Text style={styles.exchangeRate}>0.19</Text>
              </View>
            </View>
            <Text style={styles.rateTimestamp}>Rates updated: May 15, 2023 at 04:30 PM</Text>
          </View>

          <Text style={styles.disclaimer}>
            All fees are subject to change. Exchange rates are updated every 60 minutes during business days. 
            A currency conversion spread of 0.5% is applied to all currency conversions in addition to the shown exchange rate.
          </Text> */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FeesScreen; 