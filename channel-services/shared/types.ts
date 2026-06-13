/**
 * @file types.ts
 * @module channel-services/shared
 * @description
 * Shared type definitions used across all three MCP channel servers.
 * Defines the send payload, callback payload, and delivery event shapes.
 *
 * ARCHITECTURE NOTE:
 * All three MCP servers share identical input/output contracts so the
 * CRM client can call any of them interchangeably using the same
 * callTool() invocation shape.
 */

export interface SendMessageInput {
  recipient_id: string;
  recipient_phone: string;
  recipient_email?: string;
  message: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'rcs';
  campaign_id: string;
  communication_id: string;
  crm_callback_url: string;
}

export interface DeliveryEvent {
  status: 'sent' | 'delivered' | 'failed' | 'opened' | 'read' | 'clicked' | 'converted';
  delayMs: number;
}

export interface CallbackPayload {
  communication_id: string;
  campaign_id: string;
  recipient_id: string;
  channel: string;
  status: string;
  timestamp: string;
  provider: string;
}
