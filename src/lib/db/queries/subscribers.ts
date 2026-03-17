import { db } from "../index.js";
import { subscribers } from "../schema.js";
import { eq } from "drizzle-orm";

export type NewSubscriber = typeof subscribers.$inferInsert;

export async function createSubscriber(subscriber: NewSubscriber) {
  const [result] = await db
    .insert(subscribers)
    .values(subscriber)
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function getSubscriberByID(subscriberID: string) {
  const [result] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.id, subscriberID));
  return result;
}

// Fetch all subscribers for a specific pipeline
export async function getSubscribersByPipelineID(pipelineID: string) {
  const result = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.pipelineId, pipelineID));
  return result;
}
