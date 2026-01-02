import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

interface QuickActionButtonProps {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

function QuickActionButton({ iconName, label, onPress }: QuickActionButtonProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.grayUltraLight }]}>
        <Ionicons name={iconName} size={18} color={theme.colors.textPrimary} />
      </View>
      <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface QuickActionsRowV2Props {
  onAddPress: () => void;
  onSendPress: () => void;
  onQRPress: () => void;
  onCalendarPress: () => void;
  // TODO: Update to onSettingsPress when Settings page is ready
  onProfilePress: () => void;
}

export default function QuickActionsRowV2({
  onAddPress,
  onSendPress,
  onQRPress,
  onCalendarPress,
  onProfilePress,
}: QuickActionsRowV2Props) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      <QuickActionButton iconName="person-outline" label="Profile" onPress={onProfilePress} />
      <QuickActionButton iconName="calendar-outline" label="Calendar" onPress={onCalendarPress} />
      <QuickActionButton iconName="qr-code-outline" label="QR" onPress={onQRPress} />
      <QuickActionButton iconName="arrow-up" label="Send" onPress={onSendPress} />
      <QuickActionButton iconName="add" label="Add" onPress={onAddPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
