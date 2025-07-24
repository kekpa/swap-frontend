import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../../core/database/app_database.dart';
import '../../core/network/api_client.dart';
import '../../core/network/auth_token_manager.dart';
import '../../core/constants/app_constants.dart';

/// Core Application Providers
/// 
/// Centralizes all dependency injection using Riverpod providers.
/// Adapts the dependency management patterns from Expo implementation.

/// Logger Provider
final loggerProvider = Provider<Logger>((ref) {
  return Logger(
    printer: PrettyPrinter(
      methodCount: 2,
      errorMethodCount: 8,
      lineLength: 120,
      colors: true,
      printEmojis: true,
      dateTimeFormat: DateTimeFormat.onlyTimeAndSinceStart,
    ),
  );
});

/// Database Provider
final databaseProvider = Provider<AppDatabase>((ref) {
  return AppDatabase();
});

/// Connectivity Provider
final connectivityProvider = Provider<Connectivity>((ref) {
  return Connectivity();
});

/// Auth Token Manager Provider
final authTokenManagerProvider = Provider<AuthTokenManager>((ref) {
  final logger = ref.read(loggerProvider);
  return AuthTokenManager(logger: logger);
});

/// API Client Provider
final apiClientProvider = Provider<ApiClient>((ref) {
  final tokenManager = ref.read(authTokenManagerProvider);
  final logger = ref.read(loggerProvider);
  final connectivity = ref.read(connectivityProvider);
  
  return ApiClient(
    baseUrl: EnvironmentConfig.apiBaseUrl,
    tokenManager: tokenManager,
    logger: logger,
    connectivity: connectivity,
  );
});

/// Current User Provider
final currentUserProvider = StateProvider<String?>((ref) => null);

/// Profile ID Provider (for API requests)
final profileIdProvider = StateProvider<String?>((ref) => null);

/// Authentication State Provider
final authStateProvider = StateNotifierProvider<AuthStateNotifier, AuthState>((ref) {
  final tokenManager = ref.read(authTokenManagerProvider);
  final apiClient = ref.read(apiClientProvider);
  final logger = ref.read(loggerProvider);
  
  return AuthStateNotifier(
    tokenManager: tokenManager,
    apiClient: apiClient,
    logger: logger,
  );
});

/// Authentication State
enum AuthStatus {
  initial,
  authenticated,
  unauthenticated,
  loading,
}

class AuthState {
  final AuthStatus status;
  final String? userId;
  final String? error;

  const AuthState({
    this.status = AuthStatus.initial,
    this.userId,
    this.error,
  });

  AuthState copyWith({
    AuthStatus? status,
    String? userId,
    String? error,
  }) {
    return AuthState(
      status: status ?? this.status,
      userId: userId ?? this.userId,
      error: error ?? this.error,
    );
  }

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading => status == AuthStatus.loading;
}

/// Authentication State Notifier
class AuthStateNotifier extends StateNotifier<AuthState> {
  final AuthTokenManager _tokenManager;
  final ApiClient _apiClient;
  final Logger _logger;

  AuthStateNotifier({
    required AuthTokenManager tokenManager,
    required ApiClient apiClient,
    required Logger logger,
  }) : _tokenManager = tokenManager,
       _apiClient = apiClient,
       _logger = logger,
       super(const AuthState()) {
    _initializeAuth();
  }

  /// Initialize authentication state
  Future<void> _initializeAuth() async {
    try {
      state = state.copyWith(status: AuthStatus.loading);
      
      final hasValidTokens = await _tokenManager.hasValidTokens();
      
      if (hasValidTokens) {
        final userId = _tokenManager.getUserIdFromToken();
        state = state.copyWith(
          status: AuthStatus.authenticated,
          userId: userId,
        );
        _logger.i('User authenticated with ID: $userId');
      } else {
        state = state.copyWith(status: AuthStatus.unauthenticated);
        _logger.i('User not authenticated');
      }
    } catch (error) {
      _logger.e('Error initializing auth: $error');
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        error: error.toString(),
      );
    }
  }

  /// Login with email and password
  Future<bool> login(String email, String password) async {
    try {
      state = state.copyWith(status: AuthStatus.loading, error: null);
      
      final response = await _apiClient.post(
        '/auth/login',
        data: {
          'email': email,
          'password': password,
        },
      );

      switch (response) {
        case ApiSuccess(data: final data):
          await _tokenManager.setTokens(
            accessToken: data['access_token'],
            refreshToken: data['refresh_token'],
          );
          
          final userId = _tokenManager.getUserIdFromToken();
          state = state.copyWith(
            status: AuthStatus.authenticated,
            userId: userId,
          );
          
          _logger.i('Login successful for user: $userId');
          return true;
          
        case ApiError(message: final message):
          state = state.copyWith(
            status: AuthStatus.unauthenticated,
            error: message,
          );
          _logger.e('Login failed: $message');
          return false;
      }
    } catch (error) {
      _logger.e('Login error: $error');
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        error: error.toString(),
      );
      return false;
    }
  }

  /// Logout
  Future<void> logout() async {
    try {
      // Call logout endpoint if authenticated
      if (state.isAuthenticated) {
        await _apiClient.post('/auth/logout');
      }
    } catch (error) {
      _logger.w('Logout API call failed: $error');
    } finally {
      // Always clear local tokens and state
      await _tokenManager.clearTokens();
      state = const AuthState(status: AuthStatus.unauthenticated);
      _logger.i('User logged out');
    }
  }

  /// Refresh authentication state
  Future<void> refreshAuth() async {
    await _initializeAuth();
  }
}

/// Network State Provider
final networkStateProvider = StreamProvider<List<ConnectivityResult>>((ref) {
  final connectivity = ref.read(connectivityProvider);
  return connectivity.onConnectivityChanged;
});

/// Theme Mode Provider
final themeModeProvider = StateProvider<bool>((ref) => false); // false = light, true = dark

/// Selected Theme Provider (violet, oceanBlue, green, amber)
final selectedThemeProvider = StateProvider<String>((ref) => 'violet');

/// App Lifecycle Provider - tracks if app is in foreground/background
final appLifecycleProvider = StateProvider<AppLifecycleState>((ref) => AppLifecycleState.resumed);

/// Initialization Provider - tracks app initialization status
final appInitializationProvider = FutureProvider<bool>((ref) async {
  try {
    // Initialize core services
    final database = ref.read(databaseProvider);
    final authState = ref.read(authStateProvider.notifier);
    
    // Wait for auth initialization
    await authState._initializeAuth();
    
    // Perform any other initialization tasks
    await Future.delayed(const Duration(milliseconds: 500)); // Simulate initialization time
    
    return true;
  } catch (error) {
    final logger = ref.read(loggerProvider);
    logger.e('App initialization failed: $error');
    rethrow;
  }
});

/// Global error handler
final globalErrorProvider = StateProvider<String?>((ref) => null);

/// Loading state for global operations
final globalLoadingProvider = StateProvider<bool>((ref) => false);

/// Dispose method for cleanup
void disposeProviders(ProviderContainer container) {
  final database = container.read(databaseProvider);
  database.close();
}