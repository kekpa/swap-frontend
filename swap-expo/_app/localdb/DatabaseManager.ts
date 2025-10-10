// Created: Centralized database manager to prevent race conditions and ensure proper initialization - 2025-05-29
// Updated: Added all Supabase-matching schemas for proper local-first sync - 2025-01-10
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import logger from '../utils/logger';
import { 
  initializeUserSchema,
  initializeInteractionSchema,
  initializeMessageSchema,
  initializeTransactionSchema,
  initializeTimelineSchema,
  initializeSearchHistorySchema,
  initializeLocationSchema,
  initializeCurrencyWalletsSchema,
  initializeCurrencySchema,
  initializeNotificationsSchema,
  initializeUserContactsSchema
} from './schema';

// Database configuration
const getDatabaseName = (): string => {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.EXPO_PUBLIC_ENV === 'production';
  return isProduction ? 'swap_cache_v3_prod.db' : 'swap_cache_v3.db';
};
const DATABASE_NAME = getDatabaseName();
const DATABASE_VERSION = 1;

// Initialization states
enum InitializationState {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// Schema initialization result
interface SchemaResult {
  success: boolean;
  error?: string;
}

// Centralized database manager class
class DatabaseManager {
  private static instance: DatabaseManager;
  private database: SQLite.SQLiteDatabase | null = null;
  private initializationState: InitializationState = InitializationState.NOT_STARTED;
  private initializationPromise: Promise<boolean> | null = null;
  private initializationError: Error | null = null;

