import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect, useRoute, RouteProp, CommonActions } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useAuth } from "../../hooks/useAuth";
import { useAuthContext } from "../auth/context/AuthContext";
import logger from "../../utils/logger";
import { ProfileStackParamList } from "../../navigation/profileNavigator";
import { useTheme, availableThemes, ThemeName } from "../../theme/ThemeContext";
import { Theme } from "../../theme/theme";
import { useKycStatus } from "../../query/hooks/useKycStatus";
import { useUserProfile } from "../../query/hooks/useUserProfile";

// Define a type for the route params ProfileScreen might receive when opened as ProfileModal
// These params are passed to ProfileModal, not ProfileStackParamList for the 'Profile' screen itself.
// This is a common pattern when a screen component is used by different routes (e.g. modal vs. stack screen)
// For simplicity, we define it here. In a larger app, this might live with the root navigator's types.
type ProfileModalRouteParams = {
  sourceRoute?: string; // The name of the route to return to
};

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

interface ProfileScreenProps {
  onClose?: () => void;
  onUpgrade?: () => void;
  onMenuItemPress?: (menuItem: string) => void;
}

// --- ThemeSelection Sub-component ---
interface ThemePreviewProps {
  themeName: ThemeName;
  themeData: Theme;
  isActive: boolean;
  onSelect: () => void;
  appTheme: Theme;
  styleProps: {
    themePreviewContainer: object;
    themeColorCircle: object;
    darkModeCircle: object;
    activeThemeIcon: object;
    darkModeIndicator: object;
    themeNameText: object;
    activeThemeNameText: object;
  };
}

interface ThemeSelectionProps {
  appTheme: Theme;
  styleProps: {
    themeSelectionSection: object;
    menuSectionTitle: object;
    themeSelectionRow: object;
    themePreviewContainer: object;
    themeColorCircle: object;
    darkModeCircle: object;
    activeThemeIcon: object;
    darkModeIndicator: object;
    themeNameText: object;
    activeThemeNameText: object;
  };
}

const ThemePreview = React.memo(({ 
  themeName, 
  themeData, 
  isActive, 
  onSelect,
  appTheme,
  styleProps
}: ThemePreviewProps) => {
  const isDarkMode = themeName.startsWith('dark');
  const displayName = themeData.displayName;

  return (
    <TouchableOpacity onPress={onSelect} style={styleProps.themePreviewContainer}>
      <View style={[
        styleProps.themeColorCircle, 
        { backgroundColor: themeData.colors.primary },
        isDarkMode && styleProps.darkModeCircle
      ]}>
        {isActive && (
          <Ionicons name="checkmark-circle" size={20} color={appTheme.colors.white} style={styleProps.activeThemeIcon} />
        )}
        {isDarkMode && (
          <View style={styleProps.darkModeIndicator}>
            <Ionicons name="moon" size={10} color="#fff" />
          </View>
        )}
      </View>
      <Text style={[
        styleProps.themeNameText, 
        { color: appTheme.colors.textPrimary },
        isActive && styleProps.activeThemeNameText
      ]}>
        {displayName}
      </Text>
    </TouchableOpacity>
  );
});

