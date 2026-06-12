# XENO-INSIGHTS: Next-Gen AI-Native Customer Data Platform and Growth CRM

XENO-INSIGHTS is an AI-driven Customer Data Platform (CDP) and Customer Relationship Management (CRM) engine. By deterministically unifying transactional retail data, it constructs a 360-degree customer view for modern direct-to-consumer and retail brands. Leveraging a powerful AI Marketing Agent powered by the Google Gemini API, marketers can orchestrate hyper-personalized, omnichannel campaigns using natural language. The distributed backend handles high-volume asynchronous webhook feedback loops, ensuring every delivery, open, read, and click is tracked and attributed to campaign ROI.

---

## Architecture and Directory Layout

XENO-INSIGHTS is structured as a TypeScript monorepo, decoupling the interactive Next.js client from the high-performance Express and PostgreSQL backend.

```text
XENO-INSIGHTS/
├── backend/                  # Node.js and Express API Gateway
│   ├── prisma/               # Database Schema, Migrations, and Seeders
│   │   ├── schema.prisma     # Relational database schema models
│   │   └── seed.ts           # Automatic TypeScript seeder (200+ relational customers)
│   ├── src/
│   │   ├── config/           # Setup (Prisma Client, Cron schedules)
│   │   ├── middleware/       # Rate-limiters, security validators
│   │   ├── routes/           # Domain routers
│   │   │   ├── ai.ts         # Google Gemini NL-to-SQL / Prisma segment parser
│   │   │   ├── aiAgent.ts    # AI Campaign swarm orchestrator
│   │   │   ├── campaign.ts   # Campaign queuing and transmission
│   │   │   ├── channel.ts    # Mock delivery channel and hook scheduler
│   │   │   ├── crm.ts        # Customer relationship endpoints
│   │   │   ├── ingest.ts     # CDP Identity Resolution Engine
│   │   │   ├── loyalty.ts    # Gamification and rewards tracker
│   │   │   ├── offers.ts     # Offer verification and discount constraints
│   │   │   ├── swarm.ts      # Multi-agent streaming SSE pipeline
│   │   │   ├── triggers.ts   # Event trigger schedules
│   │   │   └── webhook.ts    # Webhook receipt and status processor
│   │   └── utils/            # SQL and Prisma query validations
│   └── tests/                # Automated Jest Integration Test Suites
│
├── frontend/                 # Next.js 14 App Router UI
│   ├── src/
│   │   ├── app/
│   │   │   ├── (app)/        # Protected CRM Workspace Layout
│   │   │   │   ├── analytics/    # Live metrics, CTR, and revenue attribution
│   │   │   │   ├── campaigns/    # Marketer segments builder and composer sub-routes
│   │   │   │   │   ├── builder/  # Sequential step wizard (Audience -> Compose -> Review)
│   │   │   │   │   └── command/  # Swarm AI Agent text console
│   │   │   │   ├── dashboard/    # Primary CRM hub with onboarding checks
│   │   │   │   └── gamification/ # Loyalty hub, spin-wheel and scratch card config
│   │   │   └── page.tsx      # Main application entry landing page
│   │   ├── components/       # Custom components (shadcn/ui, Recharts)
│   │   └── lib/              # Frontend utilities and UI providers
│   └── public/               # Static assets
├── vercel.json               # Root multi-service deployment configurations
└── README.md
```

### Architectural Modularity
* **AI Ingress Layer:** Decouples natural language requests from direct query execution. The input is translated to structured Prisma syntax or sandboxed SQL before being verified.
* **CDP Ingestion Layer:** Exposes deterministic identity resolution, collapsing fragmented customer rows into a unified profile.
* **Webhook State Machine:** Governs communication lifecycle stages with optimistic locking to prevent race conditions during parallel updates.
* **Asynchronous Webhook Ingestion:** Yields a fast `202 Accepted` response, processing downstream dispatch actions asynchronously to keep APIs responsive.

---

## Core Feature Matrix and Technical Implementation

### 360-Degree Single Customer View
Aggregates unlinked transactional data into unified profiles. Automatically calculates recency, frequency, monetary value (RFM), loyalty points, predictive affinity tags (Next Best Category), and channel preferences.

### AI Marketing Agent Workspace
Translates natural language prompts into executable database query parameters using the Google Gemini API. Marketers query audiences (e.g., "Find coffee lovers who spent over $100") and receive SQL/Prisma query previews, explanation breakdowns, and live audience sample lists.

### Sequenced Campaign Builder Flow
Integrates segment building and template composition into a single user-experience flow:
1. **Audience Setup:** Marks audience parameters using Gemini translation or pre-defined filters.
2. **Template Composer:** Configures rich-media options for WhatsApp, SMS, Email, and RCS. Incorporates dynamic variable replacement (e.g., `{{name}}`, `{{last_purchased_item}}`, `{{total_loyalty_points}}`) and previews them on real-time device screen mockups.
3. **Review Summary:** Evaluates final counts, channels, and incentives before initiating execution.

### CDP Identity Resolution Engine
A deterministic profile-stitching pipeline. Captures fragmented anonymous entries (e.g., offline POS checkout with only a phone number versus online newsletter signups with only an email) and executes an atomic `prisma.$transaction`. It merges historical records, combines total spends, transfers orders, and deletes duplicate customer rows.

