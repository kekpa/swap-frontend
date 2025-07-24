import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import 'package:logger/logger.dart';
import '../constants/app_constants.dart';

/// Token refresh result sealed class
sealed class TokenRefreshResult {
  const TokenRefreshResult();
}

class TokenRefreshSuccess extends TokenRefreshResult {
  final String accessToken;
  const TokenRefreshSuccess(this.accessToken);
}

class TokenRefreshFailure extends TokenRefreshResult {
  final String error;
  const TokenRefreshFailure(this.error);
}

/// Authentication Token Manager
/// 
/// Handles secure storage and management of authentication tokens,
/// including automatic refresh logic. Adapted from Expo's token management
/// patterns but optimized for Flutter's secure storage.
class AuthTokenManager {
  final FlutterSecureStorage _secureStorage;
  final Logger _logger;
  
  String? _accessToken;
  String? _refreshToken;
  
  static const String _accessTokenKey = StorageKeys.accessToken;
  static const String _refreshTokenKey = StorageKeys.refreshToken;
  
  AuthTokenManager({
    FlutterSecureStorage? secureStorage,
    Logger? logger,
  }) : _secureStorage = secureStorage ?? const FlutterSecureStorage(
         aOptions: AndroidOptions(
           encryptedSharedPreferences: true,
         ),
         iOptions: IOSOptions(
           accessibility: KeychainAccessibility.first_unlock_this_device,
         ),
       ),
       _logger = logger ?? Logger();

  /// Get the current access token
  Future<String?> getAccessToken() async {
    try {
      _accessToken ??= await _secureStorage.read(key: _accessTokenKey);
      return _accessToken;
    } catch (error) {
      _logger.e('Error reading access token: $error');
      return null;
    }
  }

  /// Get the current refresh token
  Future<String?> getRefreshToken() async {
    try {
      _refreshToken ??= await _secureStorage.read(key: _refreshTokenKey);
      return _refreshToken;
    } catch (error) {
      _logger.e('Error reading refresh token: $error');
      return null;
    }
  }

  /// Set both access and refresh tokens securely
  Future<void> setTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    try {
      _accessToken = accessToken;
      _refreshToken = refreshToken;

      await Future.wait([
        _secureStorage.write(key: _accessTokenKey, value: accessToken),
        _secureStorage.write(key: _refreshTokenKey, value: refreshToken),
      ]);
      
      _logger.d('Tokens stored successfully');
    } catch (error) {
      _logger.e('Error storing tokens: $error');
      throw Exception('Failed to store authentication tokens');
    }
  }

  /// Clear all stored tokens
  Future<void> clearTokens() async {
    try {
      _accessToken = null;
      _refreshToken = null;

      await Future.wait([
        _secureStorage.delete(key: _accessTokenKey),
        _secureStorage.delete(key: _refreshTokenKey),
      ]);
      
      _logger.d('Tokens cleared successfully');
    } catch (error) {
      _logger.e('Error clearing tokens: $error');
    }
  }

  /// Check if the current access token is expired
  /// 
  /// Returns true if:
  /// - Token doesn't exist
  /// - Token is malformed
  /// - Token is expired or expires within the threshold (5 seconds)
  bool isTokenExpired(String? token) {
    if (token == null || token.isEmpty) {
      return true;
    }

    try {
      // Check if token is expired or will expire in the next 5 seconds
      return JwtDecoder.isExpired(token) || 
             _isTokenAboutToExpire(token, thresholdSeconds: 5);
    } catch (error) {
      _logger.e('Error checking token expiration: $error');
      return true; // Treat malformed tokens as expired
    }
  }

  /// Check if token is about to expire within the given threshold
  bool _isTokenAboutToExpire(String token, {int thresholdSeconds = 5}) {
    try {
      final expirationDate = JwtDecoder.getExpirationDate(token);
      final now = DateTime.now();
      final timeUntilExpiry = expirationDate.difference(now);
      
      return timeUntilExpiry.inSeconds <= thresholdSeconds;
    } catch (error) {
      _logger.e('Error checking token expiration threshold: $error');
      return true;
    }
  }

  /// Get the user ID from the access token
  String? getUserIdFromToken() {
    try {
      final token = _accessToken;
      if (token == null) return null;
      
      final decodedToken = JwtDecoder.decode(token);
      return decodedToken['sub'] ?? decodedToken['userId'] ?? decodedToken['id'];
    } catch (error) {
      _logger.e('Error extracting user ID from token: $error');
      return null;
    }
  }

  /// Get token expiration time
  DateTime? getTokenExpirationTime(String? token) {
    if (token == null) return null;
    
    try {
      return JwtDecoder.getExpirationDate(token);
    } catch (error) {
      _logger.e('Error getting token expiration time: $error');
      return null;
    }
  }

  /// Check if we have valid tokens stored
  Future<bool> hasValidTokens() async {
    try {
      final accessToken = await getAccessToken();
      final refreshToken = await getRefreshToken();
      
      return accessToken != null && 
             refreshToken != null && 
             !isTokenExpired(accessToken);
    } catch (error) {
      _logger.e('Error checking token validity: $error');
      return false;
    }
  }

  /// Get token information for debugging (without exposing actual tokens)
  Future<Map<String, dynamic>> getTokenInfo() async {
    try {
      final accessToken = await getAccessToken();
      final refreshToken = await getRefreshToken();
      
      return {
        'hasAccessToken': accessToken != null,
        'hasRefreshToken': refreshToken != null,
        'isAccessTokenExpired': isTokenExpired(accessToken),
        'accessTokenExpiry': accessToken != null 
            ? getTokenExpirationTime(accessToken)?.toIso8601String()
            : null,
        'userId': getUserIdFromToken(),
      };
    } catch (error) {
      _logger.e('Error getting token info: $error');
      return {'error': error.toString()};
    }
  }

  /// Validate token format and structure
  bool isValidTokenFormat(String? token) {
    if (token == null || token.isEmpty) return false;
    
    try {
      // JWT tokens have 3 parts separated by dots
      final parts = token.split('.');
      if (parts.length != 3) return false;
      
      // Try to decode to validate structure
      JwtDecoder.decode(token);
      return true;
    } catch (error) {
      _logger.e('Invalid token format: $error');
      return false;
    }
  }

  /// Clear tokens and reset internal state
  Future<void> logout() async {
    await clearTokens();
    _logger.i('User logged out, tokens cleared');
  }
}