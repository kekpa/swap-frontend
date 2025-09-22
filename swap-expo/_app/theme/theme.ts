/**
 * Updated: Refactored for a primary violet theme, added oceanBlue theme, and made commonStyles themeable - YYYY-MM-DD
 * Updated: Added amber theme, fixed darkGreen theme to follow light theme pattern, added dark mode variants - YYYY-MM-DD
 * Updated: Comprehensive reorganization of colors and improved dark mode support for all UI elements - YYYY-MM-DD
 *
 * This file defines the app's design system including colors, typography, spacing,
 * and common styles. It provides a centralized place to manage the visual aspects
 * of the application.
 */

import { Dimensions, Platform } from "react-native";

const { width, height } = Dimensions.get("window");

//=============================================================================
// MAIN COLOR PALETTE
//=============================================================================
// Base color palette for the entire application.
// These are raw values not directly used in UI components.
// UI components should use the ThemeColors interface values.
//=============================================================================

const PALETTE = {
  // Brand Colors - Primary colors for each theme
  primary: {
    violet: "#8b14fd",
    violetDark: "#7512e0",
    violetLight: "#e9d5ff",
    violetUltraLight: "#f5f3ff",

    oceanBlue: "#0077b6",
    oceanBlueDark: "#005d91",  
    oceanBlueLight: "#90e0ef",
    oceanBlueUltraLight: "#e0f7fa",

    green: "#10B981",
    greenDark: "#0B815A",
    greenLight: "#D1FAE5",
    greenUltraLight: "#f0fdf4",

    amber: "#ffb744",
    amberDark: "#f59e0b",
    amberLight: "#ffe0b2",
    amberUltraLight: "#fff8e1",
  },

  // Secondary and accent colors
  secondary: {
    indigo: "#6366F1",
    indigoDark: "#4F46E5",
    indigoLight: "#E0E7FF",
  },

  // Semantic colors
  semantic: {
    success: "#10B981",  // Green
    error: "#EF4444",    // Red
    warning: "#F59E0B",  // Orange/Amber
    info: "#3B82F6",     // Blue
  },

  // Neutral palette for text, backgrounds, borders
  neutral: {
    black: "#000000",
    white: "#FFFFFF",
    
    // Gray scale from darkest to lightest
    gray900: "#111827", // Very dark gray, almost black (good for primary text)
    gray800: "#1F2937", // Dark gray
    gray700: "#374151", 
    gray600: "#4B5563", // Medium-dark gray (good for secondary text)
    gray500: "#6B7280", // Gray
    gray400: "#9CA3AF",
    gray300: "#D1D5DB", // Light gray (good for borders, dividers)
    gray200: "#E5E7EB", // Lighter gray
    gray100: "#F3F4F6", // Very light gray (good for subtle backgrounds, inputs)
    gray50: "#F9FAFB",  // Off-white
  },
};

//=============================================================================
// THEME INTERFACES
//=============================================================================
// These interfaces define the structure of our theme objects and ensure
// type safety throughout the application.
//=============================================================================

export interface ThemeColors {
  // Primary brand colors
  primary: string;          // The main brand color
  primaryDark: string;      // Darker variant for hover/press states
  primaryLight: string;     // Lighter shade for accents, borders, etc.
  primaryUltraLight: string; // Very light shade for backgrounds, selected states

  // Secondary colors
  secondary: string;        // Secondary accent color
  secondaryDark: string;    // Darker variant
  secondaryLight: string;   // Lighter variant

  // Neutral colors for general UI
  black: string;            // Pure black color
  white: string;            // Pure white color
  grayDark: string;         // Dark gray (e.g., text) 
  grayMedium: string;       // Medium gray (e.g., disabled text)
  grayLight: string;        // Light gray (e.g., borders)
  grayUltraLight: string;   // Very light gray (e.g., backgrounds)

  // Semantic/feedback colors
  success: string;          // Success state (green)
  warning: string;          // Warning state (yellow/amber)
  error: string;            // Error state (red)
  info: string;             // Information state (blue)

  // UI-specific colors
  background: string;       // Main app background 
  card: string;             // Card/container background
  statusBar: string;        // Status bar background color
  
