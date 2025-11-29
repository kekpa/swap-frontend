import "dotenv/config";

// Load the appropriate .env file based on the environment
const envPath =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

require("dotenv").config({ path: envPath });

export default {
  name: "Swap",
  slug: "swap",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.swapglobal.swap",
    appleTeamId: "98Z2KMR9NT",
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
    },
    infoPlist: {
      CFBundleDisplayName: "Swap",
      LSApplicationCategoryType: "public.app-category.finance",
      UIRequiredDeviceCapabilities: ["arm64"],
      UIStatusBarHidden: false,
      UIViewControllerBasedStatusBarAppearance: false,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
        NSAllowsLocalNetworking: true,
      },
      // Privacy Usage Descriptions
      NSContactsUsageDescription: "Swap needs access to your contacts to help you send money to friends and family easily.",
      NSCameraUsageDescription: "Swap needs camera access to scan QR codes for payments and to take photos for profile and verification.",
      NSLocationWhenInUseUsageDescription: "Swap needs your location to show nearby ATMs, merchants, and to comply with financial regulations.",
      NSPhotoLibraryUsageDescription: "Swap needs access to your photos to let you upload profile pictures and documents for verification.",
      NSPhotoLibraryAddUsageDescription: "Swap needs permission to save QR codes and receipts to your photo library.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.swapglobal.swap",
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY
      }
    },
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "15.1",
          xcodeProps: {
            SUPPORTS_MACCATALYST: "NO",
            SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD: "NO",
            SUPPORTS_XR_DESIGNED_FOR_IPHONE_IPAD: "NO",
            TARGETED_DEVICE_FAMILY: "1",
            DEVELOPMENT_TEAM: "98Z2KMR9NT",
          },
        },
      },
    ],
    "react-native-maps",
    "@maplibre/maplibre-react-native",
    "expo-secure-store",
    "expo-sqlite",
  ],
  extra: {
    // EAS Configuration
    eas: {
      projectId: "2927c0b1-fa22-49c6-934d-3321f6e0cff7"
    },
    // Load environment variables
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_NEST_API_URL: process.env.EXPO_PUBLIC_NEST_API_URL,
    EXPO_PUBLIC_MAP_API_URL: process.env.EXPO_PUBLIC_MAP_API_URL,
    EXPO_PUBLIC_REALTIME_URL: process.env.EXPO_PUBLIC_REALTIME_URL, // NEW: Add WebSocket real-time service URL
    EXPO_PUBLIC_ENABLE_DEV_TOOLS:
      process.env.EXPO_PUBLIC_ENABLE_DEV_TOOLS === "true",
    EXPO_PUBLIC_MOCK_DATA_WHEN_NO_AUTH:
      process.env.EXPO_PUBLIC_MOCK_DATA_WHEN_NO_AUTH === "true",
    EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV || "development",
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  },
};
