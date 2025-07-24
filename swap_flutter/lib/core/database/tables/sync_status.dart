/// Sync Status Enumeration
/// 
/// Defines the synchronization status for local-first data management.
/// Used to track which records need to be synced with the remote server.
enum SyncStatus {
  synced,    // Data is in sync with server
  pending,   // Local changes need to sync to server
  conflict,  // Conflict detected during sync
  failed,    // Sync failed, needs retry
}

/// Extension to convert SyncStatus to/from integer for database storage
extension SyncStatusExtension on SyncStatus {
  int get value {
    switch (this) {
      case SyncStatus.synced:
        return 0;
      case SyncStatus.pending:
        return 1;
      case SyncStatus.conflict:
        return 2;
      case SyncStatus.failed:
        return 3;
    }
  }

  static SyncStatus fromValue(int value) {
    switch (value) {
      case 0:
        return SyncStatus.synced;
      case 1:
        return SyncStatus.pending;
      case 2:
        return SyncStatus.conflict;
      case 3:
        return SyncStatus.failed;
      default:
        return SyncStatus.pending;
    }
  }
}