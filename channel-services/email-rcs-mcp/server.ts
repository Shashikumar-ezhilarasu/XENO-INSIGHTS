/**
 * @file server.ts
 * @module email-rcs-mcp
 * @description
 * MCP server simulating an Email and RCS channel provider.
 * Exposes tools:
 *   - send_email_message: queues an email message and triggers async delivery simulation
 *   - send_rcs_message: queues an RCS message
 *   - get_delivery_status: returns current simulated status for a communication
 *   - get_channel_health: returns provider health metrics
 *
 * TRANSPORT: StreamableHTTP on POST /mcp
 * PORT: 4003 (local) or process.env.PORT (Railway)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import express from 'express';
import { simulateDelivery, CHANNEL_PROFILES } from '../shared/simulator.js';

const app = express();
app.use(express.json());

const server = new McpServer({
  name: 'xeno-email-rcs-channel',
  version: '1.0.0',
});

// In-memory status store for get_delivery_status
const statusStore = new Map<string, string>();

/**
 * @tool send_email_message
 * @description Simulates sending an Email message. Returns immediately with
 * "queued" status. Async delivery events fire back to crm_callback_url.
 */
server.tool(
  'send_email_message',
  {
    recipient_id: z.string().describe('CRM customer UUID'),
    recipient_phone: z.string().describe('E.164 phone number (ignored for email)').optional(),
    recipient_email: z.string().email().describe('Email address'),
    subject: z.string().optional().describe('Email subject line'),
    message: z.string().describe('Message body text/HTML'),
    campaign_id: z.string().describe('CRM campaign UUID'),
    communication_id: z.string().describe('CRM communication record UUID'),
    crm_callback_url: z.string().url().describe('CRM webhook receipt endpoint'),
  },
  async (input) => {
    statusStore.set(input.communication_id, 'queued');

    simulateDelivery(
      { ...input, recipient_phone: input.recipient_phone || '', channel: 'email' },
      CHANNEL_PROFILES.email
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'queued',
          communication_id: input.communication_id,
          provider: 'Email SMTP (Simulated)',
          estimated_delivery_ms: CHANNEL_PROFILES.email.baseDelayMs,
        }),
      }],
    };
  }
);

/**
 * @tool send_rcs_message
 * @description Simulates sending an RCS Business message. Returns immediately with
 * "queued" status. Async delivery events fire back to crm_callback_url.
 */
server.tool(
  'send_rcs_message',
  {
    recipient_id: z.string().describe('CRM customer UUID'),
    recipient_phone: z.string().describe('E.164 phone number'),
    message: z.string().describe('Message body text/RCS payload'),
    campaign_id: z.string().describe('CRM campaign UUID'),
    communication_id: z.string().describe('CRM communication record UUID'),
    crm_callback_url: z.string().url().describe('CRM webhook receipt endpoint'),
  },
  async (input) => {
    statusStore.set(input.communication_id, 'queued');

    simulateDelivery(
      { ...input, channel: 'rcs' },
      CHANNEL_PROFILES.rcs
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'queued',
          communication_id: input.communication_id,
          provider: 'RCS Business Messaging (Simulated)',
          estimated_delivery_ms: CHANNEL_PROFILES.rcs.baseDelayMs,
        }),
      }],
    };
  }
);

/**
 * @tool get_delivery_status
 * @description Returns last known simulated delivery status for a communication.
 */
server.tool(
  'get_delivery_status',
  { communication_id: z.string() },
  async ({ communication_id }) => {
    const status = statusStore.get(communication_id) || 'unknown';
    return {
      content: [{ type: 'text', text: JSON.stringify({ communication_id, status }) }],
    };
  }
);

/**
 * @tool get_channel_health
 * @description Returns simulated provider health metrics for the AI Marketplace.
 */
server.tool(
  'get_channel_health',
  {},
  async () => {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          provider: 'Email & RCS Gateways (Simulated)',
          status: 'healthy',
          deliveryRates: { email: '68%', rcs: '87%' },
          uptime: '99.9%',
        }),
      }],
    };
  }
);

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'xeno-email-rcs-mcp', port: process.env.PORT || 4003 });
});

// MCP transport
const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
app.post('/mcp', async (req, res) => {
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => {
  console.log(`[Email+RCS MCP] Running on port ${PORT}`);
});
