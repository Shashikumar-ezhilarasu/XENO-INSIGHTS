/**
 * @file server.ts
 * @module sms-mcp
 * @description
 * MCP server simulating an SMS Gateway channel provider.
 * Exposes three tools:
 *   - send_sms_message: queues a message and triggers async delivery simulation
 *   - get_delivery_status: returns current simulated status for a communication
 *   - get_channel_health: returns provider health metrics
 *
 * TRANSPORT: StreamableHTTP on POST /mcp
 * PORT: 4002 (local) or process.env.PORT (Railway)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import express from 'express';
import { simulateDelivery, CHANNEL_PROFILES } from '../shared/simulator.js';

const app = express();
app.use(express.json());

const server = new McpServer({
  name: 'xeno-sms-channel',
  version: '1.0.0',
});

// In-memory status store for get_delivery_status
const statusStore = new Map<string, string>();

/**
 * @tool send_sms_message
 * @description Simulates sending an SMS message. Returns immediately with
 * "queued" status. Async delivery events fire back to crm_callback_url.
 */
// @ts-ignore
server.tool(
  'send_sms_message',
  {
    recipient_id: z.string().describe('CRM customer UUID'),
    recipient_phone: z.string().describe('E.164 phone number'),
    message: z.string().max(1600).describe('Message body text'),
    campaign_id: z.string().describe('CRM campaign UUID'),
    communication_id: z.string().describe('CRM communication record UUID'),
    crm_callback_url: z.string().url().describe('CRM webhook receipt endpoint'),
  },
  async (input) => {
    statusStore.set(input.communication_id, 'queued');

    const isMultipart = input.message.length > 160;

    simulateDelivery(
      { ...input, channel: 'sms' },
      CHANNEL_PROFILES.sms
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'queued',
          communication_id: input.communication_id,
          provider: 'SMS Gateway (Simulated)',
          estimated_delivery_ms: CHANNEL_PROFILES.sms.baseDelayMs,
          warning: isMultipart ? 'Message exceeds 160 characters (multi-part SMS)' : undefined,
        }),
      }],
    };
  }
);

/**
 * @tool get_delivery_status
 * @description Returns last known simulated delivery status for a communication.
 */
// @ts-ignore
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
// @ts-ignore
server.tool(
  'get_channel_health',
  {},
  async () => {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          provider: 'SMS Gateway (Simulated)',
          status: 'healthy',
          deliveryRate: '91%',
          avgLatencyMs: CHANNEL_PROFILES.sms.baseDelayMs,
          uptime: '99.9%',
        }),
      }],
    };
  }
);

/**
 * @route GET /
 * @description Root health responder. Railway pings this to verify
 * the container is accepting connections. Without this, Railway
 * shows "Application failed to respond" in logs.
 */
app.get('/', (req, res) => {
  res.json({
    service: 'xeno-sms-mcp',
    version: '1.0.0',
    status: 'running',
    transport: 'MCP over Streamable HTTP',
    endpoints: {
      mcp: 'POST /mcp',
      health: 'GET /health',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route GET /health
 * @description Railway health check endpoint.
 * Railway's health check system pings this every 30 seconds.
 * Returns 200 with service metadata to keep the container warm.
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'xeno-sms-mcp',
    uptime: process.uptime(),
    memory: process.memoryUsage().heapUsed,
    timestamp: new Date().toISOString(),
  });
});

// Standard HTTP fallback endpoint for testing callback loop without MCP transport bugs
app.post('/send', (req, res) => {
  statusStore.set(req.body.communication_id, 'queued');
  simulateDelivery(
    { ...req.body, channel: 'sms' },
    CHANNEL_PROFILES.sms
  );
  res.json({ status: 'queued', communication_id: req.body.communication_id });
});

// MCP transport
const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
server.connect(transport).catch(console.error);

app.post('/mcp', async (req, res) => {
  await transport.handleRequest(req, res, req.body);
});

// Read PORT from Railway environment — Railway sets this automatically
// Bind to 0.0.0.0 — required for Railway container routing
// localhost binds are rejected by Railway's internal proxy
const PORT = parseInt(process.env.PORT || '4002', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log(`  XENO SMS MCP Service`);
  console.log(`  Port: ${PORT}`);
  console.log(`  MCP endpoint: POST /mcp`);
  console.log(`  Health: GET /health`);
  console.log(`  Transport: Streamable HTTP`);
  console.log('========================================');
});
