import { Message, MessageType, MediaType } from './message.types';

export type TimelineItemType = 'transaction' | 'message' | 'date' | 'system_event';

// This interface combines both frontend (itemType) and backend (type) naming conventions
export interface BaseTimelineItem {
  id: string;
  interaction_id?: string;
  itemType?: TimelineItemType; // Frontend format
  type?: TimelineItemType;    // Backend format
  timestamp?: string;        // Frontend format - ISO 8601 date string
  createdAt?: string;        // Backend format - ISO 8601 date string
  metadata?: Record<string, any>;
}

export interface MessageTimelineItem extends BaseTimelineItem {
  itemType?: 'message';
  type?: 'message';
  interaction_id: string;
  sender_entity_id: string;
  content?: string;
  message_type?: MessageType;
  media_url?: string;
  media_type?: MediaType;
  is_system_generated?: boolean;
  sender?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  /**
   * Client-side / persisted status of the message lifecycle.
   * sending  – optimistic, not confirmed by API yet
   * sent      – API has accepted and stored the message
   * delivered – recipient device has acknowledged receipt
   * read      – recipient has opened the message
   * failed    – permanent error while sending
   */
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface TransactionTimelineItem extends BaseTimelineItem {
  itemType?: 'transaction';
  type?: 'transaction';
  transaction_id?: string;
  transaction_type?: 'payment' | 'request' | 'refund' | 'chargeback' | 'fee';
  status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'reversed';
  amount: number;
  currency_code?: string;
  description?: string;
  /**
   * Entity identifiers for the sender/recipient when they are returned
   * directly by the API rather than nested in related_entities.
   */
  from_entity_id?: string;
  to_entity_id?: string;
  related_entities?: {
    sender_entity_id?: string;
    recipient_entity_id?: string;
  };
}

export interface DateSeparatorTimelineItem extends BaseTimelineItem {
  itemType?: 'date';
  type?: 'date';
  date_string: string; // e.g., "Today", "Yesterday", "May 10, 2025"
}

export interface SystemEventTimelineItem extends BaseTimelineItem {
  itemType?: 'system_event';
  type?: 'system_event';
  event_type: string; // e.g., 'interaction_created', 'member_joined', 'name_changed'
  description: string;
}

export type TimelineItem = 
  | MessageTimelineItem 
  | TransactionTimelineItem 
  | DateSeparatorTimelineItem 
  | SystemEventTimelineItem;

export interface TimelineResponse {
  items: TimelineItem[];
  pagination?: {
    next_cursor?: string;
    has_more: boolean;
  };
} 