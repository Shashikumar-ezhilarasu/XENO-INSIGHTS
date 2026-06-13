import { Router, Request, Response } from 'express';
import { dispatchToChannelMcp } from '../services/mcp-client';

const router = Router();

// Internal route for dispatching messages
router.post('/send', async (req: Request, res: Response) => {
  const { communicationId, recipientPhone, recipientEmail, message, channel } = req.body;

  if (!communicationId) {
    return res.status(400).json({ error: 'communicationId is required' });
  }

  try {
    // Immediately respond 202 Accepted to the queue or CRM dispatcher
    res.status(202).json({ success: true, message: 'Message accepted for MCP routing' });

    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // Dispatch the payload to the appropriate remote MCP server
    await dispatchToChannelMcp(req.body);
    
    console.log(`[Channel Router] Successfully routed communication ${communicationId} via MCP`);
  } catch (error: any) {
    console.error(`[Channel Router] Failed to route communication ${communicationId}:`, error.message);
  }
});

export default router;
