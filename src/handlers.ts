import { Request, Response, NextFunction } from "express";
import { apiConfig } from "./config.js";
import {
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
} from "./errors.js";
import {
  NewUser,
  createUser,
  getUserByID,
  getUserByEmail,
  updateUser,
  truncateUsers,
} from "./lib/db/queries/users.js";
import {
  getRefreshTokenByToken,
  markRefreshTokenRevoked,
} from "./lib/db/queries/refreshTokens.js";
import {
  NewPipeline,
  getPipelineByID,
  getPipelineBySource,
  createPipelineWithSubscribers,
  getUserPipelines,
} from "./lib/db/queries/pipelines.js";
import {
  createJob,
  getJobByID,
  getJobsByPipelineID,
  NewJob,
} from "./lib/db/queries/jobs.js";
import { enqueueWebhookJob } from "./lib/queue/index.js";
import {
  hashPassword,
  verifyPassword,
  makeJWT,
  validateJWT,
  getBearerToken,
  makeRefreshToken,
} from "./lib/auth.js";

export function middlewareMetricsInc(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.on("finish", () => {
    apiConfig.fileserverHits++;
  });

  next();
}

export async function handlerMetrics(req: Request, res: Response) {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`
      <html>
    <body>
      <h1>Welcome, Webhook Admin</h1>
      <p>Webhook has been visited ${apiConfig.fileserverHits} times!</p>
    </body>
  </html>
  `);
}

export async function handlerReset(req: Request, res: Response) {
  if (apiConfig.platform !== "dev") {
    // check Platform
    throw new ForbiddenError('Platform should equals "dev"');
  }

  await truncateUsers();
  apiConfig.fileserverHits = 0;

  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send(`All users Deleted`);
}

export async function handlerPostPipelines(req: Request, res: Response) {
  const bearerToken = getBearerToken(req);
  const userID = validateJWT(bearerToken, apiConfig.secretKey);

  type parameters = {
    name: string;
    actionType: string;
    targetUrls: string[];
  };

  const params: parameters = req.body;

  if (
    !params.name ||
    !params.actionType ||
    !params.targetUrls ||
    params.targetUrls.length === 0
  ) {
    throw new BadRequestError(
      "Missing required fields or empty subscribers list.",
    );
  }

  const newPipeline = await createPipelineWithSubscribers(
    userID,
    params.name,
    params.actionType,
    params.targetUrls,
  );

  res.status(201).json({
    message: "Pipeline created successfully",
    pipeline: newPipeline,
    webhookUrl: `http://localhost:8080/api/webhooks/${newPipeline.sourceEndpoint}`,
  });
}

export async function handlerGetPipelines(req: Request, res: Response) {
  const bearerToken = getBearerToken(req);
  const userID = validateJWT(bearerToken, apiConfig.secretKey);

  const userPipelines = await getUserPipelines(userID);

  if (!userPipelines) {
    throw new NotFoundError("Pipeline not found for this user.");
  }

  res.status(200).json(userPipelines);
}

type UserWithoutHashedPassword = Omit<NewUser, "hashedPassword">;

export async function handlerCreateUser(req: Request, res: Response) {
  type parameters = {
    // focusing on "email" and "password" sections of the JSON
    email: string;
    password: string;
  };

  const params: parameters = req.body;
  if (!params.email) {
    throw new NotFoundError("Expected email section to be exist");
  } else if (!params.password) {
    throw new NotFoundError("Expected password section to be exist");
  } else {
    const email = params.email;
    const password = params.password;

    const hashedPassword = await hashPassword(password);

    const user: NewUser = {
      email: email,
      hashedPassword: hashedPassword,
    };

    const newUser = await createUser(user);

    const returnedObject: UserWithoutHashedPassword = {
      id: newUser.id,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
      email: newUser.email,
    };

    res.status(201).json(returnedObject);
  }
}

export async function handlerLogin(req: Request, res: Response) {
  type parameters = {
    // focusing on "email" and "password" sections of the JSON
    email: string;
    password: string;
  };

  const params: parameters = req.body;
  if (!params.email) {
    throw new NotFoundError("Expected email section to be exist");
  } else if (!params.password) {
    throw new NotFoundError("Expected password section to be exist");
  } else {
    const email = params.email;
    const password = params.password;

    const foundUser = await getUserByEmail(email);

    if (!foundUser) throw new UnauthorizedError("incorrect email or password");

    const userHashedPassword = foundUser.hashedPassword;

    const isValid = await verifyPassword(
      userHashedPassword as string,
      password,
    );

    if (!isValid) throw new UnauthorizedError("incorrect email or password");

    const jwtToken = makeJWT(foundUser.id, 3600, apiConfig.secretKey); // make JWT (Access Token) that expires after 1 Hour.

    const refreshToken = await makeRefreshToken(foundUser.id); // make Refresh Token that expires after 60 Days.

    const returnedObject: UserWithoutHashedPassword & {
      token: string;
      refreshToken: string;
    } = {
      id: foundUser.id,
      createdAt: foundUser.createdAt,
      updatedAt: foundUser.updatedAt,
      email: foundUser.email,
      token: jwtToken,
      refreshToken: refreshToken.token,
    };

    res.status(200).json(returnedObject);
  }
}

