# XENO AI-Native CRM

A fully integrated, high-performance SaaS marketing CRM powered by AI audience segmentation, gamification engines, and real-time observability.

## 🚀 Key Features

*   **Cohesive Customer Journey**: Navigate seamlessly from data ingestion to audience insights, AI campaign orchestration, delivery simulation, and performance analytics.
*   **AI Audience Orchestration**: Uses Google Gemini to dynamically segment your customers based on RFM (Recency, Frequency, Monetary) data and generate hyper-personalized campaign copy.
*   **Native Gamification Engine**: Launch Spin-the-Wheel, Scratch Cards, and Loyalty campaigns directly from the central campaign builder.
*   **Dual-Database Architecture**: Secure isolation between Application transactional data (Campaigns, Orders, Webhooks) and central Tenant configurations.
*   **Enterprise-Grade Operations (Simulator)**: 
    *   **BullMQ + Redis**: High-throughput background campaign queuing.
    *   **Idempotent Webhooks**: Strict monotonically increasing state resolution guarantees data integrity even with out-of-order delivery events.
    *   **Dead Letter Queues**: Resilient error handling for failed deliveries.
*   **Real-Time Analytics**: Monitor live conversion funnels, ROAS, and offer redemptions.

## 📁 Information Architecture

1.  **Dashboard**: Business Profile setup, file upload/data ingestion, and top-level KPI overview.
2.  **Customers**: Directory of customer profiles, RFM segments, and 1-on-1 "Quick Nudge" messaging.
3.  **Campaigns**: AI copy generation, audience targeting, and embedded gamification rules.
4.  **Analytics**: Deep-dive into campaign conversions and live offer monitoring.
5.  **Operations Simulator**: Raw view of system metrics, worker queues, and event logs.
6.  **Workspace Profile**: Global tenant configuration and personalization settings.

## 🛠️ Technology Stack

*   **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons, Recharts, PapaParse.
*   **Backend**: Node.js, Express, Prisma ORM, BullMQ, Redis, Google Gemini SDK.
*   **Database**: PostgreSQL.

## ⚙️ Setup & Installation

**1. Clone the repository:**
\`\`\`bash
git clone https://github.com/Shashikumar-ezhilarasu/XENO-INSIGHTS.git
cd XENO-INSIGHTS
\`\`\`

**2. Setup Backend:**
\`\`\`bash
cd backend
npm install
# Configure your .env file with DATABASE_URL, TENANT_DATABASE_URL, REDIS_URL, GEMINI_API_KEY
npx prisma generate
npx prisma generate --schema=prisma/schema-tenant.prisma
npm run dev
\`\`\`

**3. Setup Frontend:**
\`\`\`bash
cd ../frontend
npm install
# Configure your .env.local with NEXT_PUBLIC_BACKEND_URL
npm run dev
\`\`\`

## 📖 For Developers & AI Assistants

If you are an AI assistant or a new developer jumping into this codebase, please thoroughly read the `AI_CONTEXT.md` file located in the root of the repository. It contains explicit architectural rules, state flows, and structural reasoning behind the UI.