  // Form elements
  inputBackground: string;  // Input field background
  inputText: string;        // Input text color
  inputBorder: string;      // Input border color
  inputPlaceholder: string; // Input placeholder text color
  
  // Content boundaries
  border: string;           // Border color for containers
  divider: string;          // Divider color for lists

  // Text colors
  textPrimary: string;      // Primary text (headers, important text)
  textSecondary: string;    // Secondary text (descriptions, labels)
  textTertiary: string;     // Tertiary text (hints, disabled)
  textAccent: string;       // Accent text (links, highlights)
  textInverted: string;     // Text on dark/colored backgrounds
  
  // Badge and notification colors
  badge: string;            // Badge background color
  badgeText: string;        // Badge text color
  
  // Toggle/switch colors
  toggleActive: string;     // Toggle/switch in active state
  toggleInactive: string;   // Toggle/switch in inactive state
  
  // Other UI elements
  overlay: string;          // Modal/popup overlay color
  shadow: string;           // Shadow color for elevation
  
  // Transaction-specific colors
  received: string;         // Positive financial transaction
  spent: string;            // Negative financial transaction
  pending: string;          // Pending/in-progress transaction

  // Status-specific colors for KYC and other status indicators
  status: {
    pending: string;        // Orange for "Under Review" status
    completed: string;      // Green for "Completed" status
    inProgress: string;     // Blue for "In Progress" status
    error: string;          // Red for error states
  };
  statusBackground: {
    pending: string;        // Light orange background
    completed: string;      // Light green background
    inProgress: string;     // Light blue background
    error: string;          // Light red background
  };
}

// Rest of the interfaces remain the same
export interface ThemeTypography {
  fontFamily: {
    regular: string;
    medium: string;
    bold: string;
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
  };
  lineHeight: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
  };
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
}

export interface ThemeResponsive {
  isSmallDevice: boolean;
  isMediumDevice: boolean;
  isLargeDevice: boolean;
  screenWidth: number;
  screenHeight: number;
}

export interface ThemeBorderRadius {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  circle: number;
}

export interface ThemeShadows {
  small: object;
  medium: object;
  large: object;
}

export interface Theme {
  name: string; // To identify the theme, e.g., 'violet', 'oceanBlue'
  displayName: string; // User-facing name, e.g., 'Violet', 'Ocean Blue'
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  responsive: ThemeResponsive;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  commonStyles: ReturnType<typeof createCommonStyles>;
  isDark: boolean; // Flag indicating if this is a dark theme
}

//=============================================================================
// SHARED THEME FOUNDATIONS
//=============================================================================
// These are the building blocks of our themes that remain consistent
// across all color themes (but may differ between light and dark modes).
//=============================================================================

// Typography is shared across all themes
const baseTypography: ThemeTypography = {
    fontFamily: {
      regular: Platform.OS === "ios" ? "System" : "Roboto",
      medium: Platform.OS === "ios" ? "System" : "Roboto-Medium",
      bold: Platform.OS === "ios" ? "System-Bold" : "Roboto-Bold",
    },
  fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, xxl: 24, xxxl: 30 },
  lineHeight: { xs: 16, sm: 20, md: 24, lg: 28, xl: 32, xxl: 36, xxxl: 42 },
};

// Spacing is shared across all themes
const baseSpacing: ThemeSpacing = { 
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  xxxl: 64 
};

// Border radius is shared across all themes
const baseBorderRadius: ThemeBorderRadius = { 
  xs: 4, 
  sm: 8, 
  md: 12, 
  lg: 16, 
  xl: 24, 
  circle: 9999 
};

// Responsive metrics are shared across all themes
const baseResponsive: ThemeResponsive = {
    isSmallDevice: width < 375,
    isMediumDevice: width >= 375 && width < 768,
    isLargeDevice: width >= 768,
    screenWidth: width,
    screenHeight: height,
};

//=============================================================================
// SHARED BASE COLOR SETS
//=============================================================================
// These define sets of colors that are used as starting points for
// light and dark themes. These make it easier to apply consistent 
// styling across different primary colors.
//=============================================================================

