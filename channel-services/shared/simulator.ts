/**
 * @file simulator.ts
 * @module channel-services/shared
 * @description
 * Shared async delivery simulator used by all MCP channel servers.
 * Builds a probabilistic event chain (sent → delivered → opened → clicked)
 * and fires each event as an HTTP callback to the CRM receipt endpoint.
 *
 * DELIVERY PROBABILITIES (configurable per channel via channelProfile):
 * - WhatsApp: 94% delivery, 72% open, 35% click, 12% convert
 * - SMS:      91% delivery, 48% open, 20% click, 8% convert
 * - Email:    68% delivery, 22% open, 12% click, 5% convert
 * - RCS:      87% delivery, 61% open, 28% click, 10% convert
 *
 * RETRY LOGIC:
 * Each callback fire retries up to 3 times with exponential backoff
 * (1s, 2s, 4s) before giving up. Failed retries are logged to stdout
 * for Railway log capture.
 *
 * ARCHITECTURE NOTE:
 * simulateDelivery() returns immediately after scheduling — it is
 * deliberately non-blocking so the MCP tool returns a fast "queued"
 * response to the CRM while delivery events fire asynchronously.
 */

import { DeliveryEvent, CallbackPayload, SendMessageInput } from './types.js';

export interface ChannelProfile {
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  convertRate: number;
  baseDelayMs: number;
  provider: string;
}

export const CHANNEL_PROFILES: Record<string, ChannelProfile> = {
  whatsapp: {
    deliveryRate: 0.94,
    openRate: 0.72,
    clickRate: 0.35,
    convertRate: 0.12,
    baseDelayMs: 800,
    provider: 'WhatsApp Business API (Simulated)',
  },
  sms: {
    deliveryRate: 0.91,
    openRate: 0.48,
    clickRate: 0.20,
    convertRate: 0.08,
    baseDelayMs: 500,
    provider: 'SMS Gateway (Simulated)',
  },
  email: {
    deliveryRate: 0.68,
    openRate: 0.22,
    clickRate: 0.12,
    convertRate: 0.05,
    baseDelayMs: 1200,
    provider: 'Email SMTP (Simulated)',
  },
  rcs: {
    deliveryRate: 0.87,
    openRate: 0.61,
    clickRate: 0.28,
    convertRate: 0.10,
    baseDelayMs: 600,
    provider: 'RCS Business Messaging (Simulated)',
  },
};

export function buildEventChain(profile: ChannelProfile): DeliveryEvent[] {
  const events: DeliveryEvent[] = [];
  let cumulativeDelay = 0;

  // Always sent first
  cumulativeDelay += profile.baseDelayMs;
  events.push({ status: 'sent', delayMs: cumulativeDelay });

  if (Math.random() < profile.deliveryRate) {
    cumulativeDelay += profile.baseDelayMs * 1.5;
    events.push({ status: 'delivered', delayMs: cumulativeDelay });

    if (Math.random() < profile.openRate) {
      cumulativeDelay += 2000 + Math.random() * 3000;
      events.push({ status: 'opened', delayMs: cumulativeDelay });

      if (Math.random() < profile.openRate * 0.8) {
        cumulativeDelay += 1000;
        events.push({ status: 'read', delayMs: cumulativeDelay });
      }

      if (Math.random() < profile.clickRate) {
        cumulativeDelay += 1500 + Math.random() * 2000;
        events.push({ status: 'clicked', delayMs: cumulativeDelay });

        if (Math.random() < profile.convertRate) {
          cumulativeDelay += 3000;
          events.push({ status: 'converted', delayMs: cumulativeDelay });
        }
      }
    }
  } else {
    cumulativeDelay += profile.baseDelayMs;
    events.push({ status: 'failed', delayMs: cumulativeDelay });
  }

  return events;
}

async function fireCallbackWithRetry(
  url: string,
  payload: CallbackPayload,
  attempt = 1
): Promise<void> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log(`[${payload.provider}] Callback fired: ${payload.status} for ${payload.communication_id}`);
  } catch (err) {
    if (attempt <= 3) {
      const backoff = Math.pow(2, attempt) * 1000;
      console.warn(`[${payload.provider}] Callback attempt ${attempt} failed, retrying in ${backoff}ms`);
      await delay(backoff);
      return fireCallbackWithRetry(url, payload, attempt + 1);
    }
    console.error(`[${payload.provider}] All callback retries exhausted for ${payload.communication_id}`);
  }
}

export function simulateDelivery(input: SendMessageInput, profile: ChannelProfile): void {
  // Non-blocking — schedules async chain and returns immediately
  (async () => {
    const events = buildEventChain(profile);

    for (const event of events) {
      await delay(event.delayMs);
      const payload: CallbackPayload = {
        communication_id: input.communication_id,
        campaign_id: input.campaign_id,
        recipient_id: input.recipient_id,
        channel: input.channel,
        status: event.status,
        timestamp: new Date().toISOString(),
        provider: profile.provider,
      };
      await fireCallbackWithRetry(input.crm_callback_url, payload);
    }
  })();
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
