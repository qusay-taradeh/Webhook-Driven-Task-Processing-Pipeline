import { defineConfig } from "drizzle-kit";
import { apiConfig } from "./src/config.ts";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: apiConfig.dbURL,
  },
});
