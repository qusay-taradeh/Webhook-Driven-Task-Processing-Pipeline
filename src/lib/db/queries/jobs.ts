import { db } from "../index.js";
import { jobs } from "../schema.js";
import { eq, desc } from "drizzle-orm";

export type NewJob = typeof jobs.$inferInsert;

export async function createJob(job: NewJob) {
  const [result] = await db
    .insert(jobs)
    .values(job)
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function getJobByID(jobID: string) {
  const [result] = await db.select().from(jobs).where(eq(jobs.id, jobID));
  return result;
}

// to update the job as it moves through the queue
export async function updateJob(
  jobID: string,
  updates: Partial<{
    status: "pending" | "processing" | "completed" | "failed" | "retrying";
    processedResult: any;
    attempts: number;
    errorLog: string;
  }>,
) {
  const [result] = await db
    .update(jobs)
    .set({ ...updates })
    .where(eq(jobs.id, jobID))
    .returning();
  return result;
}

//to fetch all jobs for a specific pipeline (Job History) Most recent first
export async function getJobsByPipelineID(pipelineID: string) {
  const result = await db
    .select()
    .from(jobs)
    .where(eq(jobs.pipelineId, pipelineID))
    .orderBy(desc(jobs.createdAt));
  return result;
}
