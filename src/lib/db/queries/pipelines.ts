import { db } from "../index.js";
import { pipelines } from "../schema.js";
import { eq } from "drizzle-orm";

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
