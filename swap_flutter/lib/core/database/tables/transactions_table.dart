import 'package:drift/drift.dart';
import 'sync_status.dart';

/// Transactions Table
/// 
/// Local database table for storing transaction data with sync capabilities.
/// Supports offline-first architecture with background synchronization.
@DataClassName('TransactionEntity')
class TransactionsTable extends Table {
  /// Primary key - server-generated ID once synced
  TextColumn get id => text()();
  
  /// User/entity who owns this transaction
  TextColumn get userId => text()();
  
  /// Transaction amount in the base currency
  RealColumn get amount => real()();
  
  /// Transaction description/memo
  TextColumn get description => text()(); 
  
  /// Transaction category (food, transport, etc.)
  TextColumn get category => text().nullable()();
  
  /// Currency code (USD, EUR, HTG, etc.)
  TextColumn get currencyCode => text().withDefault(const Constant('USD'))();
  
  /// Transaction type (debit, credit, transfer, etc.)
  TextColumn get type => text()();
  
  /// Transaction status (pending, completed, failed, etc.)  
  TextColumn get status => text().withDefault(const Constant('pending'))();
  
  /// Recipient entity ID (for transfers)
  TextColumn get recipientId => text().nullable()();
  
  /// Sender entity ID (for transfers)
  TextColumn get senderId => text().nullable()();
  
  /// Associated interaction ID (for social payments)
  TextColumn get interactionId => text().nullable()();
  
  /// Account ID this transaction belongs to
  TextColumn get accountId => text()();
  
  /// Wallet ID this transaction affects
  TextColumn get walletId => text().nullable()();
  
  /// Transaction timestamp (milliseconds since epoch)
  IntColumn get timestamp => integer()();
  
  /// When this record was created locally
  IntColumn get createdAt => integer().withDefault(const Constant(0))();
  
  /// When this record was last updated locally
  IntColumn get updatedAt => integer().withDefault(const Constant(0))();
  
  /// Sync status for offline-first architecture
  IntColumn get syncStatus => intEnum<SyncStatus>().withDefault(const Constant(1))(); // Default to pending
  
  /// Local ID for offline-created records (UUID)
  TextColumn get localId => text().nullable()();
  
  /// Server-side timestamp for conflict resolution
  IntColumn get serverTimestamp => integer().nullable()();
  
  /// Additional metadata as JSON string
  TextColumn get metadata => text().nullable()();
  
  /// External reference ID (for third-party integrations)
  TextColumn get externalId => text().nullable()();
  
  /// Transaction fees
  RealColumn get fees => real().withDefault(const Constant(0.0))();
  
  /// Exchange rate (if currency conversion involved)
  RealColumn get exchangeRate => real().nullable()();
  
  /// Transaction location (latitude,longitude)
  TextColumn get location => text().nullable()();
  
  /// Device/source that created this transaction
  TextColumn get source => text().nullable()();
  
  @override
  Set<Column> get primaryKey => {id};
  
  @override
  List<String> get customConstraints => [
    // Create indexes for performance
    'CREATE INDEX IF NOT EXISTS idx_transactions_user_timestamp ON transactions(user_id, timestamp DESC)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_sync_status ON transactions(sync_status)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_interaction ON transactions(interaction_id)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(type, status)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC)',
  ];
}