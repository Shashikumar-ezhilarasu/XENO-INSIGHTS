# Architectural Tradeoffs

This document outlines the core engineering tradeoffs made during the development of XENO CRM. Every decision was optimized for speed of delivery, simplicity, and assignment requirements, resulting in specific limitations at scale.

---

## Decision 1: Message Queue Infrastructure

**What I chose:** BullMQ backed by a managed Redis instance.

**Alternatives I considered:** Apache Kafka, AWS SQS, or RabbitMQ.

**Why I chose this for the MVP:** BullMQ offers dead-simple implementation within a Node.js ecosystem. It provides exactly what the assignment needed—job scheduling, concurrency control, and retries—without the massive infrastructure overhead of setting up and managing a Kafka cluster. It allowed me to ship the async processing requirement in a few hours.

**What breaks at scale / the real cost:** Redis is an in-memory datastore. At very high volumes (e.g., beyond 1 million pending jobs per hour), job payloads could easily exhaust Redis memory limits, leading to out-of-memory crashes or eviction of critical tasks.

**What I'd do in production:** Migrate to Apache Kafka or AWS SQS. Kafka offers durable disk-based storage for events, allowing the queue to handle massive backpressure and replayability without memory constraints.

---

## Decision 2: Webhook Delivery Ordering

**What I chose:** Optimistic concurrency using an integer `statusLevel` (e.g., PENDING=0, SENT=1, DELIVERED=2) to reject out-of-order webhook callbacks.

**Alternatives I considered:** Event sourcing (appending all events to an immutable log table), or strict serializable database transactions.

**Why I chose this for the MVP:** Out-of-order network requests are a reality. Adding a simple numeric hierarchy to the `Communication` table was the fastest way to enforce monotonic state transitions. It required just one extra `updateMany` clause in Prisma without complicating the database schema.

**What breaks at scale / the real cost:** We permanently lose the historical timeline of events. If a communication is marked `CLICKED`, we don't have a database record of *when* it was `DELIVERED` or `OPENED`, severely limiting deep funnel analytics and debugging capabilities at 10M+ events/day.

**What I'd do in production:** Implement an Event Sourcing pattern. I would create a `CommunicationEvent` table where every webhook payload is appended immutably, and use materialized views or database triggers to compute the current state.

---

## Decision 3: Independent Channel Service

**What I chose:** A standalone Express service in a separate folder (`/backend/channel-services`), communicating via HTTP.

**Alternatives I considered:** Direct 3rd-party SDK imports within the CRM backend, or a gRPC microservice.

**Why I chose this for the MVP:** The assignment strictly required the CRM to call a "separate stubbed channel service" that responds asynchronously. Building it as a separate HTTP API perfectly fulfilled this prompt while avoiding the complexity of gRPC Protobuf definitions.

**What breaks at scale / the real cost:** HTTP incurs high network overhead and latency. At 10k+ requests per second, the TCP handshake overhead and JSON parsing CPU costs will bottleneck the workers before they hit the actual channel API limits.

**What I'd do in production:** For internal microservices, switch to gRPC for multiplexed, binary-encoded, low-latency communication, or drop the microservice entirely in favor of an event stream like Kafka where the channel service acts purely as a consumer.

---

## Decision 4: AI Integration Strategy

**What I chose:** Direct HTTP calls to the Google Gemini API using their native SDK.

**Alternatives I considered:** LangChain, LlamaIndex, or hosting a local open-source model (like Llama 3) via vLLM.

**Why I chose this for the MVP:** Frameworks like LangChain add massive dependency bloat and unnecessary abstraction layers for simple prompt-response interactions. Calling Gemini directly allowed me to rapidly iterate on system prompts and parse JSON outputs without wrestling with framework-specific bugs.

**What breaks at scale / the real cost:** The application is tightly coupled to Gemini. If we hit severe rate limits, cost issues, or want to route simpler tasks to a cheaper model (like Claude Haiku), we have to manually rewrite the API wrappers and parsing logic.

**What I'd do in production:** Implement a centralized AI gateway (e.g., LiteLLM or an internal abstraction layer) that normalizes prompts and handles intelligent routing, fallbacks, and rate-limiting across multiple model providers.

---

## Decision 5: Database ORM

**What I chose:** Prisma ORM.

**Alternatives I considered:** Raw SQL via pg, Knex.js, or Kysely.

**Why I chose this for the MVP:** Prisma provides unparalleled developer experience. The type-safety, auto-generated migrations, and intuitive schema definition allowed me to spin up the entire data model in minutes. It completely eliminated a class of bugs related to incorrect typing.

**What breaks at scale / the real cost:** Prisma translates its intuitive syntax into exceptionally complex and often unoptimized SQL queries under the hood. At high query concurrency (e.g., beyond 5,000 analytics dashboard loads/min), Prisma's query engine consumes excessive CPU and can lock tables inefficiently.

**What I'd do in production:** Retain Prisma for simple CRUD operations and schema management, but bypass it using raw SQL or Kysely for high-volume ingestion routes (like the webhook receipt API) and complex analytical aggregations.

---

## Decision 6: Frontend Framework

**What I chose:** Next.js App Router (React).

**Alternatives I considered:** Vite + React (SPA), Remix, or Vue/Nuxt.

**Why I chose this for the MVP:** Next.js is the industry standard for React apps, offering seamless server-side rendering, built-in API routes, and a highly structured file-based router. It allowed me to rapidly build a full-stack feeling frontend without worrying about client-side routing libraries.

