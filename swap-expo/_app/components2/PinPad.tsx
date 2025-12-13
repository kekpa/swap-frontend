import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

/**
 * PinPad Component
 *
 * Reusable 6-digit PIN input with keypad.
 * Extracted from Passcode.tsx for use across:
 * - Passcode creation (KYC)
 * - App lock screen (unlock)
 * - Wallet unlock (if needed)
 *
 * @created 2025-12-01
 */

interface PinPadProps {
  /** Current PIN value (0-6 digits) */
  value: string;
  /** Callback when PIN changes */
  onChange: (value: string) => void;
  /** Number of digits (default: 6) */
  length?: number;
  /** Optional error state - shakes dots and shows red */
  error?: boolean;
  /** Disable input */
  disabled?: boolean;
}

const PinPad: React.FC<PinPadProps> = ({
  value,
  onChange,
  length = 6,
  error = false,
  disabled = false,
}) => {
  const { theme } = useTheme();

  // Responsive sizing
  const { height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 700;
  const isTinyScreen = screenHeight < 600;

  const handleKeyPress = (key: number | 'delete') => {
    if (disabled) return;

    if (key === 'delete') {
      if (value.length > 0) {
        onChange(value.slice(0, -1));
      }
    } else if (value.length < length) {
      onChange(value + key);
    }
  };

  const styles = useMemo(() => {
    const keySize = isTinyScreen ? 60 : isSmallScreen ? 70 : 80;
    const keyMargin = isTinyScreen ? theme.spacing.xs : isSmallScreen ? theme.spacing.sm : theme.spacing.md;
    const dotSize = isSmallScreen ? 14 : 16;
    const dotMargin = isTinyScreen ? theme.spacing.sm : theme.spacing.md;
    const keyFontSize = isTinyScreen ? theme.typography.fontSize.lg : isSmallScreen ? theme.typography.fontSize.xl - 2 : theme.typography.fontSize.xl;

    return StyleSheet.create({
      container: {
        alignItems: 'center',
      },
      dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: isTinyScreen ? theme.spacing.md : isSmallScreen ? theme.spacing.lg : theme.spacing.xl,
      },
      dot: {
        width: dotSize,
        height: dotSize,
        borderRadius: dotSize / 2,
        backgroundColor: error ? theme.colors.error + '40' : theme.colors.inputBorder,
        marginHorizontal: dotMargin,
      },
      dotFilled: {
        backgroundColor: error ? theme.colors.error : theme.colors.primary,
      },
      keypad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%',
        maxWidth: isTinyScreen ? 280 : isSmallScreen ? 320 : 350,
      },
      key: {
        width: keySize,
        height: keySize,
        borderRadius: keySize / 2,
        backgroundColor: disabled ? theme.colors.inputBorder : theme.colors.card,
        margin: keyMargin,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.small,
      },
      keyPressed: {
        backgroundColor: theme.colors.primary + '20',
      },
      keyText: {
        fontSize: keyFontSize,
        fontWeight: '500',
        color: disabled ? theme.colors.textSecondary : theme.colors.textPrimary,
      },
      keyEmpty: {
        width: keySize,
        height: keySize,
        margin: keyMargin,
      },
      keyDelete: {
        width: keySize,
        height: keySize,
        borderRadius: keySize / 2,
        margin: keyMargin,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: disabled ? theme.colors.inputBorder : theme.colors.card,
        ...theme.shadows.small,
      },
    });
  }, [theme, isSmallScreen, isTinyScreen, error, disabled]);

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < length; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            i < value.length && styles.dotFilled,
          ]}
        />
      );
    }
    return dots;
  };

  const renderKeypad = () => {
    const keys: (number | null | 'delete')[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'delete'];

    return keys.map((key, index) => {
      if (key === null) {
        return <View key={index} style={styles.keyEmpty} />;
      }

      if (key === 'delete') {
        return (
          <TouchableOpacity
            key={index}
            style={styles.keyDelete}
            onPress={() => handleKeyPress('delete')}
            disabled={disabled || value.length === 0}
          >
            <Ionicons
              name="backspace-outline"
              size={isSmallScreen ? 20 : 24}
              color={disabled || value.length === 0 ? theme.colors.textSecondary : theme.colors.primary}
            />
          </TouchableOpacity>
        );
      }

      return (
        <TouchableOpacity
          key={index}
          style={styles.key}
          onPress={() => handleKeyPress(key)}
          disabled={disabled}
        >
          <Text style={styles.keyText}>{key}</Text>
        </TouchableOpacity>
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.dotsContainer}>
        {renderDots()}
      </View>
      <View style={styles.keypad}>
        {renderKeypad()}
      </View>
    </View>
  );
};

export default PinPad;
