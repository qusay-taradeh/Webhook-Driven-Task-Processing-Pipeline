import { Worker, Job } from "bullmq";
import { redisConnection } from "./index.js";
import { updateJob } from "../db/queries/jobs.js";
import { getPipelineByID } from "../db/queries/pipelines.js";
import { getSubscribersByPipelineID } from "../db/queries/subscribers.js";
import crypto from "crypto";

// THE 6 PROCESSING ACTIONS
function processData(actionType: string, payload: any) {
  let processed = { ...payload };

  switch (actionType) {
    case "DATA_MASKING":
      // Action 1: Replaces 'email' and 'password' fields with asterisks if they exist
      if (processed.email) processed.email = "***@***.***";
      if (processed.password) processed.password = "********";
      if (processed.ssn) processed.ssn = "***-**-****";
      break;

    case "ADD_METADATA":
      // Action 2: Enriches the payload with a processing timestamp and server info
      processed._webhook_metadata = {
        processedAt: new Date().toISOString(),
        server: "Node-BullMQ-Worker",
      };
      break;

    case "FLATTEN_PAYLOAD":
      // Action 3: Takes a nested "data" object and flattens it to the top level
      if (processed.data && typeof processed.data === "object") {
        processed = { ...processed, ...processed.data };
        delete processed.data;
      }
      break;

    case "REMOVE_NULLS":
      // Action 4: Iterates through root keys and deletes any that are null or undefined
      for (const key in processed) {
        if (processed[key] === null || processed[key] === undefined) {
          delete processed[key];
        }
      }
      break;

    case "HASH_IDENTIFIERS":
      // Action 5: Replaces email and userId with secure one-way hashes
      if (processed.email) {
        processed.email_hash = crypto
          .createHash("sha256")
          .update(processed.email)
          .digest("hex");
        delete processed.email;
      }
      if (processed.userId) {
        processed.userId_hash = crypto
          .createHash("sha256")
          .update(String(processed.userId))
          .digest("hex");
        delete processed.userId;
      }
      break;

    case "SUMMARIZE_PAYLOAD":
      // Action 6: Throws away the heavy payload and forwards a lightweight summary
      const keyCount = Object.keys(processed).length;
      processed = {
        _summary: `Payload reduced. Originally contained ${keyCount} root keys.`,
        _original_event: processed.event || "unknown_event",
        _received_at: new Date().toISOString(),
      };
      break;

    default:
      // If action type is unknown, just pass the data through unchanged
      break;
  }
  return processed;
}

// THE WORKER LOGIC
export const webhookWorker = new Worker(
  "webhook-pipeline",
  async (job: Job) => {
    const { dbJobId, pipelineId, payload } = job.data;
    console.log(`[Worker] Picked up Job ID: ${dbJobId}`);

    try {
      // Mark job as processing in Postgres
      await updateJob(dbJobId, { status: "processing" });

      // Fetch Pipeline config and its Subscribers
      const pipeline = await getPipelineByID(pipelineId);
      const subscribers = await getSubscribersByPipelineID(pipelineId);

      if (!pipeline) throw new Error("Pipeline not found in DB");
      if (subscribers.length === 0)
        throw new Error("No subscribers found for this pipeline");

      // Apply the transformation
      const processedResult = processData(pipeline.actionType, payload);

      // DELIVERY TO SUBSCRIBERS
      // We map over the subscribers and send a POST request to each one
      const deliveryPromises = subscribers.map(async (sub) => {
        const response = await fetch(sub.targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(processedResult),
        });

        if (!response.ok) {
          throw new Error(
            `Subscriber ${sub.targetUrl} responded with status ${response.status}`,
          );
        }
      });

      // Wait for all deliveries to finish
      await Promise.all(deliveryPromises);

      // If we reach here, all deliveries succeeded! Mark as complete.
      await updateJob(dbJobId, {
        status: "completed",
        processedResult,
        attempts: job.attemptsMade + 1,
      });
      console.log(`[Worker] Successfully completed Job ID: ${dbJobId}`);
    } catch (error: any) {
      console.error(`[Worker] Job ${dbJobId} failed:`, error.message);

      // RETRY LOGIC TRACKING
      // BullMQ handles the actual retry delay, but we want to log the failure in Postgres
      const isLastAttempt = job.attemptsMade >= (job.opts.attempts || 1) - 1;

      await updateJob(dbJobId, {
        status: isLastAttempt ? "failed" : "retrying",
        errorLog: error.message,
        attempts: job.attemptsMade + 1,
      });

      // throw the error so BullMQ knows the job failed and will trigger a retry
      throw error;
    }
  },
  {
    connection: redisConnection,
    // limit how many jobs process at the exact same time
    concurrency: 5,
  },
);

// Worker Event Listeners for debugging
webhookWorker.on("completed", (job) =>
  console.log(`Job ${job.id} has completed!`),
);
webhookWorker.on("failed", (job, err) =>
  console.log(`Job ${job?.id} has failed with ${err.message}`),
);
