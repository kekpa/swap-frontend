/// API Paths Module
/// 
/// This module defines all API endpoints used in the application.
/// Adapted from Expo apiPaths.ts to maintain the same structure and organization.
/// 
/// - DO NOT include 'api/' or '/api/' at the beginning of paths
/// - DO NOT include 'v1/' or '/v1/' at the beginning of paths  
/// - The apiClient already adds the base URL with '/api/v1/' automatically
/// - All paths in this file should start directly with the resource name
/// 
/// CORRECT:   '/auth/login'
/// INCORRECT: '/api/auth/login' or '/api/v1/auth/login'

/// Authentication endpoints
class AuthPaths {
  static const String login = '/auth/login';
  static const String pinLogin = '/auth/pin-login';
  static const String businessLogin = '/auth/business/login';
  static const String businessRegister = '/auth/business/register';
  static const String logout = '/auth/logout';
  static const String refresh = '/auth/refresh';
  static const String profile = '/auth/profile';
  static const String me = '/auth/me';
  static const String verify = '/auth/verify-token';
  static const String register = '/auth/register';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';
  static const String phoneSignin = '/auth/phone-signin';
  static const String verifyPhone = '/auth/verify-phone';
  static const String registerPhone = '/auth/register-phone';
  static const String checkPhone = '/auth/check-phone';
  static const String completeProfile = '/auth/complete-profile';
  static const String storePasscode = '/auth/store-passcode';
  static const String verifyEmail = '/auth/verify-email';
  static const String resendEmailCode = '/auth/resend-email-code';
  static const String verifyResetCode = '/auth/verify-reset-code';
}

/// User management endpoints
class UserPaths {
  static String profile(String id) => '/profiles/$id';
  static const String search = '/users/search';
  static const String discover = '/users/discover';
  static const String preferences = '/users/preferences';
}

/// KYC (Know Your Customer) endpoints
class KycPaths {
  static const String status = '/kyc/verification/status';
  static const String requirements = '/kyc/verification/requirements';
  static const String documents = '/kyc/verification/documents';
  static const String submitDocuments = '/kyc/verification/documents';
  static const String upload = '/kyc/upload';
  static const String verifyPhone = '/kyc/phone/verify';
  static const String verifyEmail = '/kyc/email/verify';
  static const String biometricSetup = '/kyc/biometric/setup';
  static const String requestPhoneChange = '/kyc/phone/request-change';
  static const String selfieComplete = '/kyc/selfie/complete';
  
  /// Admin endpoints for KYC
  static const String adminPending = '/kyc/admin/pending';
  static String adminDocument(String id) => '/kyc/admin/documents/$id';
  static String adminReview(String id) => '/kyc/admin/documents/$id/review';
}

/// Reference data endpoints
class ReferenceDataPaths {
  static const String countries = '/countries';
}

/// Account management endpoints
class AccountPaths {
  static const String list = '/accounts';
  static const String balances = '/accounts/balances';
  static String details(String id) => '/accounts/$id';
  static String update(String id) => '/accounts/$id';
  static String setPrimary(String id) => '/accounts/$id';
  static String balance(String id) => '/accounts/$id/balance';
  static String statement(String id) => '/accounts/$id/statement';
  static String byEntity(String? entityId) => 
    entityId != null ? '/accounts/entity/$entityId' : '/accounts';
}

/// Transaction endpoints
class TransactionPaths {
  static const String list = '/transactions';
  static String details(String id) => '/transactions/$id';
  static const String create = '/transactions';
  static String interaction(String interactionId) => '/transactions/interaction/$interactionId';
  static const String accounts = '/transactions/accounts';
  static String accountDetails(String id) => '/transactions/accounts/$id';
  static const String currencies = '/transactions/currencies';
  static String currencyDetails(String id) => '/transactions/currencies/$id';
  static const String requests = '/transactions/requests';
  static String requestDetails(String id) => '/transactions/requests/$id';
  static String totalSent(String senderId, String recipientId) => 
    '/transactions/total-sent/$senderId/$recipientId';
  static const String direct = '/transactions/direct';
}

