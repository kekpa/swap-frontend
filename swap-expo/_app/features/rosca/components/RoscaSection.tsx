import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextStyle } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import RoscaCard from './RoscaCard';
import type { RoscaEnrollment } from '../../../types/rosca.types';

interface RoscaSectionProps {
  enrollments: RoscaEnrollment[];
  onCardPress: (enrollment: RoscaEnrollment) => void;
  onPayPress: (enrollment: RoscaEnrollment) => void;
  onJoinPress: () => void;
  onCompletedPress: () => void;
  completedCount?: number;
}

export default function RoscaSection({
  enrollments,
  onCardPress,
  onPayPress,
  onJoinPress,
  onCompletedPress,
  completedCount = 0,
}: RoscaSectionProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <Text style={[styles.sectionHeader, { color: theme.colors.textPrimary }]}>
        My Roscas ({enrollments.length})
      </Text>

      {/* Enrollment Cards */}
      {enrollments.map((enrollment) => (
        <RoscaCard
          key={enrollment.id}
          enrollment={enrollment}
          onPress={() => onCardPress(enrollment)}
          onPayPress={() => onPayPress(enrollment)}
        />
      ))}

      {/* Join Button - uses theme.commonStyles.secondaryButton */}
      <TouchableOpacity
        style={[
          theme.commonStyles.secondaryButton,
          styles.joinButton,
        ]}
        onPress={onJoinPress}
        activeOpacity={0.8}
      >
        <Text style={[theme.commonStyles.secondaryButtonText as TextStyle, styles.joinButtonText]}>
          + Join a Rosca
        </Text>
      </TouchableOpacity>

      {/* Completed Link */}
      {completedCount > 0 && (
        <TouchableOpacity
          style={styles.completedLink}
          onPress={onCompletedPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.completedLinkText, { color: theme.colors.textSecondary }]}>
            Completed ({completedCount}) →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  joinButton: {
    marginTop: 4,
  },
  joinButtonText: {
    fontSize: 14,
  },
  completedLink: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  completedLinkText: {
    fontSize: 14,
  },
});
