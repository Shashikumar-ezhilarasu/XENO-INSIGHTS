import re

with open('backend/src/routes/ai.ts', 'r') as f:
    content = f.read()

new_route = """
/**
 * POST /api/ai/onboarding-strategy
 * Generates CRM strategic recommendations for a new business profile.
 */
router.post('/onboarding-strategy', async (req: Request, res: Response) => {
  const { businessName, businessIndustry, mainProduct, targetAudience, primaryGoal } = req.body;

  if (!businessName || !businessIndustry) {
    return res.status(400).json({ error: 'businessName and businessIndustry are required' });
  }

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.startsWith('AIzaSy...')) {
    return res.status(500).json({ 
      error: 'Gemini API key is not configured.' 
    });
  }

  try {
    const prompt = `You are a world-class CRM and Marketing expert.
A new business is onboarding onto XENO CRM. Here is their profile:
- Name: ${businessName}
- Industry: ${businessIndustry}
- Main Products: ${mainProduct || 'Not specified'}
- Target Audience: ${targetAudience || 'Not specified'}
- Primary Goal: ${primaryGoal || 'Not specified'}

Generate a strategic recommendation on how they can leverage a CDP and CRM to improve their business.
Also provide 3 distinct, tailored campaign ideas they could run using the CRM.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            strategicRecommendation: {
              type: SchemaType.STRING,
              description: 'A professional, 2-paragraph strategy on how to use a CRM for this specific business.'
            },
            campaignIdeas: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: 'Array of 3 distinct, tailored campaign concepts (e.g. "Win-back Campaign: [details]").'
            }
          },
          required: ['strategicRecommendation', 'campaignIdeas']
        }
      }
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error('Systemic error generating onboarding strategy:', error);
    return res.status(500).json({ 
      error: 'An error occurred while generating the strategy.',
      details: error.message
    });
  }
});
"""

# Export default router is at the end? Oh wait, earlier I saw export default router is somewhere in the middle or end.
# Let's just remove "export default router;" if it's there and append the new route, then append export default router.

# But earlier grep output showed:
# "export default router;" was BEFORE "/draft-message"!
# Oh no, if "export default router;" was before "POST /draft-message", then the draft message endpoint was never registered!
# Let's check where "export default router" is.
