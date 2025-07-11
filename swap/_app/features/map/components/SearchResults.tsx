// Created: Fullscreen search results overlay component for mobile - 2024-06-29
// Updated: Added status bar management for better UX - 2024-06-30
// Updated: Fixed positioning to not cover the SearchBar - 2024-06-30
// Updated: Fixed issue with web platform visibility handling - 2024-06-30
// Updated: Fixed React hooks error when toggling visibility - 2024-07-01
// Updated: Enhanced visibility handling for web platform - 2024-07-02
// Updated: Added dropdown style for web on larger screens - 2024-07-02

import React, { useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  ScrollView, 
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { SearchResult } from '../../../types/map';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useMapStore } from '../../../store/mapStore';

interface SearchResultsProps {
  visible: boolean;
  results: SearchResult[];
  recentSearches: SearchResult[];
  favorites: { name: string; address: string; count: number }[];
  query: string;
  onResultPress: (result: SearchResult) => void;
}

// Gets status bar height for safe area
const getStatusBarHeight = () => {
  if (Platform.OS === 'ios') {
    return Constants.statusBarHeight || 47;
  }
  return 0;
};

// Get search bar height including padding
const getSearchBarTotalHeight = () => {
  return 70; // 50px for the search bar + 20px for padding
};

// Check if the device is mobile sized
const isMobileSize = () => {
  const windowWidth = Dimensions.get('window').width;
  return windowWidth < 768;
};

