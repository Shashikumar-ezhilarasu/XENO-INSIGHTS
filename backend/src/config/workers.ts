// ============================================================
// FUTURE ENHANCEMENT: BullMQ Background Workers
// ============================================================
// Defines concurrency-controlled background workers for:
// - campaign-dispatch (concurrency 5)
// - webhook-processing (concurrency 10)
// - nudge (concurrency 3)
// All include exponential backoff retry (5 attempts, 1000ms base).
//
// CURRENT STATUS: Commented out — queue infrastructure deferred.
// Campaign dispatch and webhook processing run synchronously
// via direct async calls until this is re-enabled.
//
// TO ENABLE: Uncomment this file and uncomment the
// startAllWorkers() call in app.ts
// ============================================================

/*
import { Worker, Job } from 'bullmq';
import { redisConnection } from './queue';
import prisma from './prisma';

const STATUS_PRECEDENCE: Record<string, number> = {
  PENDING: 0,
  SENT: 1,
  DELIVERED: 2,
  OPENED: 3,
  READ: 4,
  CLICKED: 5,
  FAILED: 6
};

export async function runWebhookStateMachine(data: {
  communicationId: string;
  status: string;
  errorMsg?: string | null;
  orderValue?: number | null;
}) {
  const { communicationId, status, errorMsg, orderValue } = data;
  const upperStatus = status.toUpperCase();

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.communication.findUnique({
      where: { id: communicationId }
    });

    if (!existing) {
      throw new Error(`Communication record ${communicationId} not found.`);
    }

    const currentPrecedence = STATUS_PRECEDENCE[existing.status] ?? 0;
    const newPrecedence = STATUS_PRECEDENCE[upperStatus] ?? 0;

    if (newPrecedence > currentPrecedence) {
      const updated = await tx.communication.update({
        where: { id: communicationId },
        data: {
          status: upperStatus,
          errorMsg: errorMsg || null
        }
      });

      if (upperStatus === 'CLICKED') {
        const customer = await tx.customer.findUnique({
          where: { id: existing.customerId }
        });

        if (customer) {
          const finalOrderValue = orderValue ? Number(orderValue) : Math.floor(Math.random() * (4000 - 400 + 1) + 400);

          await tx.campaign.update({
            where: { id: existing.campaignId },
            data: {
              attributedOrders: { increment: 1 },
              attributedRevenue: { increment: finalOrderValue }
            }
          });
          console.log(`[Worker Webhook] Campaign ${existing.campaignId} attributed +1 Order ($${finalOrderValue})`);
        }
      }

      return { updated: true, record: updated };
    }

    return {
      updated: false,
      message: `Status update ignored. Current: ${existing.status}, Received: ${upperStatus}`,
      record: existing
    };
  });
}

export function startAllWorkers() {
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
  const channelServiceUrl = `${backendUrl}/api/channel/send`;

  // 1. Campaign Dispatch Worker
  const campaignDispatchWorker = new Worker('campaign-dispatch', async (job: Job) => {
    const { communicationId, recipientPhone, recipientEmail, recipientName, message, channel, imageUrl, buttons } = job.data;
    
    console.log(`[Worker Dispatch] Processing job ${job.id} for communication ${communicationId}`);
    
    const response = await fetch(channelServiceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communicationId,
        recipient: {
          name: recipientName,
          phone: recipientPhone,
          email: recipientEmail
        },
        channel,
        message,
        imageUrl,
        buttons
      })
    });

    if (!response.ok) {
      throw new Error(`Channel send failed: ${response.statusText}`);
    }

    // Update database communication log to SENT
    await prisma.communication.update({
      where: { id: communicationId },
      data: { status: 'SENT' }
    });
  }, {
    connection: redisConnection,
    concurrency: 5
  });

  // 2. Webhook Processing Worker
  const webhookProcessingWorker = new Worker('webhook-processing', async (job: Job) => {
    const { communicationId, status, errorMsg, orderValue } = job.data;
    console.log(`[Worker Webhook] Processing callback state update for ${communicationId} -> ${status}`);
    await runWebhookStateMachine({ communicationId, status, errorMsg, orderValue });
  }, {
    connection: redisConnection,
    concurrency: 10
  });

  // 3. Nudge Worker
  const nudgeWorker = new Worker('nudge', async (job: Job) => {
    const { customerId, message, channel, campaignId } = job.data;
    console.log(`[Worker Nudge] Dispatching nudge for customer ${customerId} via ${channel}`);

    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw new Error(`Customer ${customerId} not found for nudge.`);
    }

    // Create communication record in PENDING state
    const comm = await prisma.communication.create({
      data: {
        customerId: customer.id,
        campaignId: campaignId,
        channel: channel.toUpperCase(),
        status: 'PENDING'
      }
    });

    const response = await fetch(channelServiceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communicationId: comm.id,
        recipient: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email
        },
        channel: channel.toUpperCase(),
        message
      })
    });

    if (!response.ok) {
      throw new Error(`Nudge delivery stub failed: ${response.statusText}`);
    }

    // Update status to SENT
    await prisma.communication.update({
      where: { id: comm.id },
      data: { status: 'SENT' }
    });
  }, {
    connection: redisConnection,
    concurrency: 3
  });

  // Global failure handler for logging to DB dead letters and debug monitoring
  [campaignDispatchWorker, webhookProcessingWorker, nudgeWorker].forEach(worker => {
    worker.on('failed', async (job, err) => {
      console.error(`[Queue Error] Worker ${worker.name} failed on job ${job?.id}: ${err.message}`);
      
      try {
        if (job && job.queueName === 'campaign-dispatch') {
          const { communicationId } = job.data;
          await prisma.communication.update({
            where: { id: communicationId },
            data: {
              status: 'FAILED',
              errorMsg: err.message
            }
          });
        }
      } catch (dbErr: any) {
        console.error(`[Queue DB Error] Failed to update failed communication log: ${dbErr.message}`);
      }
    });
  });
}
*/

// Stub export so app.ts import does not break
export function startAllWorkers() {
  console.log('[Queue] Workers deferred — future enhancement. Running in direct async mode.');
}
