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
  hashPassword,
  verifyPassword,
  makeJWT,
  validateJWT,
  getBearerToken,
  makeRefreshToken,
  getAPIKey,
} from "./lib/auth.js";

export function middlewareLogResponses(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.on("finish", () => {
    const statusCode = res.statusCode;
    if (statusCode !== 200) {
      console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${statusCode}`);
    }
  });

  next();
}

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
  apiConfig.fileserverHits = 0;
  await truncateUsers();

  if (apiConfig.platform !== "dev") {
    // check Platform
    throw new ForbiddenError('Platform should equals "dev"');
  }

  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send(`All users Deleted`);
}

export async function handlerPostChirps(req: Request, res: Response) {
  type parameters = {
    // focusing on "body" section of the JSON
    body: string;
  };

  const params: parameters = req.body;

  const bearerToken = getBearerToken(req);

  const userID = validateJWT(bearerToken, apiConfig.secretKey); // If its not valid it will automatically throws error

  if (!params.body) {
    throw new NotFoundError("Expected body section to be exist");
  } else if (params.body.length <= 140) {
    const profaneWords = ["kerfuffle", "sharbert", "fornax"];

    const bodyWords = params.body.split(" "); // Splitting the words based on the single space between them

    const respWords = [];

    for (let index = 0; index < bodyWords.length; index++) {
      const word = bodyWords[index];

      if (profaneWords.includes(word.toLowerCase())) {
        // check if the word is profane or not
        // let asterisks = "";

        // for (let index = 0; index < word.length; index++) {   // prepare asterisks with same length of the profane word
        //   asterisks += "*";
        // }

        let asterisks = "****";

        respWords.push(asterisks);
      } else {
        respWords.push(word);
      }
    }

    const cleanedBody = respWords.join(" ");

    // const chirp: NewChirp = { body: cleanedBody, userId: userID };

    // const newChirp = await createChirp(chirp);

    // res.status(201).json(newChirp);
    res.status(201).json({ message: "created" });
  } else {
    throw new BadRequestError("Chirp is too long. Max length is 140");
  }
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

    const jwtToken = makeJWT(foundUser.id, 3600, apiConfig.secretKey);

    const refreshToken = await makeRefreshToken(foundUser.id);

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

  const jwtToken = makeJWT(foundRefreshToken.userId, 3600, apiConfig.secretKey);

  res.status(200).json({ token: jwtToken });
}

export async function handlerRevoke(req: Request, res: Response) {
  const refreshToken = getBearerToken(req);

  const foundRefreshToken = await getRefreshTokenByToken(refreshToken);

  if (!foundRefreshToken)
    throw new UnauthorizedError("Refresh Token Doesn't exist");

  await markRefreshTokenRevoked(foundRefreshToken);

  res.status(204).send("Refresh Token Revoked");
}

export async function handlerUpdate(req: Request, res: Response) {
  const bearerToken = getBearerToken(req);

  const userID = validateJWT(bearerToken, apiConfig.secretKey); // If its not valid it will automatically throws error

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

export async function handlerWebhooks(req: Request, res: Response) {
  type parameters = {
    // focusing on "event" and "data" sections of the JSON
    event: string;
    data: {
      userId: string;
    };
  };

  const params: parameters = req.body;

  const receivedApiKey = getAPIKey(req);

  if (receivedApiKey !== apiConfig.polkaKey)
    throw new UnauthorizedError("Invalid API Key");

  if (!params.event)
    throw new NotFoundError("Expected event section to be exist");

  if (params.event !== "user.upgraded")
    res.status(204).send("The event isn't upgrade type");
  else {
    // event = user.upgraded

    if (!params.data.userId)
      throw new NotFoundError(
        "Expected data section and userId subsection to be exist",
      );

    // const upgradedUser = await upgradeUsertoChirpyRed(params.data.userId);

    // if (!upgradedUser) throw new NotFoundError("User Not Found");

    res.status(204).json({});
  }
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
