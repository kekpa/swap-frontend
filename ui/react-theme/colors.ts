/**
 * Swap Payment System - Colors
 * 
 * This file defines the color palette used across both web and React Native applications.
 * Colors are organized by purpose and can be used with both platforms.
 */

// Brand colors
export const brand = {
  primary: '#8b14fd', // Main purple from Swap branding
  secondary: '#4263eb', // Used for links and secondary actions
  success: '#16a34a', // Green for success states
  pending: '#9333ea', // Purple for pending states
  warning: '#f97316', // Orange for warnings
  error: '#dc2626', // Red for errors
  
  // Tints and shades of primary
  primaryLight: '#a855f7',
  primaryLighter: '#c084fc',
  primaryDark: '#6b21a8',
  
  // Tints and shades of secondary
  secondaryLight: '#60a5fa',
  secondaryLighter: '#93c5fd',
  secondaryDark: '#1e40af',
};

// Grayscale palette
export const gray = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
};

// Backgrounds
export const background = {
  primary: '#ffffff',
  secondary: '#f7f7fa', // Light gray background
  tertiary: '#f0f2f5', // Chat background
  card: '#ffffff',
  
  // Transaction backgrounds
  receiveTransaction: '#e6f2ff', // Light blue for received money
  requestTransaction: '#f3f0ff', // Light purple for requested money
};

// Text colors
export const text = {
  primary: gray[900],
  secondary: gray[600],
  tertiary: gray[500],
  disabled: gray[400],
  inverse: '#ffffff',
  link: brand.secondary,
  
  // Special text colors
  positive: brand.success,
  negative: brand.error,
  warning: brand.warning,
  info: brand.secondary,
};

// Border colors
export const border = {
  light: gray[200],
  default: gray[300],
  dark: gray[400],
  focus: brand.secondaryLight,
};

// Status colors for notifications, alerts, etc.
export const status = {
  success: {
    background: '#dcfce7',
    foreground: '#16a34a',
    border: '#86efac',
  },
  error: {
    background: '#fee2e2',
    foreground: '#dc2626',
    border: '#fca5a5',
  },
  warning: {
    background: '#ffedd5',
    foreground: '#f97316',
    border: '#fdba74',
  },
  info: {
    background: '#dbeafe',
    foreground: '#2563eb',
    border: '#93c5fd',
  },
  pending: {
    background: '#f5f3ff',
    foreground: '#9333ea',
    border: '#d8b4fe',
  },
};

// Specific component colors
export const components = {
  // Buttons
  buttonPrimary: brand.primary,
  buttonSecondary: gray[200],
  buttonDisabled: gray[300],
  
  // Inputs
  inputBackground: '#ffffff',
  inputBorder: gray[300],
  inputFocusBorder: brand.primary,
  
  // Tab bars and navigation
  tabBarActive: brand.primary,
  tabBarInactive: gray[500],
  tabBarBackground: '#ffffff',
  
  // Chat bubbles
  chatOutgoing: '#0084ff', // Blue for outgoing messages
  chatIncoming: gray[200], // Gray for incoming messages
}; 