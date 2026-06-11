import request from 'supertest';
import app from '../src/app'; // Your Express app entry point
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('CDP Enterprise Engine - Integration Verification Suite', () => {
  beforeEach(async () => {
    // Clean slate for isolation
    await prisma.order.deleteMany({});
    await prisma.communication.deleteMany({});
    await prisma.trigger.deleteMany({});
    await prisma.campaign.deleteMany({});
    await prisma.customer.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Identity Resolution (Deterministic Stitching)', () => {
    it('should stitch two fragmented profiles into a unified customer view when overlapping identifiers are ingested', async () => {
      // Setup: Profile A has only an email (e.g., web signup)
      const customerA = await prisma.customer.create({
        data: { name: 'Pooja S. (Web)', email: 'pooja@mail.com', phone: 'PENDING_PHONE_1' }
      });
      
      // Setup: Profile B has only a phone number (e.g., offline POS checkout)
      const customerB = await prisma.customer.create({
        data: { name: 'Pooja Offline', email: 'pending_email_2@mail.com', phone: '+919999999999' }
      });

      // Link an order to the offline profile
      await prisma.order.create({
        data: { customerId: customerB.id, amount: 1356.0, itemCount: 1, category: 'Coffee' }
      });

      // Ingest overlapping event containing BOTH identifiers
      const res = await request(app)
        .post('/api/ingest/identity-event')
        .send({
          email: 'pooja@mail.com',
          phone: '+919999999999',
          orderAmount: 500.0,
          itemCategory: 'Bakery'
        });

      expect(res.status).toBe(200);

      // Assert: One record should be completely rolled into the other
      const physicalRows = await prisma.customer.findMany({
        where: {
          OR: [{ email: 'pooja@mail.com' }, { phone: '+919999999999' }]
        }
      });
      
      // The duplication has been resolved out of the table
      expect(physicalRows.length).toBe(1);

      // Assert: Both historical and incoming orders are consolidated under the surviving UUID
      const survivingCustomerId = physicalRows[0].id;
      const combinedOrders = await prisma.order.findMany({
        where: { customerId: survivingCustomerId }
      });
      expect(combinedOrders.length).toBe(2);
    });
  });

  describe('2. Click Funnel Callback Pipeline', () => {
    it('should cycle through to a CLICKED state and dynamically attribute calculated revenue to the campaign metrics', async () => {
      const customer = await prisma.customer.create({
        data: { name: 'Funnel Tester', email: 'funnel@mail.com', phone: '+1111111111', totalSpends: 100 }
      });
      
      await prisma.order.create({
        data: { customerId: customer.id, amount: 100, category: 'Coffee' }
      });

      const campaign = await prisma.campaign.create({
        data: {
          name: 'Zomato-Style Flash Discount',
          promptText: 'Target active shoppers',
          messageTemplate: 'Hey {{name}}, click here for 50% off!',
          channel: 'WHATSAPP'
        }
      });

      const communication = await prisma.communication.create({
        data: {
          campaignId: campaign.id,
          customerId: customer.id,
          status: 'PENDING'
        }
      });

      // Directly trigger a simulated CLICKED callback status response
      const res = await request(app)
        .post('/api/webhooks/channel-callback')
        .send({
          communicationId: communication.id,
          status: 'CLICKED'
        });

      expect(res.status).toBe(200);

      // Assert: Database status record updated correctly
      const updatedComm = await prisma.communication.findUnique({
        where: { id: communication.id }
      });
      expect(updatedComm?.status).toBe('CLICKED');
      
      // Assert: Campaign revenue has increased
      const updatedCampaign = await prisma.campaign.findUnique({
        where: { id: campaign.id }
      });
      expect(updatedCampaign?.revenueGenerated).toBeGreaterThan(0);
    });
  });
});
