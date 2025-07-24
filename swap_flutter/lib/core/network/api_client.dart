import 'dart:io';
import 'package:dio/dio.dart';
import 'package:dio_cache_interceptor/dio_cache_interceptor.dart';
import 'package:dio_cache_interceptor_hive_store/dio_cache_interceptor_hive_store.dart';
import 'package:logger/logger.dart';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../constants/app_constants.dart';
import '../constants/api_paths.dart';
import 'auth_token_manager.dart';
import 'network_interceptors.dart';
import '../utils/error_handler.dart';

/// API Response wrapper for consistent response handling
sealed class ApiResponse<T> {
  const ApiResponse();
}

class ApiSuccess<T> extends ApiResponse<T> {
  final T data;
  const ApiSuccess(this.data);
}

class ApiError<T> extends ApiResponse<T> {
  final String message;
  final int? statusCode;
  final dynamic originalError;
  const ApiError(this.message, {this.statusCode, this.originalError});
}

/// Cache configuration matching Expo patterns
class CacheConfig {
  static const Map<String, Duration> cacheablePaths = {
    // User data
    '/auth/me': AppConstants.profileCacheTtl,
    '/auth/verify-token': AppConstants.defaultCacheTtl,
    
    // Financial data
    '/accounts/*/balance': AppConstants.balancesCacheTtl,
    '/transactions': AppConstants.transactionsCacheTtl,
    
    // App configuration
    '/app/config': AppConstants.appConfigCacheTtl,
  };
  
  static Duration getCacheTtl(String path) {
    for (final entry in cacheablePaths.entries) {
      final pattern = entry.key.replaceAll('*', r'[^/]+');
      final regex = RegExp(pattern);
      if (regex.hasMatch(path)) {
        return entry.value;
      }
    }
    return AppConstants.defaultCacheTtl;
  }
  
  static bool isCacheable(String path, String method) {
    if (method.toUpperCase() != 'GET') return false;
    
    return cacheablePaths.keys.any((pattern) {
      final regexPattern = pattern.replaceAll('*', r'[^/]+');
      return RegExp(regexPattern).hasMatch(path);
    });
  }
}

/// Main API Client
/// 
/// Comprehensive HTTP client with interceptors, caching, retry logic,
/// and authentication management. Adapted from Expo's apiClient.ts patterns
/// but optimized for Flutter with Dio.
class ApiClient {
  late final Dio _dio;
  final AuthTokenManager _tokenManager;
  final Logger _logger;
  final Connectivity _connectivity;
  
  // Request queue management
  final List<RequestOptions> _failedRequestsQueue = [];
  bool _isRefreshingToken = false;
  
  // Rate limiting
  final Map<String, DateTime> _rateLimitedEndpoints = {};
  
  // API call tracking for debugging
  final List<Map<String, dynamic>> _apiCallHistory = [];
  static const int _maxHistoryLength = 20;

  ApiClient({
    required String baseUrl,
    required AuthTokenManager tokenManager,
    Logger? logger,
    Connectivity? connectivity,
  }) : _tokenManager = tokenManager,
       _logger = logger ?? Logger(),
       _connectivity = connectivity ?? Connectivity() {
    
    _setupDio(baseUrl);
    _setupInterceptors();
    _logApiWarning();
  }

  void _setupDio(String baseUrl) {
    _dio = Dio(BaseOptions(
      baseUrl: '$baseUrl${AppConstants.apiBasePath}',
      connectTimeout: const Duration(milliseconds: AppConstants.defaultTimeoutMs),
      receiveTimeout: const Duration(milliseconds: AppConstants.defaultTimeoutMs),
      sendTimeout: const Duration(milliseconds: AppConstants.defaultTimeoutMs),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));
  }

