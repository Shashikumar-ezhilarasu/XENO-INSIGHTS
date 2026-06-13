import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('--- CLEANING UP TEST DATA ---');

  // 1. Delete all test campaigns
  const deletedCampaigns = await prisma.campaign.deleteMany({
    where: {
      name: { startsWith: 'LOAD_TEST_CAMPAIGN_' }
    }
  });
  console.log(`✓ Deleted ${deletedCampaigns.count} test campaigns.`);

  // 2. Delete all test customers
  const deletedCustomers = await prisma.customer.deleteMany({
    where: {
      email: { startsWith: 'loadtest' }
    }
  });
  console.log(`✓ Deleted ${deletedCustomers.count} test customers.`);

  console.log('--- CLEANUP COMPLETE ---');
}

cleanup()
  .catch(console.error)
  .finally(() => process.exit(0));
