import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env' });

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  try {
    const prompt = `You are the core XENO Marketing AI Agent. You are talking to a marketer.
They want to brainstorm and execute a campaign. 
If they just give a broad goal, ask clarifying questions to narrow down the target audience, incentive, and channel (SMS, Email, WhatsApp, RCS).
Once you have enough context or if their initial prompt is detailed enough, PROPOSE a campaign.
When you propose a campaign, fill out the "proposedCampaign" object in the JSON response. If you are just chatting and not ready to propose, leave "proposedCampaign" null.
Make sure your "agentReply" is conversational, encouraging, and helpful.

Here is the conversation history:
USER: Find customers who haven't ordered in the last 90 days but have a high discount preference." (To test the data segmentation

Based on the LAST message from the USER, generate your response.`;

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
                targetSegment: { type: SchemaType.STRING, description: 'Natural language description of the target audience (e.g. "Coffee lovers who haven\\'t bought in 30 days")' },
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
  } catch (error: any) {
    console.error('Systemic error:', error);
  }
}

run();