export async function handlerRefresh(req: Request, res: Response) {
  const refreshToken = getBearerToken(req);

  const foundRefreshToken = await getRefreshTokenByToken(refreshToken);

  if (!foundRefreshToken)
    throw new UnauthorizedError("Refresh Token Doesn't exist");

  const elapsedInMs = foundRefreshToken.expiresAt.getTime();
  if (elapsedInMs <= Date.now())
    throw new UnauthorizedError("Refresh Token Expired");

  if (foundRefreshToken.revokedAt !== null)
    throw new UnauthorizedError("Refresh Token Revoked");

  const jwtToken = makeJWT(foundRefreshToken.userId, 3600, apiConfig.secretKey); // make new JWT for an hour.

  res.status(200).json({ token: jwtToken });
}

export async function handlerRevoke(req: Request, res: Response) {
  const refreshToken = getBearerToken(req);

  const foundRefreshToken = await getRefreshTokenByToken(refreshToken);

  if (!foundRefreshToken)
    throw new UnauthorizedError("Refresh Token Doesn't exist");

  await markRefreshTokenRevoked(foundRefreshToken);

  res.status(204).json({ status: "Refresh Token revoked successfully" });
}

export async function handlerUpdate(req: Request, res: Response) {
  const accessToken = getBearerToken(req);

  const userID = validateJWT(accessToken, apiConfig.secretKey); // If its not valid it will automatically throws error

  type parameters = {
    // focusing on "email" and "password" sections of the JSON
    email: string;
    password: string;
  };

  const params: parameters = req.body;
  if (!params.email) {
    throw new NotFoundError("Expected email section to be exist");
  } else if (!params.password) {
    throw new NotFoundError("Expected password section to be exist");
  } else {
    const email = params.email;
    const password = params.password;

    const foundUser = await getUserByID(userID);

    if (!foundUser) throw new UnauthorizedError("User Not Found");

    const hashedPassword = await hashPassword(password);

    const updatedUser = await updateUser(userID, email, hashedPassword);

    const returnedObject: UserWithoutHashedPassword = {
      id: updatedUser.id,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      email: updatedUser.email,
    };

    res.status(200).json(returnedObject);
  }
}

export async function handlerIngestWebhook(req: Request, res: Response) {
  // Get the dynamic endpoint string from the URL (for example: /api/webhooks/sourceEndpoint)
  const sourceEndpoint = req.params.sourceEndpoint;
  const rawPayload = req.body;

  let pipeline: NewPipeline;

  // Find the pipeline associated with this endpoint
  if (Array.isArray(sourceEndpoint)) {
    pipeline = await getPipelineBySource(sourceEndpoint[0]);
  } else {
    pipeline = await getPipelineBySource(sourceEndpoint);
  }

  if (!pipeline) {
    throw new NotFoundError("Pipeline not found for this endpoint.");
  }

  // Save the initial "pending" job to the database
  const newJob = await createJob({
    pipelineId: pipeline.id as string,
    status: "pending",
    incomingPayload: rawPayload,
  });

  // Push the task to the Redis Queue for background processing
  await enqueueWebhookJob(newJob.id, pipeline.id as string, rawPayload);

  // Respond immediately to the sender
  res.status(202).json({
    message: "Webhook received and queued for processing.",
    jobId: newJob.id,
  });
}

export async function handlerGetPipelineJobs(req: Request, res: Response) {
  const bearerToken = getBearerToken(req);
  const userID = validateJWT(bearerToken, apiConfig.secretKey);
  const pipelineId = req.params.pipelineId;

  let pipeline: NewPipeline;

  // Security Check: Verify the pipeline exists and the user owns it
  if (Array.isArray(pipelineId)) {
    pipeline = await getPipelineByID(pipelineId[0]);
  } else {
    pipeline = await getPipelineByID(pipelineId);
  }

  if (!pipeline) throw new NotFoundError("Pipeline not found");
  if (pipeline.userId !== userID)
    throw new ForbiddenError("You do not have access to this pipeline");

  let jobHistory: NewJob[];

  if (Array.isArray(pipelineId)) {
    jobHistory = await getJobsByPipelineID(pipelineId[0]);
  } else {
    jobHistory = await getJobsByPipelineID(pipelineId);
  }

  res.status(200).json(jobHistory);
}

export async function handlerGetJobStatus(req: Request, res: Response) {
  const bearerToken = getBearerToken(req);
  const userID = validateJWT(bearerToken, apiConfig.secretKey);
  const jobId = req.params.jobId;

  let job: NewJob;

  // Fetch the specific job
  if (Array.isArray(jobId)) {
    job = await getJobByID(jobId[0]);
  } else {
    job = await getJobByID(jobId);
  }

  if (!job) throw new NotFoundError("Job not found");

  // Security Check: Verify the user owns the pipeline this job belongs to
  const pipeline = await getPipelineByID(job.pipelineId);
  if (pipeline.userId !== userID)
    throw new ForbiddenError("You do not have access to this job");

  res.status(200).json({
    id: job.id,
    status: job.status,
    attempts: job.attempts,
    errorLog: job.errorLog,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    incomingPayload: job.incomingPayload,
    processedResult: job.processedResult,
  });
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.log(err.message);

  if (err instanceof BadRequestError) {
    res.status(400).json({
      error: err.message,
    });
  } else if (err instanceof UnauthorizedError) {
    res.status(401).send(err.message);
  } else if (err instanceof ForbiddenError) {
    res.status(403).send(err.message);
  } else if (err instanceof NotFoundError) {
    res.status(404).json({
      error: err.message,
    });
  } else if (err instanceof Error) {
    res.status(401).send(err.message);
  } else {
    res.status(500).send("Internal Server Error");
  }
}
