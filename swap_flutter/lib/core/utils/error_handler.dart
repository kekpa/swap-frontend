import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

/// Global Error Handler
/// 
/// Centralized error handling system for consistent error processing
/// and user-friendly error messages throughout the app.
class ErrorHandler {
  static const _networkErrorMessages = {
    'connection_timeout': 'Connection timeout. Please check your internet connection.',
    'send_timeout': 'Request timeout. Please try again.',
    'receive_timeout': 'Server response timeout. Please try again.',
    'no_internet': 'No internet connection. Please check your connection.',
    'server_error': 'Server error occurred. Please try again later.',
    'unauthorized': 'Session expired. Please log in again.',
    'forbidden': 'Access denied. You don\'t have permission to perform this action.',
    'not_found': 'The requested resource was not found.',
    'too_many_requests': 'Too many requests. Please wait a moment and try again.',
    'unknown': 'An unexpected error occurred. Please try again.',
  };

  static const _validationErrorMessages = {
    'email_invalid': 'Please enter a valid email address.',
    'password_weak': 'Password must be at least 8 characters long.',
    'phone_invalid': 'Please enter a valid phone number.',
    'amount_invalid': 'Please enter a valid amount.',
    'field_required': 'This field is required.',
  };

  /// Handle DioException and return user-friendly error message
  static AppError handleDioError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return AppError(
          type: ErrorType.network,
          code: error.type.name,
          message: _networkErrorMessages[error.type.name] ?? _networkErrorMessages['unknown']!,
          originalError: error,
        );

      case DioExceptionType.badResponse:
        return _handleHttpError(error);

      case DioExceptionType.cancel:
        return AppError(
          type: ErrorType.cancelled,
          code: 'request_cancelled',
          message: 'Request was cancelled',
          originalError: error,
        );

      case DioExceptionType.connectionError:
        return AppError(
          type: ErrorType.network,
          code: 'no_internet',
          message: _networkErrorMessages['no_internet']!,
          originalError: error,
        );

      case DioExceptionType.badCertificate:
        return AppError(
          type: ErrorType.security,
          code: 'bad_certificate',
          message: 'Security certificate error. Please check your connection.',
          originalError: error,
        );

