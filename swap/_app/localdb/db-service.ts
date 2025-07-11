// Updated: Renamed from db.ts to db-service.ts and refactored to use modular schema - 2025-05-22

import * as SQLite from 'expo-sqlite'; 
import { Platform } from 'react-native';
import { MessageType } from '../types/message.types';
import logger from '../utils/logger';
import { Database } from './db-interfaces';
import { 
  initializeInteractionSchema, 
  initializeMessageSchema, 
  initializeTransactionSchema, 
  initializeTimelineSchema
} from './schema';

let database: SQLite.SQLiteDatabase | null = null; 
let dbInitializedSuccessfully = false;
let initInProgress = false;

const initializeDatabaseInternal = async (): Promise<boolean> => {
  if (dbInitializedSuccessfully) {
    logger.debug('[SQLite_API] Database already initialized successfully.');
    return true;
  }
  if (initInProgress) {
    logger.debug('[SQLite_API] Database initialization already in progress, awaiting completion...');
    let attempts = 0;
    while(initInProgress && attempts < 10) { 
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    if (dbInitializedSuccessfully) return true;
    logger.warn('[SQLite_API] Waited for in-progress init, but it did not complete successfully.');
  }

  initInProgress = true;
  logger.info('[SQLite_API] Starting new database initialization process...');

  try {
    if (Platform.OS === 'web') {
      logger.warn('[SQLite_API] SQLite not supported on web platform. Caching disabled.');
      initInProgress = false;
      return false;
    }

    logger.debug("[SQLite_API] Attempting to open database 'swap_cache_v3.db' with SQLite.openDatabaseAsync().");
    const openedDb = await SQLite.openDatabaseAsync('swap_cache_v3.db'); 

    if (!openedDb) {
      logger.error('[SQLite_API] SQLite.openDatabaseAsync returned null or undefined.');
      throw new Error('SQLite.openDatabaseAsync returned null');
    }
    
    database = openedDb;
    logger.debug('[SQLite_API] Database object obtained. Setting PRAGMAs.');

    await database.runAsync('PRAGMA journal_mode = WAL;');
    await database.runAsync('PRAGMA foreign_keys = ON;');
    logger.debug('[SQLite_API] PRAGMA journal_mode=WAL and foreign_keys=ON set.');
    
    dbInitializedSuccessfully = true;
    logger.info('[SQLite_API] Core database file initialized successfully.');
    initInProgress = false;
    return true;

  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error('[SQLite_API] CRITICAL error during core database initialization: ' + errMessage, { error });
    database = null;
    dbInitializedSuccessfully = false;
    initInProgress = false;
    return false;
  }
};

initializeDatabaseInternal().catch(err => {
  const errMsg = err instanceof Error ? err.message : String(err);
  logger.error('[SQLite_API] Initial auto-initialization of DB file failed: ' + errMsg, { error: err });
});

export const isDatabaseAvailable = (): boolean => {
  const available = dbInitializedSuccessfully && database !== null;
  if (!available && Platform.OS !== 'web') {
     logger.warn(`[SQLite_API] isDatabaseAvailable check: Database is NOT ready (initialized: ${dbInitializedSuccessfully}, dbObjectExists: ${database !== null})`);
  }
  return available;
};

export const getDatabase = (): SQLite.SQLiteDatabase | null => {
  return database;
};

export const initDb = async (): Promise<void> => {
  logger.info('[SQLite_API] initDb called. Checking DB availability.');
  if (!await initializeDatabaseInternal()) { 
    logger.error('[SQLite_API] initDb: Core database initialization failed. Aborting schema setup.');
    return;
  }

  if (!database) { 
    logger.error('[SQLite_API] initDb: Database object is null after successful core initialization. This is unexpected. Aborting.');
    return;
  }
  
  const dbInstance = database;

  try {
    logger.info('[SQLite_API] initDb: Proceeding with schema setup.');

    logger.debug('[SQLite_API] Initializing Interaction schema...');
    await initializeInteractionSchema(dbInstance);
    logger.info('[SQLite_API] Interaction schema initialized.');
    
    logger.debug('[SQLite_API] Initializing Message schema...');
    await initializeMessageSchema(dbInstance);
    logger.info('[SQLite_API] Message schema initialized.');
    
    logger.debug('[SQLite_API] Initializing Transaction schema...');
    await initializeTransactionSchema(dbInstance);
    logger.info('[SQLite_API] Transaction schema initialized.');
    
    logger.debug('[SQLite_API] Initializing Timeline schema (view)...');
    await initializeTimelineSchema(dbInstance);
    logger.info('[SQLite_API] Timeline schema (view) initialized.');
    
    // Account Balance schema removed - using CurrencyWallets instead
    logger.debug('[SQLite_API] Account Balance schema skipped (using CurrencyWallets)');

    logger.info('[SQLite_API] All schemas initialized successfully.');

    await pruneOldMessages();

  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error('[SQLite_API] initDb: CRITICAL Error during schema initialization sequence: ' + errMessage, { error });
  }
};

interface InsertableMessage {
  id: string;
  interaction_id: string;
  sender_entity_id?: string;
  sender_id?: string; 
  content?: string;
  message_type?: MessageType | string;
  created_at?: string; 
  metadata?: any;
}

/**
 * Ensure that a row exists in the interactions table for the given interactionId.
 * If the interaction does not exist yet, we create a minimal placeholder row so
 * that subsequent inserts into child tables with FOREIGN KEY constraints do not
 * fail. This is especially important during first-run scenarios where the
 * timeline API returns messages before the interaction list query has
 * completed and populated the interactions table.
 */
export const ensureInteractionExists = async (interactionId: string): Promise<void> => {
  if (!interactionId || !database) return;

  try {
    // Check existence
    const row = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM interactions WHERE id = ? LIMIT 1;',
      [interactionId],
    );

    const existingCount = row?.count ?? 0;

    if (existingCount === 0) {
      // Insert minimal placeholder
      await database.runAsync(
        `INSERT INTO interactions (id, updated_at, last_message_at) VALUES (?, ?, ?);`,
        [interactionId, new Date().toISOString(), new Date().toISOString()],
      );
      logger.debug(`[SQLite_API] ensureInteractionExists: inserted placeholder interaction row for ${interactionId}`);
    }
  } catch (err) {
    logger.warn('[SQLite_API] ensureInteractionExists failed', err instanceof Error ? err.message : String(err));
  }
};

