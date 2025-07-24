import 'package:flutter/material.dart';

/// Color Palette
/// 
/// Base color palette for the entire application.
/// Adapted from Expo theme system to maintain exact same colors and organization.
/// These are raw values not directly used in UI components.
/// UI components should use the AppThemeData values instead.
class ColorPalette {
  // Brand Colors - Primary colors for each theme
  static const Map<String, Color> primary = {
    'violet': Color(0xFF8B14FD),
    'violetDark': Color(0xFF7512E0),
    'violetLight': Color(0xFFE9D5FF),
    'violetUltraLight': Color(0xFFF5F3FF),

    'oceanBlue': Color(0xFF0077B6),
    'oceanBlueDark': Color(0xFF005D91),
    'oceanBlueLight': Color(0xFF90E0EF),
    'oceanBlueUltraLight': Color(0xFFE0F7FA),

    'green': Color(0xFF10B981),
    'greenDark': Color(0xFF0B815A),
    'greenLight': Color(0xFFD1FAE5),
    'greenUltraLight': Color(0xFFF0FDF4),

    'amber': Color(0xFFFFB744),
    'amberDark': Color(0xFFF59E0B),
    'amberLight': Color(0xFFFFE0B2),
    'amberUltraLight': Color(0xFFFFF8E1),
  };

  // Secondary and accent colors
  static const Map<String, Color> secondary = {
    'indigo': Color(0xFF6366F1),
    'indigoDark': Color(0xFF4F46E5),
    'indigoLight': Color(0xFFE0E7FF),
  };

  // Semantic colors
  static const Map<String, Color> semantic = {
    'success': Color(0xFF10B981),  // Green
    'error': Color(0xFFEF4444),    // Red
    'warning': Color(0xFFF59E0B),  // Orange/Amber
    'info': Color(0xFF3B82F6),     // Blue
  };

  // Neutral palette for text, backgrounds, borders
  static const Map<String, Color> neutral = {
    'black': Color(0xFF000000),
    'white': Color(0xFFFFFFFF),
    
    // Gray scale from darkest to lightest
    'gray900': Color(0xFF111827), // Very dark gray, almost black
    'gray800': Color(0xFF1F2937), // Dark gray
    'gray700': Color(0xFF374151), 
    'gray600': Color(0xFF4B5563), // Medium-dark gray
    'gray500': Color(0xFF6B7280), // Gray
    'gray400': Color(0xFF9CA3AF),
    'gray300': Color(0xFFD1D5DB), // Light gray
    'gray200': Color(0xFFE5E7EB), // Lighter gray
    'gray100': Color(0xFFF3F4F6), // Very light gray
    'gray50': Color(0xFFF9FAFB),  // Off-white
  };

  // Helper methods to get colors by name
  static Color getPrimaryColor(String name) => primary[name] ?? primary['violet']!;
  static Color getSecondaryColor(String name) => secondary[name] ?? secondary['indigo']!;
  static Color getSemanticColor(String name) => semantic[name] ?? semantic['info']!;
  static Color getNeutralColor(String name) => neutral[name] ?? neutral['gray500']!;
}

/// Theme-specific color definitions
/// 
/// These classes define the colors for each theme variant,
/// maintaining the same structure as the Expo implementation.
class AppThemeColors {
  // Primary brand colors
  final Color primary;
  final Color primaryDark;
  final Color primaryLight;
  final Color primaryUltraLight;

  // Secondary colors
  final Color secondary;
  final Color secondaryDark;
  final Color secondaryLight;

  // Neutral colors for general UI
  final Color black;
  final Color white;
  final Color grayDark;
  final Color grayMedium;
  final Color grayLight;
  final Color grayUltraLight;

  // Semantic/feedback colors
  final Color success;
  final Color warning;
  final Color error;
  final Color info;

  // UI-specific colors
  final Color background;
  final Color surface;
  final Color statusBar;
  
  // Form elements
  final Color inputBackground;
  final Color inputText;
  final Color inputBorder;
  final Color inputPlaceholder;
  
  // Content boundaries
  final Color border;
  final Color divider;

  // Text colors
  final Color textPrimary;
  final Color textSecondary;
  final Color textTertiary;
  final Color textAccent;
  final Color textInverted;
  
