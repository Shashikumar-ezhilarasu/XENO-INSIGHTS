import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import prisma from '../config/prisma';
import { validatePrismaWhere } from '../utils/queryValidator';
import { validateAiSegment, aiSegmentRateLimiter } from '../middleware/security';

const router = Router();

// Initialize the Gemini SDK
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const SYSTEM_INSTRUCTION = `
You are a World-Class Retention and Copywriting Growth Agent. You help users design highly engaging, witty marketing campaigns.
For any natural language input prompt, you must devise a structured campaign plan.

Inject the Growth-Hacking Engagement Guardrails:
- All copywriting copy must mimic the hyper-contextual, witty, emotionally engaging, and humorous push notifications used by hyper-growth consumer apps.
- Make it conversational, punchy, slightly cheeky, and very relatable.
- Use emojis and short sentences.
- Avoid generic marketing jargon like "Dear customer, we miss you, please buy." Instead use: "Are we broken up? 💔 Hey {{name}}, our coffee machine has been crying since you left. Let's fix this relationship?"

Database Schema Details:
1. Customer table:
   - id: string (UUID, Primary Key)
   - name: string
   - email: string (unique)
   - phone: string
   - totalSpends: float (cached total spend across all orders)
   - lastVisitDate: DateTime (optional, last visit date/time)
   - loyaltyPoints: float (loyalty rewards balance)
   - createdAt: DateTime
   - updatedAt: DateTime

2. Order table:
   - id: string (UUID, Primary Key)
   - customerId: string (Foreign Key referencing Customer.id)
   - amount: float (amount spent in this order)
   - itemCount: integer (number of items bought in this order)
   - category: string (categories cased exactly: 'Coffee', 'Bakery', 'Apparel', 'Beauty', 'Accessories')
   - createdAt: DateTime

Rules for 'prismaQuery':
- 'prismaQuery' must be a structured Prisma findMany arguments object, containing a 'where' clause. E.g.:
  {"where": {"totalSpends": {"gt": 50}}}
  Or relational queries targeting order category/amount/dates:
  {"where": {"orders": {"some": {"category": "Coffee", "amount": {"gt": 50}}}}}
- To filter by lastVisitDate or createdAt dates, use ISO date strings (e.g. {"where": {"lastVisitDate": {"lte": "2026-03-11T00:00:00.000Z"}}}). Assume the current date/time is 2026-06-09T23:51:28+05:30.
- All Prisma queries must target the exact field names (lastVisitDate, totalSpends, loyaltyPoints). Never use snake_case like last_visit_date.

Instructions:
You must output a JSON object containing the fields: 'campaignName', 'prismaQuery', 'suggestedChannel', 'explanation', 'copywriteSuite', 'bannerConfig', and 'gamifiedConfig'.
`;