**What breaks at scale / the real cost:** Next.js App Router is notoriously heavy and cache-aggressive. As the application scales in dynamic complexity, managing the strict server/client boundary and mitigating hydration mismatches slows down feature development and increases frontend build times beyond 10+ minutes.

**What I'd do in production:** Stick with Next.js but aggressively optimize the `export` boundaries, utilize edge rendering for dynamic pages, and potentially move heavy data-fetching entirely to the backend API rather than Next.js server components.

---

## Decision 7: Deployment Infrastructure

**What I chose:** Vercel for the Frontend, Railway for the Backend and Channel Services.

**Alternatives I considered:** AWS EKS (Kubernetes), AWS EC2, or Render.

**Why I chose this for the MVP:** Vercel and Railway offer zero-configuration deployments via GitHub hooks. Setting up Dockerfiles, VPCs, load balancers, and CI/CD pipelines in AWS would have consumed hours that were better spent building core application features.

**What breaks at scale / the real cost:** These PaaS providers have steep pricing curves and lack deep network isolation. With 3+ backend replicas, we cannot securely place the backend and database within a private subnet (VPC) that is completely shielded from the public internet.

**What I'd do in production:** Containerize all services using Docker and orchestrate them using Kubernetes (AWS EKS) or ECS. This ensures absolute control over networking, auto-scaling rules, and infrastructure costs.

---

## Decision 8: Database Selection

**What I chose:** Supabase (PostgreSQL).

**Alternatives I considered:** MongoDB (NoSQL) or AWS DynamoDB.

**Why I chose this for the MVP:** Relational data structures inherently fit a CRM (Tenants -> Campaigns -> Communications). PostgreSQL offers strong ACID guarantees, and Supabase provided a free, instantly accessible cloud database without any complex setup.

**What breaks at scale / the real cost:** PostgreSQL is a single-writer system. At 10k+ webhook callbacks per second, the database will experience severe write contention and connection pool exhaustion, leading to connection timeouts.

**What I'd do in production:** Shard the PostgreSQL database by Tenant ID, implement PgBouncer for efficient connection pooling, and potentially offload webhook ingestion writes to a fast NoSQL datastore (like DynamoDB) before periodically batch-syncing them to PostgreSQL.

---

## Decision 9: Webhook Security

**What I chose:** HMAC-SHA256 signatures with a shared secret in environment variables.

**Alternatives I considered:** Mutual TLS (mTLS), or OAuth 2.0 client credentials.

**Why I chose this for the MVP:** HMAC-SHA256 provides excellent payload integrity and authentication without the immense operational overhead of managing certificates (mTLS) or building an OAuth token exchange flow.

**What breaks at scale / the real cost:** We use a single shared symmetric secret. If the channel service's environment variables are compromised, an attacker can spoof identical signatures. Furthermore, there is no key rotation mechanism built in, risking long-term exposure.

**What I'd do in production:** Implement asymmetric cryptography (e.g., signing with a private RSA key and verifying with a public key) and enforce automated key rotation policies. For absolute zero-trust, implement mTLS between the CRM and the channel providers.

---

## Decision 10: Frontend State Management

**What I chose:** React Context API and local `useState`.

**Alternatives I considered:** Redux Toolkit or Zustand.

**Why I chose this for the MVP:** The application state (mostly just the active tenant profile and UI toggle states) was simple enough that adding a third-party global state manager felt like overkill. React Context handles authentication state natively and cleanly.

**What breaks at scale / the real cost:** React Context forces a re-render of all consumer components whenever the context value changes. If we start storing high-frequency updates (e.g., real-time campaign dispatch progress at 100ms intervals) in Context, the entire dashboard will re-render, causing severe UI frame drops.

**What I'd do in production:** Migrate to Zustand for global state management. Zustand allows for atomic selector-based updates, ensuring only the specific UI components that rely on the changed data re-render.

---

## Decision 11: UI Component Library

**What I chose:** Shadcn UI + Tailwind CSS.

**Alternatives I considered:** Material UI (MUI), Chakra UI, or plain CSS modules.

**Why I chose this for the MVP:** Shadcn provides beautifully designed, accessible components that are copied directly into the source code, giving me 100% control over the styling without the massive bundle size bloat of a library like MUI. Tailwind allowed for rapid inline styling.

**What breaks at scale / the real cost:** Because components are copied directly into the codebase, maintaining them becomes a manual chore across multiple projects or large teams. If Shadcn issues a critical accessibility fix, we have to manually track down and patch our local version instead of just bumping an npm package version.

**What I'd do in production:** Continue using Shadcn/Tailwind, but strictly enforce a design token system within `tailwind.config.js` and extract all customized Shadcn components into a standalone, version-controlled internal UI library (e.g., published to a private npm registry) to enforce consistency.

---

## Decision 12: MCP Server Transport

**What I chose:** StreamableHTTP transport via Express for the Model Context Protocol servers.

**Alternatives I considered:** Standard I/O (stdio) or WebSockets.

**Why I chose this for the MVP:** Stdio is difficult to debug and deploy in a cloud PaaS environment like Railway, which natively expects an HTTP server listening on a port. StreamableHTTP over Express allowed me to effortlessly deploy the MCP server and attach standard health-check routes for the platform.

**What breaks at scale / the real cost:** HTTP is request-response driven. To maintain a stateful context or stream updates dynamically from the AI back to the client, HTTP forces inefficient polling or long-lived connection buffering, leading to connection exhaustion at 5,000+ concurrent clients.

**What I'd do in production:** Migrate the MCP transport layer to WebSockets. WebSockets provide a true bi-directional, low-latency persistent connection, which is significantly more efficient for high-throughput, real-time AI tool calling.
