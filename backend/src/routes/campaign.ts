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
 * Runs query validator checks for security.
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
 * Saves campaign metadata (name, promptText, channel, messageTemplate).
 * Applied validation middleware.
 */
router.post('/create', validateCampaignCreate, async (req: Request, res: Response) => {
  try {
    const { name, promptText, channel, messageTemplate } = req.body;

    const campaign = await prisma.campaign.create({
      data: {
        name,
        promptText: promptText || null,
        channel: channel.toUpperCase(),
        messageTemplate: messageTemplate || null,
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
 * Launches campaign execution. Inserts 'PENDING' communication entries,
 * triggers async channel dispatch, and instantly returns 202 Accepted.
 * Applied rate-limiting (10req/min) and body validation.
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

    // Fetch targets contact info to ensure they exist
    const customers = await prisma.customer.findMany({
      where: { id: { in: targets } }
    });

    if (customers.length === 0) {
      return res.status(400).json({ error: 'No valid customers found matching the specified audience.' });
    }

    // Pre-generate UUIDs for the Communication log rows.
    const communicationRecords = customers.map(c => ({
      id: crypto.randomUUID(),
      customerId: c.id,
      campaignId: campaign.id,
      status: 'PENDING'
    }));

    // Insert communication logs into the DB.
    await prisma.$transaction([
      prisma.communication.createMany({
        data: communicationRecords
      })
    ]);

    // Dynamic Server Port for background requests.
    const port = process.env.PORT || 3000;
    const channelServiceUrl = `http://localhost:${port}/api/stub/channel-send`;

    setImmediate(() => {
      console.log(`[Campaign Engine] Initiating async dispatch for ${communicationRecords.length} messages.`);
      
      const customerMap = new Map(customers.map(c => [c.id, c]));

      communicationRecords.forEach(async (record) => {
        const customer = customerMap.get(record.customerId);
        if (!customer) return;

        try {
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
              channel: campaign.channel,
              message: campaign.messageTemplate
                ? campaign.messageTemplate.replace(/\{\{\s*name\s*\}\}/gi, customer.name)
                : `Hi ${customer.name}, check out our campaign: ${campaign.name}!`
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
