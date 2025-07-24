import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/providers/app_providers.dart';
import 'app/theme/color_palette.dart';
import 'app/router/app_router.dart';

void main() {
  runApp(
    ProviderScope(
      child: SwapApp(),
    ),
  );
}

class SwapApp extends ConsumerWidget {
  const SwapApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDarkMode = ref.watch(themeModeProvider);
    final selectedTheme = ref.watch(selectedThemeProvider);
    final router = ref.watch(routerProvider);
    
    return MaterialApp.router(
      title: 'Swap Neobank',
      debugShowCheckedModeBanner: false,
      theme: _buildTheme(selectedTheme, false),
      darkTheme: _buildTheme(selectedTheme, true),
      themeMode: isDarkMode ? ThemeMode.dark : ThemeMode.light,
      routerConfig: router,
    );
  }

  ThemeData _buildTheme(String themeName, bool isDark) {
    AppThemeColors colors;
    
    switch (themeName) {
      case 'violet':
        colors = isDark ? VioletThemeColors.dark : VioletThemeColors.light;
        break;
      case 'oceanBlue':
        colors = isDark ? OceanBlueThemeColors.dark : OceanBlueThemeColors.light;
        break;
      case 'green':
        colors = isDark ? GreenThemeColors.dark : GreenThemeColors.light;
        break;
      case 'amber':
        colors = isDark ? AmberThemeColors.dark : AmberThemeColors.light;
        break;
      default:
        colors = isDark ? VioletThemeColors.dark : VioletThemeColors.light;
    }

    return ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: colors.primary,
        brightness: isDark ? Brightness.dark : Brightness.light,
        primary: colors.primary,
        secondary: colors.secondary,
        surface: colors.surface,
        background: colors.background,
        error: colors.error,
        onPrimary: colors.textInverted,
        onSecondary: colors.textInverted,
        onSurface: colors.textPrimary,
        onBackground: colors.textPrimary,
        onError: colors.textInverted,
      ),
      scaffoldBackgroundColor: colors.background,
      appBarTheme: AppBarTheme(
        backgroundColor: colors.background,
        foregroundColor: colors.textPrimary,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colors.primary,
          foregroundColor: colors.textInverted,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: colors.primary,
          side: BorderSide(color: colors.primary),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.inputBackground,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: colors.inputBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: colors.inputBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: colors.primary, width: 2),
        ),
        hintStyle: TextStyle(color: colors.inputPlaceholder),
      ),
      cardTheme: CardThemeData(
        color: colors.surface,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      dividerTheme: DividerThemeData(
        color: colors.divider,
        thickness: 1,
      ),
      useMaterial3: true,
    );
  }
}

