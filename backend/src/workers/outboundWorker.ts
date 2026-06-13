/**
 * @file outboundWorker.ts
 * @description
 * BullMQ Worker responsible for processing outbound communications.
 * It pulls 'PENDING' jobs from the Redis queue and dispatches them via 
 * the channel MCP client (HTTP). Implements concurrency control (50 msgs/sec),
 * rate limiting, and exponential retry/DLQ logic for resilience.
 */
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { sendViaChannel } from '../config/channelMcpClient';
import prisma from '../config/prisma';

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

export const outboundWorker = new Worker(
  'outbound-dispatch',
  async (job: Job) => {
    const { payload, recordId } = job.data;
    
    try {
      // Execute the MCP call
      await sendViaChannel(payload);

      // Successfully dispatched - channel service will handle async simulation
      // We can optionally mark it as "DISPATCHED" or "QUEUED" here, but the channel 
      // service immediately fires callbacks, so we rely on those.
    } catch (err: any) {
      // If we fail to even reach the channel service, log error and rethrow to trigger BullMQ retries
      console.error(`[Worker] Failed to dispatch communication ${recordId} to MCP:`, err.message);
      
      // Optionally update DB with transient error before retry
      await prisma.communication.update({
        where: { id: recordId },
        data: { errorMsg: `Dispatch attempt failed: ${err.message}` }
      });
      
      throw err;
    }
  },
  {
    connection: connection as any,
    concurrency: 50, // Process 50 messages concurrently
    limiter: {
      max: 1000,
      duration: 1000 // Max 1000 jobs per second rate limit
    }
  }
);

outboundWorker.on('failed', async (job, err) => {
  if (job) {
    console.error(`[Worker] Job ${job.id} completely failed after retries:`, err.message);
    
    // Dead Letter Handling: If all retries fail, update status to FAILED
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      await prisma.communication.updateMany({
        where: { id: job.data.recordId, statusLevel: { lt: 6 } }, // FAILED precedence
        data: { status: 'FAILED', statusLevel: 6, errorMsg: 'Max retries exhausted for MCP dispatch.' }
      });
      
      await prisma.communicationEvent.create({
        data: {
          communicationId: job.data.recordId,
          status: 'FAILED',
          providerPayload: { error: 'Max retries exhausted for MCP dispatch' }
        }
      });
    }
  }
});
