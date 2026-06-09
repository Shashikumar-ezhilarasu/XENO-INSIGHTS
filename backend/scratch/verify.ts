import app from '../src/app';
import prisma from '../src/config/prisma';
import http from 'http';

const TEST_PORT = 4567;
let server: http.Server;

// Utility to make HTTP requests in tests
async function makeRequest(path: string, method: 'GET' | 'POST', body?: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const options: http.RequestOptions = {
      hostname: 'localhost',
      port: TEST_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(dataString) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = responseBody ? JSON.parse(responseBody) : {};
          resolve({ status: res.statusCode || 0, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode || 0, data: { raw: responseBody } });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(dataString);
    }
    req.end();
  });
}

// Delay helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('\n==================================================');
  console.log('STARTING INTEGRATION VERIFICATION SUITE');
  console.log('==================================================\n');

  // 1. Health check
  console.log('1. Testing /health endpoint...');
  const healthRes = await makeRequest('/health', 'GET');
  console.log(`   Status: ${healthRes.status}, Body:`, healthRes.data);
  if (healthRes.status !== 200 || healthRes.data.status !== 'OK') {
    throw new Error('Health check failed!');
  }

  // 2. Customers paginated listing
  console.log('\n2. Testing /api/customers endpoint...');
  const customersRes = await makeRequest('/api/customers?page=1&limit=3', 'GET');
  console.log(`   Status: ${customersRes.status}`);
  console.log(`   Meta:`, customersRes.data.meta);
  console.log(`   Customers count returned: ${customersRes.data.data.length}`);
  if (customersRes.status !== 200 || !customersRes.data.data || customersRes.data.data.length > 3) {
    throw new Error('Customers listing failed!');
  }

  // Fetch some customer IDs to use for campaign test
  const testCustomers = await prisma.customer.findMany({ take: 2 });
  const testCustomerIds = testCustomers.map(c => c.id);
  console.log(`   Selected test customers: ${testCustomers.map(c => c.name).join(', ')}`);

  // 3. Campaign Creation
  console.log('\n3. Testing campaign creation...');
  const campaignPayload = {
    name: 'Test Coffee Promotion',
    channel: 'WHATSAPP',
    promptText: 'Find customers who spent more than $50 in coffee'
  };
  const createCampaignRes = await makeRequest('/api/campaigns/create', 'POST', campaignPayload);
  console.log(`   Status: ${createCampaignRes.status}, Campaign ID: ${createCampaignRes.data.campaign?.id}`);
  if (createCampaignRes.status !== 201 || !createCampaignRes.data.campaign?.id) {
    throw new Error('Campaign creation failed!');
  }
  const campaignId = createCampaignRes.data.campaign.id;

  // 4. Campaign Execution (Async Loop & Callback simulation)
  console.log('\n4. Testing campaign execution (sending)...');
  const sendPayload = {
    campaignId,
    customerIds: testCustomerIds // Send directly to the two selected customers
  };
  
  const sendTimeStart = Date.now();
  const sendRes = await makeRequest('/api/campaigns/send', 'POST', sendPayload);
  const sendTimeEnd = Date.now();
  
  console.log(`   Status: ${sendRes.status} (Expected: 202)`);
  console.log(`   Response Message: "${sendRes.data.message}"`);
  console.log(`   Response Latency: ${sendTimeEnd - sendTimeStart}ms (Should be very low - non-blocking)`);
  
  if (sendRes.status !== 202) {
    throw new Error('Campaign execution trigger failed! Expected 202 status.');
  }

  // Check database immediately: states should be PENDING
  console.log('\n5. Checking initial database communication state...');
  let communications = await prisma.communication.findMany({
    where: { campaignId }
  });
  console.log(`   Found ${communications.length} communication records.`);
  console.log(`   Statuses immediately after dispatch:`, communications.map(c => c.status));
  
  const allPending = communications.every(c => c.status === 'PENDING');
  if (!allPending) {
    console.warn('   Warning: Some communications are not PENDING. (They may have processed extremely fast).');
  }

  // Wait for mock channel delivery (1.5 seconds delay + callback processing time)
  console.log('\n6. Waiting 3.5 seconds for mock delivery service delay and webhook callbacks...');
  await sleep(3500);

  // Check database state after waiting
  console.log('7. Verifying updated database communication status...');
  communications = await prisma.communication.findMany({
    where: { campaignId }
  });
  console.log(`   Statuses after delay:`, communications.map(c => `${c.id.substring(0,8)}...: ${c.status}`));
  
  const anyUpdated = communications.some(c => ['DELIVERED', 'OPENED', 'FAILED'].includes(c.status));
  if (!anyUpdated) {
    throw new Error('No communication statuses were updated! Webhook callbacks might be failing.');
  }
  console.log('   Success: Message states were successfully updated by the webhook.');

  // 8. Analytics Verification
  console.log('\n8. Verifying campaign analytics calculations...');
  const analyticsRes = await makeRequest('/api/analytics', 'GET');
  console.log(`   Status: ${analyticsRes.status}`);
  const campaignAnalytics = analyticsRes.data.analytics.find((a: any) => a.campaignId === campaignId);
  console.log(`   Campaign Analytics:`, campaignAnalytics);
  if (!campaignAnalytics || campaignAnalytics.totalMessages !== testCustomerIds.length) {
    throw new Error('Analytics totals do not match expected campaign target size!');
  }

  // 9. AI Segment Parsing API check (Skipped or runs if API Key exists)
  console.log('\n9. Testing AI Segment Parsing (/api/ai/segment)...');
  const geminiKeyExists = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('AIzaSy...');
  if (!geminiKeyExists) {
    console.log('   [SKIPPED] GEMINI_API_KEY not configured. To test AI segment parsing, please add a valid key to backend/.env.');
  } else {
    const segmentPayload = { promptText: 'Find customers with totalSpend more than 100' };
    const segmentRes = await makeRequest('/api/ai/segment', 'POST', segmentPayload);
    console.log(`   Status: ${segmentRes.status}`);
    console.log(`   Query Type: ${segmentRes.data.queryType}`);
    console.log(`   Explanation: "${segmentRes.data.explanation}"`);
    console.log(`   Audience Size resolved: ${segmentRes.data.audienceSize}`);
    if (segmentRes.status !== 200) {
      throw new Error('AI dynamic segmentation parsing failed.');
    }
  }

  console.log('\n==================================================');
  console.log('INTEGRATION VERIFICATION SUITE: PASSED');
  console.log('==================================================\n');
}

// Start temporary test server
console.log(`Starting test server on port ${TEST_PORT}...`);
server = app.listen(TEST_PORT, async () => {
  try {
    await runTests();
    server.close(() => {
      console.log('Test server closed. Exiting.');
      process.exit(0);
    });
  } catch (error: any) {
    console.error('\n❌ VERIFICATION TEST FAILED:', error.message);
    server.close(() => {
      console.log('Test server closed.');
      process.exit(1);
    });
  }
});
