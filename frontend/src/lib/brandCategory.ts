export type BrandCategory =
  | 'coffee_cafe'
  | 'retail'
  | 'food_beverage'
  | 'fashion_apparel'
  | 'beauty_cosmetics'
  | 'jewelry_accessories';

export function getBrandCategory(): BrandCategory {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('xeno_brand_category') as BrandCategory) || 'retail';
  }
  return 'retail';
}

export function setBrandCategory(cat: BrandCategory) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('xeno_brand_category', cat);
  }
}

export const BRAND_CONFIG: Record<BrandCategory, {
  label: string;
  voice: string;           // injected into Gemini system prompt
  kpiLabel: string;        // e.g. "Covers Sold" vs "Units Shipped"
  chips: { label: string; prompt: string; icon: string }[];
  presets: { label: string; channel: string; prompt: string; description: string }[];
  mockupMessages: Record<string, string>; // channel -> example message
  accentColor: string;     // CSS variable-compatible hex for subtle UI theming
}> = {
  coffee_cafe: {
    label: 'Coffee & Cafe',
    voice: 'You are a CRM assistant for a specialty coffee and cafe brand. Use warm, conversational language. Reference coffee culture, morning rituals, loyalty rewards, and seasonal drinks.',
    kpiLabel: 'Covers Served',
    chips: [
      { label: 'Morning Regulars Win-Back', prompt: 'Re-engage customers who visited every morning but haven\'t been in for 30 days', icon: 'ti-coffee' },
      { label: 'Seasonal Drink Promo', prompt: 'Find customers who ordered our seasonal drinks last year and promote this season\'s launch', icon: 'ti-leaf' },
      { label: 'Loyalty Tier Upgrade', prompt: 'Find customers close to Gold tier and nudge them with a double-points weekend offer', icon: 'ti-star' },
      { label: 'Dine-In Lapsed', prompt: 'Re-engage customers who used to dine in but switched to delivery or stopped ordering', icon: 'ti-armchair' },
    ],
    presets: [
      { label: '☕ Morning Win-Back (30d)', channel: 'WhatsApp', prompt: 'Re-engage morning coffee regulars missing for 30 days', description: 'Warm win-back for your daily regulars with a free upgrade offer.' },
      { label: '🍂 Seasonal Launch Alert', channel: 'RCS', prompt: 'Announce the new seasonal menu to loyal customers', description: 'Rich RCS card with seasonal drink visuals for top loyalty members.' },
      { label: '⭐ Gold Tier Nudge', channel: 'SMS', prompt: 'Push near-Gold loyalty customers over the threshold with bonus points', description: 'SMS nudge with points balance and a weekend double-points event.' },
    ],
    mockupMessages: {
      WhatsApp: 'Hey {{name}}! ☕ We miss your morning visits. Your favourite {{last_product}} is waiting — come back this week and get a free size upgrade on us. Show this at the counter. Valid till Sunday!',
      SMS: 'Hi {{name}}, you\'re only {{points_to_gold}} pts away from Gold! Visit us this weekend for 2x points on every order. - Brew Co.',
      Email: 'Subject: We saved your usual, {{name}} ☕\n\nIt\'s been {{recency_days}} days and your corner table misses you. Here\'s a little something to bring you back...',
      RCS: '🍂 New Season, New Sips! Our Pumpkin Spice Oat Latte is here. Tap below to see the full seasonal menu and pre-order your first cup.',
    },
    accentColor: '#7C5C3E',
  },

  retail: {
    label: 'Retail & General Store',
    voice: 'You are a CRM assistant for a modern retail and general merchandise brand. Use clear, value-driven language focused on savings, new arrivals, and convenience.',
    kpiLabel: 'Units Sold',
    chips: [
      { label: 'Lapsed Buyers Win-Back', prompt: 'Find customers who bought 2+ times but haven\'t purchased in 60 days', icon: 'ti-shopping-cart' },
      { label: 'New Arrival Alert', prompt: 'Notify customers who browsed our top categories about new arrivals this week', icon: 'ti-sparkles' },
      { label: 'Cart Abandonment', prompt: 'Target customers who added items but didn\'t complete their purchase in the last 7 days', icon: 'ti-shopping-cart-off' },
      { label: 'Bulk Buyer Reward', prompt: 'Identify customers with 5+ orders and send a loyalty reward', icon: 'ti-gift' },
    ],
    presets: [
      { label: '🛒 60-Day Win-Back', channel: 'WhatsApp', prompt: 'Win back lapsed shoppers with a discount', description: 'Personalised win-back with a 10% discount code for lapsed buyers.' },
      { label: '✨ New Arrivals Alert', channel: 'RCS', prompt: 'Announce new arrivals to frequent shoppers', description: 'Rich product carousel sent to top-frequency buyers.' },
      { label: '🎁 Loyalty Reward Drop', channel: 'SMS', prompt: 'Reward high-order-count customers with a surprise gift', description: 'SMS surprise reward for customers with 5+ lifetime orders.' },
    ],
    mockupMessages: {
      WhatsApp: 'Hey {{name}}! 👋 We noticed you haven\'t shopped with us in a while. Here\'s 10% off your next order — just for you. Use code: {{discount_code}}. Valid for 48 hours only!',
      SMS: '{{name}}, new arrivals just dropped! Shop now and get free delivery on orders over ₹999. Reply STOP to unsubscribe.',
      Email: 'Subject: {{name}}, your favourites are back in stock!\n\nBased on your past purchases, we think you\'ll love what just arrived...',
      RCS: '🆕 New In This Week! Swipe through our latest collection and add to cart directly from this message.',
    },
    accentColor: '#2563EB',
  },

  food_beverage: {
    label: 'Food & Beverages',
    voice: 'You are a CRM assistant for a food and beverage brand. Use appetite-driven, sensory language — mention taste, freshness, seasonal ingredients, and hunger cues.',
    kpiLabel: 'Orders Fulfilled',
    chips: [
      { label: 'Hungry Hour Push', prompt: 'Target active customers at lunchtime who ordered last week', icon: 'ti-clock' },
      { label: 'Lapsed Foodie Win-Back', prompt: 'Find customers who ordered 3+ times but haven\'t ordered in 45 days', icon: 'ti-tools-kitchen-2' },
      { label: 'Festival Menu Launch', prompt: 'Promote the new festival menu to top spenders before public launch', icon: 'ti-confetti' },
      { label: 'Combo Upsell', prompt: 'Target single-item buyers with a personalised combo upgrade offer', icon: 'ti-arrow-up-circle' },
    ],
    presets: [
      { label: '🍱 Hungry Hour Blast', channel: 'WhatsApp', prompt: 'Push a lunch deal to active customers right now', description: 'Time-sensitive WhatsApp push for midday ordering window.' },
      { label: '🍽️ Festival Menu VIP', channel: 'RCS', prompt: 'Give VIP early access to the festival menu', description: 'Rich RCS preview with dish images for top spenders.' },
      { label: '🔁 Lapsed Foodie Return', channel: 'SMS', prompt: 'Win back customers who haven\'t ordered in 45 days', description: 'SMS with a free dessert incentive for returning customers.' },
    ],
    mockupMessages: {
      WhatsApp: 'Hey {{name}}! 🍱 Lunch plans sorted? Order now and get your {{favourite_category}} delivered hot in 30 mins. Use {{discount_code}} for 20% off today only. Tap to order!',
      SMS: '{{name}}, it\'s lunchtime! Your favourite dishes are ready. Order in the next 2 hrs and get a free dessert. Reply MENU to see options.',
      Email: 'Subject: {{name}}, your lunch is calling 🍽️\n\nFresh ingredients, bold flavours. Here\'s what\'s hot today...',
      RCS: '🎉 Festival Menu is Here! Swipe to see our limited edition dishes — available for 7 days only. Reserve your table or order delivery below.',
    },
    accentColor: '#D97706',
  },

  fashion_apparel: {
    label: 'Fashion & Apparel',
    voice: 'You are a CRM assistant for a fashion and apparel brand. Use stylish, aspirational language. Reference trends, personal style, exclusive drops, and seasonal collections.',
    kpiLabel: 'Items Sold',
    chips: [
      { label: 'Summer Clearance VIP', prompt: 'Send an early clearance sale alert to high-spend customers before public launch', icon: 'ti-sun' },
      { label: 'New Drop Alert', prompt: 'Notify customers who bought from our last collection about the new drop', icon: 'ti-hanger' },
      { label: 'Style Profile Lapsed', prompt: 'Re-engage customers who haven\'t shopped in 90 days with a curated style pick', icon: 'ti-refresh' },
      { label: 'Size Restock Alert', prompt: 'Alert customers whose wishlist items are back in their size', icon: 'ti-bell' },
    ],
    presets: [
      { label: '👗 VIP Clearance Early Access', channel: 'WhatsApp', prompt: 'Give VIP customers early access to the summer clearance', description: 'Exclusive early access message for top-tier fashion buyers.' },
      { label: '👟 New Drop Launch', channel: 'RCS', prompt: 'Launch new collection to previous buyers', description: 'Rich image carousel of new arrivals for repeat purchasers.' },
      { label: '💌 Style Win-Back (90d)', channel: 'Email', prompt: 'Re-engage lapsed fashion buyers with a curated lookbook', description: 'Personalised email with curated picks based on past purchases.' },
    ],
    mockupMessages: {
      WhatsApp: 'Hey {{name}} 👗 You\'re on the VIP list! Our Summer Clearance starts for you 24 hours early. Up to 60% off your favourite styles. Tap to shop before it opens to everyone.',
      SMS: '{{name}}, the new drop is live! Your size in {{last_category}} just came in. Shop now before it sells out — {{shop_link}}',
      Email: 'Subject: {{name}}, we curated this for your style ✨\n\nBased on your past picks, here\'s what our stylists chose for you this season...',
      RCS: '🆕 New Collection Just Dropped! Swipe through the lookbook and shop directly. Your size is available — don\'t wait.',
    },
    accentColor: '#7C3AED',
  },

  beauty_cosmetics: {
    label: 'Beauty & Cosmetics',
    voice: 'You are a CRM assistant for a beauty and cosmetics brand. Use empowering, self-care language. Reference skincare routines, product benefits, glow-ups, and beauty rituals.',
    kpiLabel: 'Products Sold',
    chips: [
      { label: 'Skincare Routine Push', prompt: 'Target customers who bought a cleanser but never bought a moisturiser — complete their routine', icon: 'ti-sparkles' },
      { label: 'Replenishment Nudge', prompt: 'Find customers whose last purchase of a consumable product was 60 days ago — nudge them to reorder', icon: 'ti-refresh' },
      { label: 'New Launch VIP', prompt: 'Give loyalty members early access to the new product launch', icon: 'ti-star' },
      { label: 'Lapsed Glow Win-Back', prompt: 'Re-engage beauty customers who haven\'t purchased in 75 days with a personalized recommendation', icon: 'ti-heart' },
    ],
    presets: [
      { label: '✨ Routine Completion Push', channel: 'WhatsApp', prompt: 'Cross-sell moisturiser to cleanser-only buyers', description: 'Smart cross-sell completing the skincare routine for partial buyers.' },
      { label: '🔁 Replenishment Reminder', channel: 'SMS', prompt: 'Remind customers to reorder their consumable products', description: '60-day replenishment nudge with one-tap reorder link.' },
      { label: '💄 VIP Launch Access', channel: 'RCS', prompt: 'Give VIP early access to new product launch', description: 'Rich product reveal card for loyalty-tier members.' },
    ],
    mockupMessages: {
      WhatsApp: 'Hey {{name}} ✨ Your skin deserves the full ritual. You\'ve been using our Vitamin C Cleanser — pair it with our new Hyaluronic Moisturiser for the full glow. Shop the bundle with 15% off: {{discount_code}}',
      SMS: '{{name}}, time to restock! Your {{last_product}} is probably running low. Reorder in one tap and get free shipping this week only.',
      Email: 'Subject: {{name}}, complete your glow routine 💆‍♀️\n\nYour skin is halfway there. Here\'s what our beauty experts recommend to complete your regimen...',
      RCS: '💄 New Launch Alert! Swipe to see our newest collection, read reviews, and add to bag — all from this message.',
    },
    accentColor: '#DB2777',
  },

  jewelry_accessories: {
    label: 'Jewelry & Accessories',
    voice: 'You are a CRM assistant for a jewelry and accessories brand. Use elegant, aspirational language. Reference occasions, gifting, craftsmanship, and the emotional value of jewelry.',
    kpiLabel: 'Pieces Sold',
    chips: [
      { label: 'Occasion-Based Gifting', prompt: 'Target customers approaching wedding anniversaries or birthdays with a curated gifting guide', icon: 'ti-gift' },
      { label: 'High-Value VIP Re-engagement', prompt: 'Find customers who spent over ₹10,000 lifetime but haven\'t visited in 90 days', icon: 'ti-diamond' },
      { label: 'New Collection Preview', prompt: 'Give top buyers an exclusive first look at the new festive collection', icon: 'ti-eye' },
      { label: 'Festive Season Push', prompt: 'Build an audience of all customers for the Diwali gifting campaign', icon: 'ti-confetti' },
    ],
    presets: [
      { label: '💍 Anniversary Gifting Guide', channel: 'WhatsApp', prompt: 'Send a curated gifting guide to customers with upcoming anniversaries', description: 'Occasion-triggered gifting recommendation for high-LTV customers.' },
      { label: '✨ VIP New Collection Preview', channel: 'RCS', prompt: 'Give VIP customers exclusive first look at festive collection', description: 'Rich preview of the new festive collection for top spenders.' },
      { label: '🪔 Diwali Campaign Blast', channel: 'SMS', prompt: 'Launch a Diwali gifting push to all customers', description: 'Festive SMS campaign with gift-finder CTA for the full base.' },
    ],
    mockupMessages: {
      WhatsApp: 'Dear {{name}} 💍 Your anniversary is coming up — make it unforgettable. We\'ve curated a collection of pieces she\'ll treasure forever. View your personalised gifting guide: {{gift_link}}',
      SMS: '{{name}}, this Diwali, gift something timeless. Explore our festive collection — crafted for those who matter most. Free gift wrapping on all orders.',
      Email: 'Subject: {{name}}, a gift as special as the moment 💎\n\nCrafted with care, chosen with love. Here\'s our curated gifting guide for your special occasion...',
      RCS: '✨ Festive Collection Preview — Exclusively for You. Swipe through our new arrivals, book a private viewing, or order with complimentary engraving.',
    },
    accentColor: '#B45309',
  },
};