  // Badge and notification colors
  final Color badge;
  final Color badgeText;
  
  // Toggle/switch colors
  final Color toggleActive;
  final Color toggleInactive;
  
  // Other UI elements
  final Color overlay;
  final Color shadow;
  
  // Transaction-specific colors
  final Color received;
  final Color spent;
  final Color pending;

  const AppThemeColors({
    required this.primary,
    required this.primaryDark,
    required this.primaryLight,
    required this.primaryUltraLight,
    required this.secondary,
    required this.secondaryDark,
    required this.secondaryLight,
    required this.black,
    required this.white,
    required this.grayDark,
    required this.grayMedium,
    required this.grayLight,
    required this.grayUltraLight,
    required this.success,
    required this.warning,
    required this.error,
    required this.info,
    required this.background,
    required this.surface,
    required this.statusBar,
    required this.inputBackground,
    required this.inputText,
    required this.inputBorder,
    required this.inputPlaceholder,
    required this.border,
    required this.divider,
    required this.textPrimary,
    required this.textSecondary,
    required this.textTertiary,
    required this.textAccent,
    required this.textInverted,
    required this.badge,
    required this.badgeText,
    required this.toggleActive,
    required this.toggleInactive,
    required this.overlay,
    required this.shadow,
    required this.received,
    required this.spent,
    required this.pending,
  });
}

/// Light mode base colors (shared by all light themes)
class LightBaseColors {
  static const AppThemeColors base = AppThemeColors(
    primary: Color(0xFF8B14FD), // Will be overridden per theme
    primaryDark: Color(0xFF7512E0), // Will be overridden per theme
    primaryLight: Color(0xFFE9D5FF), // Will be overridden per theme
    primaryUltraLight: Color(0xFFF5F3FF), // Will be overridden per theme
    
    secondary: Color(0xFF6366F1),
    secondaryDark: Color(0xFF4F46E5),
    secondaryLight: Color(0xFFE0E7FF),
    
    black: Color(0xFF000000),
    white: Color(0xFFFFFFFF),
    grayDark: Color(0xFF1F2937),
    grayMedium: Color(0xFF6B7280),
    grayLight: Color(0xFFD1D5DB),
    grayUltraLight: Color(0xFFF3F4F6),
    
    success: Color(0xFF10B981),
    warning: Color(0xFFF59E0B),
    error: Color(0xFFEF4444),
    info: Color(0xFF3B82F6),
    
    background: Color(0xFFFFFFFF),
    surface: Color(0xFFFFFFFF),
    statusBar: Color(0xFFFFFFFF),
    inputBackground: Color(0xFFF9FAFB),
    inputText: Color(0xFF111827),
    inputPlaceholder: Color(0xFF9CA3AF),
    inputBorder: Color(0xFFD1D5DB),
    border: Color(0xFFE5E7EB),
    divider: Color(0xFFE5E7EB),
    
    textPrimary: Color(0xFF111827),
    textSecondary: Color(0xFF4B5563),
    textTertiary: Color(0xFF9CA3AF),
    textAccent: Color(0xFF8B14FD), // Will be overridden per theme
    textInverted: Color(0xFFFFFFFF),
    
    badge: Color(0xFFE5E7EB),
    badgeText: Color(0xFF111827),
    
    toggleActive: Color(0xFF10B981),
    toggleInactive: Color(0xFFD1D5DB),
    
    overlay: Color(0x80000000), // rgba(0, 0, 0, 0.5)
    shadow: Color(0xFF000000),
    
    received: Color(0xFF10B981),
    spent: Color(0xFF111827),
    pending: Color(0xFFF59E0B),
  );
}

