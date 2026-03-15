import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword, makeJWT, validateJWT } from "./auth";

describe("Password Hashing and JWT", () => {
    const password1 = "correctPassword123!";
    const password2 = "anotherPassword456!";
    let hash1: string;
    let hash2: string;
    let jwtToken1: string;
    let jwtToken2: string;
    const userID1 = "userID1";
    const userID2 = "userID2";
    const secret1 = "$ecr3t1";
    const secret2 = "$ecr3t2";
    const expiresIn1 = 5;
    const expiresIn2 = 10;
    let jwtCreatedAt1: number;
    let jwtCreatedAt2: number;

    beforeAll(async () => {
        hash1 = await hashPassword(password1);
        hash2 = await hashPassword(password2);
        jwtToken1 = makeJWT(userID1, expiresIn1, secret1);
        jwtCreatedAt1 = Math.floor(Date.now() / 1000);
        jwtToken2 = makeJWT(userID2, expiresIn2, secret2);
        jwtCreatedAt2 = Math.floor(Date.now() / 1000);
    });

    it("should return true for the correct password", async () => {
        const result = await verifyPassword(hash1, password1);
        expect(result).toBe(true);
    });

    it("should return false for the incorrect password", async () => {
        const result = await verifyPassword(hash1, password2);
        expect(result).toBe(false);
    });

    // Correct secret -> returns userID
    it("should return userID1 for a valid token verified with correct secret", () => {
        const result = validateJWT(jwtToken1, secret1);
        expect(result).toBe(userID1);
    });

    // Wrong secret -> should throw, so we expect an error
    it("should throw when validating jwtToken1 with wrong secret", () => {
        expect(() => validateJWT(jwtToken1, secret2)).toThrow();
    });

    // Correct secret -> returns userID
    it("should return userID2 for a valid token verified with correct secret", () => {
        const result = validateJWT(jwtToken2, secret2);
        expect(result).toBe(userID2);
    });

    // Wrong secret -> should throw
    it("should throw when validating jwtToken2 with wrong secret", () => {
        expect(() => validateJWT(jwtToken2, secret1)).toThrow();
    });

    // Token is NOT expired yet (just created), so time elapsed < expiresIn
    it("jwtToken1 should not be expired immediately after creation", () => {
        const currentSeconds = Math.floor(Date.now() / 1000);
        const elapsed = currentSeconds - jwtCreatedAt1;
        expect(elapsed < expiresIn1).toBe(true);
    });

    it("jwtToken2 should not be expired immediately after creation", () => {
        const currentSeconds = Math.floor(Date.now() / 1000);
        const elapsed = currentSeconds - jwtCreatedAt2;
        expect(elapsed < expiresIn2).toBe(true);
    });
});