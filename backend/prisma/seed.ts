import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing database tables...');
  await prisma.communication.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.customer.deleteMany({});

  console.log('Seeding customers and orders...');

  const customersData = [
    {
      name: 'Alice Smith',
      email: 'alice.smith@example.com',
      phone: '+15550100001',
      orders: [
        { amount: 45.0, category: 'COFFEE' },
        { amount: 65.0, category: 'COFFEE' },
        { amount: 40.0, category: 'COFFEE' }
      ]
    },
    {
      name: 'Bob Jones',
      email: 'bob.jones@example.com',
      phone: '+15550100002',
      orders: [
        { amount: 30.0, category: 'COFFEE' },
        { amount: 40.0, category: 'FASHION' }
      ]
    },
    {
      name: 'Charlie Brown',
      email: 'charlie.brown@example.com',
      phone: '+15550100003',
      orders: [
        { amount: 180.0, category: 'FASHION' },
        { amount: 70.0, category: 'FASHION' }
      ]
    },
    {
      name: 'Diana Prince',
      email: 'diana.prince@example.com',
      phone: '+15550100004',
      orders: [
        { amount: 120.0, category: 'COFFEE' },
        { amount: 350.0, category: 'FASHION' }
      ]
    },
    {
      name: 'Evan Wright',
      email: 'evan.wright@example.com',
      phone: '+15550100005',
      orders: [
        { amount: 15.0, category: 'COFFEE' }
      ]
    }
  ];

  for (const c of customersData) {
    const totalSpend = c.orders.reduce((sum, order) => sum + order.amount, 0);
    await prisma.customer.create({
      data: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        totalSpend,
        orders: {
          create: c.orders.map(o => ({
            amount: o.amount,
            category: o.category
          }))
        }
      }
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
