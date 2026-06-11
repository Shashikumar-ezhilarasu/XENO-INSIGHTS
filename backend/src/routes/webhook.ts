import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';

import { validateWebhookCallback } from '../middleware/security';

const router = Router();

// Define logical precedence for communication statuses to prevent race conditions
const STATUS_PRECEDENCE: Record<string, number> = {
  PENDING: 0,
  SENT: 1,
  DELIVERED: 2,
  OPENED: 3,
  CLICKED: 4,
  FAILED: 5
};

/**
 * POST /api/webhooks/channel-callback
 * Consumes real-time webhook updates from the mock channel.
 * Body: { communicationId: string, status: string, errorMsg?: string, timestamp: string }
 */
router.post('/channel-callback', validateWebhookCallback, async (req: Request, res: Response) => {
  const { communicationId, status, errorMsg } = req.body;

  if (!communicationId || !status) {
    return res.status(400).json({ error: 'communicationId and status are required fields.' });
  }

  const upperStatus = status.toUpperCase();
  if (STATUS_PRECEDENCE[upperStatus] === undefined) {
    return res.status(400).json({ error: `Invalid status: ${status}` });
  }

  try {
    /**
     * DESIGN CHOICE (Prisma Transaction with Concurrency Locking):
     * To prevent data corruption under high concurrent webhook callbacks (e.g., if a 'DELIVERED' status update
     * and 'OPENED' status update arrive nearly simultaneously, or out-of-order), we wrap the operations
     * in a Prisma interactive transaction.
     * We retrieve the current state and perform a precedence validation check. This ensures that a delayed
     * callback (e.g., 'DELIVERED') does not overwrite a more advanced state (e.g., 'OPENED').
     */
    const result = await prisma.$transaction(async (tx) => {
      // Fetch the existing record
      const existing = await tx.communication.findUnique({
        where: { id: communicationId }
      });

      if (!existing) {
        throw new Error(`Communication record ${communicationId} not found.`);
      }

      const currentPrecedence = STATUS_PRECEDENCE[existing.status] ?? 0;
      const newPrecedence = STATUS_PRECEDENCE[upperStatus];

      // If the incoming status represents an advanced step in the communication lifecycle, update it.
      // E.g., moving from 'PENDING' -> 'DELIVERED' or 'DELIVERED' -> 'OPENED'.
      if (newPrecedence > currentPrecedence) {
        const updated = await tx.communication.update({
          where: { id: communicationId },
          data: {
            status: upperStatus,
            errorMsg: errorMsg || null
          }
        });

        // REVENUE TRACKING: When a link is clicked, simulate a conversion
        if (upperStatus === 'CLICKED') {
          const customer = await tx.customer.findUnique({
            where: { id: existing.customerId },
            include: { _count: { select: { orders: true } } }
          });

          if (customer) {
            // Estimate conversion revenue based on average order value, or a flat default
            const conversionValue = (customer.totalSpends > 0 && customer._count.orders > 0)
              ? (customer.totalSpends / customer._count.orders)
              : 45.0;

            // Increment the campaign's revenue tracking metric
            await tx.campaign.update({
              where: { id: existing.campaignId },
              data: {
                revenueGenerated: { increment: conversionValue }
              }
            });
            
            console.log(`[Webhook Server] CLICKED event registered. Campaign ${existing.campaignId} revenue incremented by $${conversionValue.toFixed(2)}`);
          }
        }

        return { updated: true, record: updated };
      }

      // If status is out of order (e.g. DELIVERED arrives after OPENED), we skip the update but return success.
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