/// Dark mode base colors (shared by all dark themes)
class DarkBaseColors {
  static const AppThemeColors base = AppThemeColors(
    primary: Color(0xFF8B14FD), // Will be overridden per theme
    primaryDark: Color(0xFF7512E0), // Will be overridden per theme
    primaryLight: Color(0xFFE9D5FF), // Will be overridden per theme
    primaryUltraLight: Color(0xFF2D1A3E), // Will be overridden per theme
    
    secondary: Color(0xFF6366F1),
    secondaryDark: Color(0xFF4F46E5),
    secondaryLight: Color(0xFFE0E7FF),
    
    black: Color(0xFF000000),
    white: Color(0xFFFFFFFF),
    grayDark: Color(0xFFD1D5DB), // Inverted from light
    grayMedium: Color(0xFF9CA3AF),
    grayLight: Color(0xFF4B5563),
    grayUltraLight: Color(0xFF374151),
    
    success: Color(0xFF10B981),
    warning: Color(0xFFF59E0B),
    error: Color(0xFFEF4444),
    info: Color(0xFF3B82F6),
    
    background: Color(0xFF111827),
    surface: Color(0xFF1F2937),
    statusBar: Color(0xFF111827),
    inputBackground: Color(0xFF1F2937),
    inputText: Color(0xFFFFFFFF),
    inputPlaceholder: Color(0xFF6B7280),
    inputBorder: Color(0xFF4B5563),
    border: Color(0xFF374151),
    divider: Color(0xFF374151),
    
    textPrimary: Color(0xFFFFFFFF),
    textSecondary: Color(0xFFD1D5DB),
    textTertiary: Color(0xFF6B7280),
    textAccent: Color(0xFF8B14FD), // Will be overridden per theme
    textInverted: Color(0xFF1F2937),
    
    badge: Color(0xFF374151),
    badgeText: Color(0xFFFFFFFF),
    
    toggleActive: Color(0xFF10B981),
    toggleInactive: Color(0xFF4B5563),
    
    overlay: Color(0xB3000000), // rgba(0, 0, 0, 0.7)
    shadow: Color(0xFF000000),
    
    received: Color(0xFF10B981),
    spent: Color(0xFFD1D5DB),
    pending: Color(0xFFF59E0B),
  );
}

/// Specific theme color definitions

// Violet Themes
class VioletThemeColors {
  static AppThemeColors light = LightBaseColors.base.copyWith(
    primary: ColorPalette.primary['violet']!,
    primaryDark: ColorPalette.primary['violetDark']!,
    primaryLight: ColorPalette.primary['violetLight']!,
    primaryUltraLight: ColorPalette.primary['violetUltraLight']!,
    textAccent: ColorPalette.primary['violet']!,
  );

  static AppThemeColors dark = DarkBaseColors.base.copyWith(
    primary: ColorPalette.primary['violet']!,
    primaryDark: ColorPalette.primary['violetDark']!,
    primaryLight: ColorPalette.primary['violetLight']!,
    primaryUltraLight: const Color(0xFF2D1A3E), // Custom dark purple background
    textAccent: ColorPalette.primary['violet']!,
  );
}

// Ocean Blue Themes
class OceanBlueThemeColors {
  static AppThemeColors light = LightBaseColors.base.copyWith(
    primary: ColorPalette.primary['oceanBlue']!,
    primaryDark: ColorPalette.primary['oceanBlueDark']!,
    primaryLight: ColorPalette.primary['oceanBlueLight']!,
    primaryUltraLight: ColorPalette.primary['oceanBlueUltraLight']!,
    textAccent: ColorPalette.primary['oceanBlue']!,
  );

  static AppThemeColors dark = DarkBaseColors.base.copyWith(
    primary: ColorPalette.primary['oceanBlue']!,
    primaryDark: ColorPalette.primary['oceanBlueDark']!,
    primaryLight: ColorPalette.primary['oceanBlueLight']!,
    primaryUltraLight: const Color(0xFF0A2A3C), // Dark blue-tinted background
    textAccent: ColorPalette.primary['oceanBlue']!,
  );
}

// Green Themes
class GreenThemeColors {
  static AppThemeColors light = LightBaseColors.base.copyWith(
    primary: ColorPalette.primary['green']!,
    primaryDark: ColorPalette.primary['greenDark']!,
    primaryLight: ColorPalette.primary['greenLight']!,
    primaryUltraLight: ColorPalette.primary['greenUltraLight']!,
    textAccent: ColorPalette.primary['green']!,
  );

