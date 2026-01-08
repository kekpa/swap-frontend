/**
 * Created: Added theme utilities for easier theme usage in components
 *
 * This file provides utility functions and components to make it easier
 * to use the theme system throughout the app.
 */

import React from "react";
import {
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";
import { useTheme } from "./ThemeContext";
import { Theme } from "./theme";

// Type for style functions that use the theme
type ThemedStyleFn<T> = (theme: Theme) => T;

/**
 * Hook to create themed styles
 * @param stylesFn Function that takes theme and returns styles
 * @returns StyleSheet with theme-aware styles
 */
export const useThemedStyles = <T extends StyleSheet.NamedStyles<T>>(
  stylesFn: ThemedStyleFn<T>
): T => {
  const { theme } = useTheme();
  return StyleSheet.create(stylesFn(theme));
};

// Type for simple color keys (excludes nested objects like status, statusBackground)
type SimpleColorKey = Exclude<keyof Theme["colors"], 'status' | 'statusBackground'>;

/**
 * Hook to get a specific color from the theme
 * @param colorName Name of the color in the theme (must be a simple color, not a nested object)
 * @returns The color value
 */
export const useThemeColor = (colorName: SimpleColorKey): string => {
  const { theme } = useTheme();
  return theme.colors[colorName] as string;
};

// Props for themed components
interface ThemedTextProps {
  style?: TextStyle | TextStyle[];
  variant?: "body" | "caption" | "title" | "heading" | "subheading";
  color?: SimpleColorKey;
  children: React.ReactNode;
  [key: string]: any;
}

interface ThemedViewProps {
  style?: ViewStyle | ViewStyle[];
  backgroundColor?: SimpleColorKey;
  children: React.ReactNode;
  [key: string]: any;
}

interface ThemedButtonProps extends TouchableOpacityProps {
  variant?: "primary" | "secondary" | "outline" | "text";
  size?: "small" | "medium" | "large";
  title: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Themed Text component
 */
export const ThemedText: React.FC<ThemedTextProps> = ({
  style,
  variant = "body",
  color = "textPrimary",
  children,
  ...props
}) => {
  const { theme } = useTheme();

  // Define text styles based on variant
  const variantStyles: Record<string, TextStyle> = {
    body: {
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.md,
      lineHeight: theme.typography.lineHeight.md,
      color: theme.colors.textPrimary,
    },
    caption: {
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
      color: theme.colors.textTertiary,
    },
    title: {
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.fontSize.xl,
      lineHeight: theme.typography.lineHeight.xl,
      color: theme.colors.textPrimary,
    },
    heading: {
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.fontSize.xxl,
      lineHeight: theme.typography.lineHeight.xxl,
      color: theme.colors.textPrimary,
    },
    subheading: {
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.lg,
      lineHeight: theme.typography.lineHeight.lg,
      color: theme.colors.textSecondary,
    },
  };

  return (
    <Text
      style={[variantStyles[variant], { color: theme.colors[color] }, style]}
      {...props}
    >
      {children}
    </Text>
  );
};

/**
 * Themed View component
 */
export const ThemedView: React.FC<ThemedViewProps> = ({
  style,
  backgroundColor = "background",
  children,
  ...props
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[{ backgroundColor: theme.colors[backgroundColor] }, style]}
      {...props}
    >
      {children}
    </View>
  );
};

/**
 * Themed Button component
 */
export const ThemedButton: React.FC<ThemedButtonProps> = ({
  variant = "primary",
  size = "medium",
  title,
  leftIcon,
  rightIcon,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  // Define button styles based on variant
  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
    },
    secondary: {
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.md,
    },
    outline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
    },
    text: {
      backgroundColor: "transparent",
    },
  };

  // Define text styles based on variant
  const textStyles: Record<string, TextStyle> = {
    primary: {
      color: theme.colors.white,
      fontFamily: theme.typography.fontFamily.medium,
    },
    secondary: {
      color: theme.colors.white,
      fontFamily: theme.typography.fontFamily.medium,
    },
    outline: {
      color: theme.colors.primary,
      fontFamily: theme.typography.fontFamily.medium,
    },
    text: {
      color: theme.colors.primary,
      fontFamily: theme.typography.fontFamily.medium,
    },
  };

  // Define size styles
  const sizeStyles: Record<string, ViewStyle> = {
    small: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    medium: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    large: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
  };

  // Define text size styles
  const textSizeStyles: Record<string, TextStyle> = {
    small: {
      fontSize: theme.typography.fontSize.sm,
    },
    medium: {
      fontSize: theme.typography.fontSize.md,
    },
    large: {
      fontSize: theme.typography.fontSize.lg,
    },
  };

  return (
    <TouchableOpacity
      style={[
        variantStyles[variant],
        sizeStyles[size],
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
      {...props}
    >
      {leftIcon && (
        <View style={{ marginRight: theme.spacing.xs }}>{leftIcon}</View>
      )}
      <Text style={[textStyles[variant], textSizeStyles[size]]}>{title}</Text>
      {rightIcon && (
        <View style={{ marginLeft: theme.spacing.xs }}>{rightIcon}</View>
      )}
    </TouchableOpacity>
  );
};

/**
 * Create a themed component
 * @param Component Base component to theme
 * @param getStyles Function to get styles based on theme and props
 * @returns Themed component
 */
export function withTheme<
  P extends { style?: any },
  S extends StyleSheet.NamedStyles<S> & { container: any }
>(Component: React.ComponentType<P>, getStyles: (theme: Theme, props: P) => S) {
  return (props: P) => {
    const { theme } = useTheme();
    const styles = StyleSheet.create(getStyles(theme, props));
    return <Component {...props} style={[styles.container, props.style]} />;
  };
}
