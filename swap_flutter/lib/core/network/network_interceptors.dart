import 'dart:async';
import 'package:dio/dio.dart';
import 'package:logger/logger.dart';
import 'auth_token_manager.dart';

/// Authentication Interceptor
/// 
/// Handles automatic token attachment and refresh logic.
/// Adapts the sophisticated token management from Expo's implementation.
class AuthenticationInterceptor extends Interceptor {
  final AuthTokenManager tokenManager;
  final Logger logger;
  final Future<TokenRefreshResult> Function() onTokenRefreshNeeded;
  
  bool _isRefreshingToken = false;
  final List<_QueuedRequest> _failedRequestsQueue = [];

  AuthenticationInterceptor({
    required this.tokenManager,
    required this.logger,
    required this.onTokenRefreshNeeded,
  });

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // Skip auth for certain requests
    if (options.headers.containsKey('skipAuth')) {
      options.headers.remove('skipAuth');
      handler.next(options);
      return;
    }

    try {
      final token = await tokenManager.getAccessToken();
      
      if (token != null) {
        // Check if this is an auth endpoint
        final isAuthPath = _isAuthPath(options.path);
        final isUiPath = _isUiPath(options.path);
        
        // Handle expired tokens
        if (tokenManager.isTokenExpired(token)) {
          if (isAuthPath || !isUiPath) {
            logger.d('Token is expired, refreshing...');
            
            // Only refresh once at a time
            if (!_isRefreshingToken) {
              _isRefreshingToken = true;
              
              try {
                final refreshResult = await onTokenRefreshNeeded();
                _isRefreshingToken = false;
                
                switch (refreshResult) {
                  case TokenRefreshSuccess(accessToken: final newToken):
                    options.headers['Authorization'] = 'Bearer $newToken';
                    _processQueue(newToken);
                    break;
                  case TokenRefreshFailure():
                    _processQueue(null, isError: true);
                    if (isUiPath && !isAuthPath) {
                      options.headers['Authorization'] = 'Bearer $token';
                      logger.d('Using existing token for UI path despite refresh failure');
                    } else {
                      handler.reject(
                        DioException(
                          requestOptions: options,
                          error: 'Token refresh failed',
                          type: DioExceptionType.cancel,
                        ),
                      );
                      return;
                    }
                }
              } catch (error) {
                _isRefreshingToken = false;
                _processQueue(null, isError: true);
                
                if (isUiPath && !isAuthPath) {
                  options.headers['Authorization'] = 'Bearer $token';
                  logger.d('Using existing token for UI path despite refresh error');
                } else {
                  handler.reject(
                    DioException(
                      requestOptions: options,
                      error: error,
                      type: DioExceptionType.cancel,
                    ),
                  );
                  return;
                }
              }
            } else {
              // If already refreshing, queue auth requests
              if (isAuthPath) {
                final completer = Completer<RequestOptions>();
                _failedRequestsQueue.add(_QueuedRequest(
                  options: options,
                  completer: completer,
                ));
                
                try {
                  final updatedOptions = await completer.future;
                  handler.next(updatedOptions);
                  return;
                } catch (error) {
                  handler.reject(
                    DioException(
                      requestOptions: options,
                      error: error,
                      type: DioExceptionType.cancel,
                    ),
                  );
                  return;
                }
              } else if (isUiPath) {
                options.headers['Authorization'] = 'Bearer $token';
                logger.d('Using existing token while refresh in progress (UI path)');
              }
            }
          } else {
            // Use existing token for UI paths
            options.headers['Authorization'] = 'Bearer $token';
          }
        } else {
          // Token is valid, use it
          options.headers['Authorization'] = 'Bearer $token';
        }
      }
    } catch (error) {
      logger.e('Error in authentication interceptor: $error');
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final originalRequest = err.requestOptions;
    
    // Handle 401 unauthorized errors
    if (err.response?.statusCode == 401 && !originalRequest.headers.containsKey('_retry')) {
      logger.w('Authentication error detected. Token may be invalid or expired.');
      
      // Mark request as retry to prevent infinite loops
      originalRequest.headers['_retry'] = 'true';
      
      // Check if we're already refreshing
      if (_isRefreshingToken) {
        final completer = Completer<RequestOptions>();
        _failedRequestsQueue.add(_QueuedRequest(
          options: originalRequest,
          completer: completer,
        ));
        
        try {
          final updatedOptions = await completer.future;
          final dio = Dio(); // Create new Dio instance to avoid interceptor loops
          dio.options = updatedOptions.copyWith() as BaseOptions;
          
          // Copy interceptors except auth interceptor to avoid loops
          for (final interceptor in (err.requestOptions.extra['dio'] as Dio?)?.interceptors ?? <Interceptor>[]) {
            if (interceptor is! AuthenticationInterceptor) {
              dio.interceptors.add(interceptor);
            }
          }
          
          final response = await dio.fetch(updatedOptions);
          handler.resolve(response);
          return;
        } catch (error) {
          handler.next(err);
          return;
        }
      }
      
      // Start token refresh
      _isRefreshingToken = true;
      
      try {
        final refreshResult = await onTokenRefreshNeeded();
        _isRefreshingToken = false;
        
        switch (refreshResult) {
          case TokenRefreshSuccess(accessToken: final newToken):
            originalRequest.headers['Authorization'] = 'Bearer $newToken';
            _processQueue(newToken);
            
            // Retry original request
            final dio = Dio();
            dio.options = originalRequest.copyWith() as BaseOptions;
            
            try {
              final response = await dio.fetch(originalRequest);
              handler.resolve(response);
              return;
            } catch (retryError) {
              handler.next(DioException(
                requestOptions: originalRequest,
                error: retryError,
                type: DioExceptionType.unknown,
              ));
              return;
            }
            
          case TokenRefreshFailure():
            _processQueue(null, isError: true);
            break;
        }
      } catch (refreshError) {
        _isRefreshingToken = false;
        _processQueue(null, isError: true);
        logger.e('Token refresh error: $refreshError');
      }
    }

    handler.next(err);
  }

