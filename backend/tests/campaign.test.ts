import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/prisma';

// Mock the global fetch to avoid real outbound connection logs during background runs
const originalFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true })
    } as any)
  );
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

describe('Campaign & Webhook Ingestion Integration Lifecycle', () => {
  
  it('should successfully create campaign metadata', async () => {
    const res = await request(app)
      .post('/api/campaigns/create')
      .send({
        name: 'Fall Fashion Special',
        channel: 'EMAIL',
        promptText: 'Find high spenders in apparel'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.campaign.id).toBeDefined();
    expect(res.body.campaign.name).toBe('Fall Fashion Special');
    expect(res.body.campaign.channel).toBe('EMAIL');
  });

  it('should return 400 if channel is invalid when creating a campaign', async () => {
    const res = await request(app)
      .post('/api/campaigns/create')
      .send({
        name: 'Fall Fashion Special',
        channel: 'TELEGRAM' // Invalid channel
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('channel must be one of');
  });

  it('should trigger campaign send, insert PENDING logs, and return 202 instantly', async () => {
    // 1. Create a campaign record
    const campaign = await prisma.campaign.create({
      data: {
        name: 'Summer Coffee Drive',
        channel: 'WHATSAPP'
      }
    });

    // 2. Post campaign send request
    const res = await request(app)
      .post('/api/campaigns/send')
      .send({
        campaignId: campaign.id,
        customerIds: ['test-customer-1', 'test-customer-2']
      });

    // Verify 202 Accepted response status
    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.audienceSize).toBe(2);

    // Verify database has created PENDING records immediately
    const communications = await prisma.communication.findMany({
      where: { campaignId: campaign.id }
    });

    expect(communications.length).toBe(2);
    expect(communications.every(c => c.status === 'PENDING')).toBe(true);
  });

  it('should consume webhook callback and update communication status accurately', async () => {
    // 1. Setup a campaign and a pending communication record
    const campaign = await prisma.campaign.create({
      data: {
        name: 'Holiday Sale',
        channel: 'SMS'
      }
    });

    const communication = await prisma.communication.create({
      data: {
        id: 'test-communication-uuid',
        customerId: 'test-customer-1',
        campaignId: campaign.id,
        status: 'PENDING'
      }
    });

    const initialUpdatedAt = new Date(communication.updatedAt);

    // Delay slightly to ensure updatedAt changes
    await new Promise(resolve => setTimeout(resolve, 50));

    // 2. POST to webhook channel callback
    const res = await request(app)
      .post('/api/webhooks/channel-callback')
      .send({
        communicationId: communication.id,
        status: 'DELIVERED',
        timestamp: new Date().toISOString()
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.record.status).toBe('DELIVERED');

    // 3. Assert database update and timestamps
    const updated = await prisma.communication.findUnique({
      where: { id: communication.id }
    });

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('DELIVERED');
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
  });

  it('should implement status sequence precedence (ignore stale updates)', async () => {
    // 1. Setup a campaign and a communication record already marked as OPENED
    const campaign = await prisma.campaign.create({
      data: {
        name: 'Holiday Sale 2',
        channel: 'SMS'
      }
    });

    const communication = await prisma.communication.create({
      data: {
        id: 'test-communication-precedence',
        customerId: 'test-customer-1',
        campaignId: campaign.id,
        status: 'OPENED' // Advanced state
      }
    });

    // 2. Fire a stale 'DELIVERED' status update (which has lower precedence than 'OPENED')
    const res = await request(app)
      .post('/api/webhooks/channel-callback')
      .send({
        communicationId: communication.id,
        status: 'DELIVERED', // Stale lower precedence state
        timestamp: new Date().toISOString()
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Status update ignored');

    // 3. Assert database status remains OPENED
    const updated = await prisma.communication.findUnique({
      where: { id: communication.id }
    });

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('OPENED'); // Did not regress to DELIVERED
  });
});
