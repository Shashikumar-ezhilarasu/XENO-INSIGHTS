# XENO-INSIGHTS: AI Context & Memory Bank

## Purpose
This file serves as the core context memory for any AI Agent continuing work on the XENO-INSIGHTS project. Read this file to understand the architecture, current state, design patterns, and known issues.

## Project Overview
XENO-INSIGHTS is a Next-Gen AI-Native Customer Data Platform (CDP) and Growth CRM.
It features a decoupled architecture:
1. **Frontend:** Next.js 14 App Router (React), Tailwind CSS, Framer Motion, Recharts.
2. **Backend:** Node.js, Express, Prisma ORM, PostgreSQL, Redis, BullMQ.
3. **Channel Simulators:** 3 independent Node.js Express servers simulating external MCP (Model Context Protocol) channels (WhatsApp, SMS, Email/RCS).

## Core Architectures & Workflows

### 1. The Communication Lifecycle (Async Callback Loop)
This is the most critical workflow evaluated in this project:
- A user launches a campaign via the UI -> `POST /api/campaigns/send`.
- The CRM creates `Communication` records (`PENDING`) in PostgreSQL and pushes them to a Redis queue.
- The `outboundWorker` (BullMQ) processes the queue (`concurrency: 50`) and dispatches a synchronous `HTTP POST` to the respective Channel Simulator (e.g., `whatsapp-mcp`).
- The **Channel Simulator** accepts the request, returns `HTTP 200 OK` instantly, and spawns a background task (`simulateDelivery`).
- `simulateDelivery` uses a probabilistic model (based on channel delivery/open/click rates) to schedule delayed events.
- The Simulator fires `POST` callbacks back to the CRM's Webhook Ingestion endpoint (`/api/webhooks/receipt`).
- The CRM updates the database state (`SENT` -> `DELIVERED` -> `OPENED` -> `CLICKED` -> `CONVERTED`), maintaining strict chronological idempotency via a `STATUS_PRECEDENCE` dictionary.

### 2. BullMQ & Resiliency
- We use `ioredis` with `maxRetriesPerRequest: null` so standard temporary Redis outages do not crash the Node process.
- Background jobs that fail are retried with exponential backoff.
- Exhausted retries are sent to the Dead Letter Queue (DLQ) handler, marking the communication `FAILED` in the DB.

### 3. Frontend Restructuring & Demo Flow (Latest)
- The UI originally contained "island" features (Nudge Engine, Gamification Studio) and mock workflows (`builder/page.tsx`).
- **Recent Update:** The mock `builder` was completely deleted to force all traffic through the real Gemini `api/ai/segment` integration.
- **Demo Architecture:** The `SystemMonitorPanel.tsx` was overhauled to explicitly expose backend reliability features (BullMQ Concurrency, Rate Limits, DLQ routing) and visualize the Webhook Idempotency (Status Precedence map).
- **Analytics:** `/analytics/page.tsx` was updated to explicitly show the `Converted` funnel state and append `✔ Triggered by CONVERTED webhook` to revenue metrics, tying the frontend directly to the async loop.

## Recent Updates & Bug Fixes
- **Webhook Precedence:** Added `CONVERTED` to the `STATUS_PRECEDENCE` map and ensured `communication_id` mapping functions correctly.
- **MCP Client Fallback:** The default MCP SDK (`StreamableHTTPServerTransport`) had issues with duplicate transports. A direct `fetch()` fallback is currently utilized in `channelMcpClient.ts` to guarantee delivery loop stability.
- **Frontend Simulator:** Built `SystemMonitorPanel` inside `/simulator` to visually track live webhook callbacks trickling into the CRM.

## Development Patterns
1. **Security Middleware:** All routes are protected by `security.ts`, providing request ID injection, rate-limiting, SQL injection guards, and strict input payload validation.
2. **Prisma Schema:** Heavy use of composite indexes and relations for rapid dashboard aggregations.

## Running the Project
```bash
# Start all services concurrently (CRM, Frontend, 3x Channel Simulators, Redis)
npm run start:all
```

## Next Steps / Tech Debt
1. **Pagination for Massive Segments:** `POST /api/campaigns/send` currently pulls all `customerIds` into memory. For 100k+ users, this must be refactored to chunk segment IDs or use a cursor.
2. **Analytics Deduplication:** `attributedOrders` blindly increments upon receiving a `CLICKED` or `CONVERTED` event. This needs a unique constraint to avoid double-counting.
3. **Event-Driven Channels:** Consider swapping the HTTP fallback in `channelMcpClient` to a pure Kafka/RabbitMQ implementation for 1M+ throughput.
