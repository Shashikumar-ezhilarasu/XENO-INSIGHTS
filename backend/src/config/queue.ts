import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// Use REDIS_URL or fallback to local redis
const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

export const campaignDispatchQueue = new Queue('outbound-dispatch', { connection: connection as any });

export const queueEvents = new QueueEvents('outbound-dispatch', { connection: connection as any });

queueEvents.on('completed', ({ jobId }) => {
  // console.log(`[Queue] Job ${jobId} completed successfully.`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[Queue] Job ${jobId} failed: ${failedReason}`);
});
