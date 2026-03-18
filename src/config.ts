import type { MigrationConfig } from "drizzle-orm/migrator";
import { loadEnvFile } from "process";

// Wrap in try/catch so Docker doesn't crash when .env is missing
try {
  loadEnvFile();
} catch {
  console.log(
    "No .env file found. Relying on system environment variables (Docker mode).",
  );
}

const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/lib/db/migrations",
};

type APIConfig = {
  fileserverHits: number;
  migrationConfig: MigrationConfig;
  platform: string;
  secretKey: string;
  dbURL: string;
};

const dbURLEnv = process.env.DATABASE_URL || "";
const platformEnv = process.env.PLATFORM || "dev";
const secretKeyEnv = process.env.SECRET || "";

export const apiConfig: APIConfig = {
  fileserverHits: 0,
  migrationConfig: migrationConfig,
  platform: platformEnv,
  secretKey: secretKeyEnv,
  dbURL: dbURLEnv,
};