/// Wallet endpoints (NEW - replaces account balance endpoints)
class WalletPaths {
  /// Get wallets by account (replaces account balances)
  static String byAccount(String accountId) => '/wallets/account/$accountId';
  
  /// Get wallets by entity (user/business)
  static String byEntity(String entityId) => '/wallets/entity/$entityId';
  
  /// Individual wallet operations
  static String details(String walletId) => '/wallets/$walletId';
  static String credit(String walletId) => '/wallets/$walletId/credit';
  static String debit(String walletId) => '/wallets/$walletId/debit';
  
  /// Get or create wallet for specific account and currency
  static String getOrCreate(String accountId, String currencyId) => 
    '/wallets/account/$accountId/currency/$currencyId';
}

/// Interaction endpoints
class InteractionPaths {
  static const String list = '/interactions';
  static const String recent = '/interactions/recent';
  static String details(String id) => '/interactions/$id';
  static const String create = '/interactions';
  static String direct(String profileId) => '/interactions/direct/$profileId';
  static String messages(String interactionId) => '/interactions/$interactionId/messages';
  static String timeline(String interactionId) => '/interactions/$interactionId/timeline';
}

/// Business endpoints
class BusinessPaths {
  static const String profiles = '/business/profiles';
  static String profileDetails(String id) => '/business/profiles/$id';
  static const String locations = '/business/locations';
  static String locationDetails(String id) => '/business/locations/$id';
  static const String team = '/business/team';
  static String teamMember(String id) => '/business/team/$id';
  static const String offers = '/business/offers';
  static String offerDetails(String id) => '/business/offers/$id';
}

/// Notification endpoints
class NotificationPaths {
  static const String list = '/notifications';
  static String details(String id) => '/notifications/$id';
  static const String preferences = '/notifications/preferences';
  static const String devices = '/notifications/devices';
}

/// Entity endpoints
class EntityPaths {
  static const String list = '/entities';
  static String get(String id) => '/entities/$id';
  static String byReference(String type, String id) => '/entities/reference/$type/$id';
  static String resolve(String id) => '/entities/resolve/$id';
  static const String search = '/entities/search';
  static String update(String id) => '/entities/$id';
}

/// Message endpoints
class MessagePaths {
  static const String create = '/messages/direct';
  static String listForInteraction(String interactionId) => 
    '/interactions/$interactionId/messages';
}

/// Unified Search endpoints
class SearchPaths {
  static const String all = '/search'; // GET /api/v1/search?query=...
}

/// Combined export of all API paths
/// This provides a centralized access point to all endpoint definitions
class ApiPaths {
  static final auth = AuthPaths();
  static final user = UserPaths();
  static final kyc = KycPaths();
  static final referenceData = ReferenceDataPaths();
  static final account = AccountPaths();
  static final wallet = WalletPaths(); // NEW: Wallet endpoints
  static final transaction = TransactionPaths();
  static final interaction = InteractionPaths();
  static final message = MessagePaths();
  static final business = BusinessPaths();
  static final notification = NotificationPaths();
  static final entities = EntityPaths();
  static final search = SearchPaths();
}

/// Type-safe endpoint builder for parameterized paths
class EndpointBuilder {
  /// Helper method to build parameterized URLs safely
  static String buildPath(String template, Map<String, String> params) {
    String result = template;
    params.forEach((key, value) {
      result = result.replaceAll(':$key', value);
    });
    return result;
  }
  
  /// Validate that all required parameters are provided
  static void validateParams(String template, Map<String, String> params) {
    final RegExp paramRegex = RegExp(r':(\w+)');
    final matches = paramRegex.allMatches(template);
    
    for (final match in matches) {
      final paramName = match.group(1)!;
      if (!params.containsKey(paramName)) {
        throw ArgumentError('Missing required parameter: $paramName');
      }
    }
  }
}