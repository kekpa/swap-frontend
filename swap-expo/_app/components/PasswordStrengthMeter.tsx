import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePasswordStrength, PasswordStrengthResult } from '../hooks/usePasswordStrength';
import { useTheme } from '../theme/ThemeContext';

interface PasswordStrengthMeterProps {
  password: string;
  showFeedback?: boolean;
}

const getStrengthColor = (strength: PasswordStrengthResult['strength']): string => {
  switch (strength) {
    case 'very-weak':
      return '#F44336'; // Red
    case 'weak':
      return '#FF9800'; // Orange
    case 'fair':
      return '#FFC107'; // Amber
    case 'good':
      return '#8BC34A'; // Light Green
    case 'strong':
      return '#4CAF50'; // Green
    default:
      return '#E0E0E0'; // Gray
  }
};

const getStrengthLabel = (strength: PasswordStrengthResult['strength']): string => {
  switch (strength) {
    case 'very-weak':
      return 'Very Weak';
    case 'weak':
      return 'Weak';
    case 'fair':
      return 'Fair';
    case 'good':
      return 'Good';
    case 'strong':
      return 'Strong';
    default:
      return '';
  }
};

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  showFeedback = true,
}) => {
  const { theme } = useTheme();
  const passwordStrength = usePasswordStrength(password);

  if (!password) {
    return null;
  }

  const strengthColor = getStrengthColor(passwordStrength.strength);
  const strengthLabel = getStrengthLabel(passwordStrength.strength);
  const progressWidth = (passwordStrength.score / 5) * 100;

  return (
    <View style={styles.container}>
      {/* Strength Bar */}
      <View style={styles.strengthBarContainer}>
        <View style={[styles.strengthBarBackground, { backgroundColor: theme.colors.border }]}>
          <View
            style={[
              styles.strengthBarFill,
              {
                backgroundColor: strengthColor,
                width: `${progressWidth}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.strengthLabel, { color: strengthColor }]}>
          {strengthLabel}
        </Text>
      </View>

      {/* Feedback */}
      {showFeedback && passwordStrength.feedback.length > 0 && (
        <View style={styles.feedbackContainer}>
          {passwordStrength.feedback.map((item, index) => (
            <Text
              key={index}
              style={[
                styles.feedbackText,
                {
                  color: passwordStrength.isValid ? strengthColor : theme.colors.textSecondary,
                },
              ]}
            >
              • {item}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  strengthBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  strengthBarBackground: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 12,
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 60,
    textAlign: 'right',
  },
  feedbackContainer: {
    marginTop: 4,
  },
  feedbackText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
});