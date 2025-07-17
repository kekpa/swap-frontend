// Created: SearchOverlay component for Google Maps-style in-place search experience - 2025-05-29
// Updated: Complete TanStack Query migration with proper hooks - 2025-01-10
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthContext } from '../auth/context/AuthContext';
import { InteractionsStackParamList } from '../../navigation/interactions/interactionsNavigator';
import SearchResultsList from '../../components2/SearchResultsList';
import { getAvatarProps } from '../../utils/avatarUtils';
import logger from '../../utils/logger';
import { useSearchEntities } from '../../query/hooks/useSearchEntities';
import { useInteractions, InteractionItem } from '../../query/hooks/useInteractions';

type NavigationProp = StackNavigationProp<InteractionsStackParamList>;

interface SearchResult {
  id: string;
  name: string;
  type: 'entity' | 'interaction' | 'contact';
  avatarUrl?: string;
  initials: string;
  avatarColor: string;
  secondaryText: string;
  originalData: any;
}

interface SearchOverlayProps {
  searchQuery: string;
  onItemSelect?: (item: SearchResult) => void;
}

const SearchOverlay: React.FC<SearchOverlayProps> = React.memo(({
  searchQuery,
  onItemSelect
}) => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user } = useAuthContext();

  // TanStack Query hooks
  const {
    results: searchResults,
    isLoading: isLoadingEntitySearch,
    isError: isSearchError,
    error: searchError,
  } = useSearchEntities({
    query: searchQuery,
    enabled: searchQuery.length >= 2,
  });

  const {
    interactions,
    isLoading: isLoadingInteractions,
    isError: isInteractionsError,
    error: interactionsError,
  } = useInteractions({
    enabled: true,
  });

  const [hasSearched, setHasSearched] = useState(false);
  const [mappedSearchResults, setMappedSearchResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  
  // Convert interactions to suggestions format
  const memoizedSuggestions = useMemo(() => {
    logger.debug(`[SearchOverlay] Recalculating suggestions from interactions: ${interactions?.length || 0}`);
    
    if (!interactions || interactions.length === 0) {
      return [];
    }
    
    // Convert interactions to search results format
    return interactions.slice(0, 6).map((interaction: InteractionItem) => {
      // Get the other member (not the current user) for direct conversations
      const otherMember = interaction.members?.find(
        member => member.entity_id !== user?.entityId
      );
      
      const displayName = interaction.name || otherMember?.display_name || 'Unknown';
      const avatarProps = getAvatarProps(
        otherMember?.entity_id || interaction.id,
        displayName
      );
      
      return {
        id: interaction.id,
        name: displayName,
        type: 'interaction' as const,
        avatarUrl: otherMember?.avatar_url,
        initials: avatarProps.initials,
        avatarColor: avatarProps.color,
        secondaryText: interaction.is_group ? 'Group Chat' : 'Direct Message',
        originalData: {
          ...interaction,
          contactEntityId: otherMember?.entity_id,
          type: interaction.is_group ? 'group' : 'direct',
        },
      };
    });
  }, [interactions, user?.entityId]);

  // Load suggestions when component mounts or interactions change
  useEffect(() => {
    logger.debug(`[SearchOverlay] Mount effect - loading suggestions. Interactions length: ${interactions?.length || 0}`);
    
    // Set suggestions from memoized value
    setSuggestions(memoizedSuggestions);
    
    // Log what we're displaying
    if (memoizedSuggestions.length > 0) {
      logger.debug(`[SearchOverlay] Found recent conversations: ${memoizedSuggestions.length}`);
      memoizedSuggestions.forEach((conv, idx) => {
        logger.debug(`[SearchOverlay] Recent suggestion ${idx}: ${conv.name}, type=${conv.type}, id=${conv.id}`);
      });
    } else {
      logger.debug('[SearchOverlay] No suggestions available');
    }
  }, [memoizedSuggestions, interactions]);

  // Handle search state changes
  useEffect(() => {
    // If query is empty, show suggestions
    if (!searchQuery || searchQuery.trim().length === 0) {
      setHasSearched(false);
      setMappedSearchResults([]);
      return;
    }

    // Mark as searched for queries >= 2 characters
    if (searchQuery.trim().length >= 2) {
      setHasSearched(true);
    }
  }, [searchQuery]);

  // Convert entity search results to SearchResult format
  useEffect(() => {
    if (searchResults?.entities && searchResults.entities.length > 0) {
      logger.debug(`[SearchOverlay] Processing ${searchResults.entities.length} search results. Current user entityId: ${user?.entityId}`);
      
      // Filter out current user's entity to prevent self-chat
      const filteredResults = searchResults.entities.filter(entity => {
        const shouldKeep = entity.id !== user?.entityId;
        if (!shouldKeep) {
          logger.debug(`[SearchOverlay] Filtering out current user's entity: ${entity.id} (displayName: ${entity.displayName})`);
        }
        return shouldKeep;
      });
      
      logger.debug(`[SearchOverlay] After filtering: ${filteredResults.length} results (removed ${searchResults.entities.length - filteredResults.length} self-results)`);
      
      const mappedResults = filteredResults.map(entity => {
        const avatarProps = getAvatarProps(entity.id, entity.displayName);
        
        return {
          id: entity.id,
          name: entity.displayName,
          type: 'entity' as const,
          avatarUrl: entity.avatarUrl,
          initials: avatarProps.initials,
          avatarColor: avatarProps.color,
          secondaryText: entity.entityType === 'profile' ? 'Profile' : 
                        entity.entityType === 'business' ? 'Business' : 'Account',
          originalData: entity,
        };
      });
      
      setMappedSearchResults(mappedResults);
    } else if (hasSearched) {
      setMappedSearchResults([]);
    }
  }, [searchResults, hasSearched, user?.entityId]);

  // Handle item selection
  const handleItemPress = useCallback((item: SearchResult) => {
    logger.debug(`Search item selected: ${item.name} (${item.type})`);
    
    if (onItemSelect) {
      onItemSelect(item);
    } else {
      // For recent conversations, use the contactEntityId if available, otherwise fall back to the item id
      const contactId = item.type === 'interaction' && item.originalData?.contactEntityId 
        ? item.originalData.contactEntityId 
        : item.id;
        
      const navParams: InteractionsStackParamList['ContactInteractionHistory2'] = {
        contactId: contactId,
        contactName: item.name,
        contactInitials: item.initials,
        contactAvatarColor: item.avatarColor,
        isGroup: item.type === 'interaction' ? item.originalData?.type === 'group' : false,
        forceRefresh: true,
        timestamp: new Date().getTime(),
      };

      InteractionManager.runAfterInteractions(() => {
        navigation.navigate('ContactInteractionHistory2', navParams);
      });
    }
  }, [onItemSelect, navigation]);

  // Create styles matching InteractionsHistory2 design
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
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
    quickActionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    quickActionIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    quickActionText: {
      fontSize: 16,
      color: theme.colors.textPrimary,
      fontWeight: '500',
    },
    searchResultsContainer: {
      flex: 1,
    },
    errorContainer: {
      padding: 20,
      alignItems: 'center',
    },
    errorText: {
      color: theme.colors.error,
      textAlign: 'center',
      marginTop: 8,
    },
  }), [theme]);

  // Render search result item
  const renderSearchItem = useCallback((item: SearchResult) => (
    <TouchableOpacity
      key={item.id}
      style={{
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        backgroundColor: theme.colors.background,
      }}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={[{
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      }, { backgroundColor: item.avatarColor }]}>
        <Text style={{
          color: '#FFFFFF',
          fontSize: 18,
          fontWeight: '600',
        }}>{item.initials}</Text>
      </View>
      
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '500',
          color: theme.colors.textPrimary,
          marginBottom: 4,
        }} numberOfLines={1}>{item.name}</Text>
        <Text style={{
          fontSize: 14,
          color: theme.colors.textSecondary,
        }} numberOfLines={1}>{item.secondaryText}</Text>
      </View>
    </TouchableOpacity>
  ), [handleItemPress, theme]);

  // Handle errors
  if (isSearchError || isInteractionsError) {
    logger.error('[SearchOverlay] Error in search or interactions:', {
      searchError: searchError?.message,
      interactionsError: interactionsError?.message,
    });
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions (when no query) */}
        {!searchQuery && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <TouchableOpacity style={styles.quickActionItem}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="qr-code-outline" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.quickActionText}>Scan QR Code</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Recent Conversations (when not searching) */}
        {!searchQuery && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Conversations</Text>
            </View>
            
            {isLoadingInteractions && suggestions.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={{ marginTop: 8, color: theme.colors.textSecondary }}>
                  Loading recent conversations...
                </Text>
              </View>
            ) : isInteractionsError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="warning-outline" size={24} color={theme.colors.error} />
                <Text style={styles.errorText}>
                  Failed to load recent conversations
                </Text>
              </View>
            ) : suggestions.length > 0 ? (
              suggestions.map(renderSearchItem)
            ) : (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: theme.colors.textSecondary }}>
                  No recent conversations
                </Text>
              </View>
            )}
          </>
        )}

        {/* Search Results */}
        {searchQuery && (
          <View style={styles.searchResultsContainer}>
            <SearchResultsList
              searchResults={mappedSearchResults}
              isLoading={isLoadingEntitySearch}
              searchQuery={searchQuery}
              hasSearched={hasSearched}
              onItemSelect={handleItemPress}
              scrollable={false}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
});

export default SearchOverlay; 