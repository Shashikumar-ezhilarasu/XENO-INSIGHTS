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

const LOCALIZED_PRESETS: Record<string, Record<string, any>> = {
  EN: {
    coffee: {
      campaignName: 'Operation: Spill the Beans ☕',
      explanation: 'Targeting coffee lovers who haven\'t ordered in 90 days using WhatsApp for direct reach.',
      copywriteSuite: {
        notificationHeader: 'Are we broken up? 💔',
        messageTemplate: 'Hey {{name}}, our espresso machine has been crying since you left 90 days ago. Let\'s fix this relationship? Use code COMEBACK for a flat 20% off!',
        creativeQuote: '"Out of sight, out of mind" is a lie. We think about you every morning. - Management'
      },
      primaryCallToAction: 'Claim Free Espresso'
    },
    vip: {
      campaignName: '👑 The Royal Treatment',
      explanation: 'Targeting elite customers with total spend over $500 using elegant email newsletters.',
      copywriteSuite: {
        notificationHeader: 'For your eyes only, VIP 💎',
        messageTemplate: 'Hello {{name}}, since you appreciate the finer things in life, we have a custom luxury gift waiting for you. Claim your hand-packed VIP bundle today!',
        creativeQuote: 'Quality is remembered long after price is forgotten. Enjoy this token of our appreciation.'
      },
      primaryCallToAction: 'Unlock VIP Gift'
    },
    bakery: {
      campaignName: '🥐 Doughn\'t Leave Us Hanging!',
      explanation: 'Nudging bakery buyers who haven\'t purchased this week with high-engagement RCS rich cards.',
      copywriteSuite: {
        notificationHeader: 'Fresh out of the oven! 🔥',
        messageTemplate: 'Hey {{name}}, those croissants you love are warm and golden right now. Use code FRESH for a free pastry with any order today!',
        creativeQuote: 'Life is short. Eat the dessert first.'
      },
      primaryCallToAction: 'Order Warm Croissant'
    },
    default: {
      campaignName: 'Operation: Win Back Customer Hearts ❤️',
      explanation: 'Re-engaging inactive customer segments via direct, witty SMS notifications.',
      copywriteSuite: {
        notificationHeader: 'Did we do something wrong? 🥺',
        messageTemplate: 'Hey {{name}}, we haven\'t seen you in a while and we\'re starting to take it personally. Come back today and get 15% off anything!',
        creativeQuote: 'We miss you more than a dog misses its owner when they go to work.'
      },
      primaryCallToAction: 'Get 15% Off'
    }
  },
  ES: {
    coffee: {
      campaignName: 'Operación: Revelar los granos ☕',
      explanation: 'Dirigido a los amantes del café que no han ordenado en 90 días usando WhatsApp para alcance directo.',
      copywriteSuite: {
        notificationHeader: '¿Nos hemos separado? 💔',
        messageTemplate: 'Hola {{name}}, nuestra máquina de café ha estado llorando desde que te fuiste hace 90 días. ¿Arreglamos esta relación? ¡Usa el código COMEBACK para obtener un 20% de descuento!',
        creativeQuote: '"Fuera de la vista, fuera de la mente" es mentira. Pensamos en ti cada mañana. - La Dirección'
      },
      primaryCallToAction: 'Reclamar Espresso Gratis'
    },
    vip: {
      campaignName: '👑 El Tratamiento Real',
      explanation: 'Dirigido a clientes de élite con un gasto total superior a $500 utilizando boletines informativos elegantes por correo electrónico.',
      copywriteSuite: {
        notificationHeader: 'Solo para tus ojos, VIP 💎',
        messageTemplate: 'Hola {{name}}, ya que aprecias las cosas buenas de la vida, tenemos un regalo de lujo personalizado esperándote. ¡Reclama tu paquete VIP hoy mismo!',
        creativeQuote: 'La calidad se recuerda mucho después de que se olvida el precio. Disfruta de esta muestra de nuestro aprecio.'
      },
      primaryCallToAction: 'Desbloquear Regalo VIP'
    },
    bakery: {
      campaignName: '🥐 ¡No nos dejes colgados!',
      explanation: 'Empujando a los compradores de panadería que no han comprado esta semana con tarjetas ricas en RCS de alto compromiso.',
      copywriteSuite: {
        notificationHeader: '¡Recién salido del horno! 🔥',
        messageTemplate: 'Hola {{name}}, esos croissants que te encantan están calientes y dorados ahora mismo. ¡Usa el código FRESH para un pastel gratis con cualquier pedido hoy!',
        creativeQuote: 'La vida es corta. Come el postre primero.'
      },
      primaryCallToAction: 'Pedir Croissant Caliente'
    },
    default: {
      campaignName: 'Operación: Recuperar Corazones ❤️',
      explanation: 'Re-enganchando segmentos de clientes inactivos a través de notificaciones SMS directas e ingeniosas.',
      copywriteSuite: {
        notificationHeader: '¿Hicimos algo mal? 🥺',
        messageTemplate: 'Hola {{name}}, no te hemos visto en un tiempo y empezamos a tomárnoslo como algo personal. ¡Vuelve hoy y obtén un 15% de descuento en cualquier cosa!',
        creativeQuote: 'Te extrañamos más de lo que un perro extraña a su dueño cuando va a trabajar.'
      },
      primaryCallToAction: 'Obtén 15% Descuento'
    }
  },
  TA: {
    coffee: {
      campaignName: 'ஆபரேஷன்: காபி திருவிழா ☕',
      explanation: 'வாட்ஸ்அப் மூலம் காபி பிரியர்களை நேரடியாக தொடர்பு கொள்ள இலக்கு வைக்கப்பட்டுள்ளது.',
      copywriteSuite: {
        notificationHeader: 'நமக்குள் பிரிவு ஏற்பட்டுவிட்டதா? 💔',
        messageTemplate: 'வணக்கம் {{name}}, எஸ்பிரெசோ இயந்திரம் உங்களுக்காக ஏங்குகிறது. மீண்டும் வர தயாரா? 20% தள்ளுபடிக்கு COMEBACK குறியீட்டைப் பயன்படுத்தவும்!',
        creativeQuote: 'ஒவ்வொரு காலையும் உங்களை நினைக்கிறோம். - மேலாண்மை'
      },
      primaryCallToAction: 'இலவச எஸ்பிரெசோ பெறுக'
    },
    vip: {
      campaignName: '👑 விஐபி சிறப்பு பரிசு',
      explanation: 'மின்னஞ்சல் செய்திமடல் மூலம் $500-க்கு மேல் செலவழித்த விஐபி வாடிக்கையாளர்களை இலக்கு வைக்கிறது.',
      copywriteSuite: {
        notificationHeader: 'உங்களுக்கு மட்டுமே, விஐபி 💎',
        messageTemplate: 'வணக்கம் {{name}}, உங்களுக்காக ஒரு சிறப்பு விஐபி பரிசு காத்திருக்கிறது. இன்றே உங்கள் விஐபி பரிசைப் பெற்றுக்கொள்ளுங்கள்!',
        creativeQuote: 'விலையை விட தரம் எப்போதும் நினைவில் இருக்கும். எங்களின் அன்பான பரிசு இது.'
      },
      primaryCallToAction: 'விஐபி பரிசைத் திறக்கவும்'
    },
    bakery: {
      campaignName: '🥐 எங்களை மறந்துவிடாதீர்கள்!',
      explanation: 'இந்த வாரம் பேக்கரி பொருட்களை வாங்காத வாடிக்கையாளர்களுக்கு சிறந்த ஆர்சிஎஸ் அட்டைகள் மூலம் நினைவூட்டல்.',
      copywriteSuite: {
        notificationHeader: 'சூடான பேக்கரி பொருட்கள் தயார்! 🔥',
        messageTemplate: 'வணக்கம் {{name}}, உங்களுக்குப் பிடித்த குரோசண்ட்ஸ் இப்போது சூடாகவும் சுவையாகவும் தயாராக உள்ளன. FRESH குறியீட்டைப் பயன்படுத்தி இலவச பேஸ்ட்ரி பெறவும்!',
        creativeQuote: 'வாழ்க்கை குறுகியது. இனிப்பை முதலில் சாப்பிடுங்கள்.'
      },
      primaryCallToAction: 'குரோசண்ட் ஆர்டர் செய்க'
    },
    default: {
      campaignName: 'ஆபரேஷன்: அன்பான நினைவூட்டல் ❤️',
      explanation: 'செயலற்ற வாடிக்கையாளர்களை தானியங்கி எஸ்எம்எஸ் மூலம் மீண்டும் ஈர்க்கிறது.',
      copywriteSuite: {
        notificationHeader: 'நாங்கள் ஏதேனும் தவறு செய்தோமா? 🥺',
        messageTemplate: 'வணக்கம் {{name}}, உங்களை பார்த்து சில நாட்கள் ஆகिவிட்டன. இன்றே திரும்பி வந்து எதிலும் 15% தள்ளுபடி பெறுங்கள்!',
        creativeQuote: 'நாங்கள் உங்களை மிகவும் நினைவில் கொள்கிறோம்.'
      },
      primaryCallToAction: '15% தள்ளுபடி பெறுக'
    }
  },
  HI: {
    coffee: {
      campaignName: 'ऑपरेशन: कॉफ़ी कनेक्शन ☕',
      explanation: '90 दिनों से ऑर्डर नहीं करने वाले कॉफ़ी प्रेमियों को सीधे व्हाट्सएप के जरिए लक्षित करना।',
      copywriteSuite: {
        notificationHeader: 'क्या हमारा ब्रेकअप हो गया है? 💔',
        messageTemplate: 'नमस्ते {{name}}, आपके जाने के बाद से हमारी एस्प्रेसो मशीन रो रही है। क्या हम इस रिश्ते को ठीक कर सकते हैं? फ्लैट 20% छूट के लिए COMEBACK कोड का उपयोग करें!',
        creativeQuote: '"आँखों से ओझल, मन से ओझल" एक झूठ है। हम हर सुबह आपके बारे में सोचते हैं। - प्रबंधन'
      },
      primaryCallToAction: 'मुफ़्त एस्प्रेसो प्राप्त करें'
    },
    vip: {
      campaignName: '👑 द रॉयल ट्रीटमेंट',
      explanation: 'सुरुचिपूर्ण ईमेल न्यूज़लेटर्स का उपयोग करके $500 से अधिक खर्च वाले विशिष्ट ग्राहकों को लक्षित करना।',
      copywriteSuite: {
        notificationHeader: 'केवल आपके लिए, VIP 💎',
        messageTemplate: 'नमस्ते {{name}}, हमारे पास आपके लिए एक कस्टम लक्जरी उपहार तैयार है। आज ही अपना VIP बंडल प्राप्त करें!',
        creativeQuote: 'कीमत भूल जाने के बाद भी गुणवत्ता याद रहती है। हमारे आभार के इस प्रतीक का आनंद लें।'
      },
      primaryCallToAction: 'VIP उपहार अनलॉक करें'
    },
    bakery: {
      campaignName: '🥐 हमें भूल मत जाना!',
      explanation: 'इस सप्ताह खरीदारी नहीं करने वाले बेकरी खरीदारों को उच्च-जुड़ाव वाले आरसीएस कार्ड के जरिए अनुस्मारक भेजना।',
      copywriteSuite: {
        notificationHeader: 'ओवन से एकदम ताज़ा! 🔥',
        messageTemplate: 'नमस्ते {{name}}, आपके पसंदीदा क्रोइसैन इस समय गर्म और सुनहरे हैं। आज किसी भी ऑर्डर के साथ मुफ़्त पेस्ट्री के लिए FRESH कोड का उपयोग करें!',
        creativeQuote: 'जीवन छोटा है। मिठाई पहले खाएं।'
      },
      primaryCallToAction: 'गर्म क्रोइसैन ऑर्डर करें'
    },
    default: {
      campaignName: 'ऑपरेशन: दिल जीतना ❤️',
      explanation: 'सीधे और आकर्षक एसएमएस सूचनाओं के माध्यम से निष्क्रिय ग्राहक वर्गों को फिर से जोड़ना।',
      copywriteSuite: {
        notificationHeader: 'क्या हमसे कोई गलती हुई? 🥺',
        messageTemplate: 'नमस्ते {{name}}, हम आपको याद कर रहे हैं। आज ही वापस आएं और किसी भी चीज़ पर 15% की छूट पाएं!',
        creativeQuote: 'हम आपको याद करते हैं जैसे एक कुत्ता अपने मालिक को याद करता है।'
      },
      primaryCallToAction: '15% छूट पाएं'
    }
  },
  FR: {
    coffee: {
      campaignName: 'Opération: Révéler le café ☕',
      explanation: 'Cibler les amateurs de café qui n\'ont pas commandé depuis 90 jours via WhatsApp pour un impact direct.',
      copywriteSuite: {
        notificationHeader: 'Est-ce qu\'on est séparés ? 💔',
        messageTemplate: 'Salut {{name}}, notre machine à expresso pleure depuis votre départ il y a 90 jours. Si on réparait notre relation ? Utilisez le code COMEBACK pour 20% de réduction !',
        creativeQuote: '"Loin des yeux, loin du cœur" est un mensonge. Nous pensons à vous chaque matin. - La Direction'
      },
      primaryCallToAction: 'Réclamer Expresso Gratuit'
    },
    vip: {
      campaignName: '👑 Le Traitement Royal',
      explanation: 'Cibler les clients élites ayant dépensé plus de $500 en utilisant des newsletters élégantes par e-mail.',
      copywriteSuite: {
        notificationHeader: 'Pour vos yeux seulement, VIP 💎',
        messageTemplate: 'Bonjour {{name}}, puisque vous appréciez les bonnes choses de la vie, un cadeau de luxe vous attend. Réclamez votre lot VIP dès aujourd\'hui !',
        creativeQuote: 'La qualité reste bien après que le prix a été oublié. Profitez de ce gage de notre appréciation.'
      },
      primaryCallToAction: 'Débloquer Cadeau VIP'
    },
    bakery: {
      campaignName: '🥐 Ne nous laissez pas tomber !',
      explanation: 'Relancer les acheteurs de boulangerie n\'ayant pas acheté cette semaine avec des cartes RCS engageantes.',
      copywriteSuite: {
        notificationHeader: 'Tout juste sorti du four ! 🔥',
        messageTemplate: 'Salut {{name}}, ces croissants que vous adorez sont chauds et dorés en ce moment. Utilisez le code FRESH pour une viennoiserie offerte aujourd\'hui !',
        creativeQuote: 'La vie est courte. Mangez le dessert en premier.'
      },
      primaryCallToAction: 'Commander Croissant Chaud'
    },
    default: {
      campaignName: 'Opération: Reconquérir les Cœurs ❤️',
      explanation: 'Réengager les segments inactifs via des SMS directs et humoristiques.',
      copywriteSuite: {
        notificationHeader: 'Avons-nous fait quelque chose de mal ? 🥺',
        messageTemplate: 'Salut {{name}}, nous ne vous avons pas vu depuis un moment. Revenez aujourd\'hui et profitez de 15% de réduction sur tout !',
        creativeQuote: 'Vous nous manquez plus qu\'un chien ne manque à son maître quand il part travailler.'
      },
      primaryCallToAction: 'Obtenir 15% de Réduction'
    }
  }
};

