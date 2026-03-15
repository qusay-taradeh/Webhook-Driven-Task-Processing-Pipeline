import { db } from "../index.js";
import { jobs } from "../schema.js";
import { eq } from "drizzle-orm";

export type NewJob = typeof jobs.$inferInsert;

export async function createPipeline(job: NewJob) {
  const [result] = await db
    .insert(jobs)
    .values(job)
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function getPipelineByID(jobID: string) {
  const [result] = await db.select().from(jobs).where(eq(jobs.id, jobID));
  return result;
}
