/**
 * Swap Payment System - Theme
 * 
 * This is the main theme file that exports all theme components for both
 * web and React Native applications. This ensures design consistency across platforms.
 */

import * as colorsModule from './colors';
import * as typographyModule from './typography';
import * as spacingModule from './spacing';
import * as borderRadiusModule from './borderRadius';
import * as shadowsModule from './shadows';

// Re-export all modules individually
export const colors = colorsModule;
export const typography = typographyModule;
export const spacing = spacingModule;
export const borderRadius = borderRadiusModule;
export const shadows = shadowsModule;

// Helper function to create React Native styles
export const createStyles = (styles: any) => styles;

// Platform detection (to be used in components)
export const isPlatformWeb = typeof document !== 'undefined';
export const isPlatformNative = !isPlatformWeb;

// Create a platform-specific shadow getter
export const getShadow = (shadowKey: keyof typeof shadowsModule.component) => {
  if (isPlatformWeb) {
    return { boxShadow: shadowsModule.component[shadowKey].web };
  } else {
    return shadowsModule.component[shadowKey].native;
  }
};

// Export a complete theme object that can be used with styled-components or other styling systems
const theme = {
  colors: colorsModule,
  typography: typographyModule,
  spacing: spacingModule,
  borderRadius: borderRadiusModule,
  shadows: shadowsModule,
  
  // Helper functions
  getShadow,
  isPlatformWeb,
  isPlatformNative,
};

export default theme;

// Type definitions for theme properties
export type ThemeColors = typeof colorsModule;
export type ThemeTypography = typeof typographyModule;
export type ThemeSpacing = typeof spacingModule;
export type ThemeBorderRadius = typeof borderRadiusModule;
export type ThemeShadows = typeof shadowsModule;

// Complete theme type
export type Theme = typeof theme; 