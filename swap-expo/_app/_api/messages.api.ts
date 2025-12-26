/**
 * Messages API Service
 *
 * Professional API integration for message operations.
 * Follows backend DTOs and response structures exactly.
 *
 * Backend endpoints:
 * - POST /api/v1/messages/direct - Create direct message
 * - GET /api/v1/messages/interaction/:id - Get messages for interaction
 */

import apiClient from './apiClient';
import { API_PATHS } from './apiPaths';
import { MessageType } from '../types/message.types';

/**
 * CreateDirectMessageDto
 * Matches backend: @kekpa/shared-infra/dto/message.dto.ts
 *
 * Uses from_entity_id/to_entity_id for consistency with transaction_ledger
 */
export interface CreateDirectMessageRequest {
  to_entity_id: string;           // Who receives the message (aligned with transaction_ledger)
  from_entity_id?: string;        // Who sends (optional - from JWT if not provided)
  content?: string;
  message_type: MessageType;
  media_url?: string;
  media_type?: 'image' | 'video' | 'audio' | 'file';
  metadata?: Record<string, any>;
  idempotency_key: string;        // Required for production reliability
}

/**
 * DirectMessageResponse
 * Matches backend response structure from MessagesGatewayService
 *
 * Uses from_entity_id/to_entity_id for consistency with transaction_ledger
 */
export interface DirectMessageResponse {
  message: {
    id: string;
    interaction_id: string;
    from_entity_id: string;       // Who sent (aligned with transaction_ledger)
    to_entity_id?: string;        // Who receives (aligned with transaction_ledger)
    content: string;
    message_type: MessageType;
    media_url?: string;
    media_type?: string;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
    is_system_generated: boolean;
  };
  interaction: {
    id: string;
    is_group: boolean;
    created_at: string;
    updated_at: string;
  };
}

/**
 * MessagesApiService
 *
 * Professional service for message operations.
 * Uses real backend endpoints - no mocks, no fallbacks.
 */
export class MessagesApiService {
  /**
   * Send a direct message to another entity
   *
   * Endpoint: POST /api/v1/messages/direct
   *
   * Flow:
   * 1. API Gateway validates sender (from JWT)
   * 2. Finds or creates direct interaction
   * 3. Proxies to Messages microservice
   * 4. Returns message + interaction details
   *
   * Uses from_entity_id/to_entity_id for consistency with transaction_ledger
   *
   * @param request Message data with to_entity_id
   * @returns Promise with created message and interaction
   * @throws Error if API call fails
   */
  static async sendDirectMessage(
    request: CreateDirectMessageRequest
  ): Promise<DirectMessageResponse> {
    const response = await apiClient.post(
      API_PATHS.MESSAGE.CREATE,
      request
    );

    // Clean single-wrap: Axios wraps response in .data
    // Backend returns: {message: {...}, interaction: {...}}
    // So response.data = {message, interaction}
    return response.data as DirectMessageResponse;
  }

  /**
   * Get messages for an interaction
   *
   * Endpoint: GET /api/v1/messages/interaction/:interactionId
   *
   * @param interactionId ID of the interaction
   * @param options Pagination options
   * @returns Promise with paginated messages
   */
  static async getMessagesForInteraction(
    interactionId: string,
    options?: {
      limit?: number;
      before?: string; // ISO 8601 timestamp
    }
  ): Promise<{
    items: any[];
    pagination: {
      hasMore: boolean;
      nextCursor?: string;
      total: number;
    };
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.before) params.append('before', options.before);

    const url = `${API_PATHS.MESSAGE.LIST_FOR_INTERACTION(interactionId)}?${params.toString()}`;
    const response = await apiClient.get(url);

    return response.data;
  }
}

export default MessagesApiService;
