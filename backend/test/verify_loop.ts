import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BACKEND_URL = 'http://localhost:3000';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('--- STARTING QA LIFECYCLE VERIFICATION ---');

  // 1. Seed test customers
  console.log('1. Creating test customers...');
  const customers = [];
  for (let i = 1; i <= 5; i++) {
    const cust = await prisma.customer.upsert({
      where: { email: `qa_test_${i}@example.com` },
      update: {},
      create: {
        name: `QA Test User ${i}`,
        email: `qa_test_${i}@example.com`,
        phone: `+1555000000${i}`,
        loyaltyPoints: 100,
        totalSpends: 50,
      }
    });
    customers.push(cust);
  }
  console.log(`✓ Created ${customers.length} test customers.`);

  // 2. Create Campaign
  console.log('2. Creating campaign...');
  const createRes = await fetch(`${BACKEND_URL}/api/campaigns/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `TEST_QA_CAMPAIGN_${Date.now()}`,
      channel: 'WHATSAPP',
      messageTemplate: 'Hello {{name}}, test message!',
    })
  });
  
  if (!createRes.ok) throw new Error(`Failed to create campaign: ${await createRes.text()}`);
  const { campaign } = await createRes.json();
  console.log(`✓ Created Campaign ID: ${campaign.id}`);

  // 3. Launch Campaign
  console.log('3. Launching campaign via /send endpoint...');
  const launchRes = await fetch(`${BACKEND_URL}/api/campaigns/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campaignId: campaign.id,
      customerIds: customers.map(c => c.id)
    })
  });

  if (!launchRes.ok) throw new Error(`Failed to launch: ${await launchRes.text()}`);
  const launchData = await launchRes.json();
  console.log(`✓ Launched! Expected audience size: ${launchData.audienceSize}`);

  // 4. Monitor Loop
  console.log('4. Monitoring BullMQ and Async Callbacks for 15 seconds...');
  for (let i = 0; i < 15; i++) {
    await delay(1000);
    
    // Check queue stats
    const qRes = await fetch(`${BACKEND_URL}/api/queue/stats`);
    const qData = await qRes.json();
    
    // Check communications in DB
    const comms = await prisma.communication.findMany({
      where: { campaignId: campaign.id },
      include: { events: true }
    });

    const statusCounts = comms.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalEvents = comms.reduce((acc, curr) => acc + curr.events.length, 0);

    console.log(`[T+${i+1}s] Queue: Act=${qData.totals.active} Wait=${qData.totals.waiting} Comp=${qData.totals.completed} | Statuses: ${JSON.stringify(statusCounts)} | Total Events Logged: ${totalEvents}`);

    // If all are processed and not pending/queued, we might be done
    if (Object.keys(statusCounts).length > 0 && !statusCounts['PENDING'] && totalEvents >= launchData.audienceSize * 2) {
      console.log('✓ Callback loop completed successfully!');
      break;
    }
  }

  // 5. Final Report
  console.log('5. Fetching final analytics...');
  const finalCamp = await prisma.campaign.findUnique({
    where: { id: campaign.id },
    include: { communications: { include: { events: true } } }
  });

  console.log('--- FINAL CAMPAIGN STATE ---');
  console.log(`Attributed Revenue: $${finalCamp?.attributedRevenue}`);
  console.log(`Attributed Orders: ${finalCamp?.attributedOrders}`);
  console.log(`Communications:`);
  finalCamp?.communications.forEach(c => {
    console.log(`  ID: ${c.id.substring(0,8)} | Status: ${c.status} | Events Logged: ${c.events.map(e => e.status).join(' -> ')}`);
  });

  console.log('--- QA LIFECYCLE VERIFICATION COMPLETE ---');
}

run().catch(console.error).finally(() => prisma.$disconnect());
