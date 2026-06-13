/**
 * @file server.ts
 * @module whatsapp-mcp
 * @description
 * MCP server simulating a WhatsApp Business API channel provider.
 * Exposes three tools:
 *   - send_whatsapp_message: queues a message and triggers async delivery simulation
 *   - get_delivery_status: returns current simulated status for a communication
 *   - get_channel_health: returns provider health metrics
 *
 * TRANSPORT: StreamableHTTP on POST /mcp
 * PORT: 4001 (local) or process.env.PORT (Railway)
 *
 * CONNECTED TO:
 * - CRM backend calls this via MCP client in channel-client.ts
 * - Fires callbacks back to CRM /api/webhooks/receipt
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import express from 'express';
import { simulateDelivery, CHANNEL_PROFILES } from '../shared/simulator.js';

const app = express();
app.use(express.json());

const server = new McpServer({
  name: 'xeno-whatsapp-channel',
  version: '1.0.0',
});

// In-memory status store for get_delivery_status
const statusStore = new Map<string, string>();

/**
 * @tool send_whatsapp_message
 * @description Simulates sending a WhatsApp message. Returns immediately with
 * "queued" status. Async delivery events fire back to crm_callback_url.
 */
server.tool(
  'send_whatsapp_message',
  {
    recipient_id: z.string().describe('CRM customer UUID'),
    recipient_phone: z.string().describe('E.164 phone number'),
    message: z.string().max(4096).describe('Message body text'),
    campaign_id: z.string().describe('CRM campaign UUID'),
    communication_id: z.string().describe('CRM communication record UUID'),
    crm_callback_url: z.string().url().describe('CRM webhook receipt endpoint'),
  },
  async (input) => {
    statusStore.set(input.communication_id, 'queued');

    simulateDelivery(
      { ...input, channel: 'whatsapp' },
      CHANNEL_PROFILES.whatsapp
    );

    // Update local status store as events fire
    // (status store is best-effort for get_delivery_status queries)
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'queued',
          communication_id: input.communication_id,
          provider: 'WhatsApp Business API (Simulated)',
          estimated_delivery_ms: CHANNEL_PROFILES.whatsapp.baseDelayMs,
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
          provider: 'WhatsApp Business API (Simulated)',
          status: 'healthy',
          deliveryRate: '94%',
          avgLatencyMs: CHANNEL_PROFILES.whatsapp.baseDelayMs,
          uptime: '99.9%',
        }),
      }],
    };
  }
);

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'xeno-whatsapp-mcp', port: process.env.PORT || 4001 });
});

// MCP transport
const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
app.post('/mcp', async (req, res) => {
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`[WhatsApp MCP] Running on port ${PORT}`);
});
