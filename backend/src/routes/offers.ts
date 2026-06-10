import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';

const router = Router();

interface ValidateOfferPayload {
  customerId: string;
  cartTotal: number;
  productCategory: string;
  code: string;
}

/**
 * GET /api/offers
 * Lists all active offer configurations.
 */
router.get('/offers', async (req: Request, res: Response) => {
  try {
    const offers = await prisma.offer.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, offers });
  } catch (error: any) {
    console.error('[Offers API] Failed to fetch offers:', error);
    return res.status(500).json({ error: 'Failed to retrieve offers.' });
  }
});

/**
 * POST /api/offers
 * Creates a new offer configuration.
 */
router.post('/offers', async (req: Request, res: Response) => {
  try {
    const { code, discountType, value, minOrderValue, categoryConstraint, maxTotalUsage, maxPerCustomer } = req.body;

    if (!code || !discountType || value === undefined) {
      return res.status(400).json({ error: 'Missing required fields: code, discountType, and value are mandatory.' });
    }

    const offer = await prisma.offer.create({
      data: {
        code: code.toUpperCase().trim(),
        discountType: discountType.toUpperCase(),
        value: Number(value),
        minOrderValue: minOrderValue !== undefined ? Number(minOrderValue) : 0.0,
        categoryConstraint: categoryConstraint || null,
        maxTotalUsage: maxTotalUsage !== undefined ? parseInt(maxTotalUsage) : 1000,
        maxPerCustomer: maxPerCustomer !== undefined ? parseInt(maxPerCustomer) : 1,
        currentUsageCount: 0
      }
    });

    return res.status(201).json({ success: true, offer });
  } catch (error: any) {
    console.error('[Offers API] Failed to create offer:', error);
    return res.status(500).json({ error: 'Failed to create offer configuration.' });
  }
});

/**
 * POST /api/offers/validate
 * Simulates checkouts / POS recalculations checking coupon constraints.
 */
router.post('/offers/validate', async (req: Request, res: Response) => {
  try {
    const { customerId, cartTotal, productCategory, code } = req.body as Partial<ValidateOfferPayload>;

    if (!code || !customerId || cartTotal === undefined || !productCategory) {
      return res.status(400).json({
        valid: false,
        error: 'Missing validate properties: customerId, cartTotal, productCategory, and code are required.'
      });
    }

    const formattedCode = code.toUpperCase().trim();
    const offer = await prisma.offer.findUnique({
      where: { code: formattedCode }
    });

    if (!offer) {
      return res.status(404).json({
        valid: false,
        error: `Offer code '${formattedCode}' does not exist.`
      });
    }

    // 1. Minimum Order Value Check
    if (Number(cartTotal) < offer.minOrderValue) {
      return res.status(400).json({
        valid: false,
        error: `Minimum order value criteria not met. Required: $${offer.minOrderValue.toFixed(2)}, Cart: $${Number(cartTotal).toFixed(2)}`
      });
    }

    // 2. Category Constraint Check
    if (offer.categoryConstraint && offer.categoryConstraint.toLowerCase() !== productCategory.toLowerCase()) {
      return res.status(400).json({
        valid: false,
        error: `Category constraint violated. Offer is only valid for category '${offer.categoryConstraint}'.`
      });
    }

    // 3. System-Wide Usage Check
    if (offer.currentUsageCount >= offer.maxTotalUsage) {
      return res.status(400).json({
        valid: false,
        error: 'Offer usage limit reached (system-wide execution limit exceeded).'
      });
    }

    // 4. Calculate Discount value
    let discountValue = 0;
    if (offer.discountType === 'PERCENTAGE') {
      discountValue = Number(cartTotal) * (offer.value / 100);
    } else {
      discountValue = offer.value;
    }
    // Cap discount value to cart total
    discountValue = Math.min(discountValue, Number(cartTotal));

    // Simulate incrementing usage counter if specified by query/body parameter
    const apply = req.body.apply === true;
    if (apply) {
      await prisma.offer.update({
        where: { id: offer.id },
        data: { currentUsageCount: { increment: 1 } }
      });
    }

    return res.json({
      valid: true,
      offer: {
        id: offer.id,
        code: offer.code,
        discountType: offer.discountType,
        value: offer.value,
        categoryConstraint: offer.categoryConstraint
      },
      discountValue: Math.round(discountValue * 100) / 100
    });

  } catch (error: any) {
    console.error('[Offers API] Validation failed:', error);
    return res.status(500).json({
      valid: false,
      error: 'An internal error occurred during offer validation.'
    });
  }
});

export default router;
