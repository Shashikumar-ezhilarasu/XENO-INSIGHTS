import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import prisma from '../config/prisma';

const router = Router();

// Initialize the Gemini SDK
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// System instruction specifying the schema and output rules
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
   - category: string (categories: 'Coffee', 'Bakery', 'Apparel', 'Beauty', 'Accessories')
   - createdAt: DateTime

Instructions:
- Analyze the user prompt to determine if it can be represented by a simple Prisma 'where' clause on the Customer model (e.g., matching basic customer properties or totalSpends).
- If it requires grouping, aggregations, or conditional summing on orders (e.g., "spent more than $100 in Coffee" which requires filtering orders by category and summing them), use queryType = "SQL" and write a valid raw SQL query.
- For SQL queries, make sure they are valid PostgreSQL and query all columns from the Customer table (use alias c.* or write out fields) so Prisma can map the result back to Customer objects. Example query for "spent > 100 in Coffee":
  SELECT c.* FROM "Customer" c JOIN "Order" o ON c."id" = o."customerId" WHERE o."category" = 'Coffee' GROUP BY c."id" HAVING SUM(o."amount") > 100
- For PRISMA queries, the prismaWhereJson must be a valid JSON representation of a Prisma CustomerWhereInput object. Example for "spent more than $100 total":
  {"totalSpends": {"gt": 100}}
- Return only valid JSON conforming to the requested response schema.
`;

/**
 * POST /api/ai/segment
 * Accepts promptText and parses it into a customer segment query.
 */
router.post('/segment', async (req: Request, res: Response) => {
  const { promptText } = req.body;

  if (!promptText || typeof promptText !== 'string') {
    return res.status(400).json({ error: 'promptText is required and must be a string.' });
  }

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
            queryType: {
              type: SchemaType.STRING,
              enum: ['PRISMA', 'SQL'],
              description: 'The approach chosen: either a Prisma query filter or a raw SQL query.'
            },
            prismaWhereJson: {
              type: SchemaType.STRING,
              description: 'A JSON string representing a Prisma CustomerWhereInput object. Empty string if using SQL.'
            },
            sqlQuery: {
              type: SchemaType.STRING,
              description: 'A PostgreSQL query selecting Customer records. Empty string if using PRISMA.'
            },
            explanation: {
              type: SchemaType.STRING,
              description: 'A brief explanation of how the query filter was generated.'
            }
          },
          required: ['queryType', 'prismaWhereJson', 'sqlQuery', 'explanation']
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

    if (queryData.queryType === 'PRISMA') {
      let parsedWhere = {};
      if (queryData.prismaWhereJson) {
        try {
          parsedWhere = JSON.parse(queryData.prismaWhereJson);
        } catch (err) {
          return res.status(502).json({
            error: 'Failed to parse generated Prisma filter JSON.',
            prismaWhereJson: queryData.prismaWhereJson
          });
        }
      }

      console.log('Running Prisma FindMany with where clause:', parsedWhere);
      customers = await prisma.customer.findMany({
        where: parsedWhere,
        include: {
          orders: true
        }
      });

    } else if (queryData.queryType === 'SQL') {
      console.log('Running Raw SQL Query:', queryData.sqlQuery);
      
      // Basic safety checks to prevent destructive queries
      const normalizedSql = queryData.sqlQuery.toUpperCase();
      if (normalizedSql.includes('INSERT') || normalizedSql.includes('UPDATE') || normalizedSql.includes('DELETE') || normalizedSql.includes('DROP')) {
        return res.status(403).json({
          error: 'Generated SQL contains forbidden modifying operations.',
          sqlQuery: queryData.sqlQuery
        });
      }

      // Execute raw SQL query.
      // Note: We use queryRawUnsafe because Gemini dynamically generates the query text.
      // In a production app, we would sanitize the schema names and enforce strict read-only access.
      customers = await prisma.$queryRawUnsafe<any[]>(queryData.sqlQuery);

      // If we queried raw, let's fetch full relations for these customers to keep response consistent
      if (customers.length > 0) {
        const customerIds = customers.map(c => c.id);
        customers = await prisma.customer.findMany({
          where: {
            id: { in: customerIds }
          },
          include: {
            orders: true
          }
        });
      }
    } else {
      return res.status(500).json({ error: 'Unrecognized query type returned from AI model.' });
    }

    return res.json({
      success: true,
      queryType: queryData.queryType,
      explanation: queryData.explanation,
      generatedQuery: queryData.queryType === 'PRISMA' ? queryData.prismaWhereJson : queryData.sqlQuery,
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
