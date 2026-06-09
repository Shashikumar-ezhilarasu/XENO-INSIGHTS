import prisma from '../src/config/prisma';

// Ensure env variables are configured for testing
process.env.PORT = '4001';
process.env.GEMINI_API_KEY = 'test_gemini_api_key';

beforeEach(async () => {
  // Truncate tables to ensure a completely isolated testing sandbox
  const tablenames = ['Communication', 'Campaign', 'Order', 'Customer'];
  
  for (const table of tablenames) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE public."${table}" CASCADE;`);
  }

  // Seed baseline users for segmenting and routing checks
  await prisma.customer.createMany({
    data: [
      {
        id: 'test-customer-1',
        name: 'Alice Spec',
        email: 'alice.spec@example.com',
        phone: '+15559990001',
        totalSpends: 150.0,
      },
      {
        id: 'test-customer-2',
        name: 'Bob Spec',
        email: 'bob.spec@example.com',
        phone: '+15559990002',
        totalSpends: 35.0,
      },
      {
        id: 'test-customer-3',
        name: 'Charlie Spec',
        email: 'charlie.spec@example.com',
        phone: '+15559990003',
        totalSpends: 0.0,
      }
    ]
  });

  // Seed order history for relational aggregates
  await prisma.order.createMany({
    data: [
      {
        id: 'test-order-1',
        customerId: 'test-customer-1',
        amount: 100.0,
        category: 'Coffee',
      },
      {
        id: 'test-order-2',
        customerId: 'test-customer-1',
        amount: 50.0,
        category: 'Bakery',
      },
      {
        id: 'test-order-3',
        customerId: 'test-customer-2',
        amount: 35.0,
        category: 'Coffee',
      }
    ]
  });
});

afterAll(async () => {
  // Flush database connections to prevent open handle hangs
  await prisma.$disconnect();
});
