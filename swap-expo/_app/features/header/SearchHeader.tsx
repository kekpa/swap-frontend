// Copyright 2025 licenser.author
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import React, { useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";

interface SearchHeaderProps {
  onSearch?: (text: string) => void;
  onSearchPress?: () => void;
  onCalendarPress?: () => void;
  onAddPress?: () => void;
  onProfilePress?: () => void;
  onNewChat?: () => void;
  profileImage?: React.ReactNode;
  avatarUrl?: string | null;
  initials?: string;
  placeholder?: string;
  rightIcons?: Array<{
    name: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    color?: string;
  }>;
  showProfile?: boolean;
  showSearch?: boolean;
  title?: string;
  brandName?: string;
  containerStyle?: ViewStyle;
  isSearchActive?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (text: string) => void;
  onSearchCancel?: () => void;
  transparent?: boolean;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  onSearch,
  onSearchPress,
  onCalendarPress,
  onAddPress,
  onProfilePress,
  onNewChat,
  profileImage,
  avatarUrl,
  initials,
  placeholder = "Search...",
  rightIcons,
  showProfile = true,
  showSearch = true,
  title,
  brandName,
  containerStyle,
  isSearchActive = false,
  searchQuery = "",
  onSearchQueryChange,
  onSearchCancel,
  transparent = false,
}) => {
  const { theme } = useTheme();
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isSearchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchActive]);

  const styles = useMemo(() => StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      // Add Android status bar padding
      paddingTop: Platform.OS === 'android' ? 
        (StatusBar.currentHeight || 0) + theme.spacing.md : 
        theme.spacing.md,
      borderBottomWidth: transparent ? 0 : 1,
      backgroundColor: transparent ? "transparent" : theme.colors.card,
      borderBottomColor: transparent ? "transparent" : theme.colors.border,
      // Only apply shadow on iOS when transparent
      ...(transparent && Platform.OS === 'ios' && {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }),
      // No elevation on Android when transparent to avoid shadow borders
      ...(transparent && Platform.OS === 'android' && {
        elevation: 0,
      }),
      zIndex: 50,
      ...(containerStyle as object),
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginRight: theme.spacing.sm,
      flex: 1,
    },
    brandName: {
      fontSize: theme.typography.fontSize.xxl,
      fontWeight: "bold",
      color: theme.colors.primary,
      flex: 1,
      textAlign: "center",
    },
    profileContainer: {
      marginRight: theme.spacing.sm,
    },
    profilePic: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
      // Only apply shadow on iOS for transparent profile
      ...(transparent && Platform.OS === 'ios' && {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      }),
      // No elevation on Android for transparent profile
      ...(transparent && Platform.OS === 'android' && {
        elevation: 0,
      }),
    },
    profileText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.white,
      fontWeight: "600",
    },
    searchContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: transparent ? theme.colors.inputBackground : theme.colors.inputBackground,
      borderRadius: theme.borderRadius.xl,
      paddingHorizontal: theme.spacing.sm,
      height: 40,
      borderWidth: 1,
      borderColor: isSearchActive ? theme.colors.primary : transparent ? theme.colors.inputBorder : theme.colors.inputBorder,
      ...(transparent && Platform.OS === 'ios' && {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }),
      // No elevation on Android when transparent to avoid shadow borders
      ...(transparent && Platform.OS === 'android' && {
        elevation: 0,
      }),
    },
    searchIcon: {
      marginRight: theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      height: 40,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.inputText,
    },
    searchPlaceholder: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textTertiary,
      paddingVertical: 10,
    },
    clearButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.grayMedium,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 8,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      backgroundColor: theme.colors.inputBackground,
    },
  }), [theme, containerStyle, isSearchActive, transparent]);

  const handleAddPressInternal = () => {
    console.log("Add pressed via SearchHeader");
    onAddPress && onAddPress();
  };

  const handleProfilePressInternal = () => {
    onProfilePress && onProfilePress();
  };

  const handleClearSearch = () => {
    onSearchQueryChange?.("");
    searchInputRef.current?.focus();
  };

  return (
    <View style={styles.header}>
      {title ? (
        <Text style={styles.headerTitle}>{title}</Text>
      ) : (
        <>
          {showProfile && !isSearchActive && (
        <TouchableOpacity 
          style={styles.profileContainer}
              onPress={handleProfilePressInternal}
        >
          <View style={styles.profilePic}>
            {profileImage ? profileImage :
              avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%', borderRadius: 20 }} />
              ) : (
                <Text style={styles.profileText}>{initials || 'UA'}</Text>
              )}
          </View>
        </TouchableOpacity>
          )}
          
          {showSearch && (
          <View style={styles.searchContainer}>
              <TouchableOpacity onPress={isSearchActive ? onSearchCancel : onSearchPress}>
        <Ionicons
                  name={isSearchActive ? "arrow-back" : "search-outline"}
          size={18}
              color={theme.colors.textTertiary}
          style={styles.searchIcon}
        />
              </TouchableOpacity>
              
              {isSearchActive ? (
        <TextInput
                  ref={searchInputRef}
              style={styles.searchInput}
          placeholder={placeholder}
              placeholderTextColor={theme.colors.textTertiary}
                  value={searchQuery}
                  onChangeText={onSearchQueryChange}
                  autoFocus={true}
                  returnKeyType="search"
                />
              ) : (
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={onSearchPress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.searchPlaceholder}>{placeholder}</Text>
                </TouchableOpacity>
              )}
              
              {isSearchActive && searchQuery.length > 0 && (
                <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              )}
      </View>
          )}
          
          {!showSearch && !isSearchActive && brandName && (
            <Text style={styles.brandName}>{brandName}</Text>
          )}
          
          {!showSearch && !isSearchActive && !brandName && <View style={{ flex: 1 }} />}
        </>
      )}

      {!isSearchActive && rightIcons && rightIcons.map((icon, index) => (
          <TouchableOpacity
            key={`icon-${index}`}
          style={styles.iconButton}
            onPress={icon.onPress}
          >
            <Ionicons 
              name={icon.name} 
              size={24} 
            color={icon.color || theme.colors.textPrimary}
          />
        </TouchableOpacity>
      ))}
      {!isSearchActive && !rightIcons && onAddPress && !title && (
            <TouchableOpacity
            style={styles.iconButton}
            onPress={handleAddPressInternal}
            >
            <Ionicons name="add" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
      )}
    </View>
  );
};

export default SearchHeader; 