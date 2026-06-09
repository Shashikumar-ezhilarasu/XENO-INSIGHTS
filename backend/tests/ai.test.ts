import request from 'supertest';
import app from '../src/app';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

describe('POST /api/ai/segment - AI Parsing Route', () => {
  let mockGenAIInstance: any;
  let mockModelInstance: any;

  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    mockGenAIInstance = new GoogleGenerativeAI('key');
    mockModelInstance = mockGenAIInstance.getGenerativeModel({ model: 'model' });
  });

  it('should return 400 if promptText is missing or not a string', async () => {
    const res1 = await request(app)
      .post('/api/ai/segment')
      .send({});
    expect(res1.status).toBe(400);
    expect(res1.body.error).toContain('promptText is required');

    const res2 = await request(app)
      .post('/api/ai/segment')
      .send({ promptText: 123 });
    expect(res2.status).toBe(400);
  });

  it('should return 500 if GEMINI_API_KEY is not configured', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'AIzaSy...placeholder'; // mock invalid placeholder key
    
    const res = await request(app)
      .post('/api/ai/segment')
      .send({ promptText: 'Find high spenders' });
      
    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Gemini API key is not configured');
    
    process.env.GEMINI_API_KEY = originalKey; // restore key
  });

  it('should parse prompt into a PRISMA query and query database successfully', async () => {
    // Mock successful Prisma response from Gemini
    mockModelInstance.generateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({
          queryType: 'PRISMA',
          prismaWhereJson: JSON.stringify({ totalSpends: { gt: 100 } }),
          sqlQuery: '',
          explanation: 'Targeting customers who spent more than 100'
        })
      }
    });

    const res = await request(app)
      .post('/api/ai/segment')
      .send({ promptText: 'Find customers who spent more than 100' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.queryType).toBe('PRISMA');
    expect(res.body.audienceSize).toBe(1); // Only test-customer-1 has spent 150
    expect(res.body.customers[0].id).toBe('test-customer-1');
  });

  it('should parse prompt into a SQL query and query database successfully', async () => {
    // Mock successful SQL response from Gemini
    mockModelInstance.generateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({
          queryType: 'SQL',
          prismaWhereJson: '',
          sqlQuery: 'SELECT * FROM "Customer" WHERE "totalSpends" > 30 AND "totalSpends" < 100',
          explanation: 'Targeting customers with spends between 30 and 100'
        })
      }
    });

    const res = await request(app)
      .post('/api/ai/segment')
      .send({ promptText: 'Find customers between 30 and 100' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.queryType).toBe('SQL');
    expect(res.body.audienceSize).toBe(1); // Only test-customer-2 has spent 35
    expect(res.body.customers[0].id).toBe('test-customer-2');
  });

  it('should return 403 if generated SQL query contains forbidden modifications', async () => {
    // Mock malicious SQL injection from Gemini
    mockModelInstance.generateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({
          queryType: 'SQL',
          prismaWhereJson: '',
          sqlQuery: 'DROP TABLE "Customer";',
          explanation: 'Attempting delete'
        })
      }
    });

    const res = await request(app)
      .post('/api/ai/segment')
      .send({ promptText: 'Delete all users' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('forbidden modifying operations');
  });

  it('should handle invalid JSON responses from the Gemini API gracefully', async () => {
    // Mock malformed return text
    mockModelInstance.generateContent.mockResolvedValueOnce({
      response: {
        text: () => 'invalid-json-output'
      }
    });

    const res = await request(app)
      .post('/api/ai/segment')
      .send({ promptText: 'Find customers' });

    expect(res.status).toBe(502);
    expect(res.body.error).toContain('Invalid response format');
  });

  it('should handle general runtime errors in the parser route gracefully', async () => {
    // Mock runtime model exception
    mockModelInstance.generateContent.mockRejectedValueOnce(new Error('Generative AI service unavailable.'));

    const res = await request(app)
      .post('/api/ai/segment')
      .send({ promptText: 'Find customers' });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('An error occurred while processing');
  });
});
