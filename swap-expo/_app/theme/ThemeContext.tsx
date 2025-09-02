/**
 * Updated: Adapted for multiple named themes and new default (violetTheme) - YYYY-MM-DD
 * Updated: Added amber theme, light green theme, and dark mode variants - YYYY-MM-DD
 * Updated: Improved dark mode detection and status bar handling - YYYY-MM-DD
 *
 * This file provides a context for theme management, allowing components
 * to access and potentially switch between themes.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { MMKV } from 'react-native-mmkv';
import { StatusBar, Platform, StatusBarStyle } from "react-native";
import defaultTheme, { // violetTheme is the default export
  Theme, 
  violetTheme, 
  oceanBlueTheme, 
  darkGreenTheme,
  greenTheme,
  amberTheme,
  darkVioletTheme,
  darkOceanBlueTheme,
  darkAmberTheme
} from "./theme"; 
import logger from "../utils/logger";

// High-performance MMKV storage for theme preferences
const themeStorage = new MMKV({
  id: 'swap-theme-preferences',
  encryptionKey: 'swap-theme-prefs-encryption-key-2025'
});

// Define available themes by name
export const availableThemes: Record<string, Theme> = {
  violet: violetTheme,
  oceanBlue: oceanBlueTheme,
  green: greenTheme,
  amber: amberTheme,
  darkViolet: darkVioletTheme,
  darkOceanBlue: darkOceanBlueTheme,
  darkGreen: darkGreenTheme,
  darkAmber: darkAmberTheme,
};

// Define theme names as a type for type safety
export type ThemeName = keyof typeof availableThemes;

export interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  isDarkMode: boolean;
  setThemeByName: (name: ThemeName) => void;
  statusBarStyle: StatusBarStyle;
}

// Create the context with a default value
const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  themeName: "violet",
  isDarkMode: false,
  setThemeByName: () => {},
  statusBarStyle: "dark-content",
});

// Storage key for theme preference
const THEME_STORAGE_KEY = "app_theme_name_preference_v2"; // Changed key to avoid conflicts with old structure

// Updates the status bar based on the current theme
const updateStatusBarForTheme = (theme: Theme) => {
  // Update status bar style
  StatusBar.setBarStyle(theme.isDark ? "light-content" : "dark-content", true);
  
  // For Android, additionally set background color and translucent status
  if (Platform.OS === "android") {
    StatusBar.setBackgroundColor(theme.colors.statusBar);
    StatusBar.setTranslucent(false);
  }
};

// Theme provider component
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultTheme);
  const [currentThemeName, setCurrentThemeName] = useState<ThemeName>("violet");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [statusBarStyle, setStatusBarStyle] = useState<StatusBarStyle>("dark-content");

  useEffect(() => {
    const loadThemePreference = () => {
      try {
        // Use MMKV for instant synchronous theme loading
        const savedThemeName = themeStorage.getString(THEME_STORAGE_KEY);
        logger.debug(`Loaded theme preference: ${savedThemeName}`, "theme");
        
        if (savedThemeName && availableThemes[savedThemeName as ThemeName]) {
          const theme = availableThemes[savedThemeName as ThemeName];
          setCurrentTheme(theme);
          setCurrentThemeName(savedThemeName as ThemeName);
          
          // Set isDarkMode based on theme name
          const isThemeDark = savedThemeName.startsWith('dark');
          setIsDarkMode(isThemeDark);
          
          // Set status bar style based on dark mode
          setStatusBarStyle(isThemeDark ? "light-content" : "dark-content");
        } else {
          // Default to violetTheme if no valid saved theme
          setCurrentTheme(violetTheme);
          setCurrentThemeName("violet");
          setIsDarkMode(false);
          setStatusBarStyle("dark-content");
        }
      } catch (error) {
        logger.error("Error loading theme preference:", error);
        // Default to violetTheme on error
        setCurrentTheme(violetTheme);
        setCurrentThemeName("violet");
        setIsDarkMode(false);
        setStatusBarStyle("dark-content");
      }
    };

    loadThemePreference();
  }, []);

  const setThemeByName = (name: ThemeName) => {
    const theme = availableThemes[name];
    if (theme) {
      setCurrentTheme(theme);
      setCurrentThemeName(name);
      
      // Update isDarkMode based on theme name
      const isThemeDark = name.startsWith('dark');
      setIsDarkMode(isThemeDark);
      
      // Update status bar style based on dark mode
      setStatusBarStyle(isThemeDark ? "light-content" : "dark-content");

      // Save theme preference to MMKV for instant performance
      try {
        themeStorage.set(THEME_STORAGE_KEY, name);
        logger.debug(`Saved theme preference: ${name}`, "theme");
      } catch (error) {
        logger.error("Error saving theme preference:", error);
      }
    }
  };

  // Apply status bar style when it changes
  useEffect(() => {
    // Set the global status bar style
    StatusBar.setBarStyle(statusBarStyle);
    
    // On Android, also set the background color for status bar
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(currentTheme.colors.background);
    }
  }, [statusBarStyle, currentTheme]);

  return (
    <ThemeContext.Provider value={{ 
      theme: currentTheme, 
      themeName: currentThemeName, 
      isDarkMode, 
      setThemeByName,
      statusBarStyle
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for accessing theme context
export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
