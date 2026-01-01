// Created: SQLite schema for search history data - 2025-01-09

import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../../utils/logger';

/**
 * Initialize search history related tables in SQLite database
 */
export async function initializeSearchHistorySchema(db: SQLiteDatabase): Promise<void> {
  try {
    // Create search_history table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS search_history (
        id TEXT PRIMARY KEY NOT NULL,
        query TEXT NOT NULL,
        type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create favorites table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes for frequent query patterns
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_search_history_timestamp 
      ON search_history(timestamp DESC);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_search_history_type 
      ON search_history(type);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_favorites_type 
      ON favorites(type);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_favorites_timestamp 
      ON favorites(timestamp DESC);
    `);
    
    logger.debug("Search history schema initialized successfully", "data");
  } catch (error) {
    logger.error("Failed to initialize search history schema", error, "data");
    throw error;
  }
} 