// Light mode base colors (shared by all light themes)
const lightBaseColors: Partial<ThemeColors> = {
  black: PALETTE.neutral.black,
  white: PALETTE.neutral.white,
  grayDark: PALETTE.neutral.gray800,
  grayMedium: PALETTE.neutral.gray500,
  grayLight: PALETTE.neutral.gray300,
  grayUltraLight: PALETTE.neutral.gray100,
  
  success: PALETTE.semantic.success,
  warning: PALETTE.semantic.warning,
  error: PALETTE.semantic.error,
  info: PALETTE.semantic.info,
  
  background: PALETTE.neutral.white,
  card: PALETTE.neutral.white,
  statusBar: PALETTE.neutral.white,
  inputBackground: PALETTE.neutral.gray50,
  inputText: PALETTE.neutral.gray900,
  inputPlaceholder: PALETTE.neutral.gray400,
  inputBorder: PALETTE.neutral.gray300,
  border: PALETTE.neutral.gray200,
  divider: PALETTE.neutral.gray200,
  
  textPrimary: PALETTE.neutral.gray900,
  textSecondary: PALETTE.neutral.gray600,
  textTertiary: PALETTE.neutral.gray400,
  textInverted: PALETTE.neutral.white,
  
  badge: PALETTE.neutral.gray200,
  badgeText: PALETTE.neutral.gray900,
  
  toggleActive: PALETTE.semantic.success,
  toggleInactive: PALETTE.neutral.gray300,
  
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: PALETTE.neutral.black,
  
  received: PALETTE.semantic.success,
  spent: PALETTE.neutral.gray900,
  pending: PALETTE.semantic.warning,

  // Status colors - consistent across all themes
  status: {
    pending: '#FF9800',     // Orange for "Under Review"
    completed: '#4CAF50',   // Green for "Completed"
    inProgress: '#2196F3',  // Blue for "In Progress"
    error: '#F44336',       // Red for error states
  },
  statusBackground: {
    pending: '#FFF8E1',     // Light orange background
    completed: '#E8F5E8',   // Light green background
    inProgress: '#E3F2FD',  // Light blue background
    error: '#FFEBEE',       // Light red background
  },
};

// Dark mode base colors (shared by all dark themes)
const darkBaseColors: Partial<ThemeColors> = {
  black: PALETTE.neutral.black,
  white: PALETTE.neutral.white,
  grayDark: PALETTE.neutral.gray300, // Inverted from light
  grayMedium: PALETTE.neutral.gray400,
  grayLight: PALETTE.neutral.gray600,
  grayUltraLight: PALETTE.neutral.gray700,
  
  success: PALETTE.semantic.success,
  warning: PALETTE.semantic.warning,
  error: PALETTE.semantic.error,
  info: PALETTE.semantic.info,
  
  background: PALETTE.neutral.gray900,
  card: PALETTE.neutral.gray800,
  statusBar: PALETTE.neutral.gray900,  
  inputBackground: PALETTE.neutral.gray800,
  inputText: PALETTE.neutral.white,
  inputPlaceholder: PALETTE.neutral.gray500,
  inputBorder: PALETTE.neutral.gray600,
  border: PALETTE.neutral.gray700,
  divider: PALETTE.neutral.gray700,
  
  textPrimary: PALETTE.neutral.white,
  textSecondary: PALETTE.neutral.gray300,
  textTertiary: PALETTE.neutral.gray500,
  textInverted: PALETTE.neutral.gray800,
  
  badge: PALETTE.neutral.gray700,
  badgeText: PALETTE.neutral.white,
  
  toggleActive: PALETTE.semantic.success,
  toggleInactive: PALETTE.neutral.gray600,
  
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: PALETTE.neutral.black,
  
  received: PALETTE.semantic.success,
  spent: PALETTE.neutral.gray300,
  pending: PALETTE.semantic.warning,

  // Status colors - consistent across all themes (same as light mode)
  status: {
    pending: '#FF9800',     // Orange for "Under Review"
    completed: '#4CAF50',   // Green for "Completed"
    inProgress: '#2196F3',  // Blue for "In Progress"
    error: '#F44336',       // Red for error states
  },
  statusBackground: {
    pending: '#332211',     // Dark orange background for dark theme
    completed: '#1a2e1a',   // Dark green background for dark theme
    inProgress: '#1a2332',  // Dark blue background for dark theme
    error: '#331a1a',       // Dark red background for dark theme
  },
};

