// ============================================================
// FUTURE ENHANCEMENT: In-Process Message Queue
// ============================================================
// This module implements a pure Node.js in-process job queue
// designed to be a drop-in replacement for BullMQ + Redis.
//
// CURRENT STATUS: Commented out for stable deployment.
// The cmsgpack Lua dependency in BullMQ is incompatible with
// ioredis-mock. A custom InProcessQueue was built as a workaround,
// but is deferred to avoid deployment risk on Railway.
//
// TO ENABLE IN FUTURE:
// 1. Uncomment this file
// 2. Uncomment worker registrations in config/workers.ts
// 3. Uncomment queue.add() calls in campaign.ts and webhook.ts
// 4. For production Redis: replace InProcessQueue with BullMQ
//    + real ioredis connection. No other files need to change.
// ============================================================

/*
import Redis from 'ioredis-mock';
import { Queue } from 'bullmq';

const redisConnection = new Redis({ maxRetriesPerRequest: null });

export const campaignDispatchQueue = new Queue('campaign-dispatch', { connection: redisConnection });
export const webhookProcessingQueue = new Queue('webhook-processing', { connection: redisConnection });
export const nudgeQueue = new Queue('nudge', { connection: redisConnection });

export { redisConnection };
*/

// Stub exports to prevent TypeScript compilation failures in unused imports
export const campaignDispatchQueue: any = null;
export const webhookProcessingQueue: any = null;
export const nudgeQueue: any = null;
export const redisConnection: any = null;
