// Created: Added CountryCodePicker component for phone input - 2025-05-30
// Updated: Fixed close button functionality - 2025-05-30
// Updated: Added forwardRef support for external modal control - 2025-05-30
// Updated: Fixed forwardRef implementation to resolve render error - 2025-05-30
import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { countryCodes, CountryCode } from '../constants/countryCodes';
import { useTheme } from '../theme/ThemeContext';

interface CountryCodePickerProps {
  selectedCountryCode: string;
  onSelect: (countryCode: CountryCode) => void;
}

// Define interface for the methods we want to expose to parent components
export interface CountryCodePickerRef {
  openModal: () => void;
}

// Create the component with forwardRef
const CountryCodePicker = forwardRef<CountryCodePickerRef, CountryCodePickerProps>((props, ref) => {
  const { selectedCountryCode, onSelect } = props;
  const themeContext = useTheme();
  const theme = themeContext?.theme;
  
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  
  // Find the currently selected country
  const selectedCountry = countryCodes.find(country => country.code === selectedCountryCode) 
    || countryCodes[0]; // Default to first country if not found
  
  const filteredCountries = searchQuery
    ? countryCodes.filter(country => 
        country.country.toLowerCase().includes(searchQuery.toLowerCase()) || 
        country.code.includes(searchQuery) ||
        country.iso.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : countryCodes;
  
  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    openModal: () => {
      setModalVisible(true);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }));
  
  const openModal = () => {
    setModalVisible(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };
  
  const closeModal = () => {
    setModalVisible(false);
    setSearchQuery('');
  };
  
  const handleSelect = (country: CountryCode) => {
    onSelect(country);
    closeModal();
  };
  
  if (!theme) return null;
  
  return (
    <>
      <TouchableOpacity 
        style={[
          styles.countryButton, 
          { 
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.border
          }
        ]}
        onPress={openModal}
      >
        <Text style={[styles.countryCode, { color: theme.colors.textPrimary }]}>
          {selectedCountry.flag} {selectedCountry.code}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <SafeAreaView style={[styles.fullScreenModal, { backgroundColor: theme.colors.background }]}>
          <StatusBar barStyle="dark-content" />
          
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={closeModal} 
              style={styles.closeButton}
              accessibilityLabel="Close country code picker"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              Select Country Code
            </Text>
            <View style={{ width: 24 }} />
          </View>
          
          <View style={[styles.searchContainer, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
            <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: theme.colors.textPrimary }]}
              placeholder="Search country name or code"
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
              autoCapitalize="none"
            />
          </View>
          
          <FlashList
            data={filteredCountries}
            keyExtractor={(item) => item.iso}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[
                  styles.countryItem, 
                  selectedCountry.iso === item.iso && { backgroundColor: theme.colors.primaryUltraLight }
                ]}
                onPress={() => handleSelect(item)}
              >
                <Text style={[styles.flag]}>{item.flag}</Text>
                <View style={styles.countryInfo}>
                  <Text style={[styles.countryName, { color: theme.colors.textPrimary }]}>
                    {item.country}
                  </Text>
                  <Text style={[styles.countryCodeSmall, { color: theme.colors.textSecondary }]}>
                    {item.code}
                  </Text>
                </View>
                {selectedCountry.iso === item.iso && (
                  <Ionicons name="checkmark" size={24} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            )}
            estimatedItemSize={60}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
});

// Important: Set display name for the component
CountryCodePicker.displayName = 'CountryCodePicker';

const styles = StyleSheet.create({
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 56,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '500',
  },
  fullScreenModal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  closeButton: {
    padding: 8,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  countryCodeSmall: {
    fontSize: 14,
  },
});

export default CountryCodePicker; 