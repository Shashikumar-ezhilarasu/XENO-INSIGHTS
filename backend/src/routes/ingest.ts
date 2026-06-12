import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import multer from 'multer';
import Papa from 'papaparse';
import { z } from 'zod';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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

/**
 * POST /api/ingest/file
 * Multi-format Data Ingestion (CSV / JSON)
 * Validates rows, upserts via email, prevents duplicates.
 */
/**
 * Helper to normalize keys to camelCase from various formats (snake_case, spaces, lowercase)
 */
function normalizeRowKeys(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const normalized: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, '');
    
    if (normalizedKey === 'name') normalized.name = val;
    else if (normalizedKey === 'email') normalized.email = val;
    else if (normalizedKey === 'phone' || normalizedKey === 'phonenumber' || normalizedKey === 'phone_number') normalized.phone = val;
    else if (normalizedKey === 'totalspends' || normalizedKey === 'totalspend' || normalizedKey === 'spend' || normalizedKey === 'spends' || normalizedKey === 'total_spends') normalized.totalSpends = val;
    else if (normalizedKey === 'loyaltypoints' || normalizedKey === 'points' || normalizedKey === 'loyalty_points') normalized.loyaltyPoints = val;
    else if (normalizedKey === 'favoritecategory' || normalizedKey === 'category' || normalizedKey === 'favorite_category') normalized.favoriteCategory = val;
    else if (normalizedKey === 'location' || normalizedKey === 'address' || normalizedKey === 'city') normalized.location = val;
    else if (normalizedKey === 'modeofpayment' || normalizedKey === 'paymentmode' || normalizedKey === 'payment' || normalizedKey === 'mode_of_payment') normalized.modeOfPayment = val;
    else if (normalizedKey === 'preferredcommunication' || normalizedKey === 'communication' || normalizedKey === 'preferred_communication') normalized.preferredCommunication = val;
    else {
      normalized[key] = val;
    }
  }
  return normalized;
}

/**
 * Helper to clean numeric strings containing symbols, spaces, or suffixes (e.g. "$12,500" or "⚡ 89 pts")
 */
function cleanNumericString(val: any): any {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }
  return val;
}

/**
 * POST /api/ingest/file
 * Multi-format Data Ingestion (CSV / JSON)
 * Validates rows, normalizes headers, cleans metrics, and upserts per-row to avoid timeout constraints.
 */
