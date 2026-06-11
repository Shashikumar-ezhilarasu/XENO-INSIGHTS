import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';

const router = Router();

/**
 * POST /api/ingest/identity-event
 * CDP Identity Resolution Engine (Deterministic Stitching)
 * Handles anonymous or disconnected event identities and dynamically stitches them 
 * into a single Customer profile record when an overlapping identifier is detected.
 */
router.post('/identity-event', async (req: Request, res: Response) => {
  const { email, phone, orderAmount, itemCategory } = req.body;

  if (!email && !phone) {
    return res.status(400).json({ error: 'At least an email or phone number is required.' });
  }

  try {
    // Determine the final resolved customer
    let resolvedCustomer = null;

    await prisma.$transaction(async (tx) => {
      // 1. Look up existing records by email and phone independently
      let customerByEmail = null;
      let customerByPhone = null;

      if (email) {
        customerByEmail = await tx.customer.findUnique({ where: { email } });
      }

      if (phone) {
        // Phone is not marked as @unique in Prisma schema, so we use findFirst
        customerByPhone = await tx.customer.findFirst({ where: { phone } });
      }

      // 2. Evaluate resolution cases
      if (customerByEmail && customerByPhone && customerByEmail.id !== customerByPhone.id) {
        // CASE A: Two different profiles exist. WE MUST STITCH THEM.
        
        // Elect the primary UUID based on which is older (createdAt)
        const isEmailOlder = customerByEmail.createdAt <= customerByPhone.createdAt;
        const primary = isEmailOlder ? customerByEmail : customerByPhone;
        const secondary = isEmailOlder ? customerByPhone : customerByEmail;

        console.log(`[Identity Engine] Stitching fragmented profile ${secondary.id} into primary ${primary.id}`);

        // A. Migrate related Orders from secondary to primary
        await tx.order.updateMany({
          where: { customerId: secondary.id },
          data: { customerId: primary.id }
        });

        // B. Migrate related Communications from secondary to primary
        await tx.communication.updateMany({
          where: { customerId: secondary.id },
          data: { customerId: primary.id }
        });

        // C. Merge scalar attributes
        const mergedTotalSpends = primary.totalSpends + secondary.totalSpends;
        const mergedLoyaltyPoints = primary.loyaltyPoints + secondary.loyaltyPoints;
        const finalEmail = primary.email || secondary.email;
        const finalPhone = primary.phone || secondary.phone;

        // D. Update the primary record
        resolvedCustomer = await tx.customer.update({
          where: { id: primary.id },
          data: {
            totalSpends: mergedTotalSpends,
            loyaltyPoints: mergedLoyaltyPoints,
            email: finalEmail,
            phone: finalPhone
          }
        });

        // E. Flush the duplicate row
        await tx.customer.delete({
          where: { id: secondary.id }
        });

      } else if (customerByEmail || customerByPhone) {
        // CASE B: Only one profile matches. Update it with new identifiers.
        const existing = customerByEmail || customerByPhone;
        
        const updateData: any = {};
        if (email && existing!.email !== email) updateData.email = email;
        if (phone && existing!.phone !== phone) updateData.phone = phone;

        if (Object.keys(updateData).length > 0) {
          resolvedCustomer = await tx.customer.update({
            where: { id: existing!.id },
            data: updateData
          });
        } else {
          resolvedCustomer = existing;
        }

      } else {
        // CASE C: Brand new anonymous or disconnected customer
        resolvedCustomer = await tx.customer.create({
          data: {
            name: email ? email.split('@')[0] : 'Guest Shopper',
            email: email || `anonymous_${Date.now()}@example.com`,
            phone: phone || 'Unknown'
          }
        });
      }

      // 3. Append the new incoming event data (e.g., an Order)
      if (orderAmount && orderAmount > 0) {
        await tx.order.create({
          data: {
            customerId: resolvedCustomer!.id,
            amount: parseFloat(orderAmount),
            category: itemCategory || 'Coffee',
            itemCount: 1
          }
        });

        // Update total spends for the resolved customer
        resolvedCustomer = await tx.customer.update({
          where: { id: resolvedCustomer!.id },
          data: {
            totalSpends: resolvedCustomer!.totalSpends + parseFloat(orderAmount),
            loyaltyPoints: resolvedCustomer!.loyaltyPoints + (parseFloat(orderAmount) * 0.1) // 10% points logic
          }
        });
      }
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Identity resolution executed successfully', 
      customer: resolvedCustomer 
    });

  } catch (error: any) {
    console.error('[Identity Engine] Ingestion error:', error);
    return res.status(500).json({ error: 'Internal Server Error during identity resolution' });
  }
});

export default router;
