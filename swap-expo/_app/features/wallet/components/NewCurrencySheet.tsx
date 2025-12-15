/**
 * NewCurrencySheet Component
 *
 * Bottom sheet for selecting a new currency to add to the wallet.
 * Shows only currencies that the user doesn't already have.
 *
 * Updated: 2025-12-15 - Now fetches currencies from API instead of hardcoded list
 */

import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useTheme } from '../../../theme/ThemeContext';
import { useCurrencies, Currency } from '../../../hooks-data/useCurrencies';

const { height: screenHeight } = Dimensions.get('window');

// Currency type exported for use in parent components
// Now includes flag from database
export type AvailableCurrency = Currency;

interface NewCurrencySheetProps {
  visible: boolean;
  existingCurrencyCodes: string[];
  onSelectCurrency: (currency: AvailableCurrency) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const NewCurrencySheet: React.FC<NewCurrencySheetProps> = ({
  visible,
  existingCurrencyCodes,
  onSelectCurrency,
  onClose,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Fetch currencies from API
  const { currencies: allCurrencies, loading: currenciesLoading, error: currenciesError } = useCurrencies();

  // Filter out currencies user already has (flag now comes from database)
  const availableCurrencies = useMemo(() => {
    return allCurrencies.filter(currency => !existingCurrencyCodes.includes(currency.code));
  }, [allCurrencies, existingCurrencyCodes]);

  // Snap points for the bottom sheet
  const snapPoints = useMemo(() => {
    // Dynamic height based on number of available currencies
    const itemHeight = 70; // Each currency item
    const headerHeight = 80; // Header with title
    const paddingHeight = 40; // Bottom padding
    const contentHeight = headerHeight + (availableCurrencies.length * itemHeight) + paddingHeight;

    // Show up to 5-6 currencies without scrolling (increased from 400 to 520)
    // 520px = 80 (header) + 5*70 (items) + 40 (padding) + some buffer
    const maxFirstSnap = 520;
    const maxHeight = '70%';
    return [Math.min(contentHeight, maxFirstSnap), maxHeight];
  }, [availableCurrencies.length]);

  // Handle sheet close
  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  // Render backdrop
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  // Handle currency selection
  const handleSelect = useCallback((currency: AvailableCurrency) => {
    if (!isLoading) {
      onSelectCurrency(currency);
    }
  }, [onSelectCurrency, isLoading]);

  // Dynamic styles based on theme
  const styles = useMemo(() => StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 32,
    },
    currencyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      marginBottom: 8,
    },
    currencyItemDisabled: {
      opacity: 0.5,
    },
    currencyInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    flagContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    flag: {
      fontSize: 24,
    },
    currencyDetails: {
      flex: 1,
    },
    currencyCode: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    currencyName: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    currencySymbol: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.primary,
      marginLeft: 8,
    },
    addIcon: {
      marginLeft: 8,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 12,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12,
    },
  }), [theme]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
          backdropComponent={renderBackdrop}
          enablePanDownToClose
          enableDynamicSizing={false}
          backgroundStyle={{ backgroundColor: theme.colors.background }}
          handleIndicatorStyle={{ backgroundColor: theme.colors.border, width: 40 }}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add New Currency</Text>
            <Text style={styles.headerSubtitle}>
              {currenciesLoading
                ? 'Loading currencies...'
                : currenciesError
                  ? 'Failed to load currencies'
                  : availableCurrencies.length > 0
                    ? 'Select a currency to add to your wallet'
                    : 'You have all available currencies'}
            </Text>
          </View>

          <BottomSheetScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            scrollIndicatorInsets={{ right: 2 }}
          >
            {currenciesLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.emptyTitle}>Loading currencies...</Text>
              </View>
            ) : currenciesError ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="alert-circle"
                  size={48}
                  color={theme.colors.error}
                />
                <Text style={styles.emptyTitle}>Failed to load currencies</Text>
                <Text style={styles.emptySubtitle}>
                  Please try again later.
                </Text>
              </View>
            ) : availableCurrencies.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  color={theme.colors.success}
                />
                <Text style={styles.emptyTitle}>All currencies added!</Text>
                <Text style={styles.emptySubtitle}>
                  You already have wallets for all available currencies.
                </Text>
              </View>
            ) : (
              availableCurrencies.map((currency) => (
                <TouchableOpacity
                  key={currency.id}
                  style={[
                    styles.currencyItem,
                    isLoading && styles.currencyItemDisabled,
                  ]}
                  onPress={() => handleSelect(currency)}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <View style={styles.currencyInfo}>
                    <View style={styles.flagContainer}>
                      <Text style={styles.flag}>{currency.flag}</Text>
                    </View>
                    <View style={styles.currencyDetails}>
                      <Text style={styles.currencyCode}>{currency.code}</Text>
                      <Text style={styles.currencyName}>{currency.name}</Text>
                    </View>
                  </View>
                  <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                  <Ionicons
                    name="add-circle"
                    size={24}
                    color={theme.colors.primary}
                    style={styles.addIcon}
                  />
                  {isLoading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator color={theme.colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </Modal>
  );
};

export default NewCurrencySheet;
