# XENO CRM - AI Context Memory

This document serves as a "brain dump" and architectural context map for any future AI or developer working on the XENO CRM codebase.

## Product Philosophy
Xeno CRM is an **AI-native marketing platform** designed not as a collection of disjointed tools, but as a single, cohesive customer journey. Data flows sequentially: 
`Ingestion → Audience AI Segmentation → Campaign Orchestration → Simulation/Execution → Delivery Analytics`.

## Core Features & System Architecture

### 1. Dual-Database Architecture
- **Application DB** (`prisma/schema.prisma`): Handles high-volume transactional data, audience metrics, campaign logs, and webhook events.
- **Tenant DB** (`prisma/schema-tenant.prisma`): Acts as the source of truth for workspace configurations, Business Profiles (Accent colors, KPI labels, industry categories), and global AI prompts.

### 2. Frontend Modules & Information Architecture
- **Dashboard (`/dashboard`)**: The landing page. Handles onboarding, database connection, CSV uploads, and displays high-level business KPIs pulled from the Tenant DB.
- **Customers (`/customers`)**: Replaces the old `/nudge` module. Contains the customer directory, RFM cluster segmentation, and "Quick Nudge" functionality for individual engagement.
- **Campaign Manager (`/campaigns`)**: The core AI Orchestrator. Users select a target audience and use Gemini AI to generate copy. It supports multiple `campaignType`s (Standard, Loyalty, Spin Wheel, Scratch Card). Gamification is natively integrated here, not isolated.
- **Operations Simulator (`/simulator`)**: Real-time observability dashboard for tracking BullMQ workers, webhook idempotency, Dead Letter Queues, and campaign delivery logs.
- **Analytics (`/analytics`)**: Focuses purely on post-campaign conversion metrics, ROAS, and offer redemption tracking.
- **Workspace Settings (`/workspace/profile`)**: Replaces the old `/settings` route. Contains global configurations synced with the Tenant DB.

### 3. Backend Capabilities Surfaced
- **AI Audience Segmentation**: Uses Gemini to analyze customer RFM metrics and generate dynamic clusters.
- **BullMQ + Redis Queues**: Async worker architecture for broadcasting campaigns.
- **Webhook Ingestion**: Traceable event callbacks (Sent, Delivered, Opened, Clicked, Converted).
- **Status Precedence & Idempotency**: Strict monotonically increasing event states ensure out-of-order webhook deliveries don't corrupt campaign metrics.
- **Channel MCP Routing**: Pluggable Model Context Protocol architecture for dispatching messages via WhatsApp, SMS, or RCS (`channelMcpClient.ts`).

## Recent Refactoring Notes (June 2026)
- **Problem**: The UI felt like multiple disjointed assignments (Gamification, Nudge, Settings).
- **Resolution**: A massive Information Architecture (IA) unification. Merged gamification into campaign generation. Moved nudge into the customer directory. Extracted system observability from analytics into its own Operations simulator. 
- **Codebase Cleanups**: Removed deprecated unused pages (`/gamification`, `/nudge`, `/settings`, `/ai-usage`). Fixed typing and unclosed div errors inside the UI components.

## How to Continue Work
1. **Frontend**: Always verify imports using `useTenant()` context for personalization. The UI utilizes Tailwind CSS and Lucide Icons. Ensure the `Sidebar` reflects any new module routing.
2. **Backend**: Any modifications to AI prompts should be made in `src/routes/aiAgent.ts`. If modifying queues, check `src/workers/campaignWorker.ts`.
3. **Database**: Remember to run migrations on BOTH schema files if adding models (`npx prisma generate --schema=prisma/schema.prisma` and `npx prisma generate --schema=prisma/schema-tenant.prisma`).