  static AppThemeColors dark = DarkBaseColors.base.copyWith(
    primary: ColorPalette.primary['green']!,
    primaryDark: ColorPalette.primary['greenDark']!,
    primaryLight: ColorPalette.primary['greenLight']!,
    primaryUltraLight: const Color(0xFF0C291D), // Dark green-tinted background
    textAccent: ColorPalette.primary['green']!,
  );
}

// Amber Themes
class AmberThemeColors {
  static AppThemeColors light = LightBaseColors.base.copyWith(
    primary: ColorPalette.primary['amber']!,
    primaryDark: ColorPalette.primary['amberDark']!,
    primaryLight: ColorPalette.primary['amberLight']!,
    primaryUltraLight: ColorPalette.primary['amberUltraLight']!,
    textAccent: ColorPalette.primary['amber']!,
  );

  static AppThemeColors dark = DarkBaseColors.base.copyWith(
    primary: ColorPalette.primary['amber']!,
    primaryDark: ColorPalette.primary['amberDark']!,
    primaryLight: ColorPalette.primary['amberLight']!,
    primaryUltraLight: const Color(0xFF332211), // Dark amber-tinted background
    textAccent: ColorPalette.primary['amber']!,
  );
}

/// Extension to add copyWith method to AppThemeColors
extension AppThemeColorsExtension on AppThemeColors {
  AppThemeColors copyWith({
    Color? primary,
    Color? primaryDark,
    Color? primaryLight,
    Color? primaryUltraLight,
    Color? secondary,
    Color? secondaryDark,
    Color? secondaryLight,
    Color? black,
    Color? white,
    Color? grayDark,
    Color? grayMedium,
    Color? grayLight,
    Color? grayUltraLight,
    Color? success,
    Color? warning,
    Color? error,
    Color? info,
    Color? background,
    Color? surface,
    Color? statusBar,
    Color? inputBackground,
    Color? inputText,
    Color? inputBorder,
    Color? inputPlaceholder,
    Color? border,
    Color? divider,
    Color? textPrimary,
    Color? textSecondary,
    Color? textTertiary,
    Color? textAccent,
    Color? textInverted,
    Color? badge,
    Color? badgeText,
    Color? toggleActive,
    Color? toggleInactive,
    Color? overlay,
    Color? shadow,
    Color? received,
    Color? spent,
    Color? pending,
  }) {
    return AppThemeColors(
      primary: primary ?? this.primary,
      primaryDark: primaryDark ?? this.primaryDark,
      primaryLight: primaryLight ?? this.primaryLight,
      primaryUltraLight: primaryUltraLight ?? this.primaryUltraLight,
      secondary: secondary ?? this.secondary,
      secondaryDark: secondaryDark ?? this.secondaryDark,
      secondaryLight: secondaryLight ?? this.secondaryLight,
      black: black ?? this.black,
      white: white ?? this.white,
      grayDark: grayDark ?? this.grayDark,
      grayMedium: grayMedium ?? this.grayMedium,
      grayLight: grayLight ?? this.grayLight,
      grayUltraLight: grayUltraLight ?? this.grayUltraLight,
      success: success ?? this.success,
      warning: warning ?? this.warning,
      error: error ?? this.error,
      info: info ?? this.info,
      background: background ?? this.background,
      surface: surface ?? this.surface,
      statusBar: statusBar ?? this.statusBar,
      inputBackground: inputBackground ?? this.inputBackground,
      inputText: inputText ?? this.inputText,
      inputBorder: inputBorder ?? this.inputBorder,
      inputPlaceholder: inputPlaceholder ?? this.inputPlaceholder,
      border: border ?? this.border,
      divider: divider ?? this.divider,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textTertiary: textTertiary ?? this.textTertiary,
      textAccent: textAccent ?? this.textAccent,
      textInverted: textInverted ?? this.textInverted,
      badge: badge ?? this.badge,
      badgeText: badgeText ?? this.badgeText,
      toggleActive: toggleActive ?? this.toggleActive,
      toggleInactive: toggleInactive ?? this.toggleInactive,
      overlay: overlay ?? this.overlay,
      shadow: shadow ?? this.shadow,
      received: received ?? this.received,
      spent: spent ?? this.spent,
      pending: pending ?? this.pending,
    );
  }
}