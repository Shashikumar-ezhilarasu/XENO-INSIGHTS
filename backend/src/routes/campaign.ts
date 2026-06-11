import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { validateSqlQuery, validatePrismaWhere } from '../utils/queryValidator';
import { validateCampaignCreate, validateCampaignSend, campaignSendRateLimiter } from '../middleware/security';

const router = Router();

// Initialize the Gemini SDK
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const SYSTEM_INSTRUCTION = `
You are a Senior Systems and Database Engineer translating natural language prompts into queries targeting a PostgreSQL database of customers and their orders.

Database Schema Details:
1. Customer table:
   - id: string (UUID, Primary Key)
   - name: string
   - email: string (unique)
   - phone: string
   - totalSpends: float (cached total spend across all orders)
   - lastVisitDate: DateTime (optional, last visit date)
   - loyaltyPoints: integer (loyalty rewards balance)
   - createdAt: DateTime
   - updatedAt: DateTime

2. Order table:
   - id: string (UUID, Primary Key)
   - customerId: string (Foreign Key referencing Customer.id)
   - amount: float (amount spent in this order)
   - itemCount: integer (number of items bought in this order)
   - category: string (categories cased exactly: 'Coffee', 'Bakery', 'Apparel', 'Beauty', 'Accessories')
   - createdAt: DateTime

Instructions:
1. Return a JSON object containing three fields: 'explanation', 'prismaQuery', and 'fallbackSql'.
2. 'prismaQuery' must be a structured Prisma findMany arguments object, containing a 'where' clause. For example:
   {"where": {"totalSpends": {"gt": 50}}}
   If the query cannot be written in Prisma, return an empty object {}.
3. 'fallbackSql' must be a valid, read-only PostgreSQL SELECT query selecting c.id from "Customer" c.
4. Do NOT include any destructive or modifying SQL queries. Only SELECT operations are allowed.
`;

/**
 * Helper to resolve customer segment using the saved promptText (Gemini segmentation)
 */
async function resolveCustomerSegment(promptText: string): Promise<string[]> {
  if (!apiKey || apiKey.startsWith('AIzaSy...')) {
    throw new Error('Gemini API key is not configured.');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          explanation: { type: SchemaType.STRING },
          prismaQuery: { type: SchemaType.OBJECT },
          fallbackSql: { type: SchemaType.STRING }
        },
        required: ['explanation', 'prismaQuery', 'fallbackSql']
      }
    }
  });

  const result = await model.generateContent(`Analyze segment: "${promptText}"`);
  const queryData = JSON.parse(result.response.text());

  let customers: any[] = [];
  let prismaSuccess = false;

  // Tier 1: Try Prisma
  if (queryData.prismaQuery && typeof queryData.prismaQuery === 'object' && Object.keys(queryData.prismaQuery).length > 0) {
    try {
      const whereClause = queryData.prismaQuery.where || {};
      const validation = validatePrismaWhere(whereClause);
      if (!validation.valid) {
        throw new Error(`Prisma Query Security Violation: ${validation.error}`);
      }

      customers = await prisma.customer.findMany({
        ...queryData.prismaQuery,
        select: { id: true }
      });
      prismaSuccess = true;
    } catch (err: any) {
      console.warn(`[Campaign Segment] Prisma resolution failed, falling back to SQL: ${err.message}`);
    }
  }

  // Tier 2: Try Fallback SQL
  if (!prismaSuccess && queryData.fallbackSql && typeof queryData.fallbackSql === 'string' && queryData.fallbackSql.trim().length > 0) {
    const validation = validateSqlQuery(queryData.fallbackSql);
    if (!validation.valid) {
      throw new Error(`SQL Query Security Violation: ${validation.error}`);
    }

    customers = await prisma.$queryRawUnsafe<any[]>(queryData.fallbackSql);
  }

  return customers.map(c => c.id);
}

/**
 * POST /api/campaigns/create
 * Saves campaign metadata (name, promptText, channel, messageTemplate, messageTemplateB, imageUrl, buttons).
 */
router.post('/create', validateCampaignCreate, async (req: Request, res: Response) => {
  try {
    const { name, promptText, channel, messageTemplate, messageTemplateB, imageUrl, buttons, autoSplit } = req.body;

    let serializedButtons = null;
    if (buttons) {
      serializedButtons = typeof buttons === 'string' ? buttons : JSON.stringify(buttons);
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        promptText: promptText || null,
        channel: channel.toUpperCase(),
        messageTemplate: messageTemplate || null,
        messageTemplateB: messageTemplateB || null,
        imageUrl: imageUrl || null,
        buttons: serializedButtons,
        autoSplit: autoSplit ?? false
      }
    });

    return res.status(201).json({ success: true, campaign });
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/campaigns/send
 * Launches campaign execution. Splits variants for A/B testing, interpolates 
 * hyper-personalized variables, and sends payloads to the stub service.
 */
router.post('/send', campaignSendRateLimiter, validateCampaignSend, async (req: Request, res: Response) => {
  try {
    const { campaignId, customerIds } = req.body;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    let targets: string[] = [];

    if (customerIds && Array.isArray(customerIds)) {
      targets = customerIds;
    } else if (campaign.promptText) {
      console.log(`Resolving segment dynamically for campaign "${campaign.name}" via prompt: "${campaign.promptText}"`);
      try {
        targets = await resolveCustomerSegment(campaign.promptText);
      } catch (err: any) {
        console.error('Failed to resolve segment dynamically:', err);
        return res.status(502).json({ error: 'Failed to resolve campaign segment via AI.', details: err.message });
      }
    } else {
      return res.status(400).json({ error: 'No segment targets or promptText available for this campaign.' });
    }

    if (targets.length === 0) {
      return res.status(200).json({ success: true, message: 'Audience segment is empty. No messages to send.', audienceSize: 0 });
    }

    // Fetch targets contact and order histories to evaluate personalization attributes
    const customers = await prisma.customer.findMany({
      where: { id: { in: targets } },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (customers.length === 0) {
      return res.status(400).json({ error: 'No valid customers found matching the specified audience.' });
    }

    // A/B Testing split configuration:
    // If the campaign has Variant B template, split recipients 50% variant A, 50% variant B.
    const isABTest = Boolean(campaign.messageTemplateB);

    // Least-Cost Smart Routing Optimizer
    // Automatically maximizes ROAS by routing high-value VIPs to premium channels
    // while shifting standard discount-seeking customers to lower-cost email/SMS channels.
    const getChannelForCustomer = (customer: any): string => {
      // Calculate Average Transactional Value
      const numOrders = customer.orders ? customer.orders.length : 0;
      const avgTransactionalValue = numOrders > 0 ? (customer.totalSpends / numOrders) : 0;
      
      const discountBehavior = customer.discountSeekingBehavior || 'MID';

      // VIP Criteria: Spends > $40 on average OR never actively seeks discounts
      const isVip = avgTransactionalValue > 40 || discountBehavior === 'LOW';

      if (isVip) {
        // Premium touchpoints for VIPs
        const category = customer.favoriteCategory || 'Coffee';
        return category === 'Bakery' ? 'RCS' : 'WHATSAPP';
      } else {
        // Standard/Discount-seeker margin protection (Low-cost channels)
        return discountBehavior === 'HIGH' ? 'EMAIL' : 'SMS';
      }
    };

    const customerMap = new Map(customers.map(c => [c.id, c]));

    const communicationRecords = customers.map((c, index) => {
      const variant = isABTest ? (index % 2 === 0 ? 'A' : 'B') : 'A';
      const channelChoice = campaign.autoSplit ? getChannelForCustomer(c) : campaign.channel;
      return {
        id: crypto.randomUUID(),
        customerId: c.id,
        campaignId: campaign.id,
        channel: channelChoice.toUpperCase(),
        status: 'PENDING',
        variant: variant
      };
    });

    // Write communication records into database
    await prisma.$transaction([
      prisma.communication.createMany({
        data: communicationRecords
      })
    ]);

    const channelServiceUrl = `http://localhost:3002/send`;

    setImmediate(() => {
      console.log(`[Campaign Engine] Initiating async dispatch for ${communicationRecords.length} messages. A/B Test: ${isABTest}`);
      
      communicationRecords.forEach(async (record) => {
        const customer = customerMap.get(record.customerId);
        if (!customer) return;

        try {
          // Calculate hyper-personalized attributes
          const latestOrder = customer.orders && customer.orders.length > 0 ? customer.orders[0] : null;
          const lastPurchasedItem = latestOrder ? latestOrder.category : 'special item';
          
          // Favorite category (most frequent order category)
          const categoryCounts: Record<string, number> = {};
          customer.orders.forEach(o => {
            categoryCounts[o.category] = (categoryCounts[o.category] || 0) + 1;
          });
          
          let favoriteCategory = 'our products';
          let maxCount = 0;
          Object.entries(categoryCounts).forEach(([cat, count]) => {
            if (count > maxCount) {
              maxCount = count;
              favoriteCategory = cat;
            }
          });

          const loyaltyPoints = customer.loyaltyPoints;

          // Select correct template based on A/B test variant assignment
          const baseTemplate = (record.variant === 'B' && campaign.messageTemplateB)
            ? campaign.messageTemplateB
            : (campaign.messageTemplate || '');

          // Replace personalized variables dynamically
          const personalizedMessage = baseTemplate
            .replace(/\{\{\s*name\s*\}\}/gi, customer.name)
            .replace(/\{\{\s*last_purchased_item\s*\}\}/gi, lastPurchasedItem)
            .replace(/\{\{\s*favorite_category\s*\}\}/gi, favoriteCategory)
            .replace(/\{\{\s*total_loyalty_points\s*\}\}/gi, String(loyaltyPoints));

          // Parse button actions
          let buttonsArray = undefined;
          if (campaign.buttons) {
            try {
              buttonsArray = JSON.parse(campaign.buttons);
            } catch (e) {
              // If not JSON, split by comma
              buttonsArray = campaign.buttons.split(',').map(b => b.trim());
            }
          }

          // Call the stub channel send endpoint
          const response = await fetch(channelServiceUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              communicationId: record.id,
              recipient: {
                name: customer.name,
                phone: customer.phone,
                email: customer.email
              },
              channel: record.channel || campaign.channel,
              message: personalizedMessage,
              imageUrl: campaign.imageUrl || undefined,
              buttons: buttonsArray
            })
          });

          if (!response.ok) {
            console.error(`[Campaign Engine] Failed to dispatch communication ${record.id}: ${response.statusText}`);
          }
        } catch (dispatchError) {
          console.error(`[Campaign Engine] Network error dispatching communication ${record.id}:`, dispatchError);
        }
      });
    });

    return res.status(202).json({
      success: true,
      message: 'Campaign queued and transmission started.',
      campaignId: campaign.id,
      audienceSize: customers.length
    });

  } catch (error: any) {
    console.error('Error executing campaign send:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
