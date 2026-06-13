import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import crypto from 'crypto';
// import { webhookProcessingQueue } from '../config/queue';
import { validateWebhookCallback } from '../middleware/security';

const router = Router();

// Define logical precedence for communication statuses to prevent race conditions
const STATUS_PRECEDENCE: Record<string, number> = {
  PENDING: 0,
  SENT: 1,
  DELIVERED: 2,
  OPENED: 3,
  READ: 4,
  CLICKED: 5,
  FAILED: 6
};

/**
 * POST /api/webhooks/channel-callback
 * Consumes real-time webhook updates from the mock channel.
 * Body: { communicationId: string, status: string, errorMsg?: string, timestamp: string }
 */
router.post(['/receipt', '/channel-callback'], validateWebhookCallback, async (req: Request, res: Response) => {
  const webhookSecret = process.env.NODE_ENV === 'production' ? (process.env.WEBHOOK_SECRET || '') : '';
  if (webhookSecret) {
    const signature = req.headers['x-webhook-signature'] as string;
    if (!signature) {
      return res.status(401).json({ error: 'Unauthorized. Missing webhook signature.' });
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return res.status(401).json({ error: 'Unauthorized. Invalid signature.' });
    }
  }

  const { communicationId, status, errorMsg, orderValue } = req.body;

  if (!communicationId || !status) {
    return res.status(400).json({ error: 'communicationId and status are required fields.' });
  }

  const upperStatus = status.toUpperCase();
  if (STATUS_PRECEDENCE[upperStatus] === undefined) {
    return res.status(400).json({ error: `Invalid status: ${status}` });
  }

  // FUTURE ENHANCEMENT: Queue-based webhook processing
  // When queue infrastructure is re-enabled, replace the direct
  // processing below with:
  //
  // try {
  //   const job = await webhookProcessingQueue.add(`webhook-${communicationId}-${upperStatus}`, {
  //     communicationId,
  //     status: upperStatus,
  //     errorMsg,
  //     orderValue
  //   });
  //   return res.status(202).json({
  //     success: true,
  //     message: 'Callback enqueued for asynchronous processing.',
  //     jobId: job.id
  //   });
  // } catch (enqueueErr: any) {
  //   console.error('[Webhook Server] Failed to enqueue webhook job:', enqueueErr.message);
  //   return res.status(500).json({ error: 'Failed to enqueue webhook update.' });
  // }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.communication.findUnique({
        where: { id: communicationId }
      });

      if (!existing) {
        throw new Error(`Communication record ${communicationId} not found.`);
      }

      const currentPrecedence = STATUS_PRECEDENCE[existing.status] ?? 0;
      const newPrecedence = STATUS_PRECEDENCE[upperStatus];

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
            where: { id: existing.customerId },
            include: { _count: { select: { orders: true } } }
          });

          if (customer) {
            const finalOrderValue = orderValue ? parseFloat(orderValue) : Math.floor(Math.random() * (4000 - 400 + 1) + 400);

            await tx.campaign.update({
              where: { id: existing.campaignId },
              data: {
                attributedOrders: { increment: 1 },
                attributedRevenue: { increment: finalOrderValue }
              }
            });
            
            console.log(`[Webhook Server] CLICKED event registered. Campaign ${existing.campaignId} attributed +1 Order ($${finalOrderValue})`);
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

    if (result.updated) {
      console.log(`[Webhook Server] Successfully updated communication ${communicationId} to status ${upperStatus}.`);
      return res.status(200).json({ 
        success: true, 
        message: 'Status updated successfully.', 
        record: result.record 
      });
    } else {
      console.log(`[Webhook Server] Communication ${communicationId} update skipped: ${result.message}`);
      return res.status(200).json({ 
        success: true, 
        message: result.message, 
        record: result.record 
      });
    }

  } catch (error: any) {
    console.error(`[Webhook Server] Error processing callback for ${communicationId}:`, error.message);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error processing webhook update.' });
  }
});

export default router;
