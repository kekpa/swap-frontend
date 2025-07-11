/**
 * Swap Payment System - Border Radius
 * 
 * This file defines the border radius values used across both web and React Native applications.
 * Consistent border radiuses help maintain a unified visual language.
 */

// Base unit for border radius (in pixels)
export const baseUnit = 2;

// Border radius scale
export const borderRadius = {
  none: 0,
  xs: baseUnit * 2, // 4px
  sm: baseUnit * 3, // 6px
  md: baseUnit * 4, // 8px
  lg: baseUnit * 6, // 12px
  xl: baseUnit * 8, // 16px
  '2xl': baseUnit * 10, // 20px
  '3xl': baseUnit * 12, // 24px
  full: 9999, // Fully rounded (for circles)
};

// Component-specific border radiuses
export const component = {
  // Cards and containers
  card: borderRadius.lg,
  modal: borderRadius.xl,
  
  // Form elements
  input: borderRadius.md,
  button: borderRadius.md,
  
  // Specific components from the UI
  badge: borderRadius['2xl'], // 20px rounded badge as in the filter bar
  pill: borderRadius['3xl'], // Pill-shaped elements
  messageBubble: borderRadius.xl, // Chat message bubbles
  
  // Avatar and profile pictures
  avatar: {
    sm: borderRadius.full,
    md: borderRadius.full,
    lg: borderRadius.full,
  },
  
  // Transaction cards
  transaction: borderRadius.xl,
  
  // Custom shapes - specifies different radiuses for different corners
  messageOutgoing: {
    topLeft: borderRadius.xl,
    topRight: borderRadius.xl,
    bottomLeft: borderRadius.xl, 
    bottomRight: borderRadius.sm, // Special case for outgoing message
  },
  
  messageIncoming: {
    topLeft: borderRadius.xl,
    topRight: borderRadius.xl,
    bottomLeft: borderRadius.sm, // Special case for incoming message
    bottomRight: borderRadius.xl,
  },
}; 