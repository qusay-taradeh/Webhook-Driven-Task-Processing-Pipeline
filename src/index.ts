import express from "express";
import { apiConfig } from "./config.js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import "./lib/queue/worker.js";
import {
  middlewareMetricsInc,
  handlerMetrics,
  handlerReset,
  handlerCreateUser,
  handlerLogin,
  handlerPostPipelines,
  handlerGetPipelines,
  handlerRefresh,
  handlerRevoke,
  handlerUpdate,
  handlerIngestWebhook,
  handlerGetPipelineJobs,
  handlerGetJobStatus,
  errorHandler,
} from "./handlers.js";

async function main() {
  // to keep the database up-to-date whenever the server start
  const migrationClient = postgres(apiConfig.dbURL, { max: 1 });
  await migrate(drizzle(migrationClient), apiConfig.migrationConfig);

  const app = express();

  // for GCP
  const PORT = apiConfig.connectionPort;

  // To send JSON responses
  app.use(express.json());

  // To record the number of hits
  app.get("/", middlewareMetricsInc);

  app.use("/", express.static("./src/app"));

  // To log the /app hits count
  app.get("/admin/metrics", async (req, res, next) => {
    try {
      await handlerMetrics(req, res);
    } catch (err) {
      next(err); // Pass the error to Express
    }
  });

  // Delete all users, and set file server hits count to zero
  app.post("/admin/reset", async (req, res, next) => {
    try {
      await handlerReset(req, res);
    } catch (err) {
      next(err);
    }
  });

  // Register a user
  app.post("/api/users", async (req, res, next) => {
    try {
      await handlerCreateUser(req, res);
    } catch (err) {
      next(err);
    }
  });

  // Login a user
  app.post("/api/login", async (req, res, next) => {
    try {
      await handlerLogin(req, res);
    } catch (err) {
      next(err);
    }
  });

  // To make a new JWT for a provided valid refresh token, which is the Bearer Token of the Authorization Header
  app.post("/api/refresh", async (req, res, next) => {
    try {
      await handlerRefresh(req, res);
    } catch (err) {
      next(err);
    }
  });

  // To Revoke a provided valid refresh token, which is the Bearer Token of the Authorization Header
  app.post("/api/revoke", async (req, res, next) => {
    try {
      await handlerRevoke(req, res);
    } catch (err) {
      next(err);
    }
  });

  // To update user's email and password, using the provided Bearer Token as JWT token
  app.put("/api/users", async (req, res, next) => {
    try {
      await handlerUpdate(req, res);
    } catch (err) {
      next(err);
    }
  });

  // To create a job for exist pipline related to sourceEndpoint
  app.post("/api/webhooks/:sourceEndpoint", async (req, res, next) => {
    try {
      await handlerIngestWebhook(req, res);
    } catch (err) {
      next(err);
    }
  });

  // To create a new pipeline
  app.post("/api/pipelines", async (req, res, next) => {
    try {
      await handlerPostPipelines(req, res);
    } catch (err) {
      next(err);
    }
  });

  // To get a user's pipelines
  app.get("/api/pipelines", async (req, res, next) => {
    try {
      await handlerGetPipelines(req, res);
    } catch (err) {
      next(err);
    }
  });

  // Get history of all jobs for a pipeline
  app.get("/api/pipelines/:pipelineId/jobs", async (req, res, next) => {
    try {
      await handlerGetPipelineJobs(req, res);
    } catch (err) {
      next(err);
    }
  });

  // Get exact status and delivery attempts of a specific job
  app.get("/api/jobs/:jobId", async (req, res, next) => {
    try {
      await handlerGetJobStatus(req, res);
    } catch (err) {
      next(err);
    }
  });

  // To use the overall errors handler when an error occurs
  app.use(errorHandler);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

await main();
