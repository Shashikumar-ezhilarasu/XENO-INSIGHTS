// backend/tests/campaign.test.ts
import request from 'supertest';
import app from '../src/app'; // Your Express app entry point
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Campaign & Webhook Async Integration Lifecycle', () => {
  let testCampaignId: string;
  let testCustomerId: string;

  beforeEach(async () => {
    // Seed a test customer and campaign before each test to survive the global truncate hooks
    const customer = await prisma.customer.create({
      data: { name: 'Test User', email: 'test@example.com', phone: '+1234567890' },
    });
    const campaign = await prisma.campaign.create({
      data: {
        name: 'Test Webhook Campaign',
        promptText: 'Find test users',
        messageTemplate: 'Hello {{name}}',
        channel: 'WHATSAPP',
      },
    });
    testCustomerId = customer.id;
    testCampaignId = campaign.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.communication.deleteMany({});
    await prisma.campaign.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.$disconnect();
  });

  it('1. POST /api/campaigns/send - Should create PENDING communications and return 202 instantly', async () => {
    const res = await request(app)
      .post('/api/campaigns/send')
      .send({
        campaignId: testCampaignId,
        customerIds: [testCustomerId],
      });

    expect(res.status).toBe(202);
    expect(res.body.message).toMatch(/Campaign queued/i);

    // Verify DB state is PENDING
    const comms = await prisma.communication.findFirst({
      where: { campaignId: testCampaignId },
    });
    expect(comms).toBeDefined();
    expect(comms?.status).toBe('PENDING');
  });

  it('2. POST /api/webhooks/channel-callback - Should update status from PENDING to DELIVERED', async () => {
    // Explicitly create the pending communication log to ensure this test is fully self-contained
    const pendingComm = await prisma.communication.create({
      data: {
        customerId: testCustomerId,
        campaignId: testCampaignId,
        status: 'PENDING'
      }
    });

    // Simulate the Channel Service firing a webhook back to the CRM
    const webhookPayload = {
      communicationId: pendingComm.id,
      status: 'DELIVERED',
      timestamp: new Date().toISOString(),
    };

    const res = await request(app)
      .post('/api/webhooks/channel-callback')
      .send(webhookPayload);

    expect(res.status).toBe(200);

    // Verify the database updated the state correctly
    const updatedComm = await prisma.communication.findUnique({
      where: { id: pendingComm.id },
    });
    expect(updatedComm?.status).toBe('DELIVERED');
  });

  it('3. POST /api/campaigns/send (A/B testing) - Should split targets 50/50 into variants A and B', async () => {
    // A. Create an A/B campaign
    const abCampaign = await prisma.campaign.create({
      data: {
        name: 'AB Promo Test',
        channel: 'WHATSAPP',
        messageTemplate: 'Variant A: Hi {{name}}',
        messageTemplateB: 'Variant B: Hi {{name}}',
        buttons: '["Buy Now", "Opt Out"]'
      }
    });

    // B. Seed two test customers
    const c1 = await prisma.customer.create({
      data: { name: 'User A', email: 'usera@example.com', phone: '+11111' }
    });
    const c2 = await prisma.customer.create({
      data: { name: 'User B', email: 'userb@example.com', phone: '+22222' }
    });

    // C. Trigger send
    const res = await request(app)
      .post('/api/campaigns/send')
      .send({
        campaignId: abCampaign.id,
        customerIds: [c1.id, c2.id]
      });

    expect(res.status).toBe(202);
    expect(res.body.audienceSize).toBe(2);

    // D. Verify DB state (one variant A, one variant B)
    const comms = await prisma.communication.findMany({
      where: { campaignId: abCampaign.id }
    });

    expect(comms.length).toBe(2);
    const variants = comms.map(c => c.variant);
    expect(variants).toContain('A');
    expect(variants).toContain('B');
  });
});
