// Created: SQLite schema for location data - 2025-01-09

import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../../utils/logger';

/**
 * Initialize location related tables in SQLite database
 */
export async function initializeLocationSchema(db: SQLiteDatabase): Promise<void> {
  try {
    // Create locations table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        updatedAt TEXT NOT NULL,
        data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes for frequent query patterns
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_locations_updated_at 
      ON locations(updatedAt DESC);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_locations_coordinates 
      ON locations(latitude, longitude);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_locations_name 
      ON locations(name);
    `);
    
    logger.debug("Location schema initialized successfully", "data");
  } catch (error) {
    logger.error("Failed to initialize location schema", error, "data");
    throw error;
  }
} 