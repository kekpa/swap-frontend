/**
 * Created: Added theme system index file for easy imports
 *
 * This file exports all theme-related components and utilities for easy importing.
 */

// Export theme definitions
export { default as theme, darkVioletTheme as darkTheme, violetTheme as lightTheme } from "./theme";
export type {
  Theme,
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  ThemeResponsive,
  ThemeBorderRadius,
  ThemeShadows,
} from "./theme";

// Export theme context
export { ThemeProvider, useTheme } from "./ThemeContext";

// Export theme utilities
export {
  useThemedStyles,
  useThemeColor,
  ThemedText,
  ThemedView,
  ThemedButton,
  withTheme,
} from "./themeUtils";

