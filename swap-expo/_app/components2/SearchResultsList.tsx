// Created: Shared SearchResultsList component for consistent search UI across the app - 2025-05-29
import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { EntitySearchResult } from '../types/entity.types';

interface SearchResult {
  id: string;
  name: string;
  type: 'entity' | 'interaction' | 'contact';
  avatarUrl?: string;
  initials: string;
  avatarColor: string;
  secondaryText: string;
  date?: string; // For interactions - shows relative date (e.g., "Nov 8")
  originalData: any;
}

interface SearchResultsListProps {
  searchResults: SearchResult[];
  isLoading: boolean;
  searchQuery: string;
  hasSearched: boolean;
  onItemSelect: (item: SearchResult) => void;
  emptyStateTitle?: string;
  emptyStateSubtitle?: string;
  showResultsCount?: boolean;
  scrollable?: boolean;
}

const SearchResultsList: React.FC<SearchResultsListProps> = ({
  searchResults,
  isLoading,
  searchQuery,
  hasSearched,
  onItemSelect,
  emptyStateTitle = "No results found",
  emptyStateSubtitle = "Try searching for a different name or username",
  showResultsCount = true,
  scrollable = true,
}) => {
  const { theme } = useTheme();

  // Handle item selection
  const handleItemPress = useCallback((item: SearchResult) => {
    onItemSelect(item);
  }, [onItemSelect]);

  // Create styles
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: scrollable ? 1 : undefined,
    },
    content: {
      flex: scrollable ? 1 : undefined,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: theme.colors.grayUltraLight,
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    resultItem: {
      flexDirection: 'row',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
      backgroundColor: theme.colors.background,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
    },
    itemContent: {
      flex: 1,
      justifyContent: 'center',
    },
    name: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    secondaryText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dateText: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginLeft: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
      paddingVertical: 60,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptySubText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
  }), [theme, scrollable]);

  // Render search result item
  // Use composite key to avoid duplicate key error when same entity appears in both entity and interaction results
  const renderSearchItem = useCallback((item: SearchResult) => {
    const compositeKey = `${item.originalData?.isInteraction ? 'interaction' : item.type}-${item.id}`;

    return (
      <TouchableOpacity
        key={compositeKey}
        style={styles.resultItem}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
          <Text style={styles.avatarText}>{item.initials}</Text>
        </View>

        <View style={styles.itemContent}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={styles.itemRow}>
            <Text style={styles.secondaryText} numberOfLines={1}>{item.secondaryText}</Text>
            {item.date && <Text style={styles.dateText}>{item.date}</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleItemPress, styles]);

  // Content based on state
  const renderContent = () => {
    // Loading State
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    // Search Results
    if (searchQuery && hasSearched) {
      if (searchResults.length > 0) {
        return (
          <>
            {showResultsCount && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {searchResults.length} Result{searchResults.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            {searchResults.map(renderSearchItem)}
          </>
        );
      } else {
        return (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name="search-outline" 
              size={64} 
              color={theme.colors.grayMedium} 
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyText}>{emptyStateTitle}</Text>
            <Text style={styles.emptySubText}>{emptyStateSubtitle}</Text>
          </View>
        );
      }
    }

    return null;
  };

  const ContentComponent = scrollable ? ScrollView : View;
  const contentProps = scrollable ? { showsVerticalScrollIndicator: false } : {};

  return (
    <View style={styles.container}>
      <ContentComponent style={styles.content} {...contentProps}>
        {renderContent()}
      </ContentComponent>
    </View>
  );
};

export default SearchResultsList; 