import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';

const router = Router();

interface GamifyEventPayload {
  customerId: string;
  eventType: string;
}

interface ReferralPayload {
  referrerId: string;
  referredId: string;
}

const EVENT_POINTS: Record<string, number> = {
  SPIN_WHEEL: 50.0,
  TRIVIA_WIN: 25.0,
  SUBMITTED_REVIEW: 15.0
};

const DEFAULT_EVENT_POINTS = 10.0;
const REFERRER_BONUS = 100.0;
const REFERRED_BONUS = 50.0;

/**
 * POST /api/loyalty/gamify-event
 * Award loyalty points to a customer based on game events/milestones.
 */
router.post('/loyalty/gamify-event', async (req: Request, res: Response) => {
  try {
    const { customerId, eventType } = req.body as Partial<GamifyEventPayload>;

    if (!customerId || !eventType) {
      return res.status(400).json({ error: 'Missing parameters: customerId and eventType are required.' });
    }

    const pointsToAward = EVENT_POINTS[eventType.toUpperCase()] || DEFAULT_EVENT_POINTS;

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Update loyalty points
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        loyaltyPoints: { increment: pointsToAward }
      }
    });

    return res.json({
      success: true,
      pointsAwarded: pointsToAward,
      currentPoints: updatedCustomer.loyaltyPoints,
      customer: updatedCustomer
    });

  } catch (error: any) {
    console.error('[Loyalty API] Gamify event failed:', error);
    return res.status(500).json({ error: 'Failed to process gamified event loyalty reward.' });
  }
});

/**
 * POST /api/loyalty/referral
 * Connects referrer-referred relationship and awards milestones in a safe Prisma Transaction block.
 */
router.post('/loyalty/referral', async (req: Request, res: Response) => {
  try {
    const { referrerId, referredId } = req.body as Partial<ReferralPayload>;

    if (!referrerId || !referredId) {
      return res.status(400).json({ error: 'Missing referral parameters: referrerId and referredId are required.' });
    }

    if (referrerId === referredId) {
      return res.status(400).json({ error: 'Invalid referral: Customers cannot refer themselves.' });
    }

    // Verify both customers exist
    const [referrer, referred] = await Promise.all([
      prisma.customer.findUnique({ where: { id: referrerId } }),
      prisma.customer.findUnique({ where: { id: referredId } })
    ]);

    if (!referrer || !referred) {
      return res.status(404).json({ error: 'One or both customer profiles could not be found.' });
    }

    // Execute referral connection and point awards concurrently inside an isolated transaction
    const [updatedReferred, updatedReferrer] = await prisma.$transaction([
      // 1. Establish the referral link
      prisma.customer.update({
        where: { id: referredId },
        data: {
          referrerId: referrerId,
          loyaltyPoints: { increment: REFERRED_BONUS }
        }
      }),
      // 2. Award referral bonus points to the referrer
      prisma.customer.update({
        where: { id: referrerId },
        data: {
          loyaltyPoints: { increment: REFERRER_BONUS }
        }
      })
    ]);

    return res.json({
      success: true,
      message: 'Referral registered and milestone points successfully credited.',
      referrerBonus: REFERRER_BONUS,
      referredBonus: REFERRED_BONUS,
      referred: updatedReferred,
      referrer: updatedReferrer
    });

  } catch (error: any) {
    console.error('[Loyalty API] Referral registration failed:', error);
    return res.status(500).json({ error: 'Failed to complete referral registration transaction.' });
  }
});

export default router;
