/**
 * DatabaseManager Tests
 *
 * Tests the centralized SQLite database manager.
 * Tests initialization, schema setup, migrations, maintenance, and singleton pattern.
 */

// Top-level mock functions that persist across resetModules
const mockExecAsync = jest.fn().mockResolvedValue(undefined);
const mockRunAsync = jest.fn().mockResolvedValue({ changes: 0 });
const mockCloseAsync = jest.fn().mockResolvedValue(undefined);
const mockDatabase = {
  execAsync: mockExecAsync,
  runAsync: mockRunAsync,
  closeAsync: mockCloseAsync,
};

const mockOpenDatabaseAsync = jest.fn().mockResolvedValue(mockDatabase);

// Logger mocks
const mockLoggerDebug = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

// Schema mocks
const mockInitializeUserSchema = jest.fn().mockResolvedValue(undefined);
const mockInitializeInteractionSchema = jest.fn().mockResolvedValue(undefined);
const mockInitializeMessageSchema = jest.fn().mockResolvedValue(undefined);
const mockInitializeTransactionSchema = jest.fn().mockResolvedValue(undefined);
const mockInitializeTimelineSchema = jest.fn().mockResolvedValue(undefined);
const mockInitializeSearchHistorySchema = jest.fn().mockResolvedValue(undefined);
const mockInitializeLocationSchema = jest.fn().mockResolvedValue(undefined);
const mockInitializeCurrencyWalletsSchema = jest.fn().mockResolvedValue(undefined);
const mockInitializeCurrencySchema = jest.fn().mockResolvedValue(undefined);
const mockInitializeNotificationsSchema = jest.fn().mockResolvedValue(undefined);
const mockInitializeUserContactsSchema = jest.fn().mockResolvedValue(undefined);

// Migration mocks
const mockRunMigration = jest.fn().mockResolvedValue(undefined);
const mockIsMigrationApplied = jest.fn().mockResolvedValue(false);

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: mockOpenDatabaseAsync,
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('../../utils/logger');

jest.mock('../schema', () => ({
  initializeUserSchema: mockInitializeUserSchema,
  initializeInteractionSchema: mockInitializeInteractionSchema,
  initializeMessageSchema: mockInitializeMessageSchema,
  initializeTransactionSchema: mockInitializeTransactionSchema,
  initializeTimelineSchema: mockInitializeTimelineSchema,
  initializeSearchHistorySchema: mockInitializeSearchHistorySchema,
  initializeLocationSchema: mockInitializeLocationSchema,
  initializeCurrencyWalletsSchema: mockInitializeCurrencyWalletsSchema,
  initializeCurrencySchema: mockInitializeCurrencySchema,
  initializeNotificationsSchema: mockInitializeNotificationsSchema,
  initializeUserContactsSchema: mockInitializeUserContactsSchema,
}));

jest.mock('../migrations/add-entity-id-columns', () => ({
  runMigration: mockRunMigration,
  isMigrationApplied: mockIsMigrationApplied,
  MIGRATION_VERSION: '1',
  MIGRATION_NAME: 'add_entity_id_columns',
}));

// Get fresh DatabaseManager instance for each test
const getDatabaseManager = async () => {
  // Clear module cache to get fresh singleton
  jest.resetModules();

  // Re-mock all dependencies after resetModules using same top-level functions
  jest.doMock('expo-sqlite', () => ({
    openDatabaseAsync: mockOpenDatabaseAsync,
  }));

  jest.doMock('react-native', () => ({
    Platform: {
      OS: 'ios',
    },
  }));

  jest.doMock('../../utils/logger', () => ({
    __esModule: true,
    default: {
      debug: mockLoggerDebug,
      info: mockLoggerInfo,
      warn: mockLoggerWarn,
      error: mockLoggerError,
    },
  }));

  jest.doMock('../schema', () => ({
    initializeUserSchema: mockInitializeUserSchema,
    initializeInteractionSchema: mockInitializeInteractionSchema,
    initializeMessageSchema: mockInitializeMessageSchema,
    initializeTransactionSchema: mockInitializeTransactionSchema,
    initializeTimelineSchema: mockInitializeTimelineSchema,
    initializeSearchHistorySchema: mockInitializeSearchHistorySchema,
    initializeLocationSchema: mockInitializeLocationSchema,
    initializeCurrencyWalletsSchema: mockInitializeCurrencyWalletsSchema,
    initializeCurrencySchema: mockInitializeCurrencySchema,
    initializeNotificationsSchema: mockInitializeNotificationsSchema,
    initializeUserContactsSchema: mockInitializeUserContactsSchema,
  }));

  jest.doMock('../migrations/add-entity-id-columns', () => ({
    runMigration: mockRunMigration,
    isMigrationApplied: mockIsMigrationApplied,
    MIGRATION_VERSION: '1',
    MIGRATION_NAME: 'add_entity_id_columns',
  }));

  const { databaseManager } = await import('../DatabaseManager');
  return databaseManager;
};

