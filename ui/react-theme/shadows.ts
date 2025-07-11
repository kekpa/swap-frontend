/**
 * Swap Payment System - Shadows
 * 
 * This file defines shadow styles for both web and React Native applications.
 * Note that web and React Native implement shadows differently, so we provide both formats.
 */

// Shadow colors
export const shadowColors = {
  light: 'rgba(0, 0, 0, 0.05)',
  medium: 'rgba(0, 0, 0, 0.1)',
  dark: 'rgba(0, 0, 0, 0.2)',
};

// Web shadows (CSS box-shadow)
export const webShadows = {
  none: 'none',
  xs: `0 1px 2px ${shadowColors.light}`,
  sm: `0 1px 3px ${shadowColors.light}, 0 1px 2px ${shadowColors.medium}`,
  md: `0 4px 6px ${shadowColors.light}, 0 2px 4px ${shadowColors.medium}`,
  lg: `0 10px 15px ${shadowColors.light}, 0 3px 6px ${shadowColors.medium}`,
  xl: `0 20px 25px ${shadowColors.light}, 0 10px 10px ${shadowColors.medium}`,
  '2xl': `0 25px 50px ${shadowColors.medium}`,
  inner: `inset 0 2px 4px ${shadowColors.light}`,
};

// React Native shadows (using the shadow* properties)
export const nativeShadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 12,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 16,
  },
};

// Component-specific shadows with both formats for easy use
export const component = {
  // Card shadows
  card: {
    web: webShadows.sm,
    native: nativeShadows.sm,
  },
  
  // Modal and dialog shadows
  modal: {
    web: webShadows.lg,
    native: nativeShadows.lg,
  },
  
  // Header shadows
  header: {
    web: webShadows.sm,
    native: nativeShadows.sm,
  },
  
  // Navigation bar shadows
  navbar: {
    web: `0 -2px 10px ${shadowColors.light}`,
    native: {
      ...nativeShadows.sm,
      shadowOffset: { width: 0, height: -2 }, // Inverted for bottom navbar
    },
  },
  
  // Button shadows
  button: {
    web: webShadows.sm,
    native: nativeShadows.sm,
  },
  
  // Transaction card shadows
  transaction: {
    web: `0 2px 5px ${shadowColors.light}`,
    native: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 2.5,
      elevation: 3,
    },
  },
  
  // Floating action button (FAB) shadows
  fab: {
    web: webShadows.lg,
    native: nativeShadows.lg,
  },
  
  // Dropdown and popup shadows
  dropdown: {
    web: webShadows.md,
    native: nativeShadows.md,
  },
}; 