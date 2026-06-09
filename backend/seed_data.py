import os
import random
import uuid
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import execute_values
from faker import Faker

# Initialize Faker
fake = Faker()

# Database Connection Configuration
DB_CONNECTION_STRING = "postgresql://postgres:300812@localhost:5432/xeno_crm"

CATEGORIES = ['Coffee', 'Bakery', 'Apparel', 'Beauty', 'Accessories']
CHANNELS = ['WHATSAPP', 'SMS', 'EMAIL', 'RCS']

def get_connection():
    try:
        return psycopg2.connect(DB_CONNECTION_STRING)
    except Exception as e:
        print(f"❌ Failed to connect to the database: {e}")
        raise

def seed_database():
    conn = get_connection()
    cursor = conn.cursor()
    
    print("🧹 Cleaning up old data to ensure a fresh state...")
    cursor.execute('TRUNCATE TABLE public."Communication", public."Campaign", public."Order", public."Customer" CASCADE;')
    conn.commit()

    print("🌱 Generating 100 realistic customer profiles...")
    customers = []
    for _ in range(100):
        customer_id = str(uuid.uuid4())
        name = fake.name()
        email = fake.unique.email()
        phone = fake.unique.phone_number()[:20] # Safeguard column length constraints
        customers.append((customer_id, name, email, phone, 0.0, datetime.now(), datetime.now()))

    # Bulk insert customers
    customer_query = """
        INSERT INTO public."Customer" (id, name, email, phone, "totalSpends", "createdAt", "updatedAt")
        VALUES %s;
    """
    execute_values(cursor, customer_query, customers)
    
    print("🛍️ Generating relational purchase history (Orders)...")
    orders = []
    customer_spend_updates = {}

    for customer in customers:
        c_id = customer[0]
        # Determine a varied number of orders per customer to simulate user traits
        num_orders = random.choices([0, 1, 2, 3, 4, 5, 10], weights=[10, 30, 25, 15, 10, 7, 3], k=1)[0]
        total_spent = 0.0
        
        for _ in range(num_orders):
            order_id = str(uuid.uuid4())
            amount = round(random.uniform(5.0, 150.0), 2)
            item_count = random.randint(1, 4)
            category = random.choice(CATEGORIES)
            # Create varied transaction histories over the last 60 days
            created_at = datetime.now() - timedelta(days=random.randint(0, 60))
            
            orders.append((order_id, c_id, amount, item_count, category, created_at))
            total_spent += amount
            
        customer_spend_updates[c_id] = total_spent

    # Bulk insert orders
    order_query = """
        INSERT INTO public."Order" (id, "customerId", amount, "itemCount", category, "createdAt")
        VALUES %s;
    """
    execute_values(cursor, order_query, orders)

    print("🔄 Caching and synchronization of Customer Lifetime Values (totalSpends)...")
    for c_id, total_spent in customer_spend_updates.items():
        cursor.execute(
            'UPDATE public."Customer" SET "totalSpends" = %s WHERE id = %s;',
            (total_spent, c_id)
        )

    print("📢 Creating sample baseline Campaign & Communications...")
    # Add an initial campaign matching your exact pgAdmin row blueprint
    campaign_id = str(uuid.uuid4())
    campaign_name = "Test Coffee Promotion"
    prompt_text = "Find customers who spent more than $50 in coffee"
    message_template = "Hey {{name}}! We noticed you love our coffee. Grab a free donut on your next order over $15! Use code: COFFEE15"
    channel = "WHATSAPP"
    campaign_created_at = datetime.now() - timedelta(days=1)
    
    cursor.execute(
        """
        INSERT INTO public."Campaign" (id, name, "promptText", "messageTemplate", channel, status, "createdAt")
        VALUES (%s, %s, %s, %s, %s, %s, %s);
        """,
        (campaign_id, campaign_name, prompt_text, message_template, channel, "COMPLETED", campaign_created_at)
    )

    # Pick a random sample of 15 customers to have been included in this historical campaign
    sample_customers = random.sample(customers, 15)
    communications = []
    
    statuses = ['DELIVERED', 'OPENED', 'FAILED']
    status_weights = [60, 30, 10] # Realistic funnel distribution
    
    for customer in sample_customers:
        c_id = customer[0]
        comm_id = str(uuid.uuid4())
        status = random.choices(statuses, weights=status_weights, k=1)[0]
        time_stamp = campaign_created_at + timedelta(minutes=random.randint(5, 120))
        communications.append((comm_id, campaign_id, c_id, status, time_stamp, time_stamp))

    comm_query = """
        INSERT INTO public."Communication" (id, "campaignId", "customerId", status, "createdAt", "updatedAt")
        VALUES %s;
    """
    execute_values(cursor, comm_query, communications)

    # Save changes permanently
    conn.commit()
    cursor.close()
    conn.close()
    print("📊 Database population completed smoothly!")

if __name__ == "__main__":
    seed_database()