function getLocalizedPreset(promptText: string, langCode: string) {
  const normalized = promptText.toLowerCase();
  const lang = (langCode && LOCALIZED_PRESETS[langCode.toUpperCase()]) ? langCode.toUpperCase() : 'EN';
  const dict = LOCALIZED_PRESETS[lang];
  
  let key = 'default';
  if (normalized.includes('coffee') || normalized.includes('bean')) {
    key = 'coffee';
  } else if (normalized.includes('high-spenders') || normalized.includes('vip') || normalized.includes('spend')) {
    key = 'vip';
  } else if (normalized.includes('bakery') || normalized.includes('croissant') || normalized.includes('pastry')) {
    key = 'bakery';
  }

  const basePreset = getPresetForPrompt(promptText);
  const localData = dict[key];

  return {
    ...basePreset,
    campaignName: localData.campaignName,
    explanation: localData.explanation,
    copywriteSuite: {
      ...basePreset.copywriteSuite,
      ...localData.copywriteSuite
    },
    bannerConfig: {
      ...basePreset.bannerConfig,
      primaryCallToAction: localData.primaryCallToAction
    }
  };
}

/**
 * POST /api/ai/draft-campaign
 * Automatically orchestrates a campaign draft
 */
router.post('/ai/draft-campaign', aiSegmentRateLimiter, validateAiSegment, async (req: Request, res: Response) => {
  const { promptText, tone, incentive, channelOverride, language } = req.body;

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
      if (language) prompt += ` and draft all copywriting text (notificationHeader, messageTemplate, creativeQuote, primaryCallToAction) in the target language: "${language}" (e.g. English, Spanish, Tamil, Hindi, French).`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      queryData = JSON.parse(responseText);
    } catch (error: any) {
      console.warn('[AI Agent] Gemini generation failed. Falling back to offline presets. Error:', error.message);
      useFallback = true;
    }
  }

  if (useFallback) {
    const preset = getLocalizedPreset(promptText, language || 'EN');
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
