// Created: EntityResolver service for consistent entity display across the app - 2025-05-21

import { Profile, Business } from '../types';
import { supabase } from '../api/supabase';
import { Database } from '../db/database';
import { EntityType } from '../types/entity.types';

// Cache expiration in milliseconds (24 hours)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

/**
 * Entity cache entry with expiration
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Default entity representations when data is missing
 */
const DefaultEntities = {
  [EntityType.PROFILE]: {
    displayName: 'Unknown User',
    avatarText: 'UU',
    avatarColor: '#0077b6',
    type: 'friend'
  },
  [EntityType.BUSINESS]: {
    displayName: 'Unknown Business',
    avatarText: 'UB',
    avatarColor: '#6366F1',
    type: 'business'
  },
  [EntityType.SYSTEM]: {
    displayName: 'System',
    avatarText: 'SY',
    avatarColor: '#10B981',
    type: 'system'
  }
};

/**
 * Resolved entity representation
 */
export interface ResolvedEntity {
  id: string;
  entityType: EntityType;
  displayName: string;
  avatarUrl?: string;
  avatarText: string;
  avatarColor: string;
  type: 'friend' | 'business' | 'system';
  metadata?: Record<string, any>;
}

/**
 * EntityResolver manages the resolution and caching of entity data
 * to ensure consistent display of users, businesses, and other entities
 * throughout the app, including in messages.
 */
export class EntityResolver {
  private profileCache: Map<string, CacheEntry<ResolvedEntity>> = new Map();
  private businessCache: Map<string, CacheEntry<ResolvedEntity>> = new Map();
  private db?: Database;
  
  /**
   * Initialize the resolver with optional database
   */
  constructor(db?: Database) {
    this.db = db;
  }
  
  /**
   * Set the database instance
   */
  setDatabase(db: Database): void {
    this.db = db;
  }
  
  /**
   * Reset all caches
   */
  clearCache(): void {
    this.profileCache.clear();
    this.businessCache.clear();
  }
  
