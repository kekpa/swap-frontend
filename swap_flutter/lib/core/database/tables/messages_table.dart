import 'package:drift/drift.dart';
import 'sync_status.dart';

/// Messages Table
/// 
/// Local database table for storing chat/interaction messages with sync capabilities.
/// Supports real-time messaging and offline-first architecture.
@DataClassName('MessageEntity')
class MessagesTable extends Table {
  /// Primary key - server-generated ID once synced
  TextColumn get id => text()();
  
  /// Interaction ID this message belongs to
  TextColumn get interactionId => text()();
  
  /// Entity ID of the message sender
  TextColumn get senderEntityId => text()();
  
  /// Message content/text
  TextColumn get content => text()();
  
  /// Message type (text, image, transaction, system, etc.)
  TextColumn get type => text().withDefault(const Constant('text'))();
  
  /// Message status (sending, sent, delivered, read, failed)
  TextColumn get status => text().withDefault(const Constant('sending'))();
  
  /// Message timestamp (milliseconds since epoch)
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
  
  /// Whether this is an optimistic message (not yet confirmed by server)
  BoolColumn get isOptimistic => boolean().withDefault(const Constant(false))();
  
  /// Reply to message ID (for threaded conversations)
  TextColumn get replyToMessageId => text().nullable()();
  
  /// Associated transaction ID (for payment messages)
  TextColumn get transactionId => text().nullable()();
  
  /// Message metadata as JSON string (attachments, formatting, etc.)
  TextColumn get metadata => text().nullable()();
  
  /// Edited timestamp (if message was edited)
  IntColumn get editedAt => integer().nullable()();
  
  /// Whether this message was edited
  BoolColumn get isEdited => boolean().withDefault(const Constant(false))();
  
  /// Whether this message was deleted
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
  
  /// Deleted timestamp
  IntColumn get deletedAt => integer().nullable()();
  
  /// Message delivery timestamp
  IntColumn get deliveredAt => integer().nullable()();
  
  /// Message read timestamp
  IntColumn get readAt => integer().nullable()();
  
  /// Message reactions as JSON string
  TextColumn get reactions => text().nullable()();
  
  /// Message priority (normal, high, urgent)
  TextColumn get priority => text().withDefault(const Constant('normal'))();
  
  /// Encryption key ID (for encrypted messages)
  TextColumn get encryptionKeyId => text().nullable()();
  
  /// Message sequence number within interaction
  IntColumn get sequenceNumber => integer().nullable()();
  
  @override
  Set<Column> get primaryKey => {id};
  
  @override
  List<String> get customConstraints => [
    // Create indexes for performance
    'CREATE INDEX IF NOT EXISTS idx_messages_interaction_timestamp ON messages(interaction_id, timestamp DESC)',
    'CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_entity_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_sync_status ON messages(sync_status)',
    'CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)',
    'CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type)',
    'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_messages_optimistic ON messages(is_optimistic)',
    'CREATE INDEX IF NOT EXISTS idx_messages_transaction ON messages(transaction_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_sequence ON messages(interaction_id, sequence_number)',
  ];
}