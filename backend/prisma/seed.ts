import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const FIRST_NAMES = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver', 'Sophia', 'Elijah', 'Isabella', 'James',
  'Mia', 'Benjamin', 'Charlotte', 'Lucas', 'Amelia', 'Alexander', 'Harper', 'Mason', 'Evelyn', 'Michael',
  'Abigail', 'Ethan', 'Emily', 'Daniel', 'Elizabeth', 'Henry', 'Sofia', 'Jackson', 'Avery', 'Sebastian',
  'Ella', 'Aiden', 'Madison', 'Matthew', 'Scarlett', 'Samuel', 'Victoria', 'David', 'Aria', 'Joseph',
  'Grace', 'Carter', 'Chloe', 'Owen', 'Camila', 'Wyatt', 'Penelope', 'John', 'Riley', 'Jack'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

const CATEGORIES = ['Coffee', 'Bakery', 'Apparel', 'Beauty', 'Accessories'];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🧹 Cleaning up old database tables...');
  await prisma.communication.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.customer.deleteMany({});

  console.log('🌱 Generating 100 realistic customer profiles...');
  const customers = [];
  for (let i = 0; i < 100; i++) {
    const firstName = getRandomElement(FIRST_NAMES);
    const lastName = getRandomElement(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${getRandomInt(100, 999)}@example.com`;
    const phone = `+1${getRandomInt(200, 999)}${getRandomInt(100, 999)}${getRandomInt(1000, 9999)}`;
    
    customers.push({
      id: crypto.randomUUID(),
      name,
      email,
      phone,
      totalSpends: 0.0,
    });
  }

  console.log('🛍️ Generating relational purchase history (Orders)...');
  const orders = [];
  const customerSpendMap = new Map<string, number>();

  for (const customer of customers) {
    // Determine a varied number of orders per customer
    // We want to make sure some customers specifically spend over $50 on Coffee in the last 30 days.
    // Let's use weights similar to seed_data.py
    const numOrdersRand = Math.random();
    let numOrders = 0;
    if (numOrdersRand < 0.1) numOrders = 0;
    else if (numOrdersRand < 0.4) numOrders = 1;
    else if (numOrdersRand < 0.65) numOrders = 2;
    else if (numOrdersRand < 0.8) numOrders = 3;
    else if (numOrdersRand < 0.9) numOrders = 4;
    else if (numOrdersRand < 0.97) numOrders = 5;
    else numOrders = 10;

    let totalSpent = 0;

    for (let o = 0; o < numOrders; o++) {
      const amount = Math.round(getRandomRange(5.0, 150.0) * 100) / 100;
      const itemCount = getRandomInt(1, 4);
      const category = getRandomElement(CATEGORIES);
      // Create orders over the last 60 days
      const daysAgo = getRandomInt(0, 60);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      orders.push({
        id: crypto.randomUUID(),
        customerId: customer.id,
        amount,
        itemCount,
        category,
        createdAt,
      });

      totalSpent += amount;
    }

    customerSpendMap.set(customer.id, totalSpent);
    customer.totalSpends = Math.round(totalSpent * 100) / 100;
  }

  // Bulk insert customers
  await prisma.customer.createMany({
    data: customers
  });

  // Bulk insert orders
  await prisma.order.createMany({
    data: orders
  });

  console.log('📢 Creating sample baseline Campaign & Communications...');
  const campaignId = crypto.randomUUID();
  const campaignName = "Test Coffee Promotion";
  const promptText = "Find customers who spent more than $50 in coffee";
  const messageTemplate = "Hey {{name}}! We noticed you love our coffee. Grab a free donut on your next order over $15! Use code: COFFEE15";
  const channel = "WHATSAPP";
  const campaignCreatedAt = new Date();
  campaignCreatedAt.setDate(campaignCreatedAt.getDate() - 1);

  await prisma.campaign.create({
    data: {
      id: campaignId,
      name: campaignName,
      promptText,
      messageTemplate,
      channel,
      status: "COMPLETED",
      createdAt: campaignCreatedAt,
    }
  });

  // Pick a sample of 15 customers to have communications
  const shuffledCustomers = [...customers].sort(() => 0.5 - Math.random());
  const sampleCustomers = shuffledCustomers.slice(0, 15);
  
  const communications = [];
  const statuses = ['DELIVERED', 'OPENED', 'FAILED'];
  const statusWeights = [0.6, 0.3, 0.1]; // 60% DELIVERED, 30% OPENED, 10% FAILED

  for (const customer of sampleCustomers) {
    const rand = Math.random();
    let status = 'DELIVERED';
    if (rand < statusWeights[0]) {
      status = 'DELIVERED';
    } else if (rand < statusWeights[0] + statusWeights[1]) {
      status = 'OPENED';
    } else {
      status = 'FAILED';
    }

    const timeStamp = new Date(campaignCreatedAt.getTime());
    timeStamp.setMinutes(timeStamp.getMinutes() + getRandomInt(5, 120));

    communications.push({
      id: crypto.randomUUID(),
      campaignId,
      customerId: customer.id,
      status,
      createdAt: timeStamp,
      updatedAt: timeStamp,
    });
  }

  await prisma.communication.createMany({
    data: communications
  });

  console.log('📊 Database population completed smoothly!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
