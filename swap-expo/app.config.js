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
    teamId: "98Z2KMR9NT",
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
    },
    infoPlist: {
      CFBundleDisplayName: "Swap",
      LSApplicationCategoryType: "public.app-category.finance",
      UIRequiredDeviceCapabilities: ["arm64"],
      UIStatusBarHidden: true,
      UIViewControllerBasedStatusBarAppearance: false,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
        NSAllowsLocalNetworking: true,
      },
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
          useFrameworks: "static",
          deploymentTarget: "15.1",
          xcodeProps: {
            SUPPORTS_MACCATALYST: "NO",
            SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD: "NO",
            SUPPORTS_XR_DESIGNED_FOR_IPHONE_IPAD: "NO",
            TARGETED_DEVICE_FAMILY: "1",
          },
        },
      },
    ],
    "@maplibre/maplibre-react-native",
    "expo-secure-store",
    "expo-sqlite",
  ],
  extra: {
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
