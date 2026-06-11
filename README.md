# 🏷️ XENO-INSIGHTS: Next-Gen AI-Native Customer Data Platform & Growth CRM

**XENO-INSIGHTS** is a highly scalable, AI-driven Customer Data Platform (CDP) and Customer Relationship Management (CRM) engine. By deterministically unifying transactional retail data, it constructs a true 360-degree customer view for modern direct-to-consumer and retail brands. Leveraging a powerful AI Marketing Agent powered by the Google Gemini API, marketers can orchestrate hyper-personalized, Zomato-style omnichannel campaigns using natural language. The distributed backend robustly handles high-volume asynchronous webhook feedback loops, ensuring every delivery, open, and click is tracked and mathematically attributed to campaign ROI.

---

## 🏗️ Architecture & Directory Layout

XENO-INSIGHTS is structured as a modern TypeScript monorepo, cleanly decoupling the interactive Next.js 14 client from the high-performance Express & PostgreSQL backend. 

```text
XENO-INSIGHTS/
├── backend/                  # Scalable Node.js & Express API Gateway
│   ├── prisma/               # Database Schema, Migrations, & Seeders
│   │   ├── schema.prisma     # Enterprise relational data models
│   │   └── seed.ts           # Advanced automated TypeScript seeder
│   ├── src/
│   │   ├── config/           # Initialization (Prisma Client, Cron schedules)
│   │   ├── middleware/       # Rate-Limiters & Security validators
│   │   ├── routes/           # Decoupled domain routers
│   │   │   ├── ai.ts         # Google Gemini NL-to-SQL parser
│   │   │   ├── campaign.ts   # Campaign orchestrator & Smart Routing Optimizer
│   │   │   ├── ingest.ts     # CDP Identity Resolution Engine
│   │   │   ├── stubChannel.ts# Click simulation background worker
│   │   │   └── webhook.ts    # Asynchronous event lifecycle feedback loop
│   │   └── utils/            # Strict SQL & Prisma security sanitizers
│   └── tests/                # Automated Jest Integration Test Suites
│
├── frontend/                 # High-performance Next.js 14 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── (app)/        # Protected CRM Workspace (Layout wrappers)
│   │   │   │   ├── analytics/    # Live interactive metrics & CTR reporting
│   │   │   │   ├── campaigns/    # Omnichannel Ad Studio Canvas
│   │   │   │   ├── gamification/ # Loyalty Hub & Spin-the-Wheel triggers
│   │   │   │   └── segments/     # AI natural-language audience building
│   │   │   └── page.tsx      # Immersive Lightfall 3D Landing Page
│   │   └── components/       # Reusable shadcn/ui components & Recharts
└── README.md
```

### Architectural Modularity
- **AI Generation Layer:** Decoupled prompt engineering parsing natural language into safe AST-based Prisma objects.
- **Database Sanitizer:** Distinct utility layers shielding the PostgreSQL engine from malicious payload injections.
- **Webhook Ingestion Handlers:** Isolated state-machines operating within atomic database transactions to handle concurrent callback resolutions.
- **Live Polling Clients:** React components utilizing interval polling and React hydration techniques to map database shifts in real-time.

---

## 🚀 Core & Advanced Enterprise Feature Matrix

| Enterprise Component | Technical Implementation & Capability |
| :--- | :--- |
| **360-Degree Single Customer View** | Aggregates unlinked transactional data into unified profiles. Automatically calculates recency, frequency, monetary values (RFM), loyalty points, predictive affinity tags (Next Best Category), and channel preferences. |
| **AI Marketing Agent Workspace** | Translates natural language prompts into executable Prisma/SQL parameters via the Google Gemini API. Equipped with prompt-chips, live audience sizing, and rapid segment previews. |
| **Multi-Channel Ad Studio Canvas** | WYSIWYG configuration for WhatsApp, SMS, Email, and RCS. Supports A/B testing templates, dynamic macro interpolation (`{{name}}`), and live lock-screen rendering mockups. |
| **Asynchronous Webhook Feedback Loop** | Implements a non-blocking `202 Accepted` processing lifecycle. Enforces strict state-precedence rules (e.g., `PENDING -> SENT -> DELIVERED -> OPENED -> CLICKED`), silently discarding out-of-order delayed receipts using Prisma interactive transactions. |
| **CDP Identity Resolution Engine** | A deterministic profile-stitching pipeline. Captures fragmented anonymous entries (e.g., offline POS phone usage vs. online web email) and executes an atomic `prisma.$transaction` to merge relations and deduplicate customer rows automatically. |
| **Interactive Click Simulation & Attribution** | Background worker timers simulate realistic interactive click paths based on payload rich-media constraints. Converts `CLICKED` callbacks into dynamic monetary value tracking, updating the Campaign ROAS analytical dashboard live. |
| **Gamification & Loyalty Hub** | A rules-driven incentive engine simulating interactive hooks (Scratch Cards, Spin Wheels) layered with a Least-Cost Smart Routing Optimizer that preserves margins by directing VIPs to WhatsApp and bargain hunters to standard Email/SMS. |

