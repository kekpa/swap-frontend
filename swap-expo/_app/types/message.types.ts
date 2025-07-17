import { Entity } from './entity.types';

/**
 * Type of message content
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  AUDIO = 'audio',
  VIDEO = 'video',
  LOCATION = 'location',
  SYSTEM = 'system',
  TRANSACTION = 'transaction'
}

/**
 * Type of media content
 */
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
}

/**
 * Standardized message status for tracking message state
 */
export enum MessageStatus {
  PENDING = 'pending',     // Initial state, not yet sent to server
  SENDING = 'sending',     // Currently being sent to server
  SENT = 'sent',           // Successfully sent to server
  DELIVERED = 'delivered', // Delivered to all recipients' servers
  READ = 'read',           // Read by all recipients
  FAILED = 'failed'        // Failed to send
}

/**
 * Message receipt status for tracking who has received/read messages
 */
export interface MessageReceipt {
  entity_id: string;          // Entity that received/read the message
  message_id: string;         // Message that was received/read
  status: 'delivered' | 'read'; // Status of the receipt
  timestamp: string;          // When the receipt was created/updated
}

/**
 * Base message properties shared by all message types
 */
export interface BaseMessage {
  id: string;                // Unique message ID
  interaction_id: string;    // Associated interaction/conversation ID
  sender_entity_id: string;  // Entity that sent the message
  created_at: string;        // ISO timestamp of creation
  updated_at?: string;       // ISO timestamp of last update
  timestamp: string;         // Client-facing display timestamp
  status: MessageStatus;     // Current message status
  type: 'message';           // Type discriminator for timeline items
  itemType: 'message';       // Type discriminator for timeline items
  metadata?: {
    optimisticId?: string;   // Temporary ID for optimistic updates
    idempotency_key?: string; // For preventing duplicates
    isOptimistic?: boolean;  // Whether this is an optimistic update
    sequence_number?: number; // For ordering messages
    [key: string]: any;      // Additional metadata
  };
  receipts?: MessageReceipt[]; // Tracking who has received/read the message
}

/**
 * Text message type
 */
export interface TextMessage extends BaseMessage {
  message_type: MessageType.TEXT;
  content: string;
  media_url?: null;
  media_type?: null;
}

/**
 * Media message type (images, videos, audio, files)
 */
export interface MediaMessage extends BaseMessage {
  message_type: MessageType.IMAGE | MessageType.VIDEO | MessageType.AUDIO | MessageType.FILE;
  content?: string;
  media_url: string;
  media_type: string;
  metadata?: {
    file_name?: string;
    file_size?: number;
    width?: number;
    height?: number;
    duration?: number;
    thumbnail_url?: string;
    [key: string]: any;
  } & BaseMessage['metadata'];
}

/**
 * Location message type
 */
export interface LocationMessage extends BaseMessage {
  message_type: MessageType.LOCATION;
  content?: string;
  metadata: {
    latitude: number;
    longitude: number;
    address?: string;
    [key: string]: any;
  } & BaseMessage['metadata'];
}

/**
 * System message type (join, leave, etc.)
 */
export interface SystemMessage extends BaseMessage {
  message_type: MessageType.SYSTEM;
  content: string;
  metadata?: {
    system_action: 'join' | 'leave' | 'rename' | 'admin' | 'other';
    related_entity_id?: string;
    [key: string]: any;
  } & BaseMessage['metadata'];
}

/**
 * Transaction message type
 */
export interface TransactionMessage extends BaseMessage {
  message_type: MessageType.TRANSACTION;
  content?: string;
  metadata: {
    transaction_id: string;
    amount: number;
    currency_id: string;
    currency_code: string;
    transaction_status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'reversed';
    from_entity_id: string;
    to_entity_id: string;
    [key: string]: any;
  } & BaseMessage['metadata'];
}

/**
 * Union type of all message types
 */
export type Message = TextMessage | MediaMessage | LocationMessage | SystemMessage | TransactionMessage;

/**
 * Read receipt for a message
 */
export interface MessageReadReceipt {
  id: string;
  message_id: string;
  read_by_id: string;
  read_by_type: string;
  read_at: string;
  created_at: string;
  updated_at?: string;
}

/**
 * API response for messages
 */
export interface MessagesResponse {
  data: Message[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Request to send a new message
 */
export interface SendMessageRequest {
  interaction_id: string;
  recipient_id?: string;
  content?: string;
  message_type: MessageType;
  media_url?: string;
  media_type?: string;
  metadata?: Record<string, any>;
}

/**
 * Response for message creation
 */
export interface MessageResponse {
  message: Message;
  entities?: Record<string, Entity>; // Related entities
}

/**
 * Pending message for optimistic updates and offline queue
 */
export interface PendingMessage {
  localId: string; // Temporary local ID
  interaction_id: string;
  content?: string;
  message_type: MessageType;
  sender_entity_id: string;
  media_url?: string;
  media_type?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  status: MessageStatus;
  attempts: number;
  lastAttempt: number;
  error?: string;
}

/**
 * Mark message as read request
 */
export interface MarkMessageReadRequest {
  message_id: string;
} 