//=============================================================================
// COMMON COMPONENT STYLES
//=============================================================================
// This function creates common component styles that adapt to the currently
// active theme. By using a function instead of static objects, we ensure
// the styles always use the current theme colors.
//=============================================================================

const createCommonStyles = (colors: ThemeColors, borderRadius: ThemeBorderRadius, spacing: ThemeSpacing, typography: ThemeTypography) => ({
  // Card/container styling
    card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    },

    // Button styles
    primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + spacing.xs, // approx 12
    paddingHorizontal: spacing.lg,
    alignItems: "center" as "center",
    justifyContent: "center" as "center",
    },
  primaryButtonText: {
    color: colors.white, // Primary buttons always have white text
    fontSize: typography.fontSize.md,
    fontWeight: "600", // Or typography.fontFamily.bold if defined
  },
    secondaryButton: {
    backgroundColor: colors.background,
      borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + spacing.xs, // approx 12
    paddingHorizontal: spacing.lg,
    alignItems: "center" as "center",
    justifyContent: "center" as "center",
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.md,
    fontWeight: "600",
    },

  // Input styling
    input: {
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
    color: colors.inputText,
    fontSize: typography.fontSize.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    },

  // Layout containers
    container: {
      flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    },

  // Transaction-specific styles
  receivedAmount: {
    color: colors.received,
    fontWeight: "600",
  },
  spentAmount: {
    color: colors.spent,
    fontWeight: "600",
  },
  pendingAmount: {
    color: colors.pending,
    fontWeight: "600",
  },
  
  // General utility styles
    row: {
      flexDirection: "row",
    alignItems: "center" as "center" 
    },
    center: {
    alignItems: "center" as "center", 
    justifyContent: "center" as "center" 
    },
    spaceBetween: {
      flexDirection: "row",
    alignItems: "center" as "center", 
    justifyContent: "space-between" as "space-between" 
  },
  
  // Custom components common in the app
  badge: {
    backgroundColor: colors.badge,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  badgeText: {
    color: colors.badgeText,
    fontSize: typography.fontSize.xs,
    fontWeight: "600",
  },
  
  // Forms and message areas
  formSection: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  messageContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  messageSuccess: {
    backgroundColor: `${colors.success}10`, // 10% opacity
    borderColor: colors.success,
  },
  messageError: {
    backgroundColor: `${colors.error}10`, // 10% opacity
    borderColor: colors.error,
  },
  messageWarning: {
    backgroundColor: `${colors.warning}10`, // 10% opacity
    borderColor: colors.warning,
  },
  messageInfo: {
    backgroundColor: `${colors.info}10`, // 10% opacity
    borderColor: colors.info,
  },
});

//=============================================================================
// SHADOWS
//=============================================================================
// Shadow configurations for different elevation levels.
// We define light and dark mode shadows separately.
//=============================================================================

// Shadows for light themes
const lightShadows: ThemeShadows = {
  small: { 
    shadowColor: PALETTE.neutral.black, 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 4, 
    elevation: 2 
  },
  medium: { 
    shadowColor: PALETTE.neutral.black, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 4 
  },
  large: { 
    shadowColor: PALETTE.neutral.black, 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 16, 
    elevation: 8 
  },
};

// Shadows for dark themes (generally more subtle)
const darkShadows: ThemeShadows = {
  small: { 
    shadowColor: PALETTE.neutral.black, 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 4, 
    elevation: 3 
  },
  medium: { 
    shadowColor: PALETTE.neutral.black, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 8, 
    elevation: 5 
  },
  large: { 
    shadowColor: PALETTE.neutral.black, 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 16, 
    elevation: 9 
  },
};

//=============================================================================
// THEME DEFINITIONS
//=============================================================================
// These are the actual theme objects that will be used in the app.
// Each theme is composed of colors, typography, spacing, etc.
//=============================================================================

