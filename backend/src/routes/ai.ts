import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import prisma from '../config/prisma';
import { validateSqlQuery, validatePrismaWhere } from '../utils/queryValidator';
import { validateAiSegment, aiSegmentRateLimiter } from '../middleware/security';

const router = Router();

// Initialize the Gemini SDK
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Schema-Informed system instruction specifying database schema and categories
const SYSTEM_INSTRUCTION = `
You are a Senior Systems and Database Engineer translating natural language prompts into queries targeting a PostgreSQL database of customers and their orders.

Database Schema Details:
1. Customer table:
   - id: string (UUID, Primary Key)
   - name: string
   - email: string (unique)
   - phone: string
   - totalSpends: float (cached total spend across all orders)
   - lastVisitDate: DateTime (optional, last visit timestamp)
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
   For queries requiring complex order-level constraints (like "spent over $50 on Coffee in the last 30 days"), you can use relation filters:
   {"where": {"orders": {"some": {"category": "Coffee", "amount": {"gt": 50}, "createdAt": {"gte": "2026-05-10T22:22:09Z"}}}}}
   If the query cannot be written in Prisma, return an empty object {}.
3. 'fallbackSql' must be a valid, read-only PostgreSQL SELECT query targeting the Customer table (use alias c.* to pull Customer records). For example:
   SELECT c.* FROM "Customer" c JOIN "Order" o ON c."id" = o."customerId" WHERE o."category" = 'Coffee' AND o."amount" > 50 GROUP BY c."id"
   The fallbackSql is used as a fallback if the Prisma query fails or is empty.
4. Do NOT include any destructive or modifying SQL queries. Only read-only SELECT operations.
5. All categories are case-sensitive (e.g. 'Coffee', 'Apparel', 'Bakery', 'Beauty', 'Accessories').
`;

/**
 * POST /api/ai/segment
 * Accepts promptText and parses it into a customer segment query.
 * Applied rate-limiting (5req/min) and body validation.
 */
router.post('/segment', aiSegmentRateLimiter, validateAiSegment, async (req: Request, res: Response) => {
  const { promptText } = req.body;

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.startsWith('AIzaSy...')) {
    return res.status(500).json({ 
      error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in the .env file.' 
    });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            explanation: {
              type: SchemaType.STRING,
              description: 'Brief breakdown of query reasoning and relational logic applied.'
            },
            prismaQuery: {
              type: SchemaType.OBJECT,
              description: 'Structured Prisma findMany arguments object, containing "where" filter conditions. E.g. {"where": {"totalSpends": {"gt": 50}}}. Return empty object {} if not applicable.'
            },
            fallbackSql: {
              type: SchemaType.STRING,
              description: 'Safe read-only SELECT raw SQL query selecting all fields from Customer table.'
            }
          },
          required: ['explanation', 'prismaQuery', 'fallbackSql']
        }
      }
    });

    console.log(`Analyzing segment prompt: "${promptText}"`);
    const prompt = `Analyze this prompt and generate the database query: "${promptText}"`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let queryData;
    try {
      queryData = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini output:', responseText);
      return res.status(502).json({ 
        error: 'Invalid response format received from Gemini model.', 
        rawResponse: responseText 
      });
    }

    let customers: any[] = [];
    let executedQuery = '';
    let queryTypeUsed: 'PRISMA' | 'SQL' = 'PRISMA';
    let prismaSuccess = false;

    // Tier 1: Try Prisma Query
    if (queryData.prismaQuery && typeof queryData.prismaQuery === 'object' && Object.keys(queryData.prismaQuery).length > 0) {
      try {
        const whereClause = queryData.prismaQuery.where || {};

        // Security check on Prisma fields
        const validation = validatePrismaWhere(whereClause);
        if (!validation.valid) {
          return res.status(403).json({
            error: `Prisma Query Security Violation: ${validation.error}`,
            prismaQuery: queryData.prismaQuery
          });
        }

        console.log('Running Prisma FindMany with query:', JSON.stringify(queryData.prismaQuery));
        customers = await prisma.customer.findMany({
          ...queryData.prismaQuery,
          include: {
            orders: true
          }
        });
        executedQuery = JSON.stringify(queryData.prismaQuery);
        queryTypeUsed = 'PRISMA';
        prismaSuccess = true;
      } catch (err: any) {
        console.warn(`[AI Parser] Prisma query execution failed. Falling back to SQL. Error: ${err.message}`);
      }
    }

    // Tier 2: Fallback to SQL Query if Prisma execution failed, was bypassed, or yielded 0 records
    if (!prismaSuccess && queryData.fallbackSql && typeof queryData.fallbackSql === 'string' && queryData.fallbackSql.trim().length > 0) {
      // Security check on Raw SQL
      const validation = validateSqlQuery(queryData.fallbackSql);
      if (!validation.valid) {
        return res.status(403).json({
          error: `SQL Security Violation: ${validation.error}`,
          sqlQuery: queryData.fallbackSql
        });
      }

      console.log('Running Fallback Raw SQL Query:', queryData.fallbackSql);
      const sqlResult = await prisma.$queryRawUnsafe<any[]>(queryData.fallbackSql);
      queryTypeUsed = 'SQL';
      executedQuery = queryData.fallbackSql;

      if (sqlResult.length > 0) {
        const customerIds = sqlResult.map(c => c.id);
        customers = await prisma.customer.findMany({
          where: {
            id: { in: customerIds }
          },
          include: {
            orders: true
          }
        });
      }
    }

    return res.json({
      success: true,
      queryType: queryTypeUsed,
      explanation: queryData.explanation,
      generatedQuery: executedQuery,
      audienceSize: customers.length,
      customers
    });

  } catch (error: any) {
    console.error('Systemic error parsing segment prompt:', error);
    return res.status(500).json({ 
      error: 'An error occurred while processing the segmentation request.',
      details: error.message
    });
  }
});

export default router;