router.post('/file', upload.single('file'), async (req: Request, res: Response) => {
  const { file } = req;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  let rawData: any[] = [];
  try {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      const parsed = Papa.parse(file.buffer.toString('utf-8'), { header: true, skipEmptyLines: true });
      rawData = parsed.data;
    } else if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      rawData = JSON.parse(file.buffer.toString('utf-8'));
      if (!Array.isArray(rawData)) {
        return res.status(400).json({ error: 'JSON payload must be an array of objects.' });
      }
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload CSV or JSON.' });
    }
  } catch (err: any) {
    return res.status(400).json({ error: 'Failed to parse file: ' + err.message });
  }

  const CustomerIngestSchema = z.object({
    name: z.preprocess((val) => (typeof val === 'string' ? val.trim() : val), z.string().optional().default("")),
    email: z.preprocess((val) => (typeof val === 'string' ? val.trim() : val), z.string().email("Invalid email format")),
    phone: z.preprocess((val) => (typeof val === 'string' ? val.trim() : val), z.string().optional().default("Unknown")),
    totalSpends: z.preprocess(cleanNumericString, z.coerce.number().optional().default(0.0)),
    loyaltyPoints: z.preprocess(cleanNumericString, z.coerce.number().optional().default(0.0)),
    favoriteCategory: z.string().optional().default('Coffee'),
    location: z.string().optional().default('Chennai, India'),
    modeOfPayment: z.string().optional().default('UPI'),
    preferredCommunication: z.string().optional().default('WHATSAPP')
  }).transform((data) => {
    if (!data.name) {
      data.name = data.email.split('@')[0];
    }
    return data;
  });

  let processed = 0;
  let skipped = 0;
  const errors: any[] = [];

  const validRows: any[] = [];
  for (let i = 0; i < rawData.length; i++) {
    const row = normalizeRowKeys(rawData[i]);
    const result = CustomerIngestSchema.safeParse(row);
    if (result.success) {
      validRows.push(result.data);
    } else {
      skipped++;
      errors.push({ row: i + 1, data: rawData[i], issues: result.error.issues });
    }
  }

  // Process each customer row in its own scoped transaction block to avoid interactive timeout limits
  for (const validRow of validRows) {
    try {
      await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.upsert({
          where: { email: validRow.email },
          update: {
            name: validRow.name,
            phone: validRow.phone,
            totalSpends: validRow.totalSpends,
            loyaltyPoints: validRow.loyaltyPoints,
            favoriteCategory: validRow.favoriteCategory,
            location: validRow.location,
            modeOfPayment: validRow.modeOfPayment,
            preferredCommunication: validRow.preferredCommunication
          },
          create: {
            name: validRow.name,
            email: validRow.email,
            phone: validRow.phone,
            totalSpends: validRow.totalSpends,
            loyaltyPoints: validRow.loyaltyPoints,
            favoriteCategory: validRow.favoriteCategory,
            location: validRow.location,
            modeOfPayment: validRow.modeOfPayment,
            preferredCommunication: validRow.preferredCommunication
          }
        });

        const existingOrdersCount = await tx.order.count({
          where: { customerId: customer.id }
        });

        if (existingOrdersCount === 0 && validRow.totalSpends > 0) {
          const numOrders = validRow.totalSpends <= 50 ? 1 : (validRow.totalSpends <= 200 ? 2 : (validRow.totalSpends <= 1000 ? 3 : 4));
          const category = validRow.favoriteCategory || 'Coffee';
          let remaining = Math.round(validRow.totalSpends * 100) / 100;
          const orderAmounts: number[] = [];

          if (numOrders === 1) {
            orderAmounts.push(remaining);
          } else if (numOrders === 2) {
            const first = Math.round(remaining * 0.6 * 100) / 100;
            orderAmounts.push(first);
            orderAmounts.push(Math.round((remaining - first) * 100) / 100);
          } else if (numOrders === 3) {
            const first = Math.round(remaining * 0.5 * 100) / 100;
            const second = Math.round(remaining * 0.3 * 100) / 100;
            orderAmounts.push(first);
            orderAmounts.push(second);
            orderAmounts.push(Math.round((remaining - first - second) * 100) / 100);
          } else {
            const first = Math.round(remaining * 0.4 * 100) / 100;
            const second = Math.round(remaining * 0.3 * 100) / 100;
            const third = Math.round(remaining * 0.2 * 100) / 100;
            orderAmounts.push(first);
            orderAmounts.push(second);
            orderAmounts.push(third);
            orderAmounts.push(Math.round((remaining - first - second - third) * 100) / 100);
          }

          let lastVisitDate = customer.lastVisitDate;
          for (let j = 0; j < orderAmounts.length; j++) {
            const amt = orderAmounts[j];
            if (amt <= 0) continue;

            let daysAgo = 5;
            if (j === 1) daysAgo = 15;
            else if (j === 2) daysAgo = 45;
            else if (j === 3) daysAgo = 75;

            const orderDate = new Date();
            orderDate.setDate(orderDate.getDate() - daysAgo);

            if (j === 0) {
              lastVisitDate = orderDate;
            }

            await tx.order.create({
              data: {
                customerId: customer.id,
                amount: amt,
                category,
                itemCount: Math.max(1, Math.floor(amt / 15)),
                createdAt: orderDate
              }
            });
          }

          if (lastVisitDate) {
            await tx.customer.update({
              where: { id: customer.id },
              data: { lastVisitDate }
            });
          }
        }
      });
      processed++;
    } catch (err: any) {
      console.error(`[Ingest Engine] Row processing failed for email ${validRow.email}:`, err.message);
      skipped++;
      errors.push({ row: processed + skipped, email: validRow.email, error: err.message });
    }
  }

  return res.status(200).json({
    success: true,
    summary: {
      totalReceived: rawData.length,
      processed,
      skipped,
      errors: errors.slice(0, 10)
    }
  });
});

export default router;
