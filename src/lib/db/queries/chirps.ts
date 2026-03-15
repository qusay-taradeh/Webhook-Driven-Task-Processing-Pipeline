import { db } from "../index.js";
import { chirps, users } from "../schema.js";
import { asc, eq, and } from "drizzle-orm";

export type NewChirp = typeof chirps.$inferInsert;

export async function createChirp(chirp: NewChirp) {
  const [result] = await db
    .insert(chirps)
    .values(chirp)
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function getChirps() {
  const result = await db.select().from(chirps).orderBy(asc(chirps.createdAt));
  return result;
}

export async function getChirpById(chirpId: string) {
  const [result] = await db.select().from(chirps).where(eq(chirps.id, chirpId));
  return result;
}

export async function getChirpsForUser(userID: string) {
  const result = await db.select().from(chirps).where(eq(chirps.userId, userID));
  return result;
}

export async function deleteChirpById(chirpId: string, userID: string) {
  await db.delete(chirps).where(and(eq(chirps.id, chirpId), eq(chirps.userId, userID)));
}

export async function truncateChirps() {
    await db.execute(`TRUNCATE TABLE chirps CASCADE;`);
}