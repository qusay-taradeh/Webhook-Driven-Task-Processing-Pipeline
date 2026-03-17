import * as argon2 from "argon2";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Request } from "express";
import { UnauthorizedError } from "../errors.js";
import { randomBytes } from "node:crypto";
import {
  createRefreshToken,
  NewRefreshToken,
} from "./db/queries/refreshTokens.js";

// Function to hash a password
export async function hashPassword(password: string): Promise<string> {
  try {
    // The hash function generates a salt automatically and returns a PHC formatted string
    const hash = await argon2.hash(password);
    return hash;
  } catch (err) {
    console.error("Error hashing password:", err);
    throw err;
  }
}

// Function to verify a password
export async function verifyPassword(
  hashedPassword: string,
  inputPassword: string,
): Promise<boolean> {
  try {
    // The verify function extracts the salt, parameters, and hash from the stored string
    const isVerified = await argon2.verify(hashedPassword, inputPassword);
    return isVerified;
  } catch (err) {
    console.error("Error verifying password:", err);
    throw err;
  }
}

type Payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

export function makeJWT(
  userID: string,
  expiresIn: number,
  secret: string,
): string {
  const currentSeconds = Math.floor(Date.now() / 1000); // Current Time in seconds

  const payload: Payload = {
    iss: "express_server",
    sub: userID,
    iat: currentSeconds,
    exp: currentSeconds + expiresIn,
  };

  const token = jwt.sign(payload, secret);

  return token;
}

export function validateJWT(tokenString: string, secret: string): string {
  const isVerified = jwt.verify(tokenString, secret);

  if (typeof isVerified === "string")
    throw new Error("Invalid token: could not decode payload");

  if (!isVerified.sub)
    throw new Error("Invalid token: sub (userID) is missing");

  return isVerified.sub as string;
}

export function getBearerToken(req: Request): string {
  const authHeader = req.get("Authorization"); // format Authorization: Bearer <token>
  const regex = new RegExp(`Bearer\\s`, "g");

  if (!authHeader) throw new UnauthorizedError("Authorization Does not Exist");

  const bearerToken = authHeader.replace(regex, "");

  return bearerToken;
}

export async function makeRefreshToken(userID: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt60Days = new Date(Date.now() + 60 * 24 * (3600 * 1000)); // 1 hour = 3600 sec. ==> 60 days later
  const refreshToken: NewRefreshToken = {
    userId: userID,
    token: token,
    expiresAt: expiresAt60Days,
  };

  const newRefreshToken = await createRefreshToken(refreshToken);

  return newRefreshToken;
}
