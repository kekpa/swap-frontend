import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

interface DiscoveryCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  description: string;
  onPress: () => void;
  children?: React.ReactNode;
}

export default function DiscoveryCard({
  icon,
  iconColor,
  title,
  description,
  onPress,
  children,
}: DiscoveryCardProps) {
  const { theme } = useTheme();
  const finalIconColor = iconColor || theme.colors.primary;

  return (
    <TouchableOpacity
      style={[styles.container, {
        backgroundColor: theme.colors.card,
        shadowColor: theme.colors.shadow,
      }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${finalIconColor}15` }]}>
          <Ionicons name={icon} size={20} color={finalIconColor} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {title}
          </Text>
        </View>
      </View>

      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        {description}
      </Text>

      {children && (
        <View style={styles.childrenContainer}>
          {children}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
    minHeight: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  childrenContainer: {
    marginBottom: 8,
  },
});
