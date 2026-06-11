const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
require('dotenv').config({ path: 'backend/.env' });

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  try {
    const prompt = "Find customers who haven't ordered in the last 90 days but have a high discount preference.";

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            agentReply: {
              type: SchemaType.STRING,
              description: 'Your conversational reply to the marketer.'
            },
            proposedCampaign: {
              type: SchemaType.OBJECT,
              description: 'Populate this ONLY if you are proposing a concrete campaign to be executed. Leave null otherwise.',
              nullable: true,
              properties: {
                name: { type: SchemaType.STRING, description: 'Catchy internal campaign name' },
                targetSegment: { type: SchemaType.STRING, description: 'Natural language description of the target audience (e.g. "Coffee lovers who haven\'t bought in 30 days")' },
                channel: { type: SchemaType.STRING, description: 'WHATSAPP, EMAIL, SMS, or RCS' },
                messageCopy: { type: SchemaType.STRING, description: 'The exact drafted message to be sent.' },
                incentive: { type: SchemaType.STRING, description: 'The incentive offered (e.g. "20% off", "Flat $10")' }
              },
              required: ['name', 'targetSegment', 'channel', 'messageCopy', 'incentive']
            }
          },
          required: ['agentReply']
        }
      }
    });

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    console.log("RAW TEXT:", responseText);
    responseText = responseText.replace(/```json\n?|```/g, '').trim();
    console.log("PARSED:", JSON.parse(responseText));
  } catch (error) {
    console.error('Systemic error:', error);
  }
}

run();
