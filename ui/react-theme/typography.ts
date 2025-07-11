/**
 * Swap Payment System - Typography
 * 
 * This file defines the typography styles used across both web and React Native applications.
 * Font families, sizes, weights and line heights are defined here for consistent text styling.
 */

// Font families
export const fontFamily = {
  base: 'Inter, system-ui, sans-serif', // Primary font for web
  // For React Native, we'll need platform-specific fonts
  native: {
    ios: 'System',
    android: 'Roboto',
    default: 'sans-serif',
  },
};

// Font sizes (in pixels for web, will be converted to appropriate units in React Native)
export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 30,
  '5xl': 36,
};

// Font weights
export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

// Line heights (relative to font size)
export const lineHeight = {
  none: 1,
  tight: 1.2,
  normal: 1.5,
  loose: 1.8,
};

// Letter spacing
export const letterSpacing = {
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
};

// Pre-defined text styles for common components
export const textStyles = {
  // Headers
  header: {
    h1: {
      fontSize: fontSize['4xl'],
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.tight,
    },
    h2: {
      fontSize: fontSize['3xl'],
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.tight,
    },
    h3: {
      fontSize: fontSize['2xl'],
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.tight,
    },
    h4: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.tight,
    },
  },
  
  // Body text
  body: {
    regular: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.normal,
      lineHeight: lineHeight.normal,
    },
    medium: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.medium,
      lineHeight: lineHeight.normal,
    },
    small: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.normal,
      lineHeight: lineHeight.normal,
    },
  },
  
  // Special text styles
  special: {
    badge: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      lineHeight: lineHeight.tight,
    },
    button: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.medium,
      lineHeight: lineHeight.none,
    },
    caption: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.normal,
      lineHeight: lineHeight.normal,
    },
    timestamp: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.normal,
      lineHeight: lineHeight.none,
    },
    amount: {
      fontSize: fontSize['2xl'],
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.tight,
    },
    navLabel: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
      lineHeight: lineHeight.tight,
    },
  },
}; 