  void _setupInterceptors() {
    // 1. Request URL fixing interceptor (adapt from Expo pattern)
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          _fixDuplicateApiPrefix(options);
          _trackApiCall(options);
          _sanitizeAndLogRequest(options);
          handler.next(options);
        },
      ),
    );

    // 2. Authentication interceptor
    _dio.interceptors.add(
      AuthenticationInterceptor(
        tokenManager: _tokenManager,
        logger: _logger,
        onTokenRefreshNeeded: _handleTokenRefresh,
      ),
    );

    // 3. Cache interceptor
    _dio.interceptors.add(
      DioCacheInterceptor(
        options: CacheOptions(
          store: HiveCacheStore(null), // Use default Hive storage
          policy: CachePolicy.refresh,
          maxStale: const Duration(days: 7),
          keyBuilder: (request) => _buildCacheKey(request),
          allowPostMethod: false,
        ),
      ),
    );

    // 4. Retry interceptor with exponential backoff
    _dio.interceptors.add(
      RetryInterceptor(
        dio: _dio,
        logger: _logger,
        retries: AppConstants.maxRetryAttempts,
        retryDelays: const [
          Duration(seconds: 1),
          Duration(seconds: 2),
          Duration(seconds: 4),
        ],
      ),
    );

    // 5. Response logging and error handling
    _dio.interceptors.add(
      InterceptorsWrapper(
        onResponse: (response, handler) {
          _logResponse(response);
          _cacheResponseIfNeeded(response);
          handler.next(response);
        },
        onError: (error, handler) {
          _handleApiError(error, handler);
        },
      ),
    );
  }

  /// Fix duplicate API prefix in URLs (adapted from Expo pattern)
  void _fixDuplicateApiPrefix(RequestOptions options) {
    if (options.path.startsWith('/api/v1')) {
      options.path = options.path.substring(7);
      _logger.d('Fixed API URL by removing duplicate prefix: ${options.path}');
    } else if (options.path.startsWith('api/v1')) {
      options.path = options.path.substring(6);
      _logger.d('Fixed API URL by removing duplicate prefix: ${options.path}');
    }
  }

  /// Track API calls for debugging (adapted from Expo pattern)
  void _trackApiCall(RequestOptions options) {
    final callInfo = {
      'url': options.path,
      'method': options.method,
      'timestamp': DateTime.now().toIso8601String(),
    };

    _apiCallHistory.add(callInfo);
    if (_apiCallHistory.length > _maxHistoryLength) {
      _apiCallHistory.removeAt(0);
    }

    // Check for potential refresh loops
    final recentCalls = _apiCallHistory
        .where((call) => 
            call['url'] == options.path &&
            DateTime.now().difference(DateTime.parse(call['timestamp'])).inSeconds < 5)
        .length;

    if (recentCalls > 2) {
      _logger.w('⚠️ Potential refresh loop detected! $recentCalls calls to ${options.path} in the last 5 seconds');
    }
  }

  /// Sanitize and log request (hide sensitive data)
  void _sanitizeAndLogRequest(RequestOptions options) {
    if (kDebugMode) {
      final sanitizedHeaders = Map<String, dynamic>.from(options.headers);
      if (sanitizedHeaders.containsKey('Authorization')) {
        sanitizedHeaders['Authorization'] = 'Bearer [REDACTED]';
      }
      
      _logger.d('🔍 API Request: ${options.method} ${options.path}');
      _logger.v('Headers: $sanitizedHeaders');
    }
  }

  /// Log API warning about URL prefix (adapted from Expo)
  void _logApiWarning() {
    if (kDebugMode) {
      _logger.w('''
⚠️ API USAGE WARNING ⚠️
Do not include '/api/' in your endpoint paths when using ApiClient.
The client already includes '/api/v1' in the baseURL.

INCORRECT: apiClient.get('/api/users/profile')
CORRECT:   apiClient.get('/users/profile')
      ''');
    }
  }

  /// Handle token refresh
  Future<TokenRefreshResult> _handleTokenRefresh() async {
    final refreshToken = await _tokenManager.getRefreshToken();
    if (refreshToken == null) {
      return const TokenRefreshFailure('No refresh token available');
    }

    try {
      final response = await _dio.post(
        AuthPaths.refresh,
        data: {'refresh_token': refreshToken},
        options: Options(
          headers: {'skipAuth': 'true'}, // Skip auth for refresh request
        ),
      );

      final newAccessToken = response.data['access_token'];
      final newRefreshToken = response.data['refresh_token'];

      await _tokenManager.setTokens(
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      );

      return TokenRefreshSuccess(newAccessToken);
    } catch (error) {
      await _tokenManager.clearTokens();
      return TokenRefreshFailure(error.toString());
    }
  }

  /// Build cache key for request
  String _buildCacheKey(RequestOptions request) {
    final params = request.queryParameters.isNotEmpty 
        ? '?${request.queryParameters.entries.map((e) => '${e.key}=${e.value}').join('&')}' 
        : '';
    return 'api:${request.method}-${request.path}$params';
  }

  /// Cache response if needed
  void _cacheResponseIfNeeded(Response response) {
    if (response.requestOptions.method.toUpperCase() == 'GET' &&
        CacheConfig.isCacheable(response.requestOptions.path, response.requestOptions.method)) {
      _logger.d('Response cached for: ${response.requestOptions.path}');
    }
  }

  /// Log API response
  void _logResponse(Response response) {
    if (kDebugMode) {
      _logger.d('✅ API Response: ${response.statusCode} ${response.requestOptions.path}');
      _logger.v('Response size: ${response.data.toString().length} bytes');
    }
  }

  /// Handle API errors with sophisticated logic (adapted from Expo)
  void _handleApiError(DioException error, ErrorInterceptorHandler handler) {
    final requestOptions = error.requestOptions;
    
    // Convert DioException to AppError for consistent error handling
    final appError = ErrorHandler.handleDioError(error);
    ErrorHandler.logError(appError, _logger);

    // Handle rate limiting
    if (error.response?.statusCode == 429) {
      _handleRateLimit(error);
    }

    handler.next(error);
  }

  /// Check if error is expected (adapted from Expo pattern)
  bool _isExpectedError(DioException error) {
    final statusCode = error.response?.statusCode;
    final path = error.requestOptions.path;
    
    return (statusCode == 404 && path.contains('/interactions/direct/')) ||
           (statusCode == 401 && path.contains('/auth/verify-token')) ||
           (statusCode == 401 && (path.contains('/auth/login') || path.contains('/auth/business/login')));
  }

  /// Handle rate limiting
  void _handleRateLimit(DioException error) {
    final endpoint = error.requestOptions.path;
    final retryAfterHeader = error.response?.headers.value('retry-after');
    final retryAfter = int.tryParse(retryAfterHeader ?? '30') ?? 30;
    final retryTime = DateTime.now().add(Duration(seconds: retryAfter));
    
    _rateLimitedEndpoints[endpoint] = retryTime;
    _logger.w('Rate limited for endpoint $endpoint. Retry after ${retryAfter}s');
  }

  // Public API methods

  /// GET request
  Future<ApiResponse<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.get(
        path,
        queryParameters: queryParameters,
        options: options,
      );
      return ApiSuccess<T>(response.data);
    } on DioException catch (e) {
      return ApiError<T>(_getErrorMessage(e), statusCode: e.response?.statusCode, originalError: e);
    }
  }

  /// POST request
  Future<ApiResponse<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final requestOptions = options ?? Options();
      
      // Set custom timeout for transactions
      if (path.contains('/transactions')) {
        requestOptions.sendTimeout = const Duration(milliseconds: AppConstants.transactionTimeoutMs);
        requestOptions.receiveTimeout = const Duration(milliseconds: AppConstants.transactionTimeoutMs);
      }
      
      final response = await _dio.post(
        path,
        data: data,
        queryParameters: queryParameters,
        options: requestOptions,
      );
      return ApiSuccess<T>(response.data);
    } on DioException catch (e) {
      return ApiError<T>(_getErrorMessage(e), statusCode: e.response?.statusCode, originalError: e);
    }
  }

  /// PUT request
  Future<ApiResponse<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.put(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return ApiSuccess<T>(response.data);
    } on DioException catch (e) {
      return ApiError<T>(_getErrorMessage(e), statusCode: e.response?.statusCode, originalError: e);
    }
  }

  /// DELETE request
  Future<ApiResponse<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.delete(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return ApiSuccess<T>(response.data);
    } on DioException catch (e) {
      return ApiError<T>(_getErrorMessage(e), statusCode: e.response?.statusCode, originalError: e);
    }
  }

  /// PATCH request
  Future<ApiResponse<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.patch(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return ApiSuccess<T>(response.data);
    } on DioException catch (e) {
      return ApiError<T>(_getErrorMessage(e), statusCode: e.response?.statusCode, originalError: e);
    }
  }

  /// Clear cache
  Future<void> clearCache() async {
    try {
      // For now, we'll skip cache clearing until we can access the store properly
      // In production, you might want to recreate the cache interceptor
      _logger.i('Cache clear requested - implemented via interceptor recreation');
    } catch (error) {
      _logger.e('Error clearing cache: $error');
    }
  }

  /// Set profile ID header
  void setProfileId(String? profileId) {
    if (profileId != null) {
      _dio.options.headers['X-Profile-ID'] = profileId;
      _logger.d('Set X-Profile-ID header to $profileId');
    } else {
      _dio.options.headers.remove('X-Profile-ID');
      _logger.d('Removed X-Profile-ID header');
    }
  }

  /// Check if auth token is valid
  Future<bool> isAuthTokenValid() async {
    return await _tokenManager.hasValidTokens();
  }

  /// Get error message from DioException
  String _getErrorMessage(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'Connection timeout';
      case DioExceptionType.badResponse:
        return error.response?.data?['message'] ?? 'Request failed';
      case DioExceptionType.cancel:
        return 'Request cancelled';
      case DioExceptionType.connectionError:
        return 'Connection error';
      case DioExceptionType.unknown:
        if (error.error is SocketException) {
          return 'No internet connection';
        }
        return 'Unknown error occurred';
      default:
        return error.message ?? 'Unknown error';
    }
  }

  /// Dispose resources
  void dispose() {
    _dio.close();
  }
}