import 'package:drift/drift.dart';
import 'sync_status.dart';

/// Balances Table
/// 
/// Local database table for storing account/wallet balance data with sync capabilities.
/// Supports real-time balance updates and offline-first architecture.
@DataClassName('BalanceEntity')
class BalancesTable extends Table {
  /// Composite primary key: userId + accountId + currencyCode
  TextColumn get userId => text()();
  
  /// Account ID this balance belongs to
  TextColumn get accountId => text()();
  
  /// Currency code (USD, EUR, HTG, etc.)
  TextColumn get currencyCode => text()();
  
  /// Current balance amount
  RealColumn get amount => real().withDefault(const Constant(0.0))();
  
  /// Available balance (amount minus holds/pending)
  RealColumn get availableAmount => real().withDefault(const Constant(0.0))();
  
  /// Pending balance (incoming transactions not yet cleared)
  RealColumn get pendingAmount => real().withDefault(const Constant(0.0))();
  
  /// Balance holds (reserved amounts)
  RealColumn get holdAmount => real().withDefault(const Constant(0.0))();
  
  /// When this balance was last updated (milliseconds since epoch)
  IntColumn get lastUpdated => integer().withDefault(const Constant(0))();
  
  /// When this record was created locally
  IntColumn get createdAt => integer().withDefault(const Constant(0))();
  
  /// When this record was last updated locally
  IntColumn get updatedAt => integer().withDefault(const Constant(0))();
  
  /// Sync status for offline-first architecture
  IntColumn get syncStatus => intEnum<SyncStatus>().withDefault(const Constant(0))(); // Default to synced
  
  /// Server-side timestamp for conflict resolution
  IntColumn get serverTimestamp => integer().nullable()();
  
  /// Wallet ID if this balance is wallet-specific
  TextColumn get walletId => text().nullable()();
  
  /// Balance type (checking, savings, credit, etc.)
  TextColumn get balanceType => text().withDefault(const Constant('checking'))();
  
  /// Whether this balance is the primary balance for the account
  BoolColumn get isPrimary => boolean().withDefault(const Constant(false))();
  
  /// Additional metadata as JSON string
  TextColumn get metadata => text().nullable()();
  
  /// Interest rate (if applicable)
  RealColumn get interestRate => real().nullable()();
  
  /// Credit limit (if applicable)
  RealColumn get creditLimit => real().nullable()();
  
  /// Minimum balance requirement
  RealColumn get minimumBalance => real().withDefault(const Constant(0.0))();
  
  @override
  Set<Column> get primaryKey => {userId, accountId, currencyCode};
  
  @override
  List<String> get customConstraints => [
    // Create indexes for performance
    'CREATE INDEX IF NOT EXISTS idx_balances_user ON balances(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_balances_account ON balances(account_id)',
    'CREATE INDEX IF NOT EXISTS idx_balances_currency ON balances(currency_code)',
    'CREATE INDEX IF NOT EXISTS idx_balances_sync_status ON balances(sync_status)',
    'CREATE INDEX IF NOT EXISTS idx_balances_last_updated ON balances(last_updated DESC)',
    'CREATE INDEX IF NOT EXISTS idx_balances_wallet ON balances(wallet_id)',
    'CREATE INDEX IF NOT EXISTS idx_balances_primary ON balances(is_primary)',
  ];
}