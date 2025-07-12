// Created: Added entity type definitions for standardized message format - 2025-05-21

/**
 * Entity types supported by the application
 */
export enum EntityType {
  PROFILE = 'profile',
  BUSINESS = 'business',
  SYSTEM = 'system'
}

/**
 * Base entity properties shared by all entity types
 */
export interface BaseEntity {
  id: string;               // Unique entity ID
  entity_type: EntityType;  // Type of entity
  reference_id: string;     // ID of the referenced object (profile_id, business_id, etc.)
  display_name: string;     // Display name for the entity
  avatar_url?: string;      // Avatar/image URL
  created_at: string;       // Creation timestamp
  updated_at?: string;      // Last update timestamp
  metadata?: Record<string, any>; // Additional metadata
}

/**
 * Profile entity type
 */
export interface ProfileEntity extends BaseEntity {
  entity_type: EntityType.PROFILE;
  is_active: boolean;       // Whether the profile is active
  status?: 'online' | 'offline' | 'away'; // Online status
  last_seen_at?: string;    // When the profile was last seen
}

/**
 * Business entity type
 */
export interface BusinessEntity extends BaseEntity {
  entity_type: EntityType.BUSINESS;
  is_active: boolean;       // Whether the business is active
  business_type?: string;   // Type of business
  location_id?: string;     // Associated location ID
}

/**
 * System entity type
 */
export interface SystemEntity extends BaseEntity {
  entity_type: EntityType.SYSTEM;
  system_type: 'bot' | 'service' | 'admin'; // Type of system entity
}

/**
 * Union type of all entity types
 */
export type Entity = ProfileEntity | BusinessEntity | SystemEntity;

/**
 * Response for entity lookup
 */
export interface EntityResponse {
  entity: Entity;
}

/**
 * Response for entity batch lookup
 */
export interface EntitiesBatchResponse {
  entities: Entity[];
}

/**
 * Entity search result interface
 * Used for search functionality across the application
 */
export interface EntitySearchResult {
  id: string;
  entity_type: string;
  reference_id: string;
  display_name: string;
  avatar_url?: string;
  is_active: boolean;
  metadata?: any;
} 