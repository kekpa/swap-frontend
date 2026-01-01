import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

export interface Announcement {
  id: string;
  type: 'info' | 'maintenance' | 'promo' | 'tip';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface AnnouncementCardProps {
  announcement: Announcement;
  onDismiss?: () => void;
  totalCount?: number;
  currentIndex?: number;
}

const TYPE_CONFIG = {
  info: { icon: 'information-circle', color: 'primary' },
  maintenance: { icon: 'warning', color: 'warning' },
  promo: { icon: 'gift', color: 'success' },
  tip: { icon: 'bulb', color: 'info' },
} as const;

export default function AnnouncementCard({
  announcement,
  onDismiss,
  totalCount = 1,
  currentIndex = 0,
}: AnnouncementCardProps) {
  const { theme } = useTheme();
  const config = TYPE_CONFIG[announcement.type];
  const iconColor = theme.colors[config.color as keyof typeof theme.colors] as string;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name={config.icon as any} size={18} color={iconColor} />
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {announcement.title}
          </Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Message */}
      <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
        {announcement.message}
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        {totalCount > 1 && (
          <Text style={[styles.indicator, { color: theme.colors.textTertiary }]}>
            {currentIndex + 1} of {totalCount}
          </Text>
        )}
        {announcement.actionLabel && announcement.onAction && (
          <TouchableOpacity onPress={announcement.onAction}>
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>
              {announcement.actionLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  indicator: {
    fontSize: 11,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
