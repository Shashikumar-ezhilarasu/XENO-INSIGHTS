import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Define the routes for our 3 MCP remote servers
const MCP_ROUTES: Record<string, string> = {
  WHATSAPP: process.env.MCP_WHATSAPP_URL || 'http://localhost:4001/mcp',
  SMS: process.env.MCP_SMS_URL || 'http://localhost:4002/mcp',
  EMAIL: process.env.MCP_EMAIL_RCS_URL || 'http://localhost:4003/mcp',
  RCS: process.env.MCP_EMAIL_RCS_URL || 'http://localhost:4003/mcp',
};

/**
 * Route a message dispatch to the correct MCP Channel Server
 */
export async function dispatchToChannelMcp(payload: any): Promise<any> {
  const channel = (payload.channel || 'SMS').toUpperCase();
  const endpoint = MCP_ROUTES[channel];
  
  if (!endpoint) {
    throw new Error(`No MCP route configured for channel: ${channel}`);
  }

  const transport = new StreamableHTTPClientTransport(new URL(endpoint));
  const client = new Client(
    { name: 'xeno-crm-client', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);

    // Map the tool name based on channel
    let toolName = 'send_sms_message';
    if (channel === 'WHATSAPP') toolName = 'send_whatsapp_message';
    else if (channel === 'EMAIL' || channel === 'RCS') toolName = 'send_email_rcs_message';

    // The backend URL where webhooks should be sent back to
    const crmCallbackUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/webhooks/receipt`;

    console.log(`[MCP Router] Dispatching to ${endpoint} via tool ${toolName}`);

    // Call the tool on the remote MCP server
    const result = await client.callTool({
      name: toolName,
      arguments: {
        recipient_id: payload.recipientId || payload.customerId || 'unknown',
        recipient_phone: payload.recipientPhone || '+1234567890',
        message: payload.message,
        campaign_id: payload.campaignId || 'manual',
        communication_id: payload.communicationId,
        crm_callback_url: crmCallbackUrl
      }
    });

    return result;
  } catch (err: any) {
    console.error(`[MCP Router Error] Failed to dispatch to ${channel}:`, err.message);
    throw err;
  } finally {
    // Attempt to close transport if possible, though streamableHttp handles connection lifecycle per-request mostly
  }
}
