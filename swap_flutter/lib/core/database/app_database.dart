import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:sqlite3/sqlite3.dart';
import 'package:sqlite3_flutter_libs/sqlite3_flutter_libs.dart';

import '../constants/app_constants.dart';
import 'tables/transactions_table.dart';
import 'tables/balances_table.dart';
import 'tables/messages_table.dart';
import 'tables/interactions_table.dart';
import 'tables/users_table.dart';
import 'tables/sync_status.dart';

part 'app_database.g.dart';

/// Main Application Database
/// 
/// Local-first database using Drift ORM for offline-first architecture.
/// Supports background sync, conflict resolution, and optimistic updates.
/// Adapts the local database patterns from Expo implementation.
@DriftDatabase(tables: [
  TransactionsTable,
  BalancesTable,
  MessagesTable,
  InteractionsTable,
  UsersTable,
])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (Migrator m) async {
        await m.createAll();
        
        // Create additional indexes for performance
        await _createPerformanceIndexes();
        
        // Initialize sync metadata table
        await _initializeSyncMetadata();
      },
      onUpgrade: (Migrator m, int from, int to) async {
        // Handle database migrations
        if (from < 2) {
          // Future migration logic
          // await m.addColumn(transactions, transactions.newColumn);
        }
      },
      beforeOpen: (OpeningDetails details) async {
        // Enable foreign keys
        await customStatement('PRAGMA foreign_keys = ON');
        
        // Enable WAL mode for better performance
        await customStatement('PRAGMA journal_mode = WAL');
        
        // Optimize SQLite settings
        await customStatement('PRAGMA synchronous = NORMAL');
        await customStatement('PRAGMA cache_size = 10000');
        await customStatement('PRAGMA temp_store = MEMORY');
      },
    );
  }

  /// Create additional performance indexes
  Future<void> _createPerformanceIndexes() async {
    // Cross-table indexes for complex queries
    await customStatement('''
      CREATE INDEX IF NOT EXISTS idx_messages_interaction_sender 
      ON messages(interaction_id, sender_entity_id);
    ''');
    
    await customStatement('''
      CREATE INDEX IF NOT EXISTS idx_transactions_user_account 
      ON transactions(user_id, account_id, timestamp DESC);
    ''');
    
    await customStatement('''
      CREATE INDEX IF NOT EXISTS idx_balances_user_currency 
      ON balances(user_id, currency_code);
    ''');

    // Compound indexes for sync operations
    await customStatement('''
      CREATE INDEX IF NOT EXISTS idx_sync_pending_transactions 
      ON transactions(sync_status, updated_at DESC) 
      WHERE sync_status = 1;
    ''');
    
    await customStatement('''
      CREATE INDEX IF NOT EXISTS idx_sync_pending_messages 
      ON messages(sync_status, updated_at DESC) 
      WHERE sync_status = 1;
    ''');
  }

  /// Initialize sync metadata table for tracking sync state
  Future<void> _initializeSyncMetadata() async {
    await customStatement('''
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );
    ''');
    
    // Initialize sync timestamps
    final now = DateTime.now().millisecondsSinceEpoch;
    await customStatement('''
      INSERT OR IGNORE INTO sync_metadata (key, value) VALUES 
      ('last_transaction_sync', '$now'),
      ('last_message_sync', '$now'),
      ('last_balance_sync', '$now'),
      ('last_user_sync', '$now'),
      ('last_interaction_sync', '$now');
    ''');
  }

  /// Get pending sync records for a specific table
  Future<List<Map<String, dynamic>>> getPendingSyncRecords(String table) async {
    final result = await customSelect(
      'SELECT * FROM $table WHERE sync_status = ? ORDER BY updated_at ASC',
      variables: [Variable(SyncStatus.pending.value)],
    ).get();
    
    return result.map((row) => row.data).toList();
  }

  /// Update sync status for a record
  Future<void> updateSyncStatus(String table, String id, SyncStatus status) async {
    await customStatement(
      'UPDATE $table SET sync_status = ?, updated_at = ? WHERE id = ?',
      [status.value, DateTime.now().millisecondsSinceEpoch, id],
    );
  }

  /// Mark multiple records as synced
  Future<void> markRecordsAsSynced(String table, List<String> ids) async {
    if (ids.isEmpty) return;
    
    final placeholders = List.filled(ids.length, '?').join(',');
    final now = DateTime.now().millisecondsSinceEpoch;
    
    await customStatement(
      'UPDATE $table SET sync_status = ?, updated_at = ? WHERE id IN ($placeholders)',
      [SyncStatus.synced.value, now, ...ids],
    );
  }

  /// Get last sync timestamp for a data type
  Future<DateTime?> getLastSyncTimestamp(String syncKey) async {
    final result = await customSelect(
      'SELECT value FROM sync_metadata WHERE key = ?',
      variables: [Variable(syncKey)],
    ).getSingleOrNull();
    
    if (result != null) {
      final timestamp = int.tryParse(result.data['value']);
      if (timestamp != null) {
        return DateTime.fromMillisecondsSinceEpoch(timestamp);
      }
    }
    
    return null;
  }

  /// Update last sync timestamp
  Future<void> updateLastSyncTimestamp(String syncKey) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await customStatement(
      'INSERT OR REPLACE INTO sync_metadata (key, value, updated_at) VALUES (?, ?, ?)',
      [syncKey, now.toString(), now],
    );
  }

  /// Clean up old records to manage database size
  Future<void> cleanupOldRecords() async {
    final thirtyDaysAgo = DateTime.now()
        .subtract(const Duration(days: 30))
        .millisecondsSinceEpoch;
    
    // Clean up old synced messages (keep last 1000 per interaction)
    await customStatement('''
      DELETE FROM messages 
      WHERE sync_status = ? 
      AND created_at < ? 
      AND id NOT IN (
        SELECT id FROM messages 
        WHERE interaction_id = messages.interaction_id 
        ORDER BY created_at DESC 
        LIMIT 1000
      )
    ''', [SyncStatus.synced.value, thirtyDaysAgo]);
    
    // Clean up failed sync records older than 7 days
    final sevenDaysAgo = DateTime.now()
        .subtract(const Duration(days: 7))
        .millisecondsSinceEpoch;
    
    await customStatement(
      'DELETE FROM messages WHERE sync_status = ? AND updated_at < ?',
      [SyncStatus.failed.value, sevenDaysAgo],
    );
    
    await customStatement(
      'DELETE FROM transactions WHERE sync_status = ? AND updated_at < ?',
      [SyncStatus.failed.value, sevenDaysAgo],
    );
  }

  /// Get database statistics for monitoring
  Future<Map<String, int>> getDatabaseStats() async {
    final stats = <String, int>{};
    
    // Count records in each table
    final tables = ['transactions', 'messages', 'interactions', 'balances', 'users'];
    
    for (final table in tables) {
      final result = await customSelect('SELECT COUNT(*) as count FROM $table').getSingle();
      stats[table] = result.data['count'] as int;
      
      // Count pending sync records
      final pendingResult = await customSelect(
        'SELECT COUNT(*) as count FROM $table WHERE sync_status = ?',
        variables: [Variable(SyncStatus.pending.value)],
      ).getSingle();
      stats['${table}_pending'] = pendingResult.data['count'] as int;
    }
    
    return stats;
  }

  /// Vacuum database to reclaim space
  Future<void> vacuumDatabase() async {
    await customStatement('VACUUM');
  }

  /// Close database connection
  @override
  Future<void> close() async {
    await super.close();
  }
}

/// Database connection factory
LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    // Ensure sqlite3 is properly initialized on mobile platforms
    if (Platform.isAndroid || Platform.isIOS) {
      await applyWorkaroundToOpenSqlite3OnOldAndroidVersions();
      sqlite3.tempDirectory = (await getTemporaryDirectory()).path;
    }

    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, AppConstants.databaseName));
    
    return NativeDatabase.createInBackground(
      file,
      logStatements: AppConstants.enableDebugLogging,
    );
  });
}