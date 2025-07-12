// Created: SearchOverlay component for Google Maps-style in-place search experience - 2025-05-29
// Updated: Use centralized avatar utilities and filter out current user - 2025-05-29
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
// Temporarily disabled - search functionality will be implemented with useSearchEntities
// import { useData, EntitySearchResult } from '../../contexts/DataContext';

// EntitySearchResult type definition
interface EntitySearchResult {
  id: string;
  entity_type: string;
  reference_id: string;
  display_name: string;
  avatar_url?: string;
  is_active: boolean;
  metadata?: any;
}
import { useAuthContext } from '../auth/context/AuthContext';
import { InteractionsStackParamList } from '../../navigation/interactions/interactionsNavigator';
import SearchResultsList from '../../components2/SearchResultsList';
import { getAvatarProps } from '../../utils/avatarUtils';
import logger from '../../utils/logger';

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
  // TODO: Replace with TanStack Query hooks when search is implemented
  // const { searchAll, entitySearchResults, isLoadingEntitySearch, recentConversations, isLoadingRecentConversations, refreshRecentConversations } = useData();
  
  // Placeholder data until search hooks are implemented
  const searchAll = async () => {};
  const entitySearchResults: EntitySearchResult[] = [];
  const isLoadingEntitySearch = false;
  const recentConversations: any[] = [];
  const isLoadingRecentConversations = false;
  const refreshRecentConversations = () => {};
  const { user } = useAuthContext();

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);

  // To prevent infinite loops with refreshRecentConversations in dependency array
  const initialLoadRef = useRef(false);
  
  // Memoize the suggestions to avoid unnecessary re-renders
  const memoizedSuggestions = useMemo(() => {
    console.log('🔍 [SearchOverlay] Recalculating suggestions from recentConversations:', 
              recentConversations?.length);
    
    if (!recentConversations || recentConversations.length === 0) {
      return [];
    }
    
    // Convert recent conversations to search results format
    return recentConversations.slice(0, 6).map(conversation => ({
      id: conversation.contactEntityId || conversation.id,
      name: conversation.name,
      type: 'interaction' as const,
      avatarUrl: conversation.avatarUrl,
      initials: conversation.initials,
      avatarColor: conversation.avatarColor,
      secondaryText: conversation.type === 'group' ? 'Group Chat' : 'Direct Message',
      originalData: conversation,
    }));
  }, [recentConversations]);

  // Load suggestions when component mounts
  useEffect(() => {
    console.log('🔍 [SearchOverlay] Mount effect - loading suggestions. recentConversations length:', recentConversations?.length);
    
    // Only refresh conversations on initial mount
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
        
      // Only refresh if we don't have data
      if (!recentConversations || recentConversations.length === 0) {
        refreshRecentConversations().catch(err => 
          console.warn('🔍 [SearchOverlay] Error refreshing recent conversations:', err)
        );
          }
        }

    // Set suggestions from memoized value
    setSuggestions(memoizedSuggestions);
    
    // Log what we're displaying
    if (memoizedSuggestions.length > 0) {
      console.log('🔍 [SearchOverlay] Found recent conversations:', memoizedSuggestions.length);
      memoizedSuggestions.forEach((conv, idx) => {
        console.log(`🔍 [SearchOverlay] Recent suggestion ${idx}: ${conv.name}, type=${conv.type}, id=${conv.id}`);
      });
    } else {
      console.log('🔍 [SearchOverlay] No suggestions available');
    }
  }, [memoizedSuggestions]); // Only re-run when memoized suggestions change

  // Handle search with debouncing
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // If query is empty, show suggestions
    if (!searchQuery || searchQuery.trim().length === 0) {
      setHasSearched(false);
      setSearchResults([]);
      return;
    }

    // Search with 150ms debounce
    if (searchQuery.trim().length >= 2) {
      const timeout = setTimeout(async () => {
        logger.debug(`Fast search with query: ${searchQuery}`, "SearchOverlay");
        try {
          await searchAll(searchQuery);
          setHasSearched(true);
        } catch (error) {
          logger.error("Error searching", error, "SearchOverlay");
          setHasSearched(true);
        }
      }, 150);
      
      setSearchTimeout(timeout);
    }
  }, [searchQuery, searchAll]);

  // Convert entity search results to SearchResult format
  useEffect(() => {
    if (entitySearchResults && entitySearchResults.length > 0) {
      logger.debug(`[SearchOverlay] Processing ${entitySearchResults.length} search results. Current user entityId: ${user?.entityId}`, "SearchOverlay");
      
      // Filter out current user's entity to prevent self-chat
      const filteredResults = entitySearchResults.filter(entity => {
        const shouldKeep = entity.id !== user?.entityId;
        if (!shouldKeep) {
          logger.debug(`[SearchOverlay] Filtering out current user's entity: ${entity.id} (display_name: ${entity.display_name})`, "SearchOverlay");
        }
        return shouldKeep;
      });
      
      logger.debug(`[SearchOverlay] After filtering: ${filteredResults.length} results (removed ${entitySearchResults.length - filteredResults.length} self-results)`, "SearchOverlay");
      
      const mappedResults = filteredResults.map(entity => {
        const avatarProps = getAvatarProps(entity.id, entity.display_name);
        
        return {
          id: entity.id,
          name: entity.display_name,
          type: 'entity' as const,
          avatarUrl: entity.avatar_url,
          initials: avatarProps.initials,
          avatarColor: avatarProps.color,
          secondaryText: entity.entity_type === 'profile' ? 'Profile' : 
                        entity.entity_type === 'business' ? 'Business' : 'Account',
          originalData: entity,
        };
      });
      
      setSearchResults(mappedResults);
    } else if (hasSearched) {
      setSearchResults([]);
    }
  }, [entitySearchResults, hasSearched, user?.entityId]);

  // Handle item selection
  const handleItemPress = useCallback((item: SearchResult) => {
    logger.debug(`Search item selected: ${item.name} (${item.type})`, "SearchOverlay");
    
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions (when no query) - MOVED TO TOP */}
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

        {/* Suggestions (when not searching) - NOW BELOW QUICK ACTIONS */}
        {!searchQuery && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Conversations</Text>
            </View>
            
            {isLoadingRecentConversations && suggestions.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={{ marginTop: 8, color: theme.colors.textSecondary }}>Loading recent conversations...</Text>
              </View>
            ) : suggestions.length > 0 ? (
              suggestions.map(renderSearchItem)
            ) : (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: theme.colors.textSecondary }}>No recent conversations</Text>
              </View>
            )}
          </>
        )}

        {/* Search Results using shared component */}
        {searchQuery && (
          <View style={styles.searchResultsContainer}>
            <SearchResultsList
              searchResults={searchResults}
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