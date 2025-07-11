/**
 * Swap Payment System - Spacing
 * 
 * This file defines the spacing values used across both web and React Native applications.
 * These values create a consistent rhythm in the layout.
 */

// Base unit for spacing in pixels
export const baseUnit = 4;

// Spacing scale (multiples of the base unit)
export const spacing = {
  none: 0,
  xs: baseUnit, // 4px
  sm: baseUnit * 2, // 8px
  md: baseUnit * 4, // 16px
  lg: baseUnit * 6, // 24px
  xl: baseUnit * 8, // 32px
  '2xl': baseUnit * 12, // 48px
  '3xl': baseUnit * 16, // 64px
  '4xl': baseUnit * 24, // 96px
};

// Specific component spacings
export const component = {
  // Container padding
  containerPadding: spacing.md,
  sectionPadding: spacing.lg,
  
  // Card and content containers
  cardPadding: spacing.md,
  cardMargin: spacing.sm,
  cardBorderRadius: spacing.sm,
  
  // Form elements
  inputPadding: spacing.sm,
  inputMarginBottom: spacing.md,
  buttonPadding: spacing.sm,
  
  // List items
  listItemPadding: spacing.md,
  listItemMargin: spacing.xs,
  
  // Headers
  headerHeight: 70, // Header height as in the UI designs
  headerPadding: spacing.md,
  
  // Navigation
  navbarHeight: 70, // Bottom navbar height as in the UI designs
  tabBarHeight: 50,
  tabBarPadding: spacing.sm,
  
  // Message bubbles
  messagePadding: {
    horizontal: spacing.md,
    vertical: spacing.sm,
  },
  messageMargin: spacing.xs,
  
  // Transaction cards
  transactionPadding: spacing.md,
  transactionMargin: spacing.md,
  
  // Filter badges
  filterBarPadding: spacing.sm,
  filterBadgePadding: {
    horizontal: spacing.md + spacing.xs, // 20px
    vertical: spacing.xs + spacing.xs / 2, // 6px
  },
  filterBadgeMargin: spacing.xs,
};

// Screen specific spacing
export const screen = {
  pagePadding: spacing.md,
  contentMargin: spacing.md,
  sectionGap: spacing.lg,
  
  // Screen safe areas
  safeAreaTop: spacing.md,
  safeAreaBottom: spacing.lg,
  safeAreaHorizontal: spacing.md,
};

// Grid system
export const grid = {
  gutter: spacing.md,
  columns: 12,
  columnGap: spacing.sm,
  rowGap: spacing.md,
};

// Z-index layers
export const zIndex = {
  base: 0,
  card: 10,
  dialog: 20,
  header: 30,
  navbar: 30,
  modal: 40,
  tooltip: 50,
}; 