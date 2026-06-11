import { Router, Request, Response } from 'express';

const router = Router();

async function sendWebhookWithRetry(url: string, payload: any, attempt: number = 1): Promise<void> {
  const maxAttempts = 4;
  
  console.log(JSON.stringify({
    communicationId: payload.communicationId,
    status: payload.status,
    attempt,
    timestamp: new Date().toISOString()
  }));

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer webhook_secret_123'
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      throw new Error(`Webhook returned status ${res.status}`);
    }
  } catch (error: any) {
    if (attempt < maxAttempts) {
      const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s, 8s
      setTimeout(() => {
        sendWebhookWithRetry(url, payload, attempt + 1);
      }, backoffMs);
    } else {
      console.error(`[Channel Simulation] Webhook delivery failed after 4 attempts for ${payload.communicationId}`);
    }
  }
}

// Internal route for dispatching messages
router.post('/send', (req: Request, res: Response) => {
  const { communicationId, recipientPhone, recipientEmail, message, channel } = req.body;

  if (!communicationId) {
    return res.status(400).json({ error: 'communicationId is required' });
  }

  // Immediately respond 202 Accepted
  res.status(202).json({ success: true, message: 'Message accepted for delivery' });

  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
  const webhookUrl = `${backendUrl}/api/webhooks/receipt`;

  // Helper to generate random delay between min/max seconds
  const delay = (min: number, max: number) => Math.floor(Math.random() * (max * 1000 - min * 1000 + 1) + min * 1000);

  // 3. After 1-2s: DELIVERED
  setTimeout(() => {
    sendWebhookWithRetry(webhookUrl, { communicationId, status: "DELIVERED" });
  }, delay(1, 2));

  // 4. After 3-5s: OPENED
  setTimeout(() => {
    sendWebhookWithRetry(webhookUrl, { communicationId, status: "OPENED" });
  }, delay(3, 5));

  // 5. After 6-9s: READ
  setTimeout(() => {
    sendWebhookWithRetry(webhookUrl, { communicationId, status: "READ" });
  }, delay(6, 9));

  // 6. After 10-14s: 80% CLICKED, 10% FAILED, 10% stop at READ
  setTimeout(() => {
    const roll = Math.random() * 100;
    
    if (roll < 80) {
      const orderValue = Math.floor(Math.random() * (4000 - 400 + 1) + 400);
      sendWebhookWithRetry(webhookUrl, { communicationId, status: "CLICKED", orderValue });
    } else if (roll >= 80 && roll < 90) {
      const reasons = ["invalid_number", "carrier_rejection", "inbox_full"];
      const failureReason = reasons[Math.floor(Math.random() * reasons.length)];
      sendWebhookWithRetry(webhookUrl, { communicationId, status: "FAILED", errorMsg: failureReason });
    }
    // remaining 10% do nothing (stop at READ)
  }, delay(10, 14));
});

export default router;
