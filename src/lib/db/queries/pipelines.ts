import { db } from "../index.js";
import { pipelines, subscribers } from "../schema.js";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";

export type NewPipeline = typeof pipelines.$inferInsert;

export async function createPipeline(pipeline: NewPipeline) {
  const [result] = await db
    .insert(pipelines)
    .values(pipeline)
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function getPipelineByID(pipelineID: string) {
  const [result] = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.id, pipelineID));
  return result;
}

export async function getPipelineBySource(sourceEndpoint: string) {
  const [result] = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.sourceEndpoint, sourceEndpoint));
  return result;
}

// Transaction to create a pipeline and its subscribers together
export async function createPipelineWithSubscribers(
  userId: string,
  name: string,
  actionType: string,
  targetUrls: string[],
) {
  return await db.transaction(async (tx) => {
    const sourceEndpoint = `wh_${randomBytes(8).toString("hex")}`;

    // Insert pipeline
    const [newPipeline] = await tx
      .insert(pipelines)
      .values({
        userId,
        name,
        sourceEndpoint,
        actionType,
      })
      .returning();

    // Prepare and insert subscribers
    const subscriberData = targetUrls.map((url) => ({
      pipelineId: newPipeline.id,
      targetUrl: url,
    }));

    await tx.insert(subscribers).values(subscriberData);

    return newPipeline;
  });
}

// The JOIN query for GET /api/pipelines
export async function getUserPipelines(userID: string) {
  const result = await db
    .select()
    .from(pipelines)
    .innerJoin(subscribers, eq(pipelines.id, subscribers.pipelineId))
    .where(eq(pipelines.userId, userID));

  return result;
}
