import { Queue } from "bullmq";
import { Redis } from "ioredis";

// Fetch the URL from Docker environment, fallback to localhost for local testing
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Connect to Redis
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
}) as any;

// Instantiate the Queue
export const webhookQueue = new Queue("webhook-pipeline", {
  connection: redisConnection,
});

// to add a job to the queue
export async function enqueueWebhookJob(
  dbJobId: string,
  pipelineId: string,
  rawPayload: any,
) {
  await webhookQueue.add(
    "process-webhook", // The name of the job
    {
      // Data section
      dbJobId,
      pipelineId,
      payload: rawPayload,
    },
    {
      // Options section
      attempts: 5, // BullMQ will automatically retry the job up to 5 times if it fails
      backoff: {
        type: "exponential", // To increase the delay time for each try
        delay: 2000, // Waits 2s, 4s, 8s, 16s between retries
      },
      removeOnComplete: true, // this is to keep Redis clean, we have our Postgres DB for history
    },
  );
  console.log(`Job ${dbJobId} added to Redis queue.`);
}
