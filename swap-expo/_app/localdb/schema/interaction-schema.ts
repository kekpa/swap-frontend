// Created: SQLite schema for interaction data - 2025-05-22

import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../../utils/logger';

/**
 * Initialize interaction-related tables in SQLite database
 * Schema matches Supabase database structure exactly
 */
export async function initializeInteractionSchema(db: SQLiteDatabase): Promise<void> {
  try {
    // Create interactions table - matches Supabase schema exactly
    // Using CREATE IF NOT EXISTS for idempotency (safe for both first install and updates)
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT,
        is_group INTEGER DEFAULT 0,
        relationship_id TEXT,
        created_by_entity_id TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_activity_snippet TEXT,
        last_activity_at TEXT,
        last_activity_from_entity_id TEXT,
        unread_count INTEGER DEFAULT 0,
        icon_url TEXT,
        metadata TEXT,
        entity_id TEXT
      );
    `);

    // Create interaction_members table - matches Supabase schema exactly
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS interaction_members (
        id TEXT PRIMARY KEY NOT NULL,
        interaction_id TEXT NOT NULL,
        member_entity_id TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_read_at TEXT DEFAULT CURRENT_TIMESTAMP,
        display_name TEXT,
        avatar_url TEXT,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE CASCADE
      );
    `);
    
    // Create indexes for frequent query patterns
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_interactions_updated_at 
      ON interactions(updated_at DESC);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_interactions_last_activity_at
      ON interactions(last_activity_at DESC);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_interactions_created_by_entity 
      ON interactions(created_by_entity_id);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_interaction_members_entity_id 
      ON interaction_members(entity_id);
    `);
    
    await db.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_interaction_members_interaction_id 
      ON interaction_members(interaction_id);
    `);
    
    // Create unique constraint for interaction_id + entity_id
    await db.runAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_interaction_members_unique 
      ON interaction_members(interaction_id, entity_id);
    `);
    
    logger.debug("Interaction schema initialized successfully - matches Supabase structure", "data");
  } catch (error) {
    logger.error("Failed to initialize interaction schema", error, "data");
    throw error;
  }
} 