---

## 🔒 Production-Grade Security Architecture

Security is treated as a first-class citizen in the XENO-INSIGHTS infrastructure, strictly preventing malicious injection and ensuring high-availability during bulk campaign dispatches.

- **Strict SQL & Prisma Query Sanitizer:** The AI Natural-Language-to-SQL agent is securely sandboxed. Custom Regex inspection blocks destructive modifying verbs (`DROP`, `ALTER`, `TRUNCATE`, `UPDATE`, `DELETE`). Model boundaries are strictly whitelisted to prevent unauthorized table traversal.
- **Rate-Limiting Parameters:** Deployed via `express-rate-limit` to prevent denial-of-service and API token exhaustion:
  - **AI Endpoints:** Capped at `5 requests / minute` for heavy LLM prompt evaluations.
  - **Campaign Dispatches:** Capped at `10 requests / minute` to protect the mock delivery queues from overwhelming the webhook ingestor.
- **Payload Validation & Compilation Constraints:** Strict input validations enforce UUID v4 patterns on all foreign keys, string boundaries on text payloads, and whitelist array comparisons for status identifiers.

---

## 🧪 Validation Benchmarks & Testing Suite

The system includes a rigorous automated testing pipeline to verify logic edge cases.

- **Automated Verification Framework:** Developed using **Jest** and **Supertest**, achieving a 9/9 passing rate across advanced integration lifecycles.
- **Identity Deduplication Benchmark:** Programmatically asserts that fragmented identifiers instantly coalesce, properly merging multi-channel data relations into a singular surviving UUID.
- **Lifecycle Assertions:** Programmatic E2E assignment validator scripts verify the absolute integrity of Shopper Ingestion, AI Segmentation routing, concurrent Webhook lifecycle progressions, and automated ROAS analytical calculations—rendering a straight `PASSED` matrix output in CI/CD pipelines.

---

## 🛠️ Installation, Seeding, & Local Deployment Guide

Follow these steps to deploy XENO-INSIGHTS locally for development or QA testing.

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (Local or Cloud instance)
- A valid Google Gemini API Key (`GEMINI_API_KEY`)

### 2. Environment Configuration
Create a `.env` file in the `/backend` directory:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/xeno_crm?schema=public"
PORT=3000
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere..."
```

### 3. Backend Setup & Seeding
Navigate to the `backend` directory, install dependencies, sync the database, and inject the mock data universe.

```bash
cd backend
npm install

# Push the Prisma schema structure to PostgreSQL
npx prisma db push

# Execute the advanced automated TypeScript seeding suite
npm run prisma:seed

# Launch the Express server
npm run dev
```

### 4. Channel Service Setup
XENO-INSIGHTS includes a standalone microservice to simulate delivery loops and failures. In a new terminal window:
```bash
cd channel-service
npm install
npm run build
npm start # Runs on port 3002
```

### 5. Frontend Launch
In a new terminal window, navigate to the `frontend` directory:

```bash
cd frontend
npm install

# Launch the Next.js App Router server
npm run dev
```

### 5. Access the Platform
Navigate to `http://localhost:3001/` in your browser to experience the immersive Lightfall 3D landing page, or proceed directly to `http://localhost:3001/dashboard` to access the CRM core!