### Asynchronous Webhook Feedback Loop
A non-blocking campaign transmission system. Once campaign execution starts, the system records communications as `PENDING` and triggers callbacks. Webhook routes (`/api/webhooks/receipt` and `/api/webhooks/channel-callback`) process callbacks (`PENDING -> SENT -> DELIVERED -> OPENED -> READ -> CLICKED -> FAILED`).
To handle concurrent, out-of-order updates, the database updates utilize a logical precedence scale:
* Updates are rejected if the incoming status ranks below the current database status (e.g., a delayed `DELIVERED` callback will not overwrite an existing `OPENED` state).
* Conversions (e.g., `CLICKED` events) generate orders, increment campaign conversions, and attribute revenue directly back to campaign ROAS metrics.

---

## Security Architecture

Security constraints prevent injection and ensure high-availability during bulk dispatches.

* **Strict SQL and Prisma Query Sanitizers:** Sandboxes the AI Natural-Language-to-SQL agent. Custom Regex inspections block destructive verbs (`DROP`, `ALTER`, `TRUNCATE`, `UPDATE`, `DELETE`). Model checks prevent unauthorized database tables from being queried.
* **API Rate-Limiting:** Deployed via `express-rate-limit` to prevent denial-of-service and API token exhaustion:
  * **AI Endpoints:** Capped at `5 requests / minute` for LLM prompt evaluations.
  * **Campaign Dispatches:** Capped at `10 requests / minute` to protect downstream systems.
* **Payload Validation:** Enforces strict validation rules, including UUID v4 patterns on identifiers, text boundaries on message templates, and whitelist checks on channel types.

---

## Database and Test Suite Optimizations

The system has been optimized to handle complex integration tests and connection constraints.

### Supabase Connection Pooling
* **The Issue:** The default direct connection to Supabase PostgreSQL on port `5432` uses session-level connections and is limited to 15 concurrent clients. Parallel integration tests or concurrent serverless executions quickly exhaust this pool, resulting in `EMAXCONNSESSION` errors.
* **The Solution:** Configured the application to target Supabase's transaction pooler (port `6543` with `?pgbouncer=true&connection_limit=2`). This allows multiplexed query execution across multiple clients.

### Sandbox Isolation in Tests
* **The Issue:** Campaign executions schedule background callbacks (`setTimeout`) to mock delivery channels. When tests run, these delayed callbacks continue updating database rows while subsequent tests attempt to truncate tables, triggering database deadlocks.
* **The Solution:** Added a bypass check in the mock channel driver (`backend/src/routes/channel.ts`) to skip scheduling background webhook updates when running under the Jest test environment (`process.env.NODE_ENV === 'test'`).

### Test Error Propagation
* **The Issue:** Under normal operation, the AI route gracefully handles Gemini errors by returning cached, simulated JSON objects to preserve UI usability. However, this prevented Jest integration tests from asserting on failures (such as missing API keys or malformed JSON).
* **The Solution:** Added test-environment checks in `backend/src/routes/ai.ts` to propagate errors (returning 500 or 502 status codes) instead of falling back to simulated data when `NODE_ENV === 'test'`.

---

## Validation Benchmarks and Testing Suite

The system includes a test suite running 26 integration tests across 5 domain suites using **Jest** and **Supertest**.

```bash
cd backend
npm run test
```

### Test Suites Included
* `tests/ai.test.ts`: Validates natural-language segmentation, Prisma/SQL code parsing, security checks for SQL injection, invalid JSON formats, and missing API keys.
* `tests/aiAgent.test.ts`: Verifies the creative swarm engine, offline fallback generation, and database updates.
* `tests/campaign.test.ts`: Asserts queueing lifecycles, non-blocking dispatches, status update sequences, and A/B test split allocations.
* `tests/enterprise.test.ts`: Validates the deterministic identity resolution stitching and the ROAS campaign revenue attribution flow.
* `tests/offersLoyalty.test.ts`: Tests reward calculations, referral points assignment transactions, and promotional offer constraints.

---

## Deployment Guide

### Vercel Monorepo Deployment
The project is configured for Vercel using a root `vercel.json` file to manage both Next.js and Express services inside a single monorepo repository:

```json
{
    "experimentalServices": {
        "frontend": {
            "root": "frontend",
            "routePrefix": "/",
            "framework": "nextjs"
        },
        "backend": {
            "root": "backend",
            "routePrefix": "/_/backend"
        }
    }
}
```

#### Build Step Configuration
The build script in `backend/package.json` runs `"prisma generate && tsc"`. This automatically generates the Prisma Client and compiles the TypeScript code during Vercel's build phase, avoiding runtime engine errors.

### Local Development Guide

#### 1. Setup Environment Variables
Create a `.env` file in the `/backend` directory:
```bash
# Recommended transaction pooler URL
DATABASE_URL="postgresql://postgres.[project_id]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=2"
PORT=3000
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
```

Create a `.env` file in the `/frontend` directory:
```bash
NEXT_PUBLIC_BACKEND_URL="http://localhost:3000"
```

#### 2. Install and Seed Database
Navigate to the `backend` directory, install dependencies, push the database schema, and seed the customer database:
```bash
cd backend
npm install
npx prisma db push
npm run prisma:seed
npm run dev
```

#### 3. Run Frontend
Navigate to the `frontend` directory, install dependencies, and launch the development server:
```bash
cd ../frontend
npm install
npm run dev
```
The client dashboard will be available at `http://localhost:3001/dashboard`.
