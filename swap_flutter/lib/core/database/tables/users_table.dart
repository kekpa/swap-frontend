import 'package:drift/drift.dart';
import 'sync_status.dart';

/// Users Table
/// 
/// Local database table for storing user/profile data with sync capabilities.
/// Supports offline-first user management and profile caching.
@DataClassName('UserEntity')
class UsersTable extends Table {
  /// Primary key - user entity ID
  TextColumn get id => text()();
  
  /// User's email address
  TextColumn get email => text().nullable()();
  
  /// User's phone number
  TextColumn get phoneNumber => text().nullable()();
  
  /// User's display name
  TextColumn get displayName => text().nullable()();
  
  /// User's first name
  TextColumn get firstName => text().nullable()();
  
  /// User's last name
  TextColumn get lastName => text().nullable()();
  
  /// User's username/handle
  TextColumn get username => text().nullable()();
  
  /// User's avatar/profile picture URL
  TextColumn get avatarUrl => text().nullable()();
  
  /// User's bio/description
  TextColumn get bio => text().nullable()();
  
  /// User's date of birth (ISO string)
  TextColumn get dateOfBirth => text().nullable()();
  
  /// User's country code
  TextColumn get countryCode => text().nullable()();
  
  /// User's preferred language
  TextColumn get language => text().withDefault(const Constant('en'))();
  
  /// User's timezone
  TextColumn get timezone => text().nullable()();
  
  /// User's preferred currency
  TextColumn get preferredCurrency => text().withDefault(const Constant('USD'))();
  
  /// User account status (active, suspended, pending, etc.)
  TextColumn get status => text().withDefault(const Constant('active'))();
  
  /// User account type (personal, business, etc.)
  TextColumn get accountType => text().withDefault(const Constant('personal'))();
  
  /// KYC verification status
  TextColumn get kycStatus => text().withDefault(const Constant('pending'))();
  
  /// KYC verification level (1, 2, 3, etc.)
  IntColumn get kycLevel => integer().withDefault(const Constant(0))();
  
  /// Whether user has enabled biometric authentication
  BoolColumn get biometricEnabled => boolean().withDefault(const Constant(false))();
  
  /// Whether user has enabled 2FA
  BoolColumn get twoFactorEnabled => boolean().withDefault(const Constant(false))();
  
  /// User's notification preferences as JSON
  TextColumn get notificationPreferences => text().nullable()();
  
  /// User's privacy settings as JSON
  TextColumn get privacySettings => text().nullable()();
  
  /// When this user account was created (milliseconds since epoch)
  IntColumn get createdAt => integer().withDefault(const Constant(0))();
  
  /// When this user was last updated
  IntColumn get updatedAt => integer().withDefault(const Constant(0))();
  
  /// When this user was last seen online
  IntColumn get lastSeenAt => integer().nullable()();
  
  /// Whether this user is currently online
  BoolColumn get isOnline => boolean().withDefault(const Constant(false))();
  
  /// Sync status for offline-first architecture
  IntColumn get syncStatus => intEnum<SyncStatus>().withDefault(const Constant(0))(); // Default to synced for cached profiles
  
  /// Server-side timestamp for conflict resolution
  IntColumn get serverTimestamp => integer().nullable()();
  
  /// User's address information as JSON
  TextColumn get address => text().nullable()();
  
  /// User's social media links as JSON
  TextColumn get socialLinks => text().nullable()();
  
  /// User's emergency contact information as JSON
  TextColumn get emergencyContact => text().nullable()();
  
  /// User's employment information as JSON
  TextColumn get employmentInfo => text().nullable()();
  
  /// Additional user metadata as JSON string
  TextColumn get metadata => text().nullable()();
  
  /// User's referral code
  TextColumn get referralCode => text().nullable()();
  
  /// ID of the user who referred this user
  TextColumn get referredBy => text().nullable()();
  
  /// Number of users this user has referred
  IntColumn get referralCount => integer().withDefault(const Constant(0))();
  
  /// User's trust score/rating
  RealColumn get trustScore => real().nullable()();
  
  /// Whether this user is verified (blue checkmark)
  BoolColumn get isVerified => boolean().withDefault(const Constant(false))();
  
  /// Whether this user is a business account
  BoolColumn get isBusiness => boolean().withDefault(const Constant(false))();
  
  /// Business information as JSON (if business account)
  TextColumn get businessInfo => text().nullable()();
  
  @override
  Set<Column> get primaryKey => {id};
  
  @override
  List<String> get customConstraints => [
    // Create indexes for performance
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number)',
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
    'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
    'CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status)',
    'CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type)',
    'CREATE INDEX IF NOT EXISTS idx_users_sync_status ON users(sync_status)',
    'CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)',
    'CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by)',
    'CREATE INDEX IF NOT EXISTS idx_users_country ON users(country_code)',
    'CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_verified)',
    'CREATE INDEX IF NOT EXISTS idx_users_business ON users(is_business)',
  ];
}