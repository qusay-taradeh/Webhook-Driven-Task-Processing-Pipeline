import { db } from "../index.js";
import { refreshTokens, users } from "../schema.js";
import { asc, eq } from "drizzle-orm";

export type NewRefreshToken = typeof refreshTokens.$inferInsert;

export async function createRefreshToken(refreshToken: NewRefreshToken) {
  const [result] = await db
    .insert(refreshTokens)
    .values(refreshToken)
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function getRefreshTokenByToken(token: string) {
  const [result] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token));
  return result;
}

export async function markRefreshTokenRevoked(refreshToken: NewRefreshToken) {
    await db.update(refreshTokens).set({
        revokedAt: new Date()
    }).where(eq(refreshTokens.token, refreshToken.token));
}
