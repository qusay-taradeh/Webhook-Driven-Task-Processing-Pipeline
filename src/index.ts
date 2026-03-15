import express from "express";
import { apiConfig, readConfig } from "./config.js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  middlewareMetricsInc,
  middlewareLogResponses,
  handlerMetrics,
  handlerReset,
  handlerCreateUser,
  handlerLogin,
  handlerPostChirps,
  handlerGetChirps,
  handlerGetChirp,
  handlerDeleteChirp,
  handlerRefresh,
  handlerRevoke,
  handlerUpdate,
  handlerWebhooks,
  errorHandler,
} from "./handlers.js";

async function main() {
  // keep the database up-to-date whenever the server start
  const migrationClient = postgres(readConfig().dbUrl, { max: 1 });
  await migrate(drizzle(migrationClient), apiConfig.migrationConfig);

  const app = express();
  const PORT = 8080;

  app.use(express.json());

  app.get("/app", middlewareMetricsInc);

  app.use("/app", express.static("./src/app"));

  app.use(middlewareLogResponses);

  app.get("/admin/metrics", async (req, res, next) => {
    try {
      await handlerMetrics(req, res);
    } catch (err) {
      next(err); // Pass the error to Express
    }
  });

  app.post("/admin/reset", async (req, res, next) => {
    try {
      await handlerReset(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/users", async (req, res, next) => {
    try {
      await handlerCreateUser(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", async (req, res, next) => {
    try {
      await handlerLogin(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/chirps", async (req, res, next) => {
    try {
      await handlerPostChirps(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/chirps", async (req, res, next) => {
    try {
      await handlerGetChirps(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/chirps/:chirpId", async (req, res, next) => {
    try {
      await handlerGetChirp(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/chirps/:chirpId", async (req, res, next) => {
    try {
      await handlerDeleteChirp(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/refresh", async (req, res, next) => {
    try {
      await handlerRefresh(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/revoke", async (req, res, next) => {
    try {
      await handlerRevoke(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.put("/api/users", async (req, res, next) => {
    try {
      await handlerUpdate(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/polka/webhooks", async (req, res, next) => {
    try {
      await handlerWebhooks(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

await main();
