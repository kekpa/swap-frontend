import 'package:drift/drift.dart';
import 'sync_status.dart';

/// Interactions Table
/// 
/// Local database table for storing chat/interaction metadata with sync capabilities.
/// Represents conversations between entities (users, businesses, etc.).
@DataClassName('InteractionEntity')
class InteractionsTable extends Table {
  /// Primary key - server-generated ID once synced
  TextColumn get id => text()();
  
  /// Type of interaction (direct, group, business, etc.)
  TextColumn get type => text().withDefault(const Constant('direct'))();
  
  /// Interaction status (active, archived, blocked, etc.)
  TextColumn get status => text().withDefault(const Constant('active'))();
  
  /// Interaction title/name (for group chats)
  TextColumn get title => text().nullable()();
  
  /// Interaction description
  TextColumn get description => text().nullable()();
  
  /// Comma-separated list of participant entity IDs
  TextColumn get participantIds => text()();
  
  /// ID of the interaction creator
  TextColumn get createdBy => text()();
  
  /// When this interaction was created (milliseconds since epoch)
  IntColumn get createdAt => integer().withDefault(const Constant(0))();
  
  /// When this interaction was last updated
  IntColumn get updatedAt => integer().withDefault(const Constant(0))();
  
  /// Timestamp of the last message in this interaction
  IntColumn get lastMessageAt => integer().nullable()();
  
  /// ID of the last message in this interaction
  TextColumn get lastMessageId => text().nullable()();
  
  /// Content preview of the last message
  TextColumn get lastMessagePreview => text().nullable()();
  
  /// Entity ID of the last message sender
  TextColumn get lastMessageSenderId => text().nullable()();
  
  /// Sync status for offline-first architecture
  IntColumn get syncStatus => intEnum<SyncStatus>().withDefault(const Constant(1))(); // Default to pending
  
  /// Local ID for offline-created records (UUID)
  TextColumn get localId => text().nullable()();
  
  /// Server-side timestamp for conflict resolution
  IntColumn get serverTimestamp => integer().nullable()();
  
  /// Whether this is an optimistic interaction (not yet confirmed by server)
  BoolColumn get isOptimistic => boolean().withDefault(const Constant(false))();
  
  /// Unread message count for current user
  IntColumn get unreadCount => integer().withDefault(const Constant(0))();
  
  /// Whether this interaction is pinned
  BoolColumn get isPinned => boolean().withDefault(const Constant(false))();
  
  /// Whether this interaction is muted
  BoolColumn get isMuted => boolean().withDefault(const Constant(false))();
  
  /// Whether this interaction is archived
  BoolColumn get isArchived => boolean().withDefault(const Constant(false))();
  
  /// Interaction metadata as JSON string (settings, permissions, etc.)
  TextColumn get metadata => text().nullable()();
  
  /// Interaction avatar/image URL
  TextColumn get avatarUrl => text().nullable()();
  
  /// Interaction color theme
  TextColumn get colorTheme => text().nullable()();
  
  /// Custom notification settings as JSON
  TextColumn get notificationSettings => text().nullable()();
  
  /// Tags associated with this interaction
  TextColumn get tags => text().nullable()();
  
  /// Last time this interaction was accessed by current user
  IntColumn get lastAccessedAt => integer().nullable()();
  
  /// Encryption settings for this interaction
  TextColumn get encryptionSettings => text().nullable()();
  
  /// Whether this interaction allows new members
  BoolColumn get allowNewMembers => boolean().withDefault(const Constant(true))();
  
  /// Maximum number of participants allowed
  IntColumn get maxParticipants => integer().nullable()();
  
  @override
  Set<Column> get primaryKey => {id};
  
  @override
  List<String> get customConstraints => [
    // Create indexes for performance
    'CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type)',
    'CREATE INDEX IF NOT EXISTS idx_interactions_status ON interactions(status)',
    'CREATE INDEX IF NOT EXISTS idx_interactions_created_by ON interactions(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_interactions_last_message_at ON interactions(last_message_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_interactions_sync_status ON interactions(sync_status)',
    'CREATE INDEX IF NOT EXISTS idx_interactions_participants ON interactions(participant_ids)',
    'CREATE INDEX IF NOT EXISTS idx_interactions_pinned ON interactions(is_pinned)',
    'CREATE INDEX IF NOT EXISTS idx_interactions_archived ON interactions(is_archived)',
    'CREATE INDEX IF NOT EXISTS idx_interactions_unread ON interactions(unread_count)',
    'CREATE INDEX IF NOT EXISTS idx_interactions_last_accessed ON interactions(last_accessed_at DESC)',
  ];
}