//-----------------------------------------------------------------------------
// VIOLET THEMES
//-----------------------------------------------------------------------------
// Light Violet Theme (Default)
const violetThemeColors: ThemeColors = {
  ...lightBaseColors as ThemeColors,
  primary: PALETTE.primary.violet,
  primaryDark: PALETTE.primary.violetDark,
  primaryLight: PALETTE.primary.violetLight,
  primaryUltraLight: PALETTE.primary.violetUltraLight,
  secondary: PALETTE.secondary.indigo,
  secondaryDark: PALETTE.secondary.indigoDark,
  secondaryLight: PALETTE.secondary.indigoLight,
};

export const violetTheme: Theme = {
  name: "violet",
  displayName: "Violet",
  isDark: false,
  colors: violetThemeColors,
  typography: baseTypography,
  spacing: baseSpacing,
  responsive: baseResponsive,
  borderRadius: baseBorderRadius,
  shadows: lightShadows,
  commonStyles: createCommonStyles(violetThemeColors, baseBorderRadius, baseSpacing, baseTypography),
};

// Dark Violet Theme
const darkVioletThemeColors: ThemeColors = {
  ...darkBaseColors as ThemeColors,
  primary: PALETTE.primary.violet,
  primaryDark: PALETTE.primary.violetDark,
  primaryLight: PALETTE.primary.violetLight,
  primaryUltraLight: "#2d1a3e", // Custom dark purple background
  secondary: PALETTE.secondary.indigo,
  secondaryDark: PALETTE.secondary.indigoDark,
  secondaryLight: PALETTE.secondary.indigoLight,
};

export const darkVioletTheme: Theme = {
  name: "darkViolet",
  displayName: "Violet",
  isDark: true,
  colors: darkVioletThemeColors,
  typography: baseTypography,
  spacing: baseSpacing,
  responsive: baseResponsive,
  borderRadius: baseBorderRadius,
  shadows: darkShadows,
  commonStyles: createCommonStyles(darkVioletThemeColors, baseBorderRadius, baseSpacing, baseTypography),
};

//-----------------------------------------------------------------------------
// OCEAN BLUE THEMES
//-----------------------------------------------------------------------------
// Light Ocean Blue Theme
const oceanBlueThemeColors: ThemeColors = {
  ...lightBaseColors as ThemeColors,
  primary: PALETTE.primary.oceanBlue,
  primaryDark: PALETTE.primary.oceanBlueDark,
  primaryLight: PALETTE.primary.oceanBlueLight,
  primaryUltraLight: PALETTE.primary.oceanBlueUltraLight,
  secondary: PALETTE.secondary.indigo,
  secondaryDark: PALETTE.secondary.indigoDark,
  secondaryLight: PALETTE.secondary.indigoLight,
};

export const oceanBlueTheme: Theme = {
  name: "oceanBlue",
  displayName: "Ocean Blue",
  isDark: false,
  colors: oceanBlueThemeColors,
  typography: baseTypography,
  spacing: baseSpacing,
  responsive: baseResponsive,
  borderRadius: baseBorderRadius,
  shadows: lightShadows,
  commonStyles: createCommonStyles(oceanBlueThemeColors, baseBorderRadius, baseSpacing, baseTypography),
};

// Dark Ocean Blue Theme
const darkOceanBlueThemeColors: ThemeColors = {
  ...darkBaseColors as ThemeColors,
  primary: PALETTE.primary.oceanBlue,
  primaryDark: PALETTE.primary.oceanBlueDark,
  primaryLight: PALETTE.primary.oceanBlueLight,
  primaryUltraLight: "#0a2a3c", // Dark blue-tinted background
  secondary: PALETTE.secondary.indigo,
  secondaryDark: PALETTE.secondary.indigoDark,
  secondaryLight: PALETTE.secondary.indigoLight,
};

export const darkOceanBlueTheme: Theme = {
  name: "darkOceanBlue",
  displayName: "Ocean Blue",
  isDark: true,
  colors: darkOceanBlueThemeColors,
  typography: baseTypography,
  spacing: baseSpacing,
  responsive: baseResponsive,
  borderRadius: baseBorderRadius,
  shadows: darkShadows,
  commonStyles: createCommonStyles(darkOceanBlueThemeColors, baseBorderRadius, baseSpacing, baseTypography),
};

//-----------------------------------------------------------------------------
// GREEN THEMES
//-----------------------------------------------------------------------------
// Light Green Theme
const greenThemeColors: ThemeColors = {
  ...lightBaseColors as ThemeColors,
  primary: PALETTE.primary.green,
  primaryDark: PALETTE.primary.greenDark,
  primaryLight: PALETTE.primary.greenLight,
  primaryUltraLight: PALETTE.primary.greenUltraLight,
  secondary: PALETTE.secondary.indigo,
  secondaryDark: PALETTE.secondary.indigoDark,
  secondaryLight: PALETTE.secondary.indigoLight,
};

export const greenTheme: Theme = {
  name: "green",
  displayName: "Green",
  isDark: false,
  colors: greenThemeColors,
  typography: baseTypography,
  spacing: baseSpacing,
  responsive: baseResponsive,
  borderRadius: baseBorderRadius,
  shadows: lightShadows,
  commonStyles: createCommonStyles(greenThemeColors, baseBorderRadius, baseSpacing, baseTypography),
};

// Dark Green Theme
const darkGreenThemeColors: ThemeColors = {
  ...darkBaseColors as ThemeColors,
  primary: PALETTE.primary.green,
  primaryDark: PALETTE.primary.greenDark,
  primaryLight: PALETTE.primary.greenLight,
  primaryUltraLight: "#0c291d", // Dark green-tinted background
  secondary: PALETTE.secondary.indigo,
  secondaryDark: PALETTE.secondary.indigoDark,
  secondaryLight: PALETTE.secondary.indigoLight,
};

export const darkGreenTheme: Theme = {
  name: "darkGreen",
  displayName: "Green",
  isDark: true,
  colors: darkGreenThemeColors,
  typography: baseTypography,
  spacing: baseSpacing,
  responsive: baseResponsive,
  borderRadius: baseBorderRadius,
  shadows: darkShadows,
  commonStyles: createCommonStyles(darkGreenThemeColors, baseBorderRadius, baseSpacing, baseTypography),
};

//-----------------------------------------------------------------------------
// AMBER THEMES
//-----------------------------------------------------------------------------
// Light Amber Theme
const amberThemeColors: ThemeColors = {
  ...lightBaseColors as ThemeColors,
  primary: PALETTE.primary.amber,
  primaryDark: PALETTE.primary.amberDark,
  primaryLight: PALETTE.primary.amberLight,
  primaryUltraLight: PALETTE.primary.amberUltraLight,
  secondary: PALETTE.secondary.indigo,
  secondaryDark: PALETTE.secondary.indigoDark,
  secondaryLight: PALETTE.secondary.indigoLight,
};

export const amberTheme: Theme = {
  name: "amber",
  displayName: "Amber",
  isDark: false,
  colors: amberThemeColors,
  typography: baseTypography,
  spacing: baseSpacing,
  responsive: baseResponsive,
  borderRadius: baseBorderRadius,
  shadows: lightShadows,
  commonStyles: createCommonStyles(amberThemeColors, baseBorderRadius, baseSpacing, baseTypography),
};

// Dark Amber Theme
const darkAmberThemeColors: ThemeColors = {
  ...darkBaseColors as ThemeColors,
  primary: PALETTE.primary.amber,
  primaryDark: PALETTE.primary.amberDark,
  primaryLight: PALETTE.primary.amberLight,
  primaryUltraLight: "#332211", // Dark amber-tinted background
  secondary: PALETTE.secondary.indigo,
  secondaryDark: PALETTE.secondary.indigoDark,
  secondaryLight: PALETTE.secondary.indigoLight,
};

export const darkAmberTheme: Theme = {
  name: "darkAmber",
  displayName: "Amber",
  isDark: true,
  colors: darkAmberThemeColors,
  typography: baseTypography,
  spacing: baseSpacing,
  responsive: baseResponsive,
  borderRadius: baseBorderRadius,
  shadows: darkShadows,
  commonStyles: createCommonStyles(darkAmberThemeColors, baseBorderRadius, baseSpacing, baseTypography),
};

//=============================================================================
// DEFAULT EXPORT
//=============================================================================
// Export violetTheme as the default theme for the app
export default violetTheme;
