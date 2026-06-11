import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiSegmentRateLimiter } from '../middleware/security';

const prisma = new PrismaClient();
const router = Router();

router.post('/swarm', aiSegmentRateLimiter, async (req: Request, res: Response) => {
  const { goal } = req.body;

  if (!goal) {
    return res.status(400).json({ error: 'Goal is required' });
  }

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (agent: string, status: string, output?: any) => {
    res.write(`data: ${JSON.stringify({ agent, status, output })}\n\n`);
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    // ----------------------------------------------------------------
    // AGENT 1 — Orchestrator
    // ----------------------------------------------------------------
    sendEvent('Orchestrator', 'thinking');
    await delay(1200); // simulate thinking

    const intent = 'Re-engagement';
    let recencyDays = 90;
    let category = undefined;
    let inactiveDays = 30;
    let channelHint = undefined;

    const lowerGoal = goal.toLowerCase();
    
    // Simple regex/keyword logic
    const daysMatch = lowerGoal.match(/(\d+)\s+days/);
    if (daysMatch) {
      recencyDays = parseInt(daysMatch[1]);
    }
    if (lowerGoal.includes('coffee')) category = 'Coffee';
    if (lowerGoal.includes('shoes')) category = 'Shoes';
    if (lowerGoal.includes('whatsapp')) channelHint = 'WHATSAPP';
    else if (lowerGoal.includes('sms')) channelHint = 'SMS';
    else if (lowerGoal.includes('email')) channelHint = 'EMAIL';

    const extractedFilters = { recencyDays, category, inactiveDays, channelHint };
    const orchestratorOutput = {
      intent,
      extractedFilters,
      delegationPlan: ['Data Analyst', 'Strategy Agent', 'Creative Agent']
    };
    sendEvent('Orchestrator', 'done', orchestratorOutput);

    // ----------------------------------------------------------------
    // AGENT 2 — Data Analyst
    // ----------------------------------------------------------------
    sendEvent('Data Analyst', 'thinking');
    await delay(1500);

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - recencyDays);

    // Query Real Postgres DB
    const customers = await prisma.customer.findMany({
      where: {
        orders: {
          some: {
            createdAt: {
              gte: dateThreshold
            },
            ...(category ? { productCategory: category } : {})
          }
        }
      },
      include: {
        orders: true
      }
    });

    let audienceSize = customers.length;
    let avgOrderValue = 0;
    let topCategory = category || 'General';
    let sampleCustomers = [];

    if (audienceSize > 0) {
      let totalRevenue = 0;
      let totalOrdersCount = 0;
      const categoryCounts: Record<string, number> = {};

      customers.forEach(c => {
        c.orders.forEach(o => {
          totalRevenue += o.amount;
          totalOrdersCount += 1;
          categoryCounts[o.category] = (categoryCounts[o.category] || 0) + 1;
        });
      });

      avgOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
      
      if (!category) {
        topCategory = Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b, 'General');
      }

      sampleCustomers = customers.slice(0, 5).map(c => ({
        name: c.name,
        email: c.email,
        lastOrderDate: c.lastVisitDate,
        totalSpend: c.totalSpends,
        preferredChannel: c.preferredCommunication || 'WHATSAPP'
      }));
    } else {
      // Fallback if no matching records - return all customers
      const allCustomers = await prisma.customer.findMany({ include: { orders: true } });
      audienceSize = allCustomers.length;
      sampleCustomers = allCustomers.slice(0, 5).map(c => ({
        name: c.name,
        email: c.email,
        lastOrderDate: c.lastVisitDate,
        totalSpend: c.totalSpends,
        preferredChannel: c.preferredCommunication || 'WHATSAPP'
      }));
      avgOrderValue = 1200; 
      topCategory = 'All';
    }

    const dataAnalystOutput = {
      audienceSize,
      sampleCustomers,
      avgOrderValue,
      topCategory
    };
    sendEvent('Data Analyst', 'done', dataAnalystOutput);

    // ----------------------------------------------------------------
    // AGENT 3 — Strategy Agent
    // ----------------------------------------------------------------
    sendEvent('Strategy Agent', 'thinking');
    await delay(1200);

    // pure JS logic
    const channelCounts: Record<string, number> = {};
    sampleCustomers.forEach((c: any) => {
      channelCounts[c.preferredChannel] = (channelCounts[c.preferredChannel] || 0) + 1;
    });
    
    let recommendedChannel = channelHint;
    if (!recommendedChannel) {
       recommendedChannel = Object.keys(channelCounts).length > 0 
        ? Object.keys(channelCounts).reduce((a, b) => channelCounts[a] > channelCounts[b] ? a : b)
        : 'WHATSAPP';
    }

    const sendTime = inactiveDays > 15 ? 'Evening (6 PM - 8 PM)' : 'Morning (9 AM - 11 AM)';
    const incentiveType = avgOrderValue < 1500 ? '20% Discount' : 'Double Loyalty Points';

    const strategyOutput = {
      recommendedChannel,
      sendTime,
      incentiveType,
      reasoning: `Based on an AOV of $${avgOrderValue.toFixed(2)}, we recommend ${incentiveType}. Customers prefer ${recommendedChannel}.`
    };
    sendEvent('Strategy Agent', 'done', strategyOutput);

    // ----------------------------------------------------------------
    // AGENT 4 — Creative Agent
    // ----------------------------------------------------------------
    sendEvent('Creative Agent', 'thinking');
    await delay(1500);

    let messageBody = {
      subject: `Special ${incentiveType} just for you!`,
      body: `Hi {{name}}, we miss you! It's been a while since your last visit on {{last_order_date}}. Here's a special ${incentiveType} just for you.`,
      cta: 'Claim Now',
      macros: ['{{name}}', '{{last_order_date}}']
    };

    try {
      const apiKey = process.env.GEMINI_API_KEY || '';
      if (apiKey && apiKey.startsWith('AIzaSy')) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = `
          Write a personalized marketing message.
          Goal: ${goal}
          Top Category: ${topCategory}
          Incentive: ${incentiveType}
          Channel: ${recommendedChannel}
          
          Return ONLY valid JSON (no markdown block, no backticks).
          Schema:
          {
            "subject": "string",
            "body": "string (must include {{name}} and {{last_order_date}} macros)",
            "cta": "string",
            "macros": ["{{name}}", "{{last_order_date}}"]
          }
        `;
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json\n?|```/g, '').trim();
        const parsed = JSON.parse(text);
        if (parsed.body && parsed.body.includes('{{name}}')) {
          messageBody = parsed;
        }
      }
    } catch (e: any) {
      console.error('[Creative Agent] Gemini failed, using fallback.', e.message);
    }

    sendEvent('Creative Agent', 'done', messageBody);

    // ----------------------------------------------------------------
    // ASSEMBLY
    // ----------------------------------------------------------------
    await delay(500);
    const campaignProposal = {
      name: `AI Campaign: ${intent} (${topCategory})`,
      channel: recommendedChannel,
      audienceSize,
      message: {
        subject: messageBody.subject,
        body: messageBody.body,
        cta: messageBody.cta
      },
      segmentFilters: extractedFilters,
      estimatedReach: Math.floor(audienceSize * 0.95),
      incentiveType,
      sendTime
    };

    sendEvent('ASSEMBLY', 'done', { campaignProposal });
    res.end();

  } catch (err: any) {
    console.error('Swarm Error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

export default router;
