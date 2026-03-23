![badge](https://github.com/qusay-taradeh/Webhook-Driven-Task-Processing-Pipeline/actions/workflows/ci.yml/badge.svg)

![badge](https://github.com/qusay-taradeh/Webhook-Driven-Task-Processing-Pipeline/actions/workflows/cd.yml/badge.svg)

# Webhook-Driven Task Processing Pipeline

A robust, event-driven Node.js backend designed to ingest, transform, and securely dispatch high-volume webhook payloads. Built with strict TypeScript, queued via BullMQ, and fully containerized for serverless deployments on Google Cloud Run.

---

## 🏗 Architecture & Design Decisions

This system is built to handle asynchronous task processing without dropping payloads during traffic spikes.

- **Decoupled Ingestion & Processing:** The Express API acts purely as an ingestion layer. It immediately saves the incoming payload to PostgreSQL and pushes a job to Redis via BullMQ, responding to the client in milliseconds. A separate background worker asynchronously processes the queue.
- **Serverless Cloud Infrastructure:** The application is containerized via Docker and deployed to **Google Cloud Run**. This allows the service to scale automatically based on incoming HTTP traffic and scale to zero when idle.
- **Managed Data Layers:** Utilizes **Neon** (Serverless PostgreSQL) for persistent state (Jobs, Pipelines, Subscribers) and **Upstash** (Serverless Redis) for ultra-fast queue management.
- **Strict Type Safety:** End-to-end type safety using **TypeScript** and **Drizzle ORM** ensures database schemas and payload transformations remain strictly aligned.
- **Automated CI/CD:** GitHub Actions strictly enforces code formatting, linting, and testing on every PR. Merges to the `main` branch trigger an automated build via Google Cloud Build and deployment to Cloud Run.

---

## 📦 Required Libraries & Tech Stack

This project deliberately selects lightweight, modern, and type-safe libraries to maximize performance and developer experience.

- **Core Runtime:** Node.js (v22+), TypeScript
- **API Framework:** `express` (Minimalist web framework for fast ingestion)
- **Queue Management:** `bullmq` & `ioredis` (Industry standard for reliable, Redis-backed background jobs with built-in retry logic)
- **Database & ORM:** \* `drizzle-orm`: A lightweight, heavily typed ORM for SQL databases.
  - `postgres-js`: A fast, secure PostgreSQL client for Node.js.
- **Security & Quality Tooling:** \* `eslint` (v9 Flat Config): Enforces strict code quality.
  - `eslint-plugin-security`: Actively detects vulnerabilities like Prototype Pollution (e.g., Generic Object Injection Sinks) during the CI pipeline.
  - `prettier`: Ensures consistent code formatting.

---

## 📂 Project Structure

```text
├── .github/
│   └── workflows/          # CI/CD Pipelines (Tests, Linting, Cloud Run Deployment)
├── src/
│   ├── app/                # Static frontend assets (e.g., index.html)
│   ├── lib/
│   │   ├── auth.ts         # JWT generation and password hashing logic
│   │   ├── auth.test.ts    # Unit tests for authentication logic
│   │   ├── db/
│   │   │   ├── migrations/ # Drizzle-generated SQL migration files
│   │   │   ├── queries/    # Modular database query functions (users, jobs, etc.)
│   │   │   ├── index.ts    # Database connection and client setup
│   │   │   └── schema.ts   # Drizzle ORM table schemas
│   │   └── queue/
│   │       ├── index.ts    # BullMQ connection and queue setup
│   │       └── worker.ts   # BullMQ worker logic and transformation actions
│   ├── config.ts           # Centralized environment variables and secrets
│   ├── errors.ts           # Custom HTTP error classes
│   ├── handlers.ts         # Express route controllers
│   ├── index.ts            # Application entry point and Express server setup
│   └── test_requests.http  # REST Client test suite for all API endpoints
├── .dockerignore           # Files excluded from the Docker build context
├── .gitignore              # Files excluded from version control
├── .nvmrc                  # Node.js version manager configuration
├── .prettierrc             # Prettier code formatting rules
├── docker-compose.yml      # Local multi-container development environment
├── Dockerfile              # Production container blueprint
├── drizzle.config.ts       # Drizzle Kit configuration for migrations
├── eslint.config.js        # Strict v9 Flat Config for code quality and security
├── package.json            # Project metadata and scripts
├── README.md               # Current file
├── required_libraries.md   # Required Libraries & Tooling
└── tsconfig.json           # TypeScript compiler configuration
```

---

## 🚀 Core Features (Transformation Actions)

The worker dynamically applies one of 6 transformation actions to the payload based on the pipeline configuration before dispatching it to subscribers:

1. `DATA_MASKING`: Redacts sensitive PII (emails, passwords, SSNs).
2. `ADD_METADATA`: Enriches the payload with processing timestamps and server metadata.
3. `FLATTEN_PAYLOAD`: Lifts nested `data` objects to the root level.
4. `REMOVE_NULLS`: Cleans the payload by stripping `null` or `undefined` root keys.
5. `HASH_IDENTIFIERS`: Replaces raw IDs and emails with secure SHA-256 hashes.
6. `SUMMARIZE_PAYLOAD`: Discards heavy data and forwards a lightweight key-count summary.

---

## 📖 API Documentation

The API is fully RESTful. With the exception of the public Webhook Ingestion endpoint, all resource management endpoints are secured and require a valid Bearer Token (JWT).

### 🔐 1. User & Authentication Management

Manages user accounts, login states, and token rotation.

- **Register a New User**
  - **Endpoint:** `POST /api/users`
  - **Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "securepassword123"
    }
    ```
  - **Response (201 Created):** Returns the created user object (excluding the hashed password).

- **Login**
  - **Endpoint:** `POST /api/login`
  - **Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "securepassword123"
    }
    ```
  - **Response (200 OK):** Returns the user object along with the `token` (Access JWT) and `refreshToken`.

- **Refresh Token**
  - **Endpoint:** `POST /api/refresh`
  - **Headers:** `Authorization: Bearer <refreshToken>`
  - **Response (200 OK):** Returns a fresh `{ "token": "new-jwt-token" }` valid for 1 hour.

- **Revoke Refresh Token (Logout)**
  - **Endpoint:** `POST /api/revoke`
  - **Headers:** `Authorization: Bearer <refreshToken>`
  - **Response (204 No Content):** Revokes the token session.

- **Update Credentials**
  - **Endpoint:** `PUT /api/users`
  - **Headers:** `Authorization: Bearer <token>`
  - **Body:** `{"email": "new@example.com", "password": "newpassword123"}`

---

### 🔀 2. Pipeline Management

Pipelines define the transformation rules (`actionType`) and destinations (`targetUrls`) for incoming webhooks.
_(Requires Auth Header: `Authorization: Bearer <token>`)_

- **Create a Pipeline**
  - **Endpoint:** `POST /api/pipelines`
  - **Body:**
    ```json
    {
      "name": "Secure User Forwarder",
      "actionType": "DATA_MASKING",
      "targetUrls": [
        "[https://webhook.site/your-unique-id](https://webhook.site/your-unique-id)"
      ]
    }
    ```
    _(Valid Actions: `DATA_MASKING`, `ADD_METADATA`, `FLATTEN_PAYLOAD`, `REMOVE_NULLS`, `HASH_IDENTIFIERS`, `SUMMARIZE_PAYLOAD`)_
  - **Response (201 Created):** Returns the `pipeline` object, including the generated `sourceEndpoint` used to trigger the webhook.

- **Get All Pipelines**
  - **Endpoint:** `GET /api/pipelines`
  - **Response (200 OK):** Returns an array of the authenticated user's configured pipelines.

---

### 📡 3. Webhook Ingestion (Public)

The high-throughput ingestion endpoint. This route is public, validates the payload, saves it to the database, and immediately offloads it to the Redis queue for background processing.

- **Endpoint:** `POST /api/webhooks/:sourceEndpoint`
- **Headers:** `Content-Type: application/json`
- **Path Parameters:**
  - `sourceEndpoint` (string): The unique endpoint string generated when the pipeline was created.
- **Body:** Any valid JSON object you wish to process.
  ```json
  {
    "event": "user_signup",
    "email": "jane@example.com",
    "password": "supersecretpassword123"
  }
  ```
- **Response (202 Accepted):**
  ```json
  {
    "message": "Webhook received and queued for processing.",
    "jobId": "uuid-string-of-the-job"
  }
  ```

---

### 🔍 4. Job Status & History Tracking

Because processing happens asynchronously, you can poll these endpoints to check the delivery status and error logs of specific webhook tasks.
_(Requires Auth Header: `Authorization: Bearer <token>`)_

- **Get Job History for a Pipeline**
  - **Endpoint:** `GET /api/pipelines/:pipelineId/jobs`
  - **Response (200 OK):** Returns an array of all jobs processed by the specified pipeline.

- **Check Specific Job Status**
  - **Endpoint:** `GET /api/jobs/:jobId`
  - **Response (200 OK):**
    ```json
    {
      "id": "uuid-string",
      "status": "completed",
      "attempts": 1,
      "incomingPayload": { ... },
      "processedResult": { ... },
      "errorLog": null,
      "createdAt": "2026-03-23T12:00:00Z"
    }
    ```
    _(Possible Statuses: `pending`, `processing`, `completed`, `failed`, `retrying`)_

---

## 💻 Local Setup & Development (Step-by-Step)

The easiest way to run the application locally is using Docker Compose, which spins up the Node application along with local Postgres and Redis containers.

### Prerequisites

- Docker Desktop & Docker Compose installed.
- Node.js v22+ (for local dependency management and CLI tools).

### Step 1: Clone the Repository

```bash
git clone [https://github.com/qusay-taradeh/Webhook-Driven-Task-Processing-Pipeline.git](https://github.com/qusay-taradeh/Webhook-Driven-Task-Processing-Pipeline.git)
cd Webhook-Driven-Task-Processing-Pipeline
```

### Step 2: Environment Variables

Create a `.env` file in the root directory. **Note the `DB_PASSWORD` variable**, which is explicitly required by the `docker-compose.yml` file to authenticate the local Postgres container.

```env
# Local Docker Compose Database Authentication
DB_PASSWORD=local_dev_password

# Application Connection Strings (Routing to local Docker containers)
DATABASE_URL=postgresql://myuser:${DB_PASSWORD}@postgres_db:5432/mydb
REDIS_URL=redis://redis:6379

# Fallback Application Secrets
SECRET=your_dev_secret
PLATFORM=development
```

### Step 3: Run with Docker Compose

Build the images and start the services. The application will automatically run Drizzle database migrations on startup.

```bash
docker-compose up --build
```

_The Express server will bind to `http://localhost:8080`._

### Step 4: Local Development (Without Docker)

If you prefer to run the Node app directly on your machine while connecting to cloud databases (like Neon and Upstash):

```bash
# 1. Install dependencies
npm install

# 2. Update your .env to point to your live cloud databases
DATABASE_URL=your_neon_postgres_url
REDIS_URL=your_upstash_redis_url

# 3. Run the development server
npm run dev
```

---

## 🧪 Testing & Linting

This project enforces strict code quality standards that must pass before any branch can be merged via CI/CD.

```bash
# Run ESLint (checks for unused vars, strict typing, and security injection risks)
npm run lint

# Check Prettier formatting
npm run format:check

# Run the password hashing and JWT tests
npm run test
```
