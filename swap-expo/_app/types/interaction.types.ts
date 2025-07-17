// Updated: Import EntityType from entity.types.ts - 2025-05-21
import { EntityType } from './entity.types';

/**
 * Role of a member in an interaction
 */
export enum MemberRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  MODERATOR = 'MODERATOR',
  OWNER = 'OWNER'
}

/**
 * Status of a member in an interaction
 */
export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BANNED = 'BANNED',
  LEFT = 'LEFT'
}

/**
 * Type of an interaction
 */
export enum InteractionType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  CHANNEL = 'CHANNEL'
}

/**
 * Status of an interaction
 */
export enum InteractionStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED'
}

/**
 * Base interaction member interface
 */
export interface InteractionMember {
  id: string;
  entity_id: string;
  role: MemberRole;
  status: MemberStatus;
  joined_at: string;
  left_at?: string;
  last_read_at?: string;
  display_name?: string;
  avatar_url?: string;
  entity_type?: string;
}

/**
 * Base interaction interface
 */
export interface BaseInteraction {
  id: string;
  name?: string;
  is_group: boolean;
  status: InteractionStatus;
  created_by_entity_id: string;
  created_at: string;
  updated_at: string;
  last_activity_at?: string;
  members?: InteractionMember[];
  member_count?: number;
  metadata?: Record<string, any>;
}

/**
 * Interaction list item for UI display
 */
export interface InteractionListItem extends BaseInteraction {
  last_message_snippet?: string;
  last_message_at?: string;
  last_message_sender_id?: string;
  unread_count?: number;
}

/**
 * Direct message creation parameters
 */
export interface DirectMessageParams {
  entity_ids: string[];
}

/**
 * Group interaction creation parameters
 */
export interface GroupInteractionParams {
  name: string;
  description?: string;
  member_ids: string[];
}

/**
 * Member invitation parameters
 */
export interface MemberInviteParams {
  interaction_id: string;
  entity_ids: string[];
  role?: MemberRole;
}

// Forward reference to avoid circular dependency
export type InteractionMessage = {
  id: string;
  content?: string;
  created_at: string;
  sender_id: string;
  sender_type: string;
  sender?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
};

/**
 * Interaction model representing a conversation thread
 */
export interface Interaction {
  id: string;
  name: string | null;
  is_group: boolean;
  relationship_id?: string;
  created_by: string;
  created_by_type: string;
  is_active: boolean;
  last_activity_at: string;
  created_at: string;
  updated_at?: string;
  members?: InteractionMember[];
  lastMessage?: InteractionMessage;
  unreadCount?: number;
  
  // Frontend-specific fields for display
  displayName?: string;
  avatarColor?: string;
  initials?: string;
  lastMessageText?: string;
  lastActivityDateStr?: string;
  timestamp?: number;
  type?: string;
}

/**
 * API response for interactions
 */
export interface InteractionsResponse {
  data: Interaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Create interaction request
 */
export interface CreateInteractionRequest {
  name?: string;
  is_group: boolean;
  member_ids: string[];
}

/**
 * Direct interaction request
 */
export interface GetDirectInteractionRequest {
  profileId: string;
} 