'use client';

import React, { useEffect } from 'react';

// Generates dynamic mock data based on the business category
function generateMockData(url: string, category: string) {
  const isCoffee = category.includes('Coffee');
  const isFashion = category.includes('Fashion') || category.includes('Apparel');
  const isBeauty = category.includes('Beauty') || category.includes('Cosmetics');
  const isJewelry = category.includes('Jewelry');

  // Realistic mock data pools
  const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Sophia', 'Jackson', 'Lucas', 'Mia', 'Harper', 'Evelyn', 'Alexander', 'Sebastian', 'Chloe', 'Daniel'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];
  const getRealisticName = (i: number) => `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
  const getRealisticEmail = (name: string, i: number) => `${name.replace(' ', '.').toLowerCase()}${100 + i}@gmail.com`;

  // Multipliers based on industry
  let aov = 15; // Average order value
  let customerCount = 12500;
  let orderFrequency = 4.5;
  let topItems = ['Latte', 'Espresso', 'Cold Brew', 'Pastry'];
  let sentiments = [
    "Amazing coffee and quick service!", 
    "The seasonal lattes are to die for.", 
    "Friendly staff, always get my order right.", 
    "Best espresso in town."
  ];
  let aiInsights = [
    "Your customer repeat rate is **68.5%**, which is excellent for a cafe. Send automated promotions targeting weekend checkouts.",
    "Found **1425 shoppers** who haven't checked out in 90+ days. The AI recommends a free pastry win-back bundle.",
    "Found **1425 premium VIPs** with spends exceeding $500. Offer them 3x loyalty rewards on their favorite Cold Brew."
  ];

  if (isFashion) {
    aov = 85;
    customerCount = 8400;
    orderFrequency = 2.1;
    topItems = ['Summer Dress', 'Denim Jacket', 'Graphic Tee', 'Sneakers'];
    sentiments = [
      "Love the fit and the fabric quality!", 
      "Shipping was super fast.", 
      "The summer collection is absolutely gorgeous.", 
      "Great styles but wish there were more size options."
    ];
    aiInsights = [
      "Your customer repeat rate is **45.2%**. The AI recommends an automated 15% off discount for second-time buyers.",
      "Found **1425 shoppers** who haven't checked out in 90+ days. Launch a targeted 'New Arrivals' lookbook campaign.",
      "Found **1425 premium VIPs** with spends exceeding $500. Invite them to an exclusive early-access VIP sale."
    ];
  } else if (isBeauty) {
    aov = 65;
    customerCount = 10200;
    orderFrequency = 3.0;
    topItems = ['Matte Lipstick', 'Vitamin C Serum', 'Foundation', 'Mascara'];
    sentiments = [
      "This serum completely cleared my skin!", 
      "The lipstick shade is perfect for everyday wear.", 
      "Love that it's all cruelty-free and vegan.", 
      "My go-to brand for skincare essentials."
    ];
    aiInsights = [
      "Your customer repeat rate is **52.1%**. Replenishment flows (30-day reminders) are driving strong retention.",
      "Found **1425 shoppers** who haven't checked out in 90+ days. The AI suggests a 'We Miss You' skincare routine guide.",
      "Found **1425 premium VIPs** with spends exceeding $500. Offer them a free premium sample with their next order."
    ];
  } else if (isJewelry) {
    aov = 250;
    customerCount = 3100;
    orderFrequency = 1.4;
    topItems = ['Gold Chain', 'Diamond Studs', 'Silver Bracelet', 'Chronograph Watch'];
    sentiments = [
      "The craftsmanship is breathtaking.", 
      "My wife absolutely loved the anniversary necklace.", 
      "Elegant packaging and stunning quality.", 
      "A bit expensive, but completely worth the investment."
    ];
    aiInsights = [
      "Your customer repeat rate is **22.4%**, which is standard for high-ticket jewelry. Cross-sell matching earrings to recent necklace buyers.",
      "Found **1425 shoppers** who haven't checked out in 90+ days. Trigger an automated 'Anniversary Reminder' SMS.",
      "Found **1425 premium VIPs** with spends exceeding $1000. Recommend a white-glove concierge booking experience."
    ];
  } else if (!isCoffee) {
    aov = 45;
    customerCount = 9500;
    orderFrequency = 2.8;
    topItems = ['Signature Meal', 'Family Pack', 'Gift Card', 'Merch'];
  }

  const netSales = customerCount * aov * orderFrequency;
  const totalOrders = customerCount * orderFrequency;

  // 1. Dashboard Stats
  if (url.includes('/api/analytics/dashboard')) {
    return {
      totalCustomers: customerCount,
      totalOrders: Math.floor(totalOrders),
      netSales: Math.floor(netSales),
      repeatRate: isCoffee ? 68.5 : (isJewelry ? 22.4 : (isBeauty ? 52.1 : 45.2)),
      recencyDistribution: {
        '0-30': Math.floor(customerCount * 0.4),
        '31-60': Math.floor(customerCount * 0.3),
        '61-90': Math.floor(customerCount * 0.15),
        '90+': Math.floor(customerCount * 0.15)
      },
      funnel: {
        sent: 45000,
        delivered: 44200,
        opened: 28000,
        clicked: 8500,
        failed: 800,
        deliveredPercent: 98.2,
        openedPercent: 63.3,
        failedPercent: 1.8
      },
      orderFrequencySeries: [
        Math.floor(totalOrders * 0.1),
        Math.floor(totalOrders * 0.12),
        Math.floor(totalOrders * 0.15),
        Math.floor(totalOrders * 0.14),
        Math.floor(totalOrders * 0.16),
        Math.floor(totalOrders * 0.18),
        Math.floor(totalOrders * 0.15)
      ],
      aiInsights // Pass dynamic AI insights back to the UI
    };
  }

  // 2. Customers List
  if (url.includes('/api/customers') && !url.includes('/rfm')) {
    const generateCustomer = (i: number) => {
      const name = getRealisticName(i);
      return {
        id: `sim-cust-${i}`,
        name: name,
        email: getRealisticEmail(name, i),
        phone: `+1 555 000 ${1000 + i}`,
        totalSpends: aov * (Math.floor(Math.random() * 5) + 1),
        favoriteCategory: topItems[Math.floor(Math.random() * topItems.length)],
        lastVisitDate: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
        loyaltyPoints: Math.floor(Math.random() * 500),
        feedback: sentiments[i % sentiments.length]
      };
    };

    const data = Array.from({ length: 15 }).map((_, i) => generateCustomer(i));
    return { data };
  }

  // 3. RFM Clusters
  if (url.includes('/api/customers/rfm')) {
    const createRfmSet = (count: number, label: string) => ({
      count,
      customers: Array.from({ length: 5 }).map((_, i) => {
        const name = getRealisticName(i + (label === 'Champion' ? 100 : (label === 'AtRisk' ? 200 : 300)));
        return {
          id: `rfm-${label}-${i}`,
          name: name,
          email: getRealisticEmail(name, i),
          totalSpends: aov * (label === 'Champion' ? 10 : 2),
          lastVisitDate: new Date().toISOString()
        };
      })
    });

    return {
      champions: createRfmSet(Math.floor(customerCount * 0.2), 'Champion'),
      atRisk: createRfmSet(Math.floor(customerCount * 0.15), 'AtRisk'),
      hibernating: createRfmSet(Math.floor(customerCount * 0.25), 'Hibernating')
    };
  }

  // 4. File Ingestion Simulation
  if (url.includes('/api/ingest/file')) {
    return {
      success: true,
      summary: {
        totalReceived: 5000,
        processed: 5000,
        skipped: 0,
        errors: []
      }
    };
  }

  // 5. Default empty for anything else
  return {};
}

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const requestUrl = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      
      // Only intercept API calls
      if (!requestUrl.includes('/api/')) {
        return originalFetch(...args);
      }

      try {
        const response = await originalFetch(...args);
        // If it's a 500 or 404, we throw to trigger our catch simulation block
        if (!response.ok) {
           throw new Error('Backend unavailable, dropping to simulation');
        }
        return response;
      } catch (err) {
        console.warn(`[Simulation Layer] Intercepted failed fetch to ${requestUrl}. Injecting category-specific dummy data.`);
        
        // Extract category from localStorage
        const category = localStorage.getItem('xeno_brand_category') || 'Coffee & Cafe';
        const mockData = generateMockData(requestUrl, category);

        // Delay slightly to simulate network
        await new Promise(r => setTimeout(r, 600));

        return new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return <>{children}</>;
}
