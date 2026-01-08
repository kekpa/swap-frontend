/**
 * ArchivedInteractions Screen
 *
 * Displays archived conversations (WhatsApp-style).
 * Archived conversations are those with financial transactions that the user "deleted".
 * Users can swipe to unarchive and restore them to the main list.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/rootNavigator';
import { useArchivedInteractions, useUnarchiveInteraction } from '../../hooks-actions/useDeleteInteraction';
import logger from '../../utils/logger';
import { useRefreshByUser } from '../../hooks/useRefreshByUser';
import { getAvatarColor } from '../../utils/avatarUtils';

// Helper function to get name initials
const getInitials = (name: string): string => {
  if (!name) return '??';

  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Format time for display
const formatTime = (dateString?: string): string => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const ArchivedInteractions: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Fetch archived interactions
  const {
    data: archivedData,
    isLoading,
    refetch,
  } = useArchivedInteractions();

  // Industry-standard refresh hook (local state, no shared global state)
  const { refreshing, onRefresh } = useRefreshByUser(refetch);

  // Unarchive mutation
  const unarchiveMutation = useUnarchiveInteraction();

  const interactions = archivedData?.interactions ?? [];

  // Handle unarchive
  const handleUnarchive = useCallback(async (interactionId: string) => {
    Alert.alert(
      'Unarchive Conversation',
      'Move this conversation back to your main list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unarchive',
          onPress: async () => {
            try {
              logger.info(`[ArchivedInteractions] Unarchiving: ${interactionId}`, 'data');
              await unarchiveMutation.mutateAsync(interactionId);
            } catch (error) {
              logger.error(`[ArchivedInteractions] Failed to unarchive: ${interactionId}`, error, 'data');
              Alert.alert('Error', 'Failed to unarchive conversation. Please try again.');
            }
          },
        },
      ]
    );
  }, [unarchiveMutation]);

  // Handle chat press - navigate to the conversation
  const handleChatPress = useCallback((interaction: any) => {
    // Find the other member (not current user)
    const otherMember = interaction.members?.find((m: any) => m.entity_id);
    if (otherMember) {
      navigation.navigate('ContactInteractionHistory2', {
        contactId: otherMember.entity_id,
        contactName: interaction.name || otherMember.display_name || 'Unknown',
        contactInitials: getInitials(interaction.name || otherMember.display_name || 'Unknown'),
        contactAvatarColor: getAvatarColor(otherMember.entity_id),
        interactionId: interaction.id,
      });
    }
  }, [navigation]);

  // Render swipe actions (unarchive)
  const renderRightActions = (interactionId: string) => {
    return (
      <View
        style={{
          width: 100,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <TouchableOpacity
          style={{
            width: 100,
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.primary,
          }}
          onPress={() => handleUnarchive(interactionId)}
        >
          <Ionicons name="archive-outline" size={22} color="white" />
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 13, marginTop: 5 }}>
            Unarchive
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render interaction item
  const renderInteractionItem = (interaction: any) => {
    const initials = getInitials(interaction.name || 'Unknown');
    const avatarColor = getAvatarColor(interaction.id);

    return (
      <Swipeable
        key={interaction.id}
        renderRightActions={() => renderRightActions(interaction.id)}
        friction={1.5}
        rightThreshold={40}
        overshootRight={false}
      >
        <TouchableOpacity
          style={[styles.chatItem, { backgroundColor: theme.colors.background }]}
          onPress={() => handleChatPress(interaction)}
        >
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          {/* Content */}
          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <Text style={[styles.name, { color: theme.colors.textPrimary }]}>
                {interaction.name || 'Unknown'}
              </Text>
              <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
                {formatTime(interaction.last_activity_at)}
              </Text>
            </View>
            <Text
              style={[styles.message, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {interaction.last_activity_snippet || 'No activity'}
            </Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="archive-outline" size={60} color={theme.colors.grayMedium} />
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          No archived conversations
        </Text>
        <Text style={[styles.emptySubText, { color: theme.colors.textTertiary }]}>
          Conversations with transactions that you delete will appear here
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Archived
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading archived conversations...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          {interactions.length === 0 ? (
            renderEmptyState()
          ) : (
            interactions.map((interaction: any) => renderInteractionItem(interaction))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  headerRight: {
    width: 32, // Balance the back button
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
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
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  time: {
    fontSize: 12,
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
  },
});

export default ArchivedInteractions;