  /**
   * Get entity from cache if available and not expired
   */
  private getCachedEntity(entityId: string, entityType: EntityType): ResolvedEntity | null {
    const cache = entityType === EntityType.PROFILE
      ? this.profileCache
      : this.businessCache;
    
    const entry = cache.get(entityId);
    if (!entry) return null;
    
    // Check for expiration
    if (Date.now() - entry.timestamp > CACHE_EXPIRATION) {
      cache.delete(entityId);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Cache entity data
   */
  private cacheEntity(entityId: string, entityType: EntityType, data: ResolvedEntity): void {
    const cache = entityType === EntityType.PROFILE
      ? this.profileCache
      : this.businessCache;
    
    cache.set(entityId, {
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * Generate avatar text from display name
   */
  private generateAvatarText(displayName: string): string {
    if (!displayName) return 'UU';
    
    // Split by spaces and get first letters of first two parts
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) {
      // Single word name, take first two letters or pad
      return (parts[0].substring(0, 2) || 'U').toUpperCase();
    } else {
      // Multi-word name, take first letter of first two words
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
  }
  
  /**
   * Resolve a profile entity from local DB or remote
   */
  private async resolveProfile(entityId: string): Promise<ResolvedEntity> {
    try {
      let profile: Profile | null = null;
      
      // Try local DB first
      if (this.db) {
        const result = await this.db.query<Profile>(`
          SELECT * FROM profiles WHERE id = ? LIMIT 1
        `, [entityId]);
        
        if (result && result.length > 0) {
          profile = result[0];
        }
      }
      
      // Fall back to Supabase if needed
      if (!profile) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', entityId)
          .single();
        
        if (error) throw error;
        profile = data as unknown as Profile;
      }
      
      if (!profile) {
        // Return default if profile not found
        return {
          id: entityId,
          entityType: EntityType.PROFILE,
          ...DefaultEntities[EntityType.PROFILE]
        };
      }
      
      // Create display name from available profile data
      const displayName = [profile.first_name, profile.last_name]
        .filter(Boolean)
        .join(' ') || profile.username || 'Unknown User';
      
      const avatarText = this.generateAvatarText(displayName);
      
      return {
        id: entityId,
        entityType: EntityType.PROFILE,
        displayName,
        avatarUrl: profile.avatar_url || undefined,
        avatarText,
        avatarColor: '#0077b6', // Default color for profiles
        type: 'friend',
        metadata: {
          username: profile.username
        }
      };
    } catch (error) {
      console.error(`[EntityResolver] Failed to resolve profile ${entityId}:`, error);
      return {
        id: entityId,
        entityType: EntityType.PROFILE,
        ...DefaultEntities[EntityType.PROFILE]
      };
    }
  }
  
  /**
   * Resolve a business entity
   */
  private async resolveBusiness(entityId: string): Promise<ResolvedEntity> {
    try {
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', entityId)
        .single();
      
      if (error) throw error;
      
      if (!data) {
        // Return default if business not found
        return {
          id: entityId,
          entityType: EntityType.BUSINESS,
          ...DefaultEntities[EntityType.BUSINESS]
        };
      }
      
      const business = data as unknown as Business;
      const displayName = business.name || 'Unknown Business';
      const avatarText = this.generateAvatarText(displayName);
      
      return {
        id: entityId,
        entityType: EntityType.BUSINESS,
        displayName,
        avatarUrl: business.logo_url || undefined,
        avatarText,
        avatarColor: '#6366F1', // Default color for businesses
        type: 'business',
        metadata: {
          businessType: business.business_type,
          isVerified: business.is_verified
        }
      };
    } catch (error) {
      console.error(`[EntityResolver] Failed to resolve business ${entityId}:`, error);
      return {
        id: entityId,
        entityType: EntityType.BUSINESS,
        ...DefaultEntities[EntityType.BUSINESS]
      };
    }
  }
  
  /**
   * Resolve a system entity
   */
  private resolveSystemEntity(entityId: string): ResolvedEntity {
    return {
      id: entityId,
      entityType: EntityType.SYSTEM,
      ...DefaultEntities[EntityType.SYSTEM]
    };
  }
  
  /**
   * Resolve an entity by ID and type
   */
  async resolveEntity(entityId: string, entityType: EntityType): Promise<ResolvedEntity> {
    // Check cache first
    const cachedEntity = this.getCachedEntity(entityId, entityType);
    if (cachedEntity) return cachedEntity;
    
    let resolvedEntity: ResolvedEntity;
    
    // Resolve based on entity type
    switch (entityType) {
      case EntityType.PROFILE:
        resolvedEntity = await this.resolveProfile(entityId);
        break;
      case EntityType.BUSINESS:
        resolvedEntity = await this.resolveBusiness(entityId);
        break;
      case EntityType.SYSTEM:
        resolvedEntity = this.resolveSystemEntity(entityId);
        break;
      default:
        resolvedEntity = {
          id: entityId,
          entityType: EntityType.PROFILE, // Default to profile
          ...DefaultEntities[EntityType.PROFILE]
        };
    }
    
    // Cache the resolved entity
    this.cacheEntity(entityId, entityType, resolvedEntity);
    
    return resolvedEntity;
  }
  
  /**
   * Resolve multiple entities at once
   */
  async resolveEntities(entities: { id: string, entityType: EntityType }[]): Promise<Map<string, ResolvedEntity>> {
    const result = new Map<string, ResolvedEntity>();
    
    // Create batches of promises to avoid too many concurrent requests
    const batchSize = 5;
    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      const promises = batch.map(entity => 
        this.resolveEntity(entity.id, entity.entityType)
          .then(resolved => result.set(entity.id, resolved))
      );
      
      await Promise.all(promises);
    }
    
    return result;
  }
  
  /**
   * Pre-cache entities for faster access
   */
  async prefetchEntities(entities: { id: string, entityType: EntityType }[]): Promise<void> {
    await this.resolveEntities(entities);
  }
  
  /**
   * Update entity in cache when data changes
   */
  updateEntityCache(entityId: string, entityType: EntityType, data: Partial<ResolvedEntity>): void {
    const existing = this.getCachedEntity(entityId, entityType);
    if (existing) {
      const updated = { ...existing, ...data };
      this.cacheEntity(entityId, entityType, updated);
    }
  }
}

// Singleton instance for app-wide use
export const entityResolver = new EntityResolver(); 