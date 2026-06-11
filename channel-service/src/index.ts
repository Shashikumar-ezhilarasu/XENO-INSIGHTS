import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// The CRM's receipt endpoint
const CRM_WEBHOOK_URL = 'http://localhost:3000/api/webhooks/channel-callback';

// Exponential backoff retry utility
async function sendWebhookWithRetry(payload: any, maxRetries = 4) {
  const delays = [1000, 2000, 4000, 8000]; // 1s, 2s, 4s, 8s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await axios.post(CRM_WEBHOOK_URL, payload);
      console.log(`[Channel Service] Successfully posted status ${payload.status} for ${payload.communicationId}`);
      return;
    } catch (error: any) {
      console.log(`[Channel Service] Webhook POST failed for ${payload.communicationId} (attempt ${attempt + 1}/${maxRetries}): ${error.message}`);
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  console.error(`[Channel Service] FATAL: Max retries exceeded for ${payload.communicationId}`, {
    communicationId: payload.communicationId,
    status: payload.status,
    error: "max retries exceeded",
    timestamp: new Date().toISOString()
  });
}

// POST /send endpoint
app.post('/send', async (req: Request, res: Response) => {
  const { communicationId, recipient, message, channel } = req.body;

  if (!communicationId || !recipient) {
    return res.status(400).json({ error: 'communicationId and recipient are required' });
  }

  // Acknowledge receipt immediately (202 Accepted)
  res.status(202).json({ success: true, message: 'Message queued for dispatch' });

  console.log(`[Channel Service] Queued message dispatch for ${communicationId} on ${channel}`);

  // Determine if this delivery fails (10% chance)
  const isFailure = Math.random() < 0.10;

  if (isFailure) {
    // Immediate FAILED callback
    const failureReasons = ["invalid_number", "carrier_rejection", "inbox_full"];
    const randomReason = failureReasons[Math.floor(Math.random() * failureReasons.length)];
    
    setTimeout(() => {
      sendWebhookWithRetry({
        communicationId,
        status: 'FAILED',
        errorMsg: randomReason,
        timestamp: new Date().toISOString()
      });
    }, 1000);
    
    return; // No further progression
  }

  // Happy-path progression
  const hasButtons = message && message.toLowerCase().includes('button');

  // 1. DELIVERED
  setTimeout(() => {
    sendWebhookWithRetry({
      communicationId,
      status: 'DELIVERED',
      timestamp: new Date().toISOString()
    });
  }, 2000 + Math.random() * 2000);

  // 2. OPENED
  setTimeout(() => {
    sendWebhookWithRetry({
      communicationId,
      status: 'OPENED',
      timestamp: new Date().toISOString()
    });
  }, 4000 + Math.random() * 2000);

  // 3. READ (Gap 6: Add READ as distinct state)
  setTimeout(() => {
    sendWebhookWithRetry({
      communicationId,
      status: 'READ',
      timestamp: new Date().toISOString()
    });
  }, 6000 + Math.random() * 2000);

  // 4. CLICKED
  setTimeout(() => {
    // Higher click rate if the message contains rich media/buttons
    const isClicked = Math.random() < (hasButtons ? 0.70 : 0.40);
    if (isClicked) {
      sendWebhookWithRetry({
        communicationId,
        status: 'CLICKED',
        timestamp: new Date().toISOString()
      });
    }
  }, 9000 + Math.random() * 4000);

});

app.listen(PORT, () => {
  console.log(`[Channel Service] Standalone Mock Channel microservice running on port ${PORT}`);
});
