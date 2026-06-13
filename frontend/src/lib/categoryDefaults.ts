export const CATEGORY_DEFAULTS: Record<string, any> = {
  coffee_cafe: {
    overviewWelcome: 'Monitor your cafe metrics, track your regulars, and win back lapsed coffee lovers.',
    rfmChampionLabel: 'Daily Regulars',
    rfmAtRiskLabel: 'Lapsed Coffee Lovers',
    rfmHibernatingLabel: 'Occasional Visitors',
    aiRecommendations: [
      { title: 'Morning Win-Back', subtitle: 'Target At Risk Regulars', body: 'Found {atRisk} regulars who haven\'t visited in 30+ days. Recommend a free size upgrade voucher.' },
      { title: 'Loyalty Tier Push', subtitle: 'Incentivize Near-Gold Members', body: 'Found {nearGold} customers within 50 pts of Gold tier. A double-points weekend would push them over.' },
      { title: 'Seasonal Drop Alert', subtitle: 'New Menu Launch', body: 'Your repeat rate is {repeatRate}%. Launch the seasonal menu to Champions first for maximum impact.' },
    ],
  },
  retail: {
    overviewWelcome: 'Monitor your retail metrics, analyze purchase patterns, and re-engage lapsed shoppers.',
    rfmChampionLabel: 'Loyal Shoppers',
    rfmAtRiskLabel: 'Lapsing Buyers',
    rfmHibernatingLabel: 'Inactive Customers',
    aiRecommendations: [
      { title: 'Lapsed Buyer Win-Back', subtitle: 'Target 60-Day Inactives', body: 'Found {atRisk} shoppers with no purchase in 60 days. A 10% discount code drives 18% return rate historically.' },
      { title: 'New Arrival Alert', subtitle: 'Notify Frequent Buyers', body: 'Your top {champions} frequent buyers haven\'t been alerted to new stock. Send a WhatsApp preview.' },
      { title: 'Cart Recovery Push', subtitle: 'Re-engage Drop-offs', body: 'Estimated {hibernating} customers added to cart but didn\'t checkout. A free shipping nudge converts 22%.' },
    ],
  },
  food_beverage: {
    overviewWelcome: 'Track your order metrics, identify your best diners, and win back lapsed foodies.',
    rfmChampionLabel: 'Power Diners',
    rfmAtRiskLabel: 'Lapsed Foodies',
    rfmHibernatingLabel: 'Occasional Orderers',
    aiRecommendations: [
      { title: 'Hungry Hour Push', subtitle: 'Lunchtime Campaign', body: 'Found {atRisk} active customers. A midday WhatsApp blast with a 20% lunch deal drives 31% CTR.' },
      { title: 'Festival Menu VIP Preview', subtitle: 'Exclusive Early Access', body: 'Your {champions} power diners should get first access to the new menu before public launch.' },
      { title: 'Lapsed Foodie Return', subtitle: '45-Day Win-Back', body: 'Found {hibernating} customers who haven\'t ordered in 45+ days. A free dessert incentive returns 24%.' },
    ],
  },
  fashion_apparel: {
    overviewWelcome: 'Track your fashion metrics, identify style champions, and drive new collection awareness.',
    rfmChampionLabel: 'Style Champions',
    rfmAtRiskLabel: 'Lapsing Fashion Buyers',
    rfmHibernatingLabel: 'Occasional Shoppers',
    aiRecommendations: [
      { title: 'VIP Early Access', subtitle: 'New Drop Campaign', body: 'Give your {champions} style champions 24-hour early access to the new collection. Creates exclusivity.' },
      { title: '90-Day Style Win-Back', subtitle: 'Lapsed Buyer Re-engagement', body: 'Found {atRisk} customers who haven\'t shopped in 90 days. A curated lookbook email returns 19%.' },
      { title: 'Size Restock Alert', subtitle: 'Wishlist Fulfillment', body: '{hibernating} customers browsed items that went out of stock. Alert them — converts at 34%.' },
    ],
  },
  beauty_cosmetics: {
    overviewWelcome: 'Track your beauty metrics, complete customer routines, and drive replenishment cycles.',
    rfmChampionLabel: 'Glow Champions',
    rfmAtRiskLabel: 'Lapsed Clients',
    rfmHibernatingLabel: 'Occasional Buyers',
    aiRecommendations: [
      { title: 'Routine Completion Push', subtitle: 'Cross-sell Missing Steps', body: 'Found {atRisk} customers who bought a cleanser but no moisturiser. Complete their routine — 28% convert.' },
      { title: 'Replenishment Reminder', subtitle: '60-Day Restock Nudge', body: '{hibernating} customers\' last consumable purchase was 60+ days ago. One-tap reorder link converts 41%.' },
      { title: 'VIP Launch Access', subtitle: 'New Product Reveal', body: 'Give your {champions} glow champions first access to the new launch before it goes public.' },
    ],
  },
  jewelry_accessories: {
    overviewWelcome: 'Track your jewelry metrics, identify occasion-based gifters, and drive festive campaigns.',
    rfmChampionLabel: 'Loyal Patrons',
    rfmAtRiskLabel: 'Lapsed High-Value Buyers',
    rfmHibernatingLabel: 'Occasional Gift Buyers',
    aiRecommendations: [
      { title: 'Anniversary Gifting Guide', subtitle: 'Occasion-Based Campaign', body: 'Found {champions} patrons with upcoming anniversaries. A curated gifting guide converts at 22%.' },
      { title: 'Festive Season Push', subtitle: 'Diwali / Wedding Season', body: 'Your full base of {total} customers is ready for a festive campaign. Gift finder CTA drives footfall.' },
      { title: 'High-Value VIP Re-engagement', subtitle: '90-Day Lapsed VIPs', body: 'Found {atRisk} patrons who spent ₹10,000+ lifetime but haven\'t visited in 90 days. Personal outreach.' },
    ],
  },
};