  // Singleton pattern
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Initialize the database with proper sequencing and error handling
   */
  public async initialize(): Promise<boolean> {
    // Return existing promise if initialization is in progress
    if (this.initializationPromise) {
      logger.debug('[DatabaseManager] Initialization already in progress, waiting for completion');
      return this.initializationPromise;
    }

    // Return immediately if already completed successfully
    if (this.initializationState === InitializationState.COMPLETED) {
      logger.debug('[DatabaseManager] Database already initialized successfully');
      return true;
    }

    // Return immediately if previously failed (don't retry automatically)
    if (this.initializationState === InitializationState.FAILED) {
      logger.error('[DatabaseManager] Database initialization previously failed', this.initializationError?.message || 'Unknown error');
      return false;
    }

    // Start new initialization
    this.initializationState = InitializationState.IN_PROGRESS;
    this.initializationPromise = this.performInitialization();

    try {
      const result = await this.initializationPromise;
      this.initializationState = result ? InitializationState.COMPLETED : InitializationState.FAILED;
      return result;
    } catch (error) {
      this.initializationState = InitializationState.FAILED;
      this.initializationError = error instanceof Error ? error : new Error(String(error));
      logger.error('[DatabaseManager] Database initialization failed', this.initializationError.message);
      throw error;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Perform the actual database initialization
   */
  private async performInitialization(): Promise<boolean> {
    try {
      logger.info('[DatabaseManager] 🚀 Starting centralized database initialization');

      // Check platform compatibility
      if (Platform.OS === 'web') {
        logger.warn('[DatabaseManager] SQLite not supported on web platform');
        return false;
      }

      // Open database connection
      await this.openDatabase();

      // Configure database settings
      await this.configurePragmas();

      // Initialize all schemas in correct order
      await this.initializeSchemas();

      // Perform maintenance tasks
      await this.performMaintenance();

      logger.info('[DatabaseManager] ✅ Database initialization completed successfully');
      return true;

    } catch (error) {
      logger.error('[DatabaseManager] ❌ Database initialization failed', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Open database connection
   */
  private async openDatabase(): Promise<void> {
    logger.debug('[DatabaseManager] Opening database connection');
    
    if (!SQLite.openDatabaseAsync) {
      throw new Error('SQLite.openDatabaseAsync is not available');
    }

    this.database = await SQLite.openDatabaseAsync(DATABASE_NAME);
    
    if (!this.database) {
      throw new Error('Failed to open database');
    }

    logger.debug('[DatabaseManager] Database connection established');
  }

  /**
   * Configure database PRAGMAs for optimal performance
   */
  private async configurePragmas(): Promise<void> {
    logger.debug('[DatabaseManager] Configuring database PRAGMAs');
    
    if (!this.database) {
      throw new Error('Database not opened');
    }

    // Enable WAL mode for better concurrency
    await this.database.execAsync('PRAGMA journal_mode=WAL;');
    
    // Enable foreign key constraints
    await this.database.execAsync('PRAGMA foreign_keys=ON;');
    
    // Set synchronous mode for better performance
    await this.database.execAsync('PRAGMA synchronous=NORMAL;');
    
    // Set cache size (in KB)
    await this.database.execAsync('PRAGMA cache_size=10000;');
    
    logger.debug('[DatabaseManager] Database PRAGMAs configured');
  }

  /**
   * Initialize all schemas in the correct dependency order
   */
  private async initializeSchemas(): Promise<void> {
    logger.debug('[DatabaseManager] Initializing database schemas');

    if (!this.database) {
      throw new Error('Database not opened');
    }

    // Schema initialization order (respecting foreign key dependencies)
    // Optimized for local-first banking experience
    // 1. Core reference tables first (no dependencies)
    // 2. Entity-related tables
    // 3. Wallet tables (read-only cache)
    // 4. Interaction and message tables
    // 5. Transaction and timeline tables
    // 6. Additional feature tables
    const schemaInitializers = [
      // Core reference tables (performance cache)
      { name: 'Currencies', init: () => this.initializeCurrenciesSchema() },
      
      // User tables (profile & contacts)
      { name: 'Users', init: () => this.initializeUsersSchema() },
      { name: 'UserContacts', init: () => this.initializeUserContactsSchema() },
      
      // Wallet tables (read-only cache)
      { name: 'CurrencyWallets', init: () => this.initializeCurrencyWalletsSchema() },
      
      // Interaction and messaging tables (WhatsApp-like experience)
      { name: 'Interactions', init: () => this.initializeInteractionsSchema() },
      { name: 'Messages', init: () => this.initializeMessagesSchema() },
      { name: 'Transactions', init: () => this.initializeTransactionsSchema() },
      { name: 'Notifications', init: () => this.initializeNotificationsSchema() },
      
      // Utility tables (UX enhancement)
      { name: 'SearchHistory', init: () => this.initializeSearchHistorySchema() },
      { name: 'Locations', init: () => this.initializeLocationSchema() },
      { name: 'Timeline', init: () => this.initializeTimelineSchema() },
    ];

    // Initialize each schema sequentially
    for (const { name, init } of schemaInitializers) {
      try {
        logger.debug(`[DatabaseManager] Initializing ${name} schema`);
        const result = await init();
        
        if (!result.success) {
          throw new Error(`Failed to initialize ${name} schema: ${result.error}`);
        }
        
        logger.debug(`[DatabaseManager] ✅ ${name} schema initialized successfully`);
      } catch (error) {
        logger.error(`[DatabaseManager] ❌ Failed to initialize ${name} schema`, error instanceof Error ? error.message : String(error));
        throw error;
      }
    }

    logger.debug('[DatabaseManager] All schemas initialized successfully');
  }

  /**
   * Initialize users schema
   */
  private async initializeUsersSchema(): Promise<SchemaResult> {
    try {
      await initializeUserSchema(this.database!);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Initialize interactions schema
   */
  private async initializeInteractionsSchema(): Promise<SchemaResult> {
    try {
      await initializeInteractionSchema(this.database!);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Initialize messages schema
   */
  private async initializeMessagesSchema(): Promise<SchemaResult> {
    try {
      await initializeMessageSchema(this.database!);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Initialize transactions schema
   */
  private async initializeTransactionsSchema(): Promise<SchemaResult> {
    try {
      await initializeTransactionSchema(this.database!);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // AccountBalances schema removed - using CurrencyWallets instead

  /**
   * Initialize currency wallets schema
   */
  private async initializeCurrencyWalletsSchema(): Promise<SchemaResult> {
    try {
      await initializeCurrencyWalletsSchema(this.database!);
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize currency wallets schema:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Initialize search history schema
   */
  private async initializeSearchHistorySchema(): Promise<SchemaResult> {
    try {
      await initializeSearchHistorySchema(this.database!);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Initialize location schema
   */
  private async initializeLocationSchema(): Promise<SchemaResult> {
    try {
      await initializeLocationSchema(this.database!);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Initialize timeline view
   */
  private async initializeTimelineSchema(): Promise<SchemaResult> {
    try {
      await initializeTimelineSchema(this.database!);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Initialize currencies schema
   */
  private async initializeCurrenciesSchema(): Promise<SchemaResult> {
    try {
      await initializeCurrencySchema(this.database!);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Initialize notifications schema
   */
  private async initializeNotificationsSchema(): Promise<SchemaResult> {
    try {
      await initializeNotificationsSchema(this.database!);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Initialize user contacts schema
   */
  private async initializeUserContactsSchema(): Promise<SchemaResult> {
    try {
      await initializeUserContactsSchema(this.database!);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Perform database maintenance tasks
   */
  private async performMaintenance(): Promise<void> {
    logger.debug('[DatabaseManager] Performing database maintenance');

    if (!this.database) {
      throw new Error('Database not opened');
    }

    try {
      // Clean up old messages (older than 30 days)
      const result = await this.database.runAsync(
        "DELETE FROM messages WHERE datetime(created_at) < datetime('now', '-30 day');"
      );
      
      logger.debug(`[DatabaseManager] Cleaned up ${result.changes} old messages`);

      // Analyze database for query optimization
      await this.database.execAsync('ANALYZE;');
      
      logger.debug('[DatabaseManager] Database maintenance completed');
    } catch (error) {
      logger.warn('[DatabaseManager] Database maintenance failed', error instanceof Error ? error.message : String(error));
      // Don't throw - maintenance failures shouldn't block initialization
    }
  }

  /**
   * Get the database instance (only available after initialization)
   */
  public getDatabase(): SQLite.SQLiteDatabase | null {
    if (this.initializationState !== InitializationState.COMPLETED) {
      logger.warn('[DatabaseManager] Database requested before initialization completed');
      return null;
    }
    return this.database;
  }

  /**
   * Check if database is ready for use
   */
  public isDatabaseReady(): boolean {
    return this.initializationState === InitializationState.COMPLETED && this.database !== null;
  }

  /**
   * Get current initialization state
   */
  public getInitializationState(): InitializationState {
    return this.initializationState;
  }

  /**
   * Force retry initialization (use with caution)
   */
  public async retryInitialization(): Promise<boolean> {
    logger.info('[DatabaseManager] Forcing database initialization retry');
    this.initializationState = InitializationState.NOT_STARTED;
    this.initializationPromise = null;
    this.initializationError = null;
    this.database = null;
    return this.initialize();
  }

  /**
   * DEVELOPER UTILITY: Clear all data from SQLite database
   * This will wipe all tables but keep the schema intact
   * USE WITH CAUTION: This cannot be undone!
   */
  public async clearAllData(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    logger.warn('[DatabaseManager] 🗑️ CLEARING ALL DATA from SQLite database...');

    try {
      await this.database.execAsync('BEGIN TRANSACTION');

      // Delete from all tables in correct order (respect foreign keys)
      const tablesToClear = [
        'timeline',
        'search_history',
        'locations',
        'notifications',
        'messages',
        'transactions',
        'interaction_members',
        'interactions',
        'currency_wallets',
        'user_contacts',
        'users',
        'currency',
      ];

      for (const table of tablesToClear) {
        try {
          await this.database.execAsync(`DELETE FROM ${table}`);
          logger.debug(`[DatabaseManager] ✅ Cleared table: ${table}`);
        } catch (error) {
          // Table might not exist, continue
          logger.debug(`[DatabaseManager] ⚠️ Could not clear ${table}: ${String(error)}`);
        }
      }

      await this.database.execAsync('COMMIT');
      logger.warn('[DatabaseManager] ✅ All data cleared from SQLite database');
    } catch (error) {
      await this.database.execAsync('ROLLBACK');
      logger.error('[DatabaseManager] ❌ Failed to clear database', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    if (this.database) {
      await this.database.closeAsync();
      this.database = null;
    }
    this.initializationState = InitializationState.NOT_STARTED;
    this.initializationPromise = null;
    this.initializationError = null;
    logger.info('[DatabaseManager] Database connection closed');
  }
}

// Export singleton instance
export const databaseManager = DatabaseManager.getInstance();
export default databaseManager; 