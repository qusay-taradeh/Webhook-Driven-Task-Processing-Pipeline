import fs from "fs";
import os from "os";
import path from "path";
import { z } from "zod";
import type { MigrationConfig } from "drizzle-orm/migrator";
import { loadEnvFile } from "process";

loadEnvFile();

const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/lib/db/migrations",
};

type APIConfig = {
  fileserverHits: number;
  migrationConfig: MigrationConfig;
  platform: string;
  secretKey: string;
  polkaKey: string;
};

const platformEnv = process.env.PLATFORM as string;

const secretKeyEnv = process.env.SECRET as string;

const polkaKeyEnv = process.env.POLKA_KEY as string;

export const apiConfig: APIConfig = {
  fileserverHits: 0,
  migrationConfig: migrationConfig,
  platform: platformEnv,
  secretKey: secretKeyEnv,
  polkaKey: polkaKeyEnv,
};

const ConfigSchema = z.object({
  dbUrl: z.string(),
  currentUserName: z.string(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function setUser(name: string) {
  const config = readConfig();

  config.currentUserName = name;

  writeConfig(config);

  console.log(
    `Config File Updated, Current User Name successfully has been set to ${name}`,
  );
}

export function readConfig(): Config {
  const filePath = getConfigFilePath();

  try {
    const jsonString = fs.readFileSync(filePath, "utf8");

    if (jsonString !== "") {
      const validatedConfig = validateConfig(jsonString);
      return validatedConfig;
    }
  } catch (err) {
    console.error("Error reading file:", err);
  }

  return { dbUrl: "", currentUserName: "" };
}

function getConfigFilePath(): string {
  const homeDir = os.homedir();
  const fullPath = path.join(homeDir, ".webhookconfig.json");
  return fullPath;
}

function writeConfig(cfg: Config): void {
  const jsonObject = JSON.stringify(cfg);
  const filePath = getConfigFilePath();

  try {
    fs.writeFileSync(filePath, jsonObject, "utf8");
    console.log("File written successfully.");
  } catch (err) {
    console.error("Error writing file:", err);
  }
}

function validateConfig(rawConfig: any): Config {
  try {
    const config: Config = ConfigSchema.parse(JSON.parse(rawConfig));
    return config;
  } catch (error) {
    console.error("Validation failed:", error);
    return { dbUrl: "", currentUserName: "" };
  }
}