// For web-specific DOM element handling
const useClickOutside = (
  visible: boolean,
  isMobile: boolean,
  onClickOutside: () => void
) => {
  const resultsRef = useRef<View>(null);
  
  useEffect(() => {
    if (Platform.OS === 'web' && visible && !isMobile) {
      const handleClickOutside = (event: MouseEvent) => {
        // Check if the click is outside of search results and search bar
        const searchResults = document.getElementById('search-results-container');
        const searchBar = document.getElementById('search-bar-container');
        
        if (searchResults && searchBar && 
            !searchResults.contains(event.target as Node) && 
            !searchBar.contains(event.target as Node)) {
          console.log('[SearchResults] Click outside detected');
          onClickOutside();
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [visible, isMobile, onClickOutside]);
  
  return resultsRef;
};

const SearchResults: React.FC<SearchResultsProps> = ({
  visible,
  results,
  recentSearches,
  favorites,
  query,
  onResultPress
}) => {
  // Internal visibility state to handle animations or delayed visibility changes
  const [internalVisible, setInternalVisible] = useState(visible);
  const isWeb = Platform.OS === 'web';
  const isMobile = isMobileSize();
  const { setSearchFocused } = useMapStore();
  
  // Use custom hook to handle click outside
  const resultsRef = useClickOutside(visible, isMobile, () => {
    setSearchFocused(false);
  });
  
  // Log visibility changes to help with debugging
  useEffect(() => {
    
    // Synchronize internal state with prop
    setInternalVisible(visible);
    
    // Set status bar styles when search results are visible
    if (visible && Platform.OS === 'android') {
      StatusBar.setBackgroundColor('white');
      StatusBar.setBarStyle('dark-content');
    }
    
    // For web, ensure the component is visible when intended
    if (Platform.OS === 'web' && visible) {
      // Force any reflows needed for visibility
      if (document.body) {
        document.body.classList.add('search-results-visible');
        document.body.classList.remove('search-results-visible');
      }
    }
    
    // Cleanup when component unmounts or visibility changes
    return () => {
      if (Platform.OS === 'web' && !visible) {
        console.log('[SearchResults] Cleaning up web-specific resources');
        if (document.body) {
          document.body.classList.remove('search-closed');
        }
      }
      
      if (Platform.OS === 'android') {
        // Reset to transparent (handled by main app)
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setBarStyle('light-content');
      }
    };
  }, [visible]);

  // Don't render if not visible
  if (!internalVisible) return null;

  const renderRecent = recentSearches.length > 0;
  const renderResults = results.length > 0 && query.length > 0;
  const renderFavorites = favorites.length > 0 && !renderResults;
  const renderNoResults = query.length > 0 && results.length === 0;

  // Use different styles for web on larger screens
  const containerStyleToUse = isWeb && !isMobile ? 
    styles.webDropdownContainer : 
    styles.container;

  return (
    <View
      ref={resultsRef}
      style={containerStyleToUse}
      pointerEvents={visible ? 'auto' : 'none'} 
      // Use nativeID instead of className for React Native
      nativeID="search-results-container"
    >
      {/* Use Expo's StatusBar for iOS (only in fullscreen mobile mode) */}
      {(!isWeb || isMobile) && <ExpoStatusBar style="dark" backgroundColor="white" />}
      
      {/* Transparent area to preserve SearchBar visibility (only in fullscreen mode) */}
      {(!isWeb || isMobile) && <View style={styles.searchBarSpace} />}
      
      <ScrollView 
        style={styles.scrollView} 
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Favorites Section */}
        {renderFavorites && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Favorites</Text>
              <TouchableOpacity style={styles.infoButton}>
                <Ionicons name="information-circle-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            
            {favorites.map((item, index) => (
              <TouchableOpacity 
                key={`favorite-${index}`} 
                style={styles.resultItem}
                onPress={() => onResultPress({
                  id: `favorite-${index}`,
                  name: item.name,
                  address: item.address,
                  isFavorite: true
                })}
              >
                <View style={styles.iconContainer}>
                  <View style={[styles.iconCircle, { backgroundColor: '#f1e7fd' }]}>
                    <Ionicons name="heart" size={20} color="#8b14fd" />
                  </View>
                </View>
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle}>{item.name}</Text>
                  <Text style={styles.resultSubtitle}>{item.address}</Text>
                </View>
                <Text style={styles.placeCount}>{item.count} places</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Searches */}
        {renderRecent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent</Text>
            
            {recentSearches.map((result, index) => (
              <TouchableOpacity 
                key={`recent-${index}`} 
                style={styles.resultItem}
                onPress={() => onResultPress(result)}
              >
                <View style={styles.iconContainer}>
                  <View style={[styles.iconCircle, { backgroundColor: '#f5f5f5' }]}>
                    <Ionicons name="time" size={20} color="#666" />
                  </View>
                </View>
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle}>{result.name}</Text>
                  {result.address && (
                    <Text style={styles.resultSubtitle}>{result.address}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Search Results */}
        {renderResults && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Results</Text>
            
            {results.map((result, index) => (
              <TouchableOpacity 
                key={`result-${index}`} 
                style={styles.resultItem}
                onPress={() => onResultPress(result)}
              >
                <View style={styles.iconContainer}>
                  <View style={[styles.iconCircle, { backgroundColor: '#f5f5f5' }]}>
                    <Ionicons 
                      name={result.category === 'restaurant' ? 'restaurant' : 'location'} 
                      size={20} 
                      color="#666" 
                    />
                  </View>
                </View>
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle}>{result.name}</Text>
                  {result.address && (
                    <Text style={styles.resultSubtitle}>{result.address}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No Results */}
        {renderNoResults && (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search" size={60} color="#ccc" />
            <Text style={styles.noResultsTitle}>No results found</Text>
            <Text style={styles.noResultsMessage}>
              We couldn't find any locations matching "{query}".
              Try with a different search term.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Fullscreen container for mobile
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 40, // Below SearchBar z-index but above everything else
  },
  // Dropdown container for web on larger screens
  webDropdownContainer: {
    position: 'absolute',
    top: getStatusBarHeight() + getSearchBarTotalHeight(),
    left: '50%',
    transform: [{ translateX: '-50%' }], // Center the dropdown
    width: '90%',
    maxWidth: 600, // Match SearchBar maxWidth
    maxHeight: 400, // Limit height for dropdown
    backgroundColor: 'white',
    zIndex: 40,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    // Web-specific styling
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      borderWidth: 1,
      borderColor: '#e0e0e0',
    } : {}),
  },
  searchBarSpace: {
    height: getStatusBarHeight() + getSearchBarTotalHeight(),
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 10, // Add some space from the top
    paddingBottom: 20, // Add some space at the bottom
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 16,
    marginVertical: 12,
  },
  infoButton: {
    padding: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    marginRight: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  placeCount: {
    fontSize: 12,
    color: '#999',
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 20,
    lineHeight: 20,
  },
});

export default SearchResults; 