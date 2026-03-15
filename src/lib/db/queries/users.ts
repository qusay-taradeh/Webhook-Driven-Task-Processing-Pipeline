import { db } from "../index.js";
import { users } from "../schema.js";
import { eq } from "drizzle-orm";

export type NewUser = typeof users.$inferInsert;

export async function createUser(user: NewUser) {
  const [result] = await db
    .insert(users)
    .values(user)
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function getUserByEmail(email: string) {
  const [result] = await db.select().from(users).where(eq(users.email, email));
  return result;
}

export async function getUserByID(userID: string) {
  const [result] = await db.select().from(users).where(eq(users.id, userID));
  return result;
}

export async function updateUser(
  userID: string,
  email: string,
  hashedPassword: string,
) {
  const [result] = await db
    .update(users)
    .set({
      email: email,
      hashedPassword: hashedPassword,
    })
    .where(eq(users.id, userID))
    .returning();

  return result;
}

export async function truncateUsers() {
  await db.execute(`TRUNCATE TABLE users CASCADE;`);
}