  /// Process queued requests after token refresh
  void _processQueue(String? token, {bool isError = false}) {
    for (final queuedRequest in _failedRequestsQueue) {
      if (isError || token == null) {
        queuedRequest.completer.completeError('Failed to refresh token');
      } else {
        queuedRequest.options.headers['Authorization'] = 'Bearer $token';
        queuedRequest.completer.complete(queuedRequest.options);
      }
    }
    _failedRequestsQueue.clear();
  }

  /// Check if path is an auth endpoint
  bool _isAuthPath(String path) {
    return path.contains('/auth/logout') ||
           path.contains('/auth/refresh') ||
           path.contains('/auth/me');
  }

  /// Check if path is a UI/navigation endpoint
  bool _isUiPath(String path) {
    return path.contains('/interactions') ||
           path.contains('/profiles') ||
           path.contains('/accounts');
  }
}

/// Retry Interceptor with exponential backoff
class RetryInterceptor extends Interceptor {
  final Dio dio;
  final Logger logger;
  final int retries;
  final List<Duration> retryDelays;

  RetryInterceptor({
    required this.dio,
    required this.logger,
    this.retries = 3,
    this.retryDelays = const [
      Duration(seconds: 1),
      Duration(seconds: 2),
      Duration(seconds: 4),
    ],
  });

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final options = err.requestOptions;
    
    // Don't retry certain error types
    if (!_shouldRetry(err)) {
      handler.next(err);
      return;
    }

    final retryCount = options.extra['retryCount'] as int? ?? 0;
    
    if (retryCount >= retries) {
      logger.w('Max retries reached for ${options.path}');
      handler.next(err);
      return;
    }

    final delay = retryDelays.length > retryCount 
        ? retryDelays[retryCount] 
        : retryDelays.last;

    logger.d('Retrying ${options.path} in ${delay.inSeconds}s (attempt ${retryCount + 1}/$retries)');
    
    await Future.delayed(delay);
    
    // Update retry count
    options.extra['retryCount'] = retryCount + 1;
    
    try {
      final response = await dio.fetch(options);
      handler.resolve(response);
    } catch (retryError) {
      if (retryError is DioException) {
        handler.next(retryError);
      } else {
        handler.next(DioException(
          requestOptions: options,
          error: retryError,
          type: DioExceptionType.unknown,
        ));
      }
    }
  }

  bool _shouldRetry(DioException error) {
    // Don't retry client errors (4xx)
    if (error.response?.statusCode != null) {
      final statusCode = error.response!.statusCode!;
      if (statusCode >= 400 && statusCode < 500) {
        return false;
      }
    }

    // Retry network errors and server errors (5xx)
    return error.type == DioExceptionType.connectionTimeout ||
           error.type == DioExceptionType.sendTimeout ||
           error.type == DioExceptionType.receiveTimeout ||
           error.type == DioExceptionType.connectionError ||
           (error.response?.statusCode != null && error.response!.statusCode! >= 500);
  }
}

/// Queued request for token refresh scenarios
class _QueuedRequest {
  final RequestOptions options;
  final Completer<RequestOptions> completer;

  _QueuedRequest({
    required this.options,
    required this.completer,
  });
}