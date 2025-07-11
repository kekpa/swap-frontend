import Constants from "expo-constants";

// Environment type definition
interface Environment {
  ENV: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  NEST_API_URL: string;
  MAP_API_URL: string;
  REALTIME_URL: string;
  ENABLE_DEV_TOOLS: boolean;
  MOCK_DATA_WHEN_NO_AUTH: boolean;
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
}

// Get environment variables from Expo Constants
const getEnvVars = (): Environment => {
  const expoConstants = Constants.expoConfig?.extra || {};

  // Get environment variables from process.env (via Expo's EXPO_PUBLIC_ prefix)
  return {
    ENV: process.env.EXPO_PUBLIC_ENV || "development",
    SUPABASE_URL:
      process.env.EXPO_PUBLIC_SUPABASE_URL || expoConstants.SUPABASE_URL || "",
    SUPABASE_ANON_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      expoConstants.SUPABASE_ANON_KEY ||
      "",
    NEST_API_URL:
      process.env.EXPO_PUBLIC_NEST_API_URL || expoConstants.NEST_API_URL || "",
    MAP_API_URL:
      process.env.EXPO_PUBLIC_MAP_API_URL || expoConstants.MAP_API_URL || "http://192.168.1.110:3004",
    REALTIME_URL:
      process.env.EXPO_PUBLIC_REALTIME_URL || expoConstants.REALTIME_URL || "",
    ENABLE_DEV_TOOLS:
      process.env.EXPO_PUBLIC_ENABLE_DEV_TOOLS === "true" || false,
    MOCK_DATA_WHEN_NO_AUTH:
      process.env.EXPO_PUBLIC_MOCK_DATA_WHEN_NO_AUTH === "true" || false,
    IS_DEVELOPMENT:
      (process.env.EXPO_PUBLIC_ENV || "development") === "development",
    IS_PRODUCTION:
      (process.env.EXPO_PUBLIC_ENV || "development") === "production",
  };
};

// Export the environment configuration
export const ENV = getEnvVars();

// For backward compatibility with existing code
export const IS_DEVELOPMENT = ENV.IS_DEVELOPMENT;
