import { Router, Request, Response } from 'express';

const router = Router();

interface CallbackPayload {
  communicationId: string;
  status: 'DELIVERED' | 'OPENED' | 'FAILED';
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
  const baseDelayMs = 1000; // 1 second base delay

  try {
    console.log(`[Webhook Client] Attempt ${attempt} sending callback for ${payload.communicationId} to ${callbackUrl}`);
    
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`[Webhook Client] Callback succeeded for ${payload.communicationId} on attempt ${attempt}.`);
      return;
    }

    console.warn(`[Webhook Client] Callback returned non-200 status (${response.status}) on attempt ${attempt}.`);
    
    if (attempt < maxRetries) {
      const backoffDelay = baseDelayMs * Math.pow(2, attempt); // 2s, 4s, 8s...
      console.log(`[Webhook Client] Scheduling retry in ${backoffDelay}ms...`);
      setTimeout(() => {
        sendWebhookWithRetry(callbackUrl, payload, attempt + 1);
      }, backoffDelay);
    } else {
      console.error(`[Webhook Client] Max retries (${maxRetries}) reached. Callback failed for ${payload.communicationId}.`);
    }

  } catch (error: any) {
    console.error(`[Webhook Client] Connection error on attempt ${attempt} for ${payload.communicationId}:`, error.message);
    
    if (attempt < maxRetries) {
      const backoffDelay = baseDelayMs * Math.pow(2, attempt);
      console.log(`[Webhook Client] Scheduling retry in ${backoffDelay}ms...`);
      setTimeout(() => {
        sendWebhookWithRetry(callbackUrl, payload, attempt + 1);
      }, backoffDelay);
    } else {
      console.error(`[Webhook Client] Max retries (${maxRetries}) reached. Callback failed for ${payload.communicationId}.`);
    }
  }
}

/**
 * POST /api/stub/channel-send
 * Simulates receiving transmission payloads.
 * Body: { communicationId: string, recipient: { name, phone, email }, channel: string, message: string }
 */
router.post('/channel-send', (req: Request, res: Response) => {
  const { communicationId, recipient, channel, message } = req.body;

  if (!communicationId || !channel) {
    return res.status(400).json({ error: 'communicationId and channel are required.' });
  }

  // Acknowledge receipt of payload instantly.
  res.status(200).json({ success: true, message: 'Message accepted by channel service.' });

  // Dynamic server port to send webhook back to CRM.
  const port = process.env.PORT || 3000;
  const webhookUrl = `http://localhost:${port}/api/webhooks/channel-callback`;

  /**
   * DESIGN CHOICE (Simulating network delay & probability distributions):
   * We use setTimeout to simulate an asynchronous network propagation delay (1.5 seconds).
   * Once triggered, we use random probabilities to assign status:
   *  - 80% DELIVERED
   *  - 10% OPENED
   *  - 10% FAILED
   */
  const simulatedDelayMs = 1500;
  setTimeout(async () => {
    try {
      const rand = Math.random();
      let status: 'DELIVERED' | 'OPENED' | 'FAILED';
      let errorMsg: string | undefined;

      if (rand < 0.80) {
        status = 'DELIVERED';
      } else if (rand < 0.90) {
        status = 'OPENED';
      } else {
        status = 'FAILED';
        errorMsg = 'Channel transmission error: Subscriber handset out of range or blocked.';
      }

      console.log(`[Mock Channel] Transmission complete for ${communicationId}. Outcome: ${status}`);

      const payload: CallbackPayload = {
        communicationId,
        status,
        errorMsg,
        timestamp: new Date().toISOString()
      };

      // Trigger the webhook callback back to the CRM receiver.
      // This runs asynchronously in the background.
      await sendWebhookWithRetry(webhookUrl, payload);

    } catch (err) {
      console.error('[Mock Channel] Unexpected error in background simulation:', err);
    }
  }, simulatedDelayMs);
});

export default router;
