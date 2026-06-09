import request from 'supertest';
import app from '../src/app';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock the Gemini SDK
jest.mock('@google/generative-ai', () => {
  const mockGenerateContent = jest.fn();
  const mockGetGenerativeModel = jest.fn(() => ({
    generateContent: mockGenerateContent
  }));

  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel
    })),
    SchemaType: {
      OBJECT: 'object',
      STRING: 'string',
      NUMBER: 'number',
      INTEGER: 'integer',
      ARRAY: 'array',
      BOOLEAN: 'boolean'
    }
  };
});

describe('AI Campaign Agent & Campaign Update Routes', () => {
  let mockGenAIInstance: any;
  let mockModelInstance: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGenAIInstance = new GoogleGenerativeAI('key');
    mockModelInstance = mockGenAIInstance.getGenerativeModel({ model: 'model' });
  });

  afterAll(async () => {
    await prisma.campaign.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.$disconnect();
  });

  describe('POST /api/ai/draft-campaign', () => {
    it('should return 400 if promptText is missing or not a string', async () => {
      const res1 = await request(app)
        .post('/api/ai/draft-campaign')
        .send({});
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/ai/draft-campaign')
        .send({ promptText: 123 });
      expect(res2.status).toBe(400);
    });

    it('should fall back to offline presets when GEMINI_API_KEY is not configured', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'AIzaSy...placeholder';
      try {
        const res = await request(app)
          .post('/api/ai/draft-campaign')
          .send({ promptText: 'coffee lovers missing for 90 days' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.campaign.name).toBe('Operation: Spill the Beans ☕');
        expect(res.body.campaign.status).toBe('DRAFT');
      } finally {
        process.env.GEMINI_API_KEY = originalKey;
      }
    });

    it('should return 403 if generated Prisma query contains unauthorized keys', async () => {
      mockModelInstance.generateContent.mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify({
            campaignName: 'Malicious Query',
            prismaQuery: { where: { unauthorizedField: { gt: 10 } } },
            suggestedChannel: 'SMS',
            explanation: 'Trying to query unauthorized fields.',
            copywriteSuite: {
              notificationHeader: 'Witty title',
              messageTemplate: 'Hey {{name}}',
              creativeQuote: 'Some quote'
            },
            bannerConfig: {
              themeGradient: 'from-blue-500 to-indigo-600',
              stickerEmoji: '👾',
              primaryCallToAction: 'Click'
            }
          })
        }
      });

      const res = await request(app)
        .post('/api/ai/draft-campaign')
        .send({ promptText: 'Hack the database' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Prisma Query Security Violation');
    });

    it('should draft a campaign, count customers, and save to database with status DRAFT', async () => {
      // Alice has orders and spent $150
      mockModelInstance.generateContent.mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify({
            campaignName: 'Operation: Coffee Wakeup ☕',
            prismaQuery: { where: { totalSpends: { gt: 100 } } },
            suggestedChannel: 'WHATSAPP',
            explanation: 'Alice has spent over $100, making her a high-spending customer.',
            copywriteSuite: {
              notificationHeader: 'Are we broken up? 💔',
              messageTemplate: 'Hey {{name}}, our coffee machine is crying. Come back for 20% off!',
              creativeQuote: '"Out of sight, out of mind" is a lie. We think about you every morning.'
            },
            bannerConfig: {
              themeGradient: 'from-amber-500 to-orange-600',
              stickerEmoji: '☕',
              primaryCallToAction: 'Claim Free Coffee'
            }
          })
        }
      });

      const res = await request(app)
        .post('/api/ai/draft-campaign')
        .send({ promptText: 'Bring back high spenders' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.customerCount).toBe(1); // test-customer-1 has spent 150.0
      expect(res.body.customerIds).toContain('test-customer-1');
      expect(res.body.campaign.status).toBe('DRAFT');
      expect(res.body.campaign.name).toBe('Operation: Coffee Wakeup ☕');
      expect(res.body.campaign.channel).toBe('WHATSAPP');
      expect(res.body.campaign.messageTemplate).toContain('Hey {{name}}');

      // Verify campaign exists in database with status DRAFT
      const dbCampaign = await prisma.campaign.findUnique({
        where: { id: res.body.campaign.id }
      });
      expect(dbCampaign).toBeDefined();
      expect(dbCampaign?.status).toBe('DRAFT');
    });
  });

  describe('PATCH /api/campaigns/:id', () => {
    it('should update campaign fields successfully', async () => {
      // Create a draft campaign
      const campaign = await prisma.campaign.create({
        data: {
          name: 'Draft Campaign',
          channel: 'SMS',
          status: 'DRAFT',
          messageTemplate: 'Hello {{name}}'
        }
      });

      const res = await request(app)
        .patch(`/api/campaigns/${campaign.id}`)
        .send({
          name: 'Updated Campaign Name',
          messageTemplate: 'New template: {{name}}',
          channel: 'EMAIL',
          status: 'PENDING'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.campaign.name).toBe('Updated Campaign Name');
      expect(res.body.campaign.messageTemplate).toBe('New template: {{name}}');
      expect(res.body.campaign.channel).toBe('EMAIL');
      expect(res.body.campaign.status).toBe('PENDING');

      // Verify db updated
      const updatedCampaign = await prisma.campaign.findUnique({
        where: { id: campaign.id }
      });
      expect(updatedCampaign?.name).toBe('Updated Campaign Name');
      expect(updatedCampaign?.status).toBe('PENDING');
    });
  });
});