export const insertMessage = async (msg: InsertableMessage): Promise<void> => {
  logger.debug(`[SQLite_API] Attempting to insert message ID: ${msg.id} for interaction: ${msg.interaction_id}`);
  if (!isDatabaseAvailable() || !database) {
    const err = new Error('Database not available for insertMessage');
    logger.warn(`[SQLite_API] ${err.message}. Cannot insert message ID: ${msg.id}`);
    return Promise.reject(err);
  }
  if (!msg || !msg.id || !msg.interaction_id) {
    const err = new Error('Invalid message object for insertMessage');
    logger.warn(`[SQLite_API] ${err.message}.`, `Details: ${JSON.stringify(msg)}`); 
    return Promise.reject(err);
  }

  // Make sure a parent interaction row exists to satisfy the FK constraint
  await ensureInteractionExists(msg.interaction_id);

  const sql = `INSERT OR REPLACE INTO messages (
      id, interaction_id, sender_entity_id, content, message_type, created_at, metadata
    ) VALUES (?,?,?,?,?,?,?);`;
  const params: SQLite.SQLiteBindValue[] = [
    msg.id,
    msg.interaction_id,
    msg.sender_entity_id || msg.sender_id || null,
    msg.content || '',
    String(msg.message_type || 'text'),
    msg.created_at || new Date().toISOString(),
    msg.metadata ? JSON.stringify(msg.metadata) : null
  ];
  
  try {
    logger.debug(`[SQLite_API] Executing insert: ${sql.substring(0,100)}...`, `NumParams: ${params.length}`);
    const result = await database.runAsync(sql, params);
    logger.info(`[SQLite_API] Successfully inserted/replaced message ID: ${msg.id}. Changes: ${result.changes}`);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[SQLite_API] Error inserting/replacing message ID: ${msg.id}`, 
      `SQL: ${sql.substring(0,100)}..., Error: ${errMessage}`);
    throw error; 
  }
};

export const pruneOldMessages = async (): Promise<void> => {
  if (!isDatabaseAvailable() || !database) {
    logger.warn('[SQLite_API] Database not available for pruneOldMessages - will retry later.');
    return Promise.resolve();
  }
  
  logger.debug('[SQLite_API] Attempting to prune old messages.');
  
  try {
    const deleteQuery = "DELETE FROM messages WHERE datetime(created_at) < datetime('now','-30 day');";
    logger.debug(`[SQLite_API] Executing prune: ${deleteQuery}`);
    const result = await database.runAsync(deleteQuery);
    logger.info(`[SQLite_API] Pruned ${result.changes} old messages.`);
  } catch (error) {
    logger.error('[SQLite_API] Error during message pruning:', 
      error instanceof Error ? error.message : String(error));
  }
};

type MessageRow = Record<string, any>; 

export const getMessagesForInteraction = async (
  interactionId: string,
  limit = 100,
): Promise<MessageRow[]> => { 
  logger.debug(`[SQLite_API] Attempting to get messages for interaction ID: ${interactionId}, limit: ${limit}`);
  if (!isDatabaseAvailable() || !database) {
    logger.warn(`[SQLite_API] Database not available. Cannot get messages for ID: ${interactionId}`);
    return []; 
  }
  
  const sql = `SELECT * FROM messages WHERE interaction_id = ? ORDER BY datetime(created_at) DESC LIMIT ?;`;
  const params: SQLite.SQLiteBindValue[] = [interactionId, limit];
  
  try {
    logger.debug(`[SQLite_API] Executing select: ${sql.substring(0,100)}...`, `NumParams: ${params.length}`);
    const results = await database.getAllAsync<MessageRow>(sql, params);
    
    if (results) {
        logger.info(`[SQLite_API] Retrieved ${results.length} messages for ID: ${interactionId} (DESC order).`);
        return results; 
    } else {
        logger.info(`[SQLite_API] No messages found (null/undefined result) for ID: ${interactionId}`);
        return [];
    }
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[SQLite_API] Error retrieving messages for ID: ${interactionId}`, `Error: ${errMessage}`);
    return []; 
  }
}; 