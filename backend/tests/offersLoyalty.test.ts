import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Offers and Loyalty Integration Routes', () => {
  let customer1Id: string;
  let customer2Id: string;

  beforeEach(async () => {
    // Retrieve customers seeded in tests/setup.ts
    const customers = await prisma.customer.findMany();
    customer1Id = customers.find(c => c.id === 'test-customer-1')?.id || '';
    customer2Id = customers.find(c => c.id === 'test-customer-2')?.id || '';

    // Seed test offer codes
    await prisma.offer.deleteMany({});
    await prisma.offer.createMany({
      data: [
        {
          code: 'TEST20',
          discountType: 'PERCENTAGE',
          value: 20.0,
          minOrderValue: 50.0,
          categoryConstraint: null,
          maxTotalUsage: 500,
          maxPerCustomer: 1,
          currentUsageCount: 0
        },
        {
          code: 'COFFEE5',
          discountType: 'FLAT',
          value: 5.0,
          minOrderValue: 10.0,
          categoryConstraint: 'Coffee',
          maxTotalUsage: 100,
          maxPerCustomer: 1,
          currentUsageCount: 0
        },
        {
          code: 'MAXEDOUT',
          discountType: 'FLAT',
          value: 10.0,
          minOrderValue: 5.0,
          categoryConstraint: null,
          maxTotalUsage: 5,
          maxPerCustomer: 1,
          currentUsageCount: 5 // fully used
        }
      ]
    });
  });

  afterAll(async () => {
    await prisma.offer.deleteMany({});
    await prisma.$disconnect();
  });

  describe('POST /api/offers/validate', () => {
    it('should return 400 for missing validate payload fields', async () => {
      const res = await request(app)
        .post('/api/offers/validate')
        .send({ code: 'TEST20' });
      expect(res.status).toBe(400);
      expect(res.body.valid).toBe(false);
    });

    it('should return 404 for invalid offer codes', async () => {
      const res = await request(app)
        .post('/api/offers/validate')
        .send({
          customerId: customer1Id,
          cartTotal: 100.0,
          productCategory: 'Coffee',
          code: 'DOESNOTEXIST'
        });
      expect(res.status).toBe(404);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toContain('does not exist');
    });

    it('should reject cartTotal below minOrderValue', async () => {
      const res = await request(app)
        .post('/api/offers/validate')
        .send({
          customerId: customer1Id,
          cartTotal: 30.0, // min is 50.0
          productCategory: 'Coffee',
          code: 'TEST20'
        });
      expect(res.status).toBe(400);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toContain('Minimum order value criteria not met');
    });

    it('should reject category constraint violations', async () => {
      const res = await request(app)
        .post('/api/offers/validate')
        .send({
          customerId: customer1Id,
          cartTotal: 25.0,
          productCategory: 'Bakery', // coupon only valid for 'Coffee'
          code: 'COFFEE5'
        });
      expect(res.status).toBe(400);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toContain('Category constraint violated');
    });

    it('should reject offers exceeding system-wide limit', async () => {
      const res = await request(app)
        .post('/api/offers/validate')
        .send({
          customerId: customer1Id,
          cartTotal: 20.0,
          productCategory: 'Coffee',
          code: 'MAXEDOUT'
        });
      expect(res.status).toBe(400);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toContain('system-wide execution limit exceeded');
    });

    it('should validate and calculate discount successfully', async () => {
      const res = await request(app)
        .post('/api/offers/validate')
        .send({
          customerId: customer1Id,
          cartTotal: 100.0,
          productCategory: 'Coffee',
          code: 'TEST20'
        });
      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.discountValue).toBe(20.0); // 20% of 100
      expect(res.body.offer.code).toBe('TEST20');
    });
  });

  describe('POST /api/loyalty/gamify-event', () => {
    it('should award points for SPIN_WHEEL event and increment loyaltyPoints', async () => {
      const resBefore = await prisma.customer.findUnique({ where: { id: customer1Id } });
      const initialPoints = resBefore?.loyaltyPoints || 0.0;

      const res = await request(app)
        .post('/api/loyalty/gamify-event')
        .send({
          customerId: customer1Id,
          eventType: 'SPIN_WHEEL'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pointsAwarded).toBe(50.0);
      expect(res.body.currentPoints).toBe(initialPoints + 50.0);

      // Verify db state
      const resAfter = await prisma.customer.findUnique({ where: { id: customer1Id } });
      expect(resAfter?.loyaltyPoints).toBe(initialPoints + 50.0);
    });

    it('should award default points for unknown events', async () => {
      const resBefore = await prisma.customer.findUnique({ where: { id: customer1Id } });
      const initialPoints = resBefore?.loyaltyPoints || 0.0;

      const res = await request(app)
        .post('/api/loyalty/gamify-event')
        .send({
          customerId: customer1Id,
          eventType: 'SOME_UNKNOWN_EVENT'
        });

      expect(res.status).toBe(200);
      expect(res.body.pointsAwarded).toBe(10.0);
      expect(res.body.currentPoints).toBe(initialPoints + 10.0);
    });
  });

  describe('POST /api/loyalty/referral', () => {
    it('should link referrer and award milestone point bonuses to both parties concurrently in a transaction', async () => {
      const refBefore = await prisma.customer.findUnique({ where: { id: customer1Id } });
      const refereeBefore = await prisma.customer.findUnique({ where: { id: customer2Id } });

      const refInitPoints = refBefore?.loyaltyPoints || 0.0;
      const refereeInitPoints = refereeBefore?.loyaltyPoints || 0.0;

      const res = await request(app)
        .post('/api/loyalty/referral')
        .send({
          referrerId: customer1Id,
          referredId: customer2Id
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.referrerBonus).toBe(100.0);
      expect(res.body.referredBonus).toBe(50.0);

      // Verify db changes
      const refAfter = await prisma.customer.findUnique({ where: { id: customer1Id } });
      const refereeAfter = await prisma.customer.findUnique({ where: { id: customer2Id } });

      expect(refAfter?.loyaltyPoints).toBe(refInitPoints + 100.0);
      expect(refereeAfter?.loyaltyPoints).not.toBeNull();
      expect(refereeAfter?.loyaltyPoints).toBe(refereeInitPoints + 50.0);
      expect(refereeAfter?.referrerId).toBe(customer1Id);
    });
  });
});