// Offline presets fallback database
const OFFLINE_PRESETS = [
  {
    keywords: ['coffee', '90', 'bean'],
    campaignName: 'Operation: Spill the Beans ☕',
    suggestedChannel: 'WHATSAPP',
    explanation: 'Targeting coffee lovers who haven\'t ordered in 90 days using WhatsApp for direct reach.',
    copywriteSuite: {
      notificationHeader: 'Are we broken up? 💔',
      messageTemplate: 'Hey {{name}}, our espresso machine has been crying since you left 90 days ago. Let\'s fix this relationship? Use code COMEBACK for a flat 20% off!',
      creativeQuote: '"Out of sight, out of mind" is a lie. We think about you every morning. - Management'
    },
    bannerConfig: {
      themeGradient: 'from-amber-500 to-orange-600',
      stickerEmoji: '☕',
      primaryCallToAction: 'Claim Free Espresso'
    },
    gamifiedConfig: {
      gameType: 'SCRATCH_CARD',
      prizePool: 'Free Espresso, 50 Loyalty Points, 20% Off Beans',
      milestoneTriggerPoints: 100
    },
    prismaQuery: {
      where: {
        orders: {
          some: {
            category: 'Coffee'
          }
        }
      }
    }
  },
  {
    keywords: ['high-spenders', 'vip', '500', 'luxury', 'gift', 'spender', 'spenders'],
    campaignName: '👑 The Royal Treatment',
    suggestedChannel: 'EMAIL',
    explanation: 'Targeting elite customers with total spend over $500 using elegant email newsletters.',
    copywriteSuite: {
      notificationHeader: 'For your eyes only, VIP 💎',
      messageTemplate: 'Hello {{name}}, since you appreciate the finer things in life, we have a custom luxury gift waiting for you. Claim your hand-packed VIP bundle today!',
      creativeQuote: 'Quality is remembered long after price is forgotten. Enjoy this token of our appreciation.'
    },
    bannerConfig: {
      themeGradient: 'from-yellow-600 to-amber-900',
      stickerEmoji: '🎁',
      primaryCallToAction: 'Unlock VIP Gift'
    },
    gamifiedConfig: {
      gameType: 'TRIVIA',
      prizePool: 'Free Pastry, 200 Loyalty Points, VIP Exclusive Gift',
      milestoneTriggerPoints: 300
    },
    prismaQuery: {
      where: {
        totalSpends: {
          gt: 500
        }
      }
    }
  },
  {
    keywords: ['bakery', 'croissant', 'pastry', 'week'],
    campaignName: '🥐 Doughn\'t Leave Us Hanging!',
    suggestedChannel: 'RCS',
    explanation: 'Nudging bakery buyers who haven\'t purchased this week with high-engagement RCS rich cards.',
    copywriteSuite: {
      notificationHeader: 'Fresh out of the oven! 🔥',
      messageTemplate: 'Hey {{name}}, those croissants you love are warm and golden right now. Use code FRESH for a free pastry with any order today!',
      creativeQuote: 'Life is short. Eat the dessert first.'
    },
    bannerConfig: {
      themeGradient: 'from-orange-400 to-rose-600',
      stickerEmoji: '🥐',
      primaryCallToAction: 'Order Warm Croissant'
    },
    gamifiedConfig: {
      gameType: 'SPIN_WHEEL',
      prizePool: 'Free Croissant, 30 Loyalty Points, Flat $5 Off',
      milestoneTriggerPoints: 150
    },
    prismaQuery: {
      where: {
        orders: {
          some: {
            category: 'Bakery'
          }
        }
      }
    }
  }
];

const DEFAULT_PRESET = {
  campaignName: 'Operation: Win Back Customer Hearts ❤️',
  suggestedChannel: 'SMS',
  explanation: 'Re-engaging inactive customer segments via direct, witty SMS notifications.',
  copywriteSuite: {
    notificationHeader: 'Did we do something wrong? 🥺',
    messageTemplate: 'Hey {{name}}, we haven\'t seen you in a while and we\'re starting to take it personally. Come back today and get 15% off anything!',
    creativeQuote: 'We miss you more than a dog misses its owner when they go to work.'
  },
  bannerConfig: {
    themeGradient: 'from-purple-500 to-indigo-600',
    stickerEmoji: '👋',
    primaryCallToAction: 'Get 15% Off'
  },
  gamifiedConfig: {
    gameType: 'SPIN_WHEEL',
    prizePool: 'Free Treat, 20 Loyalty Points, 15% Off Code',
    milestoneTriggerPoints: 100
  },
  prismaQuery: {
    where: {
      totalSpends: {
        gt: 0
      }
    }
  }
};

function getPresetForPrompt(promptText: string) {
  const normalized = promptText.toLowerCase();
  for (const preset of OFFLINE_PRESETS) {
    if (preset.keywords.some(kw => normalized.includes(kw))) {
      return preset;
    }
  }
  return DEFAULT_PRESET;
}

/**
 * POST /api/ai/draft-campaign
 * Automatically orchestrates a campaign draft
 */