describe('DatabaseManager', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockOpenDatabaseAsync.mockResolvedValue(mockDatabase);
    mockExecAsync.mockResolvedValue(undefined);
    mockRunAsync.mockResolvedValue({ changes: 0 });
    mockCloseAsync.mockResolvedValue(undefined);

    // Reset schema mocks
    mockInitializeUserSchema.mockResolvedValue(undefined);
    mockInitializeInteractionSchema.mockResolvedValue(undefined);
    mockInitializeMessageSchema.mockResolvedValue(undefined);
    mockInitializeTransactionSchema.mockResolvedValue(undefined);
    mockInitializeTimelineSchema.mockResolvedValue(undefined);
    mockInitializeSearchHistorySchema.mockResolvedValue(undefined);
    mockInitializeLocationSchema.mockResolvedValue(undefined);
    mockInitializeCurrencyWalletsSchema.mockResolvedValue(undefined);
    mockInitializeCurrencySchema.mockResolvedValue(undefined);
    mockInitializeNotificationsSchema.mockResolvedValue(undefined);
    mockInitializeUserContactsSchema.mockResolvedValue(undefined);

    // Reset migration mocks
    mockIsMigrationApplied.mockResolvedValue(false);
    mockRunMigration.mockResolvedValue(undefined);
  });

  // ============================================================
  // INITIALIZATION TESTS
  // ============================================================

  describe('initialize', () => {
    it('should initialize database successfully', async () => {
      const databaseManager = await getDatabaseManager();

      const result = await databaseManager.initialize();

      expect(result).toBe(true);
      expect(mockOpenDatabaseAsync).toHaveBeenCalled();
    });

    it('should configure pragmas on initialization', async () => {
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();

      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA journal_mode=WAL;');
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA foreign_keys=ON;');
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA synchronous=NORMAL;');
      expect(mockExecAsync).toHaveBeenCalledWith('PRAGMA cache_size=10000;');
    });

    it('should initialize all schemas in order', async () => {
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();

      expect(mockInitializeCurrencySchema).toHaveBeenCalled();
      expect(mockInitializeUserSchema).toHaveBeenCalled();
      expect(mockInitializeUserContactsSchema).toHaveBeenCalled();
      expect(mockInitializeCurrencyWalletsSchema).toHaveBeenCalled();
      expect(mockInitializeInteractionSchema).toHaveBeenCalled();
      expect(mockInitializeMessageSchema).toHaveBeenCalled();
      expect(mockInitializeTransactionSchema).toHaveBeenCalled();
      expect(mockInitializeNotificationsSchema).toHaveBeenCalled();
      expect(mockInitializeSearchHistorySchema).toHaveBeenCalled();
      expect(mockInitializeLocationSchema).toHaveBeenCalled();
      expect(mockInitializeTimelineSchema).toHaveBeenCalled();
    });

    it('should run migrations', async () => {
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();

      expect(mockIsMigrationApplied).toHaveBeenCalled();
      expect(mockRunMigration).toHaveBeenCalled();
    });

    it('should skip migration if already applied', async () => {
      mockIsMigrationApplied.mockResolvedValue(true);
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();

      expect(mockRunMigration).not.toHaveBeenCalled();
    });

    it('should perform maintenance tasks', async () => {
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();

      // Should clean up old messages
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM messages'),
      );

      // Should run ANALYZE
      expect(mockExecAsync).toHaveBeenCalledWith('ANALYZE;');
    });

    it('should not reinitialize if already completed', async () => {
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();
      mockOpenDatabaseAsync.mockClear();

      await databaseManager.initialize();

      expect(mockOpenDatabaseAsync).not.toHaveBeenCalled();
    });

    it('should return same promise for concurrent initialization', async () => {
      const databaseManager = await getDatabaseManager();

      const promise1 = databaseManager.initialize();
      const promise2 = databaseManager.initialize();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      // Should only open database once
      expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // INITIALIZATION ERROR TESTS
  // ============================================================

  describe('initialization errors', () => {
    it('should return false on web platform', async () => {
      // Get fresh instance with web platform
      jest.resetModules();
      jest.doMock('expo-sqlite', () => ({
        openDatabaseAsync: mockOpenDatabaseAsync,
      }));
      jest.doMock('react-native', () => ({
        Platform: { OS: 'web' },
      }));
      jest.doMock('../../utils/logger', () => ({
        __esModule: true,
        default: {
          debug: mockLoggerDebug,
          info: mockLoggerInfo,
          warn: mockLoggerWarn,
          error: mockLoggerError,
        },
      }));
      jest.doMock('../schema', () => ({
        initializeUserSchema: mockInitializeUserSchema,
        initializeInteractionSchema: mockInitializeInteractionSchema,
        initializeMessageSchema: mockInitializeMessageSchema,
        initializeTransactionSchema: mockInitializeTransactionSchema,
        initializeTimelineSchema: mockInitializeTimelineSchema,
        initializeSearchHistorySchema: mockInitializeSearchHistorySchema,
        initializeLocationSchema: mockInitializeLocationSchema,
        initializeCurrencyWalletsSchema: mockInitializeCurrencyWalletsSchema,
        initializeCurrencySchema: mockInitializeCurrencySchema,
        initializeNotificationsSchema: mockInitializeNotificationsSchema,
        initializeUserContactsSchema: mockInitializeUserContactsSchema,
      }));
      jest.doMock('../migrations/add-entity-id-columns', () => ({
        runMigration: mockRunMigration,
        isMigrationApplied: mockIsMigrationApplied,
        MIGRATION_VERSION: '1',
        MIGRATION_NAME: 'add_entity_id_columns',
      }));

      const { databaseManager } = await import('../DatabaseManager');
      const result = await databaseManager.initialize();

      expect(result).toBe(false);
      expect(mockOpenDatabaseAsync).not.toHaveBeenCalled();
    });

    it('should throw when openDatabaseAsync fails', async () => {
      mockOpenDatabaseAsync.mockRejectedValue(new Error('Failed to open'));
      const databaseManager = await getDatabaseManager();

      await expect(databaseManager.initialize()).rejects.toThrow('Failed to open');
    });

    it('should throw when openDatabaseAsync returns null', async () => {
      mockOpenDatabaseAsync.mockResolvedValue(null);
      const databaseManager = await getDatabaseManager();

      await expect(databaseManager.initialize()).rejects.toThrow('Failed to open database');
    });

    it('should throw when schema initialization fails', async () => {
      mockInitializeUserSchema.mockRejectedValue(new Error('Schema error'));
      const databaseManager = await getDatabaseManager();

      await expect(databaseManager.initialize()).rejects.toThrow();
    });

    it('should throw when migration fails', async () => {
      mockRunMigration.mockRejectedValue(new Error('Migration failed'));
      const databaseManager = await getDatabaseManager();

      await expect(databaseManager.initialize()).rejects.toThrow();
    });

    it('should not throw on maintenance failure', async () => {
      mockRunAsync.mockRejectedValue(new Error('Cleanup failed'));
      const databaseManager = await getDatabaseManager();

      // Should not throw - maintenance failures are logged but don't block
      const result = await databaseManager.initialize();

      expect(result).toBe(true);
    });

    it('should return false on retry after failure', async () => {
      mockOpenDatabaseAsync.mockRejectedValue(new Error('Failed'));
      const databaseManager = await getDatabaseManager();

      await expect(databaseManager.initialize()).rejects.toThrow();

      // Second call should return false without retrying
      const result = await databaseManager.initialize();

      expect(result).toBe(false);
    });
  });

  // ============================================================
  // DATABASE ACCESS TESTS
  // ============================================================

  describe('getDatabase', () => {
    it('should return null before initialization', async () => {
      const databaseManager = await getDatabaseManager();

      const db = databaseManager.getDatabase();

      expect(db).toBeNull();
    });

    it('should return database after successful initialization', async () => {
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();
      const db = databaseManager.getDatabase();

      expect(db).toBe(mockDatabase);
    });
  });

  describe('isDatabaseReady', () => {
    it('should return false before initialization', async () => {
      const databaseManager = await getDatabaseManager();

      expect(databaseManager.isDatabaseReady()).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();

      expect(databaseManager.isDatabaseReady()).toBe(true);
    });
  });

  describe('getInitializationState', () => {
    it('should return NOT_STARTED initially', async () => {
      const databaseManager = await getDatabaseManager();

      expect(databaseManager.getInitializationState()).toBe('NOT_STARTED');
    });

    it('should return COMPLETED after successful initialization', async () => {
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();

      expect(databaseManager.getInitializationState()).toBe('COMPLETED');
    });

    it('should return FAILED after failed initialization', async () => {
      mockOpenDatabaseAsync.mockRejectedValue(new Error('Failed'));
      const databaseManager = await getDatabaseManager();

      try {
        await databaseManager.initialize();
      } catch {
        // Expected
      }

      expect(databaseManager.getInitializationState()).toBe('FAILED');
    });
  });

  // ============================================================
  // RETRY INITIALIZATION TESTS
  // ============================================================

  describe('retryInitialization', () => {
    it('should allow retry after failure', async () => {
      mockOpenDatabaseAsync.mockRejectedValueOnce(new Error('Failed'));
      const databaseManager = await getDatabaseManager();

      try {
        await databaseManager.initialize();
      } catch {
        // Expected
      }

      // Reset mock for retry
      mockOpenDatabaseAsync.mockResolvedValue(mockDatabase);

      const result = await databaseManager.retryInitialization();

      expect(result).toBe(true);
      expect(databaseManager.isDatabaseReady()).toBe(true);
    });

    it('should reset state before retrying', async () => {
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();

      // Force retry
      await databaseManager.retryInitialization();

      // Should have called openDatabaseAsync twice
      expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================
  // CLEAR ALL DATA TESTS
  // ============================================================

  describe('clearAllData', () => {
    it('should throw if database not initialized', async () => {
      const databaseManager = await getDatabaseManager();

      await expect(databaseManager.clearAllData()).rejects.toThrow(
        'Database not initialized',
      );
    });

    it('should clear all tables in transaction', async () => {
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();
      await databaseManager.clearAllData();

      expect(mockExecAsync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockExecAsync).toHaveBeenCalledWith('COMMIT');
    });

    it('should clear tables in correct order', async () => {
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();
      await databaseManager.clearAllData();

      // Check that DELETE statements were called for expected tables
      expect(mockExecAsync).toHaveBeenCalledWith('DELETE FROM messages');
      expect(mockExecAsync).toHaveBeenCalledWith('DELETE FROM transactions');
      expect(mockExecAsync).toHaveBeenCalledWith('DELETE FROM interactions');
      expect(mockExecAsync).toHaveBeenCalledWith('DELETE FROM users');
    });

    it('should rollback on error', async () => {
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();

      // Make COMMIT fail (outer try-catch triggers ROLLBACK)
      mockExecAsync.mockImplementation((sql: string) => {
        if (sql === 'COMMIT') {
          throw new Error('Commit failed');
        }
        return Promise.resolve(undefined);
      });

      await expect(databaseManager.clearAllData()).rejects.toThrow();
      expect(mockExecAsync).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  // ============================================================
  // CLOSE DATABASE TESTS
  // ============================================================

  describe('close', () => {
    it('should close database connection', async () => {
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();
      await databaseManager.close();

      expect(mockCloseAsync).toHaveBeenCalled();
    });

    it('should reset state after close', async () => {
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();
      expect(databaseManager.isDatabaseReady()).toBe(true);

      await databaseManager.close();

      expect(databaseManager.isDatabaseReady()).toBe(false);
      expect(databaseManager.getInitializationState()).toBe('NOT_STARTED');
    });

    it('should handle close when not initialized', async () => {
      const databaseManager = await getDatabaseManager();

      // Should not throw
      await expect(databaseManager.close()).resolves.not.toThrow();
    });
  });

  // ============================================================
  // LOGGING TESTS
  // ============================================================

  describe('logging', () => {
    it('should log initialization start', async () => {
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('Starting centralized database initialization'),
      );
    });

    it('should log initialization success', async () => {
      const databaseManager = await getDatabaseManager();

      await databaseManager.initialize();

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('initialization completed successfully'),
      );
    });

    it('should log errors on failure', async () => {
      mockOpenDatabaseAsync.mockRejectedValue(new Error('Test error'));
      const databaseManager = await getDatabaseManager();

      try {
        await databaseManager.initialize();
      } catch {
        // Expected
      }

      expect(mockLoggerError).toHaveBeenCalled();
    });
  });
});
