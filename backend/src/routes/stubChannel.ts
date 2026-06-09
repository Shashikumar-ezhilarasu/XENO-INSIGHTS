import { Router, Request, Response } from 'express';

const router = Router();

interface CallbackPayload {
  communicationId: string;
  status: 'DELIVERED' | 'OPENED' | 'CLICKED' | 'FAILED';
  errorMsg?: string;
  timestamp: string;
}

/**
 * Helper to trigger the webhook callback with a basic retry framework (up to 3 retries) and exponential backoff.
 */
async function sendWebhookWithRetry(
  callbackUrl: string, 
  payload: CallbackPayload, 
  attempt: number = 1
): Promise<void> {
  const maxRetries = 3;
  const baseDelayMs = 1000;

  try {
    console.log(`[Webhook Client] Attempt ${attempt} sending callback "${payload.status}" for ${payload.communicationId} to ${webhookUrlFormat(callbackUrl)}`);
    
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`[Webhook Client] Callback "${payload.status}" succeeded for ${payload.communicationId} on attempt ${attempt}.`);
      return;
    }

    console.warn(`[Webhook Client] Callback "${payload.status}" returned non-200 status (${response.status}) on attempt ${attempt}.`);
    
    if (attempt < maxRetries) {
      const backoffDelay = baseDelayMs * Math.pow(2, attempt);
      setTimeout(() => {
        sendWebhookWithRetry(callbackUrl, payload, attempt + 1);
      }, backoffDelay);
    }

  } catch (error: any) {
    console.error(`[Webhook Client] Connection error on attempt ${attempt} for callback "${payload.status}":`, error.message);
    
    if (attempt < maxRetries) {
      const backoffDelay = baseDelayMs * Math.pow(2, attempt);
      setTimeout(() => {
        sendWebhookWithRetry(callbackUrl, payload, attempt + 1);
      }, backoffDelay);
    }
  }
}

function webhookUrlFormat(url: string) {
  try {
    const u = new URL(url);
    return u.pathname;
  } catch (e) {
    return url;
  }
}

/**
 * POST /api/stub/channel-send
 * Simulates receiving transmission payloads and fires sequential webhooks.
 * Body: { communicationId, recipient, channel, message, imageUrl, buttons }
 */
router.post('/channel-send', (req: Request, res: Response) => {
  const { communicationId, channel, buttons } = req.body;

  if (!communicationId || !channel) {
    return res.status(400).json({ error: 'communicationId and channel are required.' });
  }

  // Acknowledge receipt of payload instantly.
  res.status(200).json({ success: true, message: 'Message accepted by channel service.' });

  // Dynamic server port to send webhook back to CRM.
  const port = process.env.PORT || 3000;
  const webhookUrl = `http://localhost:${port}/api/webhooks/channel-callback`;

  // Start sequential lifecycle callback updates
  const hasButtons = Boolean(buttons && Array.isArray(buttons) && buttons.length > 0);

  // 1. First step: DELIVERED or FAILED (after 1.5s)
  setTimeout(async () => {
    const isSuccessful = Math.random() < 0.90; // 90% delivery rate

    if (!isSuccessful) {
      // Dispatch FAILED callback
      await sendWebhookWithRetry(webhookUrl, {
        communicationId,
        status: 'FAILED',
        errorMsg: 'Handset unreachable or invalid subscriber number.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Dispatch DELIVERED callback
    await sendWebhookWithRetry(webhookUrl, {
      communicationId,
      status: 'DELIVERED',
      timestamp: new Date().toISOString()
    });

    // 2. Second step: OPENED (after another 1.5s, 80% probability)
    setTimeout(async () => {
      const isOpened = Math.random() < 0.80;
      if (!isOpened) return;

      await sendWebhookWithRetry(webhookUrl, {
        communicationId,
        status: 'OPENED',
        timestamp: new Date().toISOString()
      });

      // 3. Third step: CLICKED (after another 1.5s, 50% probability if has buttons or links)
      setTimeout(async () => {
        const isClicked = Math.random() < (hasButtons ? 0.70 : 0.40); // higher click rate with rich media buttons
        if (!isClicked) return;

        await sendWebhookWithRetry(webhookUrl, {
          communicationId,
          status: 'CLICKED',
          timestamp: new Date().toISOString()
        });

      }, 1500);

    }, 1500);

  }, 1500);
});

export default router;