router.post('/ai/draft-campaign', aiSegmentRateLimiter, validateAiSegment, async (req: Request, res: Response) => {
  const { promptText, tone, incentive, channelOverride } = req.body;

  let queryData;
  let useFallback = false;

  // If apiKey is not configured, fall back to offline presets directly
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.startsWith('AIzaSy...')) {
    console.warn('[AI Agent] Gemini API key is not configured. Using offline presets fallback.');
    useFallback = true;
  }

  if (!useFallback) {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              campaignName: {
                type: SchemaType.STRING,
                description: 'A catchy, internal name for the campaign (e.g., "Operation: Spill the Beans ☕").'
              },
              prismaQuery: {
                type: SchemaType.OBJECT,
                description: 'Structured Prisma findMany arguments object containing "where" filter conditions. E.g. {"where": {"totalSpends": {"gt": 50}}}.'
              },
              suggestedChannel: {
                type: SchemaType.STRING,
                description: 'The optimal channel choice: WHATSAPP, EMAIL, SMS, or RCS.'
              },
              explanation: {
                type: SchemaType.STRING,
                description: 'A brief sentence explaining why this channel and segment were chosen.'
              },
              copywriteSuite: {
                type: SchemaType.OBJECT,
                properties: {
                  notificationHeader: {
                    type: SchemaType.STRING,
                    description: 'A witty, click-worthy hook or headline (e.g., "Are we broken up? 💔").'
                  },
                  messageTemplate: {
                    type: SchemaType.STRING,
                    description: 'The core personalized message body utilizing variables like {{name}}.'
                  },
                  creativeQuote: {
                    type: SchemaType.STRING,
                    description: 'A funny, emotional, or relatable quote to place on banner layouts.'
                  }
                },
                required: ['notificationHeader', 'messageTemplate', 'creativeQuote']
              },
              bannerConfig: {
                type: SchemaType.OBJECT,
                properties: {
                  themeGradient: {
                    type: SchemaType.STRING,
                    description: 'Tailwind gradient classes matching the mood (e.g., "from-amber-500 to-orange-600").'
                  },
                  stickerEmoji: {
                    type: SchemaType.STRING,
                    description: 'An illustrative emoji for the banner (e.g., "☕").'
                  },
                  primaryCallToAction: {
                    type: SchemaType.STRING,
                    description: 'The button text on the banner ad (e.g., "Claim Free Pastry 🥐").'
                  }
                },
                required: ['themeGradient', 'stickerEmoji', 'primaryCallToAction']
              },
              gamifiedConfig: {
                type: SchemaType.OBJECT,
                properties: {
                  gameType: {
                    type: SchemaType.STRING,
                    description: 'The type of gamification mechanism: SPIN_WHEEL, TRIVIA, or SCRATCH_CARD.'
                  },
                  prizePool: {
                    type: SchemaType.STRING,
                    description: 'Comma separated list of prizes available (e.g., "Free Croissant, 50 Loyalty Points, 10% Off").'
                  },
                  milestoneTriggerPoints: {
                    type: SchemaType.INTEGER,
                    description: 'The loyalty milestone target points to unlock the game.'
                  }
                },
                required: ['gameType', 'prizePool', 'milestoneTriggerPoints']
              }
            },
            required: ['campaignName', 'prismaQuery', 'suggestedChannel', 'explanation', 'copywriteSuite', 'bannerConfig', 'gamifiedConfig']
          }
        }
      });

      console.log(`[AI Agent] Analyzing prompt for campaign draft: "${promptText}"`);
      let prompt = `Formulate a campaign draft for: "${promptText}"`;
      if (tone) prompt += ` with copywriting tone: "${tone}"`;
      if (incentive) prompt += ` and dynamic target incentive: "${incentive}"`;
      if (channelOverride) prompt += ` and route channel override: "${channelOverride}"`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      queryData = JSON.parse(responseText);
    } catch (error: any) {
      console.warn('[AI Agent] Gemini generation failed. Falling back to offline presets. Error:', error.message);
      useFallback = true;
    }
  }

  if (useFallback) {
    const preset = getPresetForPrompt(promptText);
    queryData = {
      ...preset,
      copywriteSuite: { ...preset.copywriteSuite },
      bannerConfig: { ...preset.bannerConfig },
      gamifiedConfig: { ...preset.gamifiedConfig }
    };

    if (channelOverride) {
      queryData.suggestedChannel = channelOverride.toUpperCase();
    }
    if (tone) {
      const toneLower = tone.toLowerCase();
      if (toneLower.includes('urgent') || toneLower.includes('fomo')) {
        queryData.copywriteSuite.notificationHeader = '🚨 URGENT: Don\'t miss out!';
        queryData.copywriteSuite.messageTemplate = queryData.copywriteSuite.messageTemplate.replace(/Hey/i, 'HURRY! Time is running out. Hey');
      } else if (toneLower.includes('premium') || toneLower.includes('luxury')) {
        queryData.copywriteSuite.notificationHeader = '💎 An Exclusive Invitation';
        queryData.copywriteSuite.messageTemplate = queryData.copywriteSuite.messageTemplate.replace(/Hey/i, 'Greetings');
      }
    }
    if (incentive) {
      const inc = incentive.toUpperCase();
      if (inc.includes('PERCENTAGE')) {
        queryData.copywriteSuite.messageTemplate = queryData.copywriteSuite.messageTemplate.replace(/\d+%\s*off|flat\s*\$\d+|loyalty/i, '20% off');
      } else if (inc.includes('FLAT')) {
        queryData.copywriteSuite.messageTemplate = queryData.copywriteSuite.messageTemplate.replace(/\d+%\s*off|flat\s*\$\d+|loyalty/i, 'flat $10');
      } else if (inc.includes('LOYALTY')) {
        queryData.copywriteSuite.messageTemplate = queryData.copywriteSuite.messageTemplate.replace(/\d+%\s*off|flat\s*\$\d+|loyalty/i, '3x loyalty points');
      }
    }
  }

  try {
    // Pass the prismaQuery through the existing queryValidator to ensure read-only safety
    const prismaQuery = queryData.prismaQuery || {};
    const whereClause = prismaQuery.where || {};

    const validation = validatePrismaWhere(whereClause);
    if (!validation.valid) {
      return res.status(403).json({
        error: `Prisma Query Security Violation: ${validation.error}`,
        prismaQuery: queryData.prismaQuery
      });
    }

    // Execute the Prisma query to find customers and compute customerCount / customerIds
    let customers: any[] = [];
    try {
      customers = await prisma.customer.findMany({
        ...prismaQuery,
        select: { id: true }
      });
    } catch (dbErr: any) {
      console.error('[AI Agent] Prisma query execution failed:', dbErr.message);
      // Fallback: If query fails (e.g. invalid date format or criteria), we still want to create the draft, but return 0 customers
    }

    const customerCount = customers.length;
    const customerIds = customers.map(c => c.id);

    // Save buttons config matching bannerConfig.primaryCallToAction
    const buttonsJson = queryData.bannerConfig?.primaryCallToAction 
      ? JSON.stringify([queryData.bannerConfig.primaryCallToAction]) 
      : null;

    // Automatically execute a Prisma create call to save this directly into the Campaign table with status 'DRAFT'
    const campaign = await prisma.campaign.create({
      data: {
        name: queryData.campaignName,
        promptText: promptText,
        channel: queryData.suggestedChannel.toUpperCase(),
        messageTemplate: queryData.copywriteSuite.messageTemplate,
        buttons: buttonsJson,
        status: 'DRAFT'
      }
    });

    return res.json({
      success: true,
      campaign,
      customerCount,
      customerIds,
      explanation: queryData.explanation,
      copywriteSuite: queryData.copywriteSuite,
      bannerConfig: queryData.bannerConfig,
      gamifiedConfig: queryData.gamifiedConfig
    });

  } catch (error: any) {
    console.error('[AI Agent] Systemic error drafting campaign:', error);
    return res.status(500).json({
      error: 'An error occurred while drafting the campaign.',
      details: error.message
    });
  }
});

/**
 * PATCH /api/campaigns/:id
 * Allows updating campaign metadata (e.g., name, messageTemplate, channel, status) before launching.
 */
router.patch('/campaigns/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, messageTemplate, channel, status } = req.body;

  try {
    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (messageTemplate !== undefined) dataToUpdate.messageTemplate = messageTemplate;
    if (channel !== undefined) dataToUpdate.channel = channel.toUpperCase();
    if (status !== undefined) dataToUpdate.status = status;

    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: dataToUpdate
    });

    return res.json({
      success: true,
      campaign: updatedCampaign
    });
  } catch (error: any) {
    console.error(`[AI Agent] Failed to update campaign ${id}:`, error);
    return res.status(500).json({
      error: 'Failed to update campaign configuration.',
      details: error.message
    });
  }
});

export default router;
