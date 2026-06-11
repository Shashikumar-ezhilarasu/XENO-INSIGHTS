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
  await prisma.trigger.deleteMany({});
  await prisma.communication.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.offer.deleteMany({});
  await prisma.lifecycleJourney.deleteMany({});
  await prisma.customer.deleteMany({});

  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const BEHAVIORS = ['LOW', 'MID', 'HIGH'];

  const LOCATIONS = ['Chennai, India', 'Bengaluru, India', 'Mumbai, India', 'Delhi, India', 'San Francisco, USA', 'London, UK', 'New York, USA', 'Hyderabad, India'];
  const FEEDBACKS = [
    'Absolutely love the morning brew here! The best coffee in town.',
    'Amazing pastries, always fresh and warm. Highly recommend the croissants!',
    'Great experience, friendly staff, and consistent quality.',
    'The loyalty reward system is fantastic. Easy checkout too.',
    'Excellent value, premium quality coffee and bakery items.',
    'Super fast checkouts and delicious cold brews.',
    'A cozy experience. Love their apparel collection as well!',
    'Always my go-to spot for weekend bakery cravings.'
  ];
  const PAYMENTS = ['UPI', 'Credit Card', 'Cash', 'Apple Pay', 'Net Banking'];
  const COMMUNICATIONS = ['WHATSAPP', 'EMAIL', 'SMS', 'RCS'];

  console.log('🌱 Generating 200 realistic customer profiles...');
  const customers = [];
  for (let i = 0; i < 200; i++) {
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
      loyaltyPoints: Math.round(getRandomRange(10.0, 500.0) * 10) / 10,
      favoriteCategory: getRandomElement(CATEGORIES),
      discountSeekingBehavior: getRandomElement(BEHAVIORS),
      preferredShoppingDay: getRandomElement(DAYS_OF_WEEK),
      location: getRandomElement(LOCATIONS),
      feedback: getRandomElement(FEEDBACKS),
      modeOfPayment: getRandomElement(PAYMENTS),
      preferredCommunication: getRandomElement(COMMUNICATIONS),
      lastVisitDate: null as Date | null
    });
  }

  console.log('🛍️ Generating relational purchase history (Orders)...');
  const orders: any[] = [];
  const customerSpendMap = new Map<string, number>();

  for (const customer of customers) {
    // Determine a varied number of orders per customer
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
    const customerOrders = [];

    // Ensure we create a few customers whose lastVisitDate hits exactly 30 days ago for triggers testing
    const forceTriggerDay = Math.random() < 0.15; // 15% probability

    for (let o = 0; o < numOrders; o++) {
      const amount = Math.round(getRandomRange(5.0, 150.0) * 100) / 100;
      const itemCount = getRandomInt(1, 4);
      const category = getRandomElement(CATEGORIES);
      
      let daysAgo = getRandomInt(0, 75);
      if (forceTriggerDay && o === 0) {
        daysAgo = 30; // Force latest order 30 days ago
      }

      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      const order = {
        id: crypto.randomUUID(),
        customerId: customer.id,
        amount,
        itemCount,
        category,
        createdAt,
      };

      orders.push(order);
      customerOrders.push(order);
      totalSpent += amount;
    }

    // Sort orders to find the latest order and set lastVisitDate
    if (customerOrders.length > 0) {
      customerOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      customer.lastVisitDate = customerOrders[0].createdAt;
    } else {
      // Set lastVisitDate to a default old date (e.g. 70 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - getRandomInt(65, 80));
      customer.lastVisitDate = oldDate;
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

  // Establish referrerId self-referencing hierarchy for about 10% of customers
  console.log('🔗 Creating customer referral links...');
  const insertedCustomers = await prisma.customer.findMany({ select: { id: true } });
  for (let i = 0; i < Math.floor(insertedCustomers.length * 0.1); i++) {
    const target = insertedCustomers[i];
    // Pick a random customer as referrer (different from target)
    let referrerIdx = getRandomInt(0, insertedCustomers.length - 1);
    while (insertedCustomers[referrerIdx].id === target.id) {
      referrerIdx = getRandomInt(0, insertedCustomers.length - 1);
    }
    const referrer = insertedCustomers[referrerIdx];
    await prisma.customer.update({
      where: { id: target.id },
      data: { referrerId: referrer.id }
    });
  }

  console.log('🎟️ Seeding next-gen offer codes...');
  const offersData = [
    {
      code: "COMEBACK20",
      discountType: "PERCENTAGE",
      value: 20.0,
      minOrderValue: 30.0,
      categoryConstraint: null,
      maxTotalUsage: 500,
      maxPerCustomer: 1,
      currentUsageCount: 24
    },
    {
      code: "SPIN_WHEEL_50",
      discountType: "PERCENTAGE",
      value: 50.0,
      minOrderValue: 50.0,
      categoryConstraint: null,
      maxTotalUsage: 100,
      maxPerCustomer: 1,
      currentUsageCount: 8
    },
    {
      code: "COFFEE_LOVER",
      discountType: "FLAT",
      value: 5.0,
      minOrderValue: 15.0,
      categoryConstraint: "Coffee",
      maxTotalUsage: 1000,
      maxPerCustomer: 2,
      currentUsageCount: 142
    },
    {
      code: "BAKERYFREE",
      discountType: "PERCENTAGE",
      value: 100.0,
      minOrderValue: 10.0,
      categoryConstraint: "Bakery",
      maxTotalUsage: 50,
      maxPerCustomer: 1,
      currentUsageCount: 48
    }
  ];
  await prisma.offer.createMany({
    data: offersData
  });

  console.log('🌀 Seeding lifecycle customer journeys...');
  const journeysData = [
    {
      name: "New Customer Welcome Track",
      isActive: true,
      steps: [
        { step: 1, type: "DELAY", value: "1 day" },
        { step: 2, type: "CHANNEL_TRIGGER", channel: "EMAIL", template: "Welcome to Xeno, {{name}}! Here is your 10% off code: WELCOME10." },
        { step: 3, type: "DELAY", value: "5 days" },
        { step: 4, type: "CHANNEL_TRIGGER", channel: "SMS", template: "Hey {{name}}, don't forget to use your welcome offer!" }
      ]
    },
    {
      name: "90-Day Churn Prevention",
      isActive: true,
      steps: [
        { step: 1, type: "SEGMENT_CHECK", criteria: "lastVisitDate > 90 days" },
        { step: 2, type: "CHANNEL_TRIGGER", channel: "WHATSAPP", template: "Are we broken up? 💔 {{name}}, we miss you. Use code COMEBACK20 for 20% off." }
      ]
    }
  ];
  for (const journey of journeysData) {
    await prisma.lifecycleJourney.create({
      data: {
        name: journey.name,
        isActive: journey.isActive,
        steps: journey.steps
      }
    });
  }

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
      messageTemplateB: "Hey {{name}}! Coffee is on us today! Enjoy 15% off using code COFFEE15. Buy Now!",
      channel,
      status: "COMPLETED",
      createdAt: campaignCreatedAt,
    }
  });

  // Create A/B testing communications logs (half A, half B)
  const shuffledCustomers = [...customers].sort(() => 0.5 - Math.random());
  const sampleCustomers = shuffledCustomers.slice(0, 16);
  
  const communications: any[] = [];
  
  sampleCustomers.forEach((customer, index) => {
    const variant = index % 2 === 0 ? 'A' : 'B';
    const rand = Math.random();
    let status = 'DELIVERED';
    
    if (rand < 0.5) {
      status = 'CLICKED';
    } else if (rand < 0.8) {
      status = 'OPENED';
    } else if (rand < 0.95) {
      status = 'DELIVERED';
    } else {
      status = 'FAILED';
    }

    const timeStamp = new Date(campaignCreatedAt.getTime());
    timeStamp.setMinutes(timeStamp.getMinutes() + getRandomInt(5, 120));

    communications.push({
      id: crypto.randomUUID(),
      campaignId,
      customerId: customer.id,
      channel: "WHATSAPP",
      status,
      variant,
      createdAt: timeStamp,
      updatedAt: timeStamp,
    });
  });

  await prisma.communication.createMany({
    data: communications
  });

  console.log('⏰ Creating automated Cron Reminder Triggers...');
  await prisma.trigger.create({
    data: {
      name: "We Miss You WhatsApp Reminder (30 Days Recency)",
      type: "LAST_VISIT_30_DAYS",
      campaignId: campaignId,
      isActive: true,
    }
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
