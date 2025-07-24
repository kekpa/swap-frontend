/// Application Constants
/// 
/// This file contains all the application-wide constants including
/// environment configuration, feature flags, and other global values.

class AppConstants {
  /// Environment Configuration
  static const String appName = 'Swap Neobank';
  static const String appVersion = '1.0.0';
  
  /// API Configuration
  static const String apiVersion = 'v1';
  static const String apiBasePath = '/api/$apiVersion';
  
  /// Environment URLs (these should be configured per environment)
  static const String developmentApiUrl = 'http://localhost:3000';
  static const String stagingApiUrl = 'https://staging-api.swap.com';
  static const String productionApiUrl = 'https://api.swap.com';
  
  /// Default timeout values (in milliseconds)
  static const int defaultTimeoutMs = 30000; // 30 seconds
  static const int transactionTimeoutMs = 60000; // 60 seconds for transactions
  static const int refreshTokenTimeoutMs = 10000; // 10 seconds for token refresh
  
  /// Cache Configuration
  static const Duration defaultCacheTtl = Duration(minutes: 5);
  static const Duration profileCacheTtl = Duration(hours: 1);
  static const Duration balancesCacheTtl = Duration(minutes: 15);
  static const Duration transactionsCacheTtl = Duration(minutes: 30);
  static const Duration appConfigCacheTtl = Duration(hours: 24);
  
  /// Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  /// Security
  static const int maxRetryAttempts = 3;
  static const Duration retryBaseDelay = Duration(seconds: 1);
  static const Duration tokenRefreshThreshold = Duration(seconds: 5);
  
  /// Local Database
  static const String databaseName = 'swap_app.db';
  static const int databaseVersion = 1;
  
  /// Sync Configuration
  static const Duration backgroundSyncInterval = Duration(minutes: 15);
  static const int maxSyncRetries = 3;
  static const Duration syncRetryDelay = Duration(seconds: 30);
  
  /// UI Configuration
  static const Duration animationDuration = Duration(milliseconds: 300);
  static const Duration shortAnimationDuration = Duration(milliseconds: 150);
  static const Duration longAnimationDuration = Duration(milliseconds: 500);
  
  /// Feature Flags
  static const bool enableBiometricAuth = true;
  static const bool enableOfflineMode = true;
  static const bool enablePushNotifications = true;
  static const bool enableAnalytics = true;
  static const bool enableCrashReporting = true;
  
  /// WebSocket Configuration
  static const Duration websocketReconnectDelay = Duration(seconds: 5);
  static const int maxWebsocketReconnectAttempts = 5;
  static const Duration websocketHeartbeatInterval = Duration(seconds: 30);
  
  /// Maps Configuration
  static const double defaultMapZoom = 15.0;
  static const double maxMapZoom = 20.0;
  static const double minMapZoom = 5.0;
  
  /// File Upload
  static const int maxFileSize = 10 * 1024 * 1024; // 10MB
  static const List<String> allowedImageTypes = ['jpg', 'jpeg', 'png', 'webp'];
  static const List<String> allowedDocumentTypes = ['pdf', 'doc', 'docx'];
  
  /// Validation
  static const int minPasswordLength = 8;
  static const int maxPasswordLength = 128;
  static const int pinLength = 4;
  
  /// Logging
  static const bool enableDebugLogging = true;
  static const int maxLogEntries = 1000;
}

/// Environment-specific configuration
enum Environment {
  development,
  staging,
  production,
}

extension EnvironmentExtension on Environment {
  String get apiBaseUrl {
    switch (this) {
      case Environment.development:
        return AppConstants.developmentApiUrl;
      case Environment.staging:
        return AppConstants.stagingApiUrl;
      case Environment.production:
        return AppConstants.productionApiUrl;
    }
  }
  
  bool get isProduction => this == Environment.production;
  bool get isDevelopment => this == Environment.development;
  bool get isStaging => this == Environment.staging;
}

/// Current environment configuration
class EnvironmentConfig {
  static const Environment _environment = Environment.development; // TODO: Configure per build
  
  static Environment get current => _environment;
  static String get apiBaseUrl => _environment.apiBaseUrl;
  static bool get isProduction => _environment.isProduction;
  static bool get isDevelopment => _environment.isDevelopment;
  static bool get isStaging => _environment.isStaging;
}

/// Storage Keys for secure storage and shared preferences
class StorageKeys {
  // Secure Storage Keys
  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';
  static const String userPin = 'user_pin';
  static const String biometricKey = 'biometric_key';
  
  // Shared Preferences Keys
  static const String userId = 'user_id';
  static const String profileId = 'profile_id';
  static const String userName = 'user_name';
  static const String userEmail = 'user_email';
  static const String isFirstLaunch = 'is_first_launch';
  static const String selectedTheme = 'selected_theme';
  static const String isDarkMode = 'is_dark_mode';
  static const String notificationsEnabled = 'notifications_enabled';
  static const String biometricEnabled = 'biometric_enabled';
  static const String lastSyncTimestamp = 'last_sync_timestamp';
  
  // Cache Keys
  static const String userProfileCache = 'user_profile_cache';
  static const String balancesCache = 'balances_cache';
  static const String transactionsCache = 'transactions_cache';
  static const String interactionsCache = 'interactions_cache';
}

/// Event names for analytics and logging
class EventNames {
  // Authentication Events
  static const String loginSuccess = 'login_success';
  static const String loginFailure = 'login_failure';
  static const String logout = 'logout';
  static const String tokenRefresh = 'token_refresh';
  static const String biometricAuth = 'biometric_auth';
  
  // Transaction Events
  static const String transactionCreated = 'transaction_created';
  static const String transactionFailed = 'transaction_failed';
  static const String balanceViewed = 'balance_viewed';
  
  // UI Events
  static const String screenViewed = 'screen_viewed';
  static const String buttonTapped = 'button_tapped';
  static const String searchPerformed = 'search_performed';
  
  // Sync Events
  static const String syncStarted = 'sync_started';
  static const String syncCompleted = 'sync_completed';
  static const String syncFailed = 'sync_failed';
  
  // Error Events
  static const String apiError = 'api_error';
  static const String networkError = 'network_error';
  static const String databaseError = 'database_error';
}