const ThemeSelection = React.memo(({ appTheme, styleProps }: ThemeSelectionProps) => {
  const { themeName: activeThemeName, setThemeByName } = useTheme();

  // Separate themes into light and dark
  const lightThemes: [string, Theme][] = [];
  const darkThemes: [string, Theme][] = [];
  
  Object.entries(availableThemes).forEach(([name, theme]) => {
    if (name.startsWith('dark')) {
      darkThemes.push([name, theme]);
    } else {
      lightThemes.push([name, theme]);
    }
  });

  return (
    <View style={styleProps.themeSelectionSection}>
      <Text style={[
        styleProps.menuSectionTitle, 
        { 
          marginLeft: 0, 
          marginBottom: appTheme.spacing.sm 
        }
      ]}>
        App Theme
      </Text>
      
      {/* Light Themes Row */}
      <View style={styleProps.themeSelectionRow}>
        {lightThemes.map(([name, themeData]) => (
          <ThemePreview
            key={name}
            themeName={name as ThemeName}
            themeData={themeData}
            isActive={activeThemeName === name}
            onSelect={() => setThemeByName(name as ThemeName)}
            appTheme={appTheme}
            styleProps={styleProps}
          />
        ))}
      </View>
      
      {/* Dark Themes Row */}
      <View style={styleProps.themeSelectionRow}>
        {darkThemes.map(([name, themeData]) => (
          <ThemePreview
            key={name}
            themeName={name as ThemeName}
            themeData={themeData}
            isActive={activeThemeName === name}
            onSelect={() => setThemeByName(name as ThemeName)}
            appTheme={appTheme}
            styleProps={styleProps}
          />
        ))}
      </View>
    </View>
  );
});
// --- End ThemeSelection Sub-component ---

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onClose,
  onUpgrade,
  onMenuItemPress,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const rootNavigation = useNavigation(); // Get root navigation
  const currentScreenRoute = useRoute<RouteProp<ProfileStackParamList, 'Profile'>>();
  const auth = useAuth(); // This is useAuth() hook, not context directly for logout
  const authContext = useAuthContext(); // Use this for user data and context logout
  const { theme } = useTheme(); // Get current theme for styling ProfileScreen itself
  const { data: kycStatus, isLoading: isKycLoading, refetch: refetchKyc } = useKycStatus(authContext.user?.entityId);
  const { data: userProfile, isLoading: isLoadingUserProfile, refetch: refetchProfile } = useUserProfile(authContext.user?.entityId);
  
  // Determine if initial load is complete based on both KYC and profile data
  const isInitialLoadComplete = !isKycLoading && !isLoadingUserProfile;
  const isLoadingUserData = isLoadingUserProfile;
  
  console.log("🔥 [ProfileScreen] 📊 KYC status from useKycStatus:", kycStatus);
  console.log("🔥 [ProfileScreen] 📊 User profile from useUserProfile:", userProfile);
  console.log("🔥 [ProfileScreen] 📊 Loading states:", { isInitialLoadComplete, isLoadingUserData, isKycLoading });

  const user = authContext.user; // Get user from AuthContext

  // REMOVED: Problematic useFocusEffect that was causing infinite refresh loop
  // TanStack Query handles data fetching and caching automatically
  // No manual refresh needed on focus

  const allStepsCompleted = useMemo(() => {
    console.log('🔥 [ProfileScreen] 📊 allStepsCompleted calculation triggered');
    console.log('🔥 [ProfileScreen] 📊 kycStatus:', kycStatus);
    
    if (!kycStatus?.steps) {
      console.log('🔥 [ProfileScreen] ❌ No KYC steps available');
      return false;
    }
    
    // Get all KYC steps
    const steps = kycStatus.steps;
    const stepKeys = Object.keys(steps) as Array<keyof typeof steps>;
    
    // Check if all steps are completed
    const completed = stepKeys.every(stepKey => {
      const step = steps[stepKey];
      const isCompleted = step?.completed || false;
      console.log(`🔥 [ProfileScreen] Step ${stepKey}: isCompleted=${isCompleted}`);
      return isCompleted;
    });
    
    // Debug logging
    console.log('🔥 [ProfileScreen] 📊 KYC status check:', {
      hasKycSteps: !!kycStatus?.steps,
      totalSteps: stepKeys.length,
      allCompleted: completed,
      currentLevel: kycStatus.currentLevel,
      overallStatus: kycStatus.isVerificationInProgress ? 'in_progress' : 'completed'
    });
    
    return completed;
  }, [kycStatus]);

  // Create styles for the ProfileScreen component with access to the theme
  const styles = React.useMemo(() => StyleSheet.create({
    mainContainer: {
      flex: 1,
    },
    container: {
      flex: 1,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "600",
      flex: 1,
      textAlign: "center",
      marginRight: 40, // Offset to center title accounting for back button width
    },
    scrollView: {
      flex: 1,
    },
    profileHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
    },
    avatar: {
      width: 70,
      height: 70,
      borderRadius: 35,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    avatarText: {
      fontSize: 28,
      fontWeight: "bold",
    },
    userName: {
      fontSize: 20,
      fontWeight: "600",
      marginBottom: 4,
    },
    userHandleContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    userHandle: {
      fontSize: 14,
    },
    copyIcon: {
      marginLeft: 8,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    verifiedText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    setupBanner: {
      margin: 16,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
    },
    setupTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 4,
    },
    setupDescription: {
      fontSize: 14,
      marginBottom: 12,
    },
    setupButton: {
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignSelf: "flex-start",
    },
    setupButtonText: {
      fontSize: 14,
      fontWeight: "500",
    },
    menuSectionContainer: {
      marginHorizontal: 16,
      marginVertical: 8,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.isDark ? '#000' : '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: theme.isDark ? 0.2 : 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    menuSectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      color: theme.colors.textPrimary,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
    },
    lastMenuItem: {
      borderBottomWidth: 0,
    },
    menuItemLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    menuIcon: {
      marginRight: 12,
    },
    menuItemText: {
      fontSize: 15,
      fontWeight: "500",
    },
    logoutButton: {
      margin: 16,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      borderWidth: 1,
    },
    logoutText: {
      fontSize: 15,
      fontWeight: "600",
    },
    deleteAccountContainer: {
      alignItems: "center",
      marginBottom: 24,
    },
    deleteAccountText: {
      fontSize: 14,
    },
    themeSelectionSection: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    themeSelectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 16,
      flexWrap: 'wrap',
    },
    themePreviewContainer: {
      alignItems: 'center',
      marginBottom: 16,
      width: 75,
    },
    themeColorCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    activeThemeIcon: {
    },
    themeNameText: {
      fontSize: 12,
      textAlign: 'center',
      height: 30,
      width: '100%',
    },
    activeThemeNameText: {
      fontWeight: 'bold',
    },
    darkModeCircle: {
      borderColor: '#444',
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 3,
    },
    darkModeIndicator: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#444',
      justifyContent: 'center',
      alignItems: 'center',
    },
  }), [theme]);

  let sourceRouteFromParams = currentScreenRoute.params?.sourceRoute;
  if (!sourceRouteFromParams) {
    const parentState = navigation.getParent()?.getState();
    if (parentState) {
      const parentRoute = parentState.routes[parentState.index];
      if (parentRoute?.params && (parentRoute.params as ProfileModalRouteParams).sourceRoute) {
        sourceRouteFromParams = (parentRoute.params as ProfileModalRouteParams).sourceRoute;
        console.log(`[ProfileScreen] Found sourceRoute in PARENT route: ${sourceRouteFromParams}`);
      }
    }
  }

  console.log(`[ProfileScreen] Mounted/Re-focused. sourceRouteFromParams: ${sourceRouteFromParams}, currentScreenRoute.key: ${currentScreenRoute.key}, currentScreenRoute.name: ${currentScreenRoute.name}`);
  if(currentScreenRoute.params) console.log(`[ProfileScreen] currentScreenRoute.params: ${JSON.stringify(currentScreenRoute.params)}`);

  // Make sure status bar height is calculated immediately
  useEffect(() => {
    // Status bar is now handled globally by ThemeContext, no need to set it here
    
    // Log when params change on ProfileScreen, which might indicate an update from a child screen
    console.log(`[ProfileScreen] useEffect for route.params. sourceRouteFromParams after potential update: ${currentScreenRoute.params?.sourceRoute}, and derived: ${sourceRouteFromParams}`);
  }, [currentScreenRoute.params, sourceRouteFromParams]);

  const handleBack = () => {
    console.log(`[ProfileScreen] handleBack called. Effective sourceRouteFromParams: ${sourceRouteFromParams}`);
    if (onClose) {
      console.log("[ProfileScreen] handleBack: Calling onClose prop.");
      onClose();
      return;
    }

    if (sourceRouteFromParams) {
      const rootNavigation = navigation.getParent();
      if (rootNavigation) {
        console.log(`[ProfileScreen] handleBack: Attempting to goBack on parent navigator (RootStack) to return to ${sourceRouteFromParams}.`);
        rootNavigation.goBack();
        console.log(`[ProfileScreen] handleBack: Dispatched goBack() on parent navigator.`);
      } else {
        console.warn("[ProfileScreen] handleBack: Could not get parent navigator to go back.");
        // Fallback to original dispatch if parent cannot be found, though unlikely
        navigation.dispatch(
          CommonActions.navigate({
            name: 'App',
            params: {
              screen: sourceRouteFromParams,
            },
          })
        );
      }
      return;
    }
    
    // Default goBack if no sourceRoute and no onClose
    console.log("[ProfileScreen] handleBack: No sourceRoute, attempting navigation.goBack() within current stack.");
    if (navigation.canGoBack()) {
        navigation.goBack();
    } else {
        console.warn("[ProfileScreen] handleBack: No sourceRoute and cannot goBack(). This might be the initial screen of a stack.");
        // As a last resort, if it's truly stuck, maybe navigate to a default home/tab screen
        // For example: navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Wallet' }] })); // Example
    }
  };

  const handleCopyUsername = () => {
    console.log("Username copied to clipboard");
    // Add actual clipboard logic here
  };

  const handleContinueSetup = () => {
    console.log(`[ProfileScreen] handleContinueSetup. Navigating to VerifyYourIdentity. Passing sourceRoute: ${sourceRouteFromParams}`);
    navigation.navigate("VerifyYourIdentity", { sourceRoute: sourceRouteFromParams });
  };

  const handleMenuItemPress = (item: string) => {
    if (onMenuItemPress) {
      onMenuItemPress(item);
      return;
    }
    switch (item) {
      case "Account":
        navigation.navigate("Account");
        break;
      case "Documents and Statements":
        console.log("Navigate to Documents and Statements");
        break;
      case "Verify Your Identity":
        console.log(`[ProfileScreen] handleMenuItemPress for Verify Your Identity. Passing sourceRoute: ${sourceRouteFromParams}`);
        navigation.navigate("VerifyYourIdentity", { sourceRoute: sourceRouteFromParams });
        break;
      case "Fees and Rates":
        navigation.navigate("Fees");
        break;
      case "Terms and conditions":
        console.log("Navigate to Terms and conditions");
        break;
      case "Security & Privacy":
        navigation.navigate("SecurityPrivacy");
        break;
      default:
        console.log(`Navigate to ${item}`);
    }
  };

  const handleLogout = async () => {
    try {
      logger.debug("Logging out user", "profile");
      
      if (authContext) {
        await authContext.logout(); // Call the logout from AuthContext
        // No need to call authContext.setIsAuthenticated(false) here,
        // as authContext.logout() handles all necessary state changes.
      } else {
        logger.warn("AuthContext not available during logout attempt", "profile");
        // Fallback or alternative error handling if context is missing
        // For instance, try to use the useAuth() hook's logout as a last resort,
        // though this indicates a deeper issue if context is missing here.
        await auth.logout(); // auth is from useAuth()
        // And manually try to navigate or force a state that leads to re-authentication.
      }
    } catch (error) {
      logger.error("Error logging out:", error, "profile");
      // Display an alert or some feedback to the user about the logout failure
      Alert.alert("Logout Failed", "An error occurred while trying to log out. Please try again.");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => console.log("Delete account confirmed")
        }
      ]
    );
  };

  const renderMenuItem = (
    iconName: keyof typeof Ionicons.glyphMap,
    title: string,
    onPress: () => void,
    isLast: boolean = false
  ) => (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: theme.colors.border }, isLast && styles.lastMenuItem]}
      onPress={onPress}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons name={iconName} size={24} color={theme.colors.primary} style={styles.menuIcon} />
        <Text style={[styles.menuItemText, { color: theme.colors.textPrimary }]}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.grayLight} />
    </TouchableOpacity>
  );

  // Create an object with styles to pass to theme components
  const themeStyleProps = {
    themeSelectionSection: styles.themeSelectionSection,
    menuSectionTitle: styles.menuSectionTitle,
    themeSelectionRow: styles.themeSelectionRow,
    themePreviewContainer: styles.themePreviewContainer,
    themeColorCircle: styles.themeColorCircle,
    darkModeCircle: styles.darkModeCircle,
    activeThemeIcon: styles.activeThemeIcon,
    darkModeIndicator: styles.darkModeIndicator,
    themeNameText: styles.themeNameText,
    activeThemeNameText: styles.activeThemeNameText,
  };

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return "UA"; // User Account / Unknown Account
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.colors.background }]}>
      {/* StatusBar is now controlled by ThemeContext, no need to set props here */}
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Profile</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={[styles.profileHeader, { borderBottomColor: theme.colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: user?.avatarUrl ? 'transparent' : theme.colors.primary }]}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={{ width: '100%', height: '100%', borderRadius: 35 }} />
              ) : (
                <Text style={[styles.avatarText, { color: theme.colors.white }]}>
                  {getInitials(user?.firstName, user?.lastName, user?.email)}
                </Text>
              )}
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={[styles.userName, { color: theme.colors.textPrimary, marginBottom: 0 }]}>
                {user?.firstName || user?.lastName ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() : (user?.email || 'User')}
              </Text>
                {allStepsCompleted && (
                  <View style={styles.verifiedBadge}>
                      <Ionicons name="shield-checkmark" size={14} color={theme.colors.primary} />
                      <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
              <View style={styles.userHandleContainer}>
                <Text style={[styles.userHandle, { color: theme.colors.textSecondary }]}>
                  {user?.username ? `@${user.username}` : (user?.email ? 'No username' : '' )}
                </Text>
                {user?.username && (
                <TouchableOpacity onPress={handleCopyUsername}>
                  <Ionicons name="copy-outline" size={16} color={theme.colors.primary} style={styles.copyIcon} />
                </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* KYC Banner: shows different content based on completion status */}
          {allStepsCompleted ? (
            <View style={[styles.setupBanner, { backgroundColor: theme.colors.primaryUltraLight, borderColor: theme.colors.primaryLight }]}>
              <Text style={[styles.setupTitle, { color: theme.colors.primary }]}>Identity Verified</Text>
              <Text style={[styles.setupDescription, { color: theme.colors.textSecondary }]}>
                Your account is fully verified. You can review your details at any time.
              </Text>
              <TouchableOpacity style={[styles.setupButton, { backgroundColor: theme.colors.primary }]} onPress={handleContinueSetup}>
                <Text style={[styles.setupButtonText, { color: theme.colors.white }]}>Review Details</Text>
              </TouchableOpacity>
            </View>
          ) : (
          <View style={[styles.setupBanner, { backgroundColor: theme.colors.primaryUltraLight, borderColor: theme.colors.primaryLight }]}>
            <Text style={[styles.setupTitle, { color: theme.colors.primary }]}>Finish account setup</Text>
            <Text style={[styles.setupDescription, { color: theme.colors.textSecondary }]}>
              Complete your profile to use all Swap money functionalities
            </Text>
            <TouchableOpacity style={[styles.setupButton, { backgroundColor: theme.colors.primary }]} onPress={handleContinueSetup}>
              <Text style={[styles.setupButtonText, { color: theme.colors.white }]}>Continue setup</Text>
            </TouchableOpacity>
          </View>
          )}

          {/* Menu Section 1 */}
          <View style={styles.menuSectionContainer}>
            {renderMenuItem("person-outline", "Account", () => handleMenuItemPress("Account"))}
            {/* {renderMenuItem("document-text-outline", "Documents and Statements", () => handleMenuItemPress("Documents and Statements"))} */}
            {renderMenuItem("cash-outline", "Fees and Rates", () => handleMenuItemPress("Fees and Rates"))}
            {renderMenuItem("reader-outline", "Terms and conditions", () => handleMenuItemPress("Terms and conditions"), true)}
          </View>

          {/* Menu Section 2 */}
          <View style={styles.menuSectionContainer}>
            {renderMenuItem("shield-checkmark-outline", "Security & Privacy", () => handleMenuItemPress("Security & Privacy"), true)}
          </View>

          {/* Theme Selection Section - Moved below Security & Privacy section */}
          <View style={styles.menuSectionContainer}>
            <ThemeSelection
              appTheme={theme} 
              styleProps={{
                themeSelectionSection: styles.themeSelectionSection,
                menuSectionTitle: styles.menuSectionTitle,
                themeSelectionRow: styles.themeSelectionRow,
                themePreviewContainer: styles.themePreviewContainer,
                themeColorCircle: styles.themeColorCircle,
                darkModeCircle: styles.darkModeCircle,
                activeThemeIcon: styles.activeThemeIcon,
                darkModeIndicator: styles.darkModeIndicator,
                themeNameText: styles.themeNameText,
                activeThemeNameText: styles.activeThemeNameText,
              }}
            />
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.colors.grayUltraLight, borderColor: theme.colors.border }]} onPress={handleLogout}>
            <Text style={[styles.logoutText, { color: theme.colors.textPrimary }]}>Log out</Text>
          </TouchableOpacity>

          {/* Delete Account Link */}
          <TouchableOpacity style={styles.deleteAccountContainer} onPress={handleDeleteAccount}>
            <Text style={[styles.deleteAccountText, { color: theme.colors.error }]}>Delete account</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default ProfileScreen;
