import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function runLoadTest(targetSize: number) {
  console.log(`--- STARTING LOAD TEST FOR ${targetSize} CUSTOMERS ---`);

  // 1. Generate customers
  console.log(`Generating ${targetSize} test customers...`);
  const batchId = Date.now();
  const customers = Array.from({ length: targetSize }).map((_, i) => ({
    name: `Load Test Customer ${i}`,
    email: `loadtest${i}_${batchId}@example.com`,
    phone: `+1555${Math.floor(1000000 + Math.random() * 9000000)}`,
    favoriteCategory: "Load Test",
    discountSeekingBehavior: "LOW",
    preferredShoppingDay: "Monday",
    location: "Test City"
  }));

  // Batch insert customers
  await prisma.customer.createMany({ data: customers, skipDuplicates: true });
  
  const created = await prisma.customer.findMany({ where: { email: { contains: `_${batchId}@example.com` } } });
  console.log(`✓ Created ${created.length} test customers.`);

  // 2. Create campaign
  console.log('Creating campaign...');
  const campaignResponse = await fetch('http://localhost:3000/api/campaigns/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `LOAD_TEST_CAMPAIGN_${targetSize}`,
      promptText: `Send a load test message to ${targetSize} people.`,
      channel: 'WHATSAPP',
      messageTemplate: 'Hello {{name}}, this is a load test message.'
    })
  });
  
  const campaignData = await campaignResponse.json();
  const campaignId = campaignData.campaign.id;
  console.log(`✓ Created Campaign ID: ${campaignId}`);

  // 3. Launch campaign
  console.log('Launching campaign...');
  const start = Date.now();
  const sendResponse = await fetch(`http://localhost:3000/api/campaigns/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId: campaignId, customerIds: created.map(c => c.id) })
  });

  if (!sendResponse.ok) {
    throw new Error(`Failed to send: ${sendResponse.statusText}`);
  }
  
  console.log(`✓ Launched in ${Date.now() - start}ms! Expected audience size: ${created.length}`);

  // 5. Monitor queue throughput
  let lastProcessed = 0;
  let stagnantCount = 0;

  for (let i = 0; i < 60; i++) {
    const statsRes = await fetch('http://localhost:3000/api/queue/stats');
    const stats = await statsRes.json();
    
    const dbStats = await prisma.communication.groupBy({
      by: ['status'],
      where: { campaignId: campaignId },
      _count: true
    });
    
    const statusMap = dbStats.reduce((acc, curr) => ({...acc, [curr.status]: curr._count}), {} as Record<string, number>);
    const comp = stats.completed || 0;
    
    console.log(`[T+${(i+1)*2}s] Queue Wait: ${stats.waiting} | Active: ${stats.active} | DB Statuses: ${JSON.stringify(statusMap)}`);

    const pending = statusMap['PENDING'] || 0;
    if (pending === 0 && i > 3) {
      console.log('✓ All messages dispatched successfully!');
      break;
    }

    await new Promise(r => setTimeout(r, 2000));
  }
}

async function main() {
  await runLoadTest(500);
}

main().catch(console.error).finally(() => process.exit(0));