      case DioExceptionType.unknown:
      default:
        return AppError(
          type: ErrorType.unknown,
          code: 'unknown',
          message: _networkErrorMessages['unknown']!,
          originalError: error,
        );
    }
  }

  /// Handle HTTP status code errors
  static AppError _handleHttpError(DioException error) {
    final statusCode = error.response?.statusCode;
    final responseData = error.response?.data;

    switch (statusCode) {
      case 400:
        return AppError(
          type: ErrorType.validation,
          code: 'bad_request',
          message: _extractErrorMessage(responseData) ?? 'Invalid request. Please check your input.',
          originalError: error,
          details: responseData,
        );

      case 401:
        return AppError(
          type: ErrorType.authentication,
          code: 'unauthorized',
          message: _networkErrorMessages['unauthorized']!,
          originalError: error,
        );

      case 403:
        return AppError(
          type: ErrorType.authorization,
          code: 'forbidden',
          message: _networkErrorMessages['forbidden']!,
          originalError: error,
        );

      case 404:
        return AppError(
          type: ErrorType.notFound,
          code: 'not_found',
          message: _networkErrorMessages['not_found']!,
          originalError: error,
        );

      case 422:
        return AppError(
          type: ErrorType.validation,
          code: 'validation_error',
          message: _extractErrorMessage(responseData) ?? 'Validation failed. Please check your input.',
          originalError: error,
          details: responseData,
        );

      case 429:
        return AppError(
          type: ErrorType.rateLimit,
          code: 'too_many_requests',
          message: _networkErrorMessages['too_many_requests']!,
          originalError: error,
        );

      case 500:
      case 502:
      case 503:
      case 504:
        return AppError(
          type: ErrorType.server,
          code: 'server_error',
          message: _networkErrorMessages['server_error']!,
          originalError: error,
        );

      default:
        return AppError(
          type: ErrorType.unknown,
          code: 'http_error',
          message: _extractErrorMessage(responseData) ?? _networkErrorMessages['unknown']!,
          originalError: error,
        );
    }
  }

  /// Extract error message from response data
  static String? _extractErrorMessage(dynamic responseData) {
    if (responseData == null) return null;
    
    if (responseData is Map<String, dynamic>) {
      // Common API error message fields
      final messageFields = ['message', 'error', 'detail', 'msg'];
      
      for (final field in messageFields) {
        if (responseData.containsKey(field) && responseData[field] is String) {
          return responseData[field];
        }
      }

      // Handle validation errors
      if (responseData.containsKey('errors') && responseData['errors'] is Map) {
        final errors = responseData['errors'] as Map<String, dynamic>;
        final firstError = errors.values.first;
        if (firstError is List && firstError.isNotEmpty) {
          return firstError.first.toString();
        }
      }
    }

    return null;
  }

  /// Handle generic exceptions
  static AppError handleGenericError(Object error, StackTrace? stackTrace) {
    if (error is DioException) {
      return handleDioError(error);
    }

    if (error is AppError) {
      return error;
    }

    return AppError(
      type: ErrorType.unknown,
      code: 'generic_error',
      message: error.toString(),
      originalError: error,
      stackTrace: stackTrace,
    );
  }

  /// Get validation error message for a specific field
  static String getValidationErrorMessage(String errorCode) {
    return _validationErrorMessages[errorCode] ?? 
           _validationErrorMessages['field_required']!;
  }

  /// Log error with appropriate level
  static void logError(AppError error, Logger logger) {
    switch (error.type) {
      case ErrorType.network:
      case ErrorType.server:
        logger.w('${error.type.name.toUpperCase()}: ${error.message}', error: error.originalError);
        break;
      
      case ErrorType.authentication:
      case ErrorType.authorization:
        logger.i('${error.type.name.toUpperCase()}: ${error.message}');
        break;
      
      case ErrorType.validation:
        logger.d('${error.type.name.toUpperCase()}: ${error.message}');
        break;
      
      case ErrorType.security:
      case ErrorType.unknown:
        logger.e('${error.type.name.toUpperCase()}: ${error.message}', 
                error: error.originalError, 
                stackTrace: error.stackTrace);
        break;
      
      default:
        logger.w('${error.type.name.toUpperCase()}: ${error.message}', error: error.originalError);
    }
  }
}

/// Application Error Class
class AppError implements Exception {
  final ErrorType type;
  final String code;
  final String message;
  final Object? originalError;
  final StackTrace? stackTrace;
  final Map<String, dynamic>? details;

  const AppError({
    required this.type,
    required this.code,
    required this.message,
    this.originalError,
    this.stackTrace,
    this.details,
  });

  @override
  String toString() {
    return 'AppError(type: $type, code: $code, message: $message)';
  }

  /// Create a copy with updated fields
  AppError copyWith({
    ErrorType? type,
    String? code,
    String? message,
    Object? originalError,
    StackTrace? stackTrace,
    Map<String, dynamic>? details,
  }) {
    return AppError(
      type: type ?? this.type,
      code: code ?? this.code,
      message: message ?? this.message,
      originalError: originalError ?? this.originalError,
      stackTrace: stackTrace ?? this.stackTrace,
      details: details ?? this.details,
    );
  }
}

/// Error Types Enumeration
enum ErrorType {
  network,
  server,
  authentication,
  authorization,
  validation,
  notFound,
  rateLimit,
  security,
  cancelled,
  unknown,
}

/// Error Result for API responses
sealed class Result<T> {
  const Result();
}

class Success<T> extends Result<T> {
  final T data;
  
  const Success(this.data);
}

class Failure<T> extends Result<T> {
  final AppError error;
  
  const Failure(this.error);
}