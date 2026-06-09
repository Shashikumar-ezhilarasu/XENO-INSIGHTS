import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const router = Router();

// Initialize the Gemini SDK in case dynamic segmentation is triggered during campaign send
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * POST /api/campaigns/create
 * Saves campaign metadata (name, promptText, channel).
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { name, promptText, channel } = req.body;

    if (!name || !channel) {
      return res.status(400).json({ error: 'name and channel are required fields.' });
    }

    const validChannels = ['WHATSAPP', 'EMAIL', 'SMS', 'RCS'];
    if (!validChannels.includes(channel.toUpperCase())) {
      return res.status(400).json({ error: `channel must be one of: ${validChannels.join(', ')}` });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        promptText,
        channel: channel.toUpperCase()
      }
    });

    return res.status(201).json({ success: true, campaign });
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Helper to resolve customer segment using the saved promptText (Gemini segmentation)
 */
async function resolveCustomerSegment(promptText: string): Promise<string[]> {
  if (!apiKey || apiKey.startsWith('AIzaSy...')) {
    throw new Error('Gemini API key is not configured.');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          queryType: { type: SchemaType.STRING, enum: ['PRISMA', 'SQL'] },
          prismaWhereJson: { type: SchemaType.STRING },
          sqlQuery: { type: SchemaType.STRING }
        },
        required: ['queryType', 'prismaWhereJson', 'sqlQuery']
      }
    }
  });

  const SYSTEM_INSTRUCTION = `
  Analyze user prompt to filter customers. Return JSON with queryType (PRISMA or SQL), prismaWhereJson, or sqlQuery.
  Customer table: id, name, email, phone, totalSpends
  Order table: id, customerId, amount, itemCount, category ('Coffee', 'Bakery', 'Apparel', 'Beauty', 'Accessories'), createdAt
  `;

  const result = await model.generateContent(`${SYSTEM_INSTRUCTION}\nAnalyze: "${promptText}"`);
  const queryData = JSON.parse(result.response.text());

  let customers: any[] = [];
  if (queryData.queryType === 'PRISMA' && queryData.prismaWhereJson) {
    customers = await prisma.customer.findMany({
      where: JSON.parse(queryData.prismaWhereJson),
      select: { id: true }
    });
  } else if (queryData.queryType === 'SQL' && queryData.sqlQuery) {
    customers = await prisma.$queryRawUnsafe<any[]>(queryData.sqlQuery);
  }

  return customers.map(c => c.id);
}

/**
 * POST /api/campaigns/send
 * Launches campaign execution. Inserts 'PENDING' communication entries,
 * triggers async channel dispatch, and instantly returns 202 Accepted.
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { campaignId, customerIds } = req.body;

    if (!campaignId) {
      return res.status(400).json({ error: 'campaignId is required.' });
    }

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
    // This allows us to match records in the async loop and database logs efficiently.
    const communicationRecords = customers.map(c => ({
      id: crypto.randomUUID(),
      customerId: c.id,
      campaignId: campaign.id,
      status: 'PENDING'
    }));

    // Insert communication logs into the DB.
    // Wrap it in a transaction to guarantee all logs are committed before starting deliveries.
    await prisma.$transaction([
      prisma.communication.createMany({
        data: communicationRecords
      })
    ]);

    // Dynamic Server Port for background requests.
    const port = process.env.PORT || 3000;
    const channelServiceUrl = `http://localhost:${port}/api/stub/channel-send`;

    /**
     * DESIGN CHOICE (Asynchronous Dispatch):
     * We spawn a background process using setImmediate() to immediately offload
     * the HTTP communication loop to Node's Event Loop. This allows this request
     * handler to return a "202 Accepted" response immediately, keeping the CRM
     * API responsive even when targeting large audience groups.
     */
    setImmediate(() => {
      console.log(`[Campaign Engine] Initiating async dispatch for ${communicationRecords.length} messages.`);
      
      // Map to map customer details easily in the loop
      const customerMap = new Map(customers.map(c => [c.id, c]));

      // We execute requests concurrently but without blocking the main event loop
      communicationRecords.forEach(async (record) => {
        const customer = customerMap.get(record.customerId);
        if (!customer) return;

        try {
          // Send request to mock channel service
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
              message: `Hi ${customer.name}, check out our new campaign: ${campaign.name}!`
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

    // Instantly return 202 Accepted status code
    return res.status(202).json({
      success: true,
      message: 'Campaign processing and transmission started.',
      campaignId: campaign.id,
      audienceSize: customers.length
    });

  } catch (error: any) {
    console.error('Error executing campaign send:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
