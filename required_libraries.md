# Required Libraries & Environment Setup

This document outlines the exact commands required to initialize the project, install all necessary dependencies, set up the local database and queue environments, and deploy the application to Google Cloud.

---

## 1. Project Initialization & Core Environment

Initialize the Node.js project and install TypeScript and core type definitions.

```bash
npm init -y
npm install -D typescript @types/node
```

## 2. API Framework & Validation

Install Express for routing and Zod for schema validation.

```bash
npm install zod
npm i express
npm i -D @types/express
```

## 3. Local Database Setup (PostgreSQL)

If you are running the database locally on a Linux environment, follow these steps to install and configure PostgreSQL.

```bash
# Update package list and install Postgres
sudo apt update
sudo apt install postgresql postgresql-contrib

# Verify installation
psql --version

# Set the postgres user password
sudo passwd postgres

# Open the Postgres interactive terminal
sudo -u postgres psql
```

Inside the `psql` terminal, run the following SQL commands to set up the database and user:

```sql
CREATE DATABASE webhook;
\c webhook
ALTER USER postgres PASSWORD 'postgres';
SELECT version();
```

## 4. ORM & Database Clients

Install Drizzle ORM and the PostgreSQL client.

```bash
npm i drizzle-orm postgres
npm i -D drizzle-kit
```

## 5. Security & Authentication

Install Argon2 for password hashing and JSON Web Tokens for API authentication.

```bash
npm i argon2
npm i jsonwebtoken
npm i -D @types/jsonwebtoken
```

**Generate a Secure Secret Key:**
To generate a secure string for your `.env` file's `SECRET` variable, run the following OpenSSL command and copy the output:

```bash
openssl rand -base64 64
```

## 6. Testing, Linting & Formatting

Install Vitest for testing and ESLint/Prettier for code quality and security checks.

```bash
# Install testing framework
npm i -D vitest

# Install formatting, linting, and coverage tools
npm install -D prettier eslint typescript-eslint @vitest/coverage-v8

# Install ESLint core and globals
npm install -D @eslint/js
npm install -D globals

# Install security plugin for vulnerability detection
npm install -D eslint-plugin-security
```

## 7. Background Queue (BullMQ & Redis)

Install the queue manager and its required Redis client.

```bash
npm install bullmq ioredis
```

**Run Local Redis for Job Queue:**
To test the queue locally without installing Redis on your host machine, spin up a lightweight Docker container:

```bash
docker run -d -p 6379:6379 redis
```

---

## ☁️ Cloud Deployment & Managed Databases Guide

Follow this guide to provision your serverless databases and deploy the application to Google Cloud Platform (GCP).

### Step 1: Initialize Google Cloud CLI

1. Install the [gcloud CLI tool](https://docs.cloud.google.com/sdk/docs/install-sdk).
2. Initialize it by running the following command in your terminal:
   ```bash
   gcloud init
   ```
3. A browser window will open. Log in with the account you used to create your GCP project.
4. Select your designated project from the prompt.

### Step 2: Set up Managed PostgreSQL (Neon.tech)

1. Go to [Neon.tech](https://neon.tech/) and sign in (using GitHub is the fastest).
2. Click **Create a Project**. Name it `webhook-pipeline` and click **Create**.
3. In your project dashboard, locate the **Connection Details** box.
4. Copy the connection string and paste it into your GCP Secret Manager as the `DATABASE_URL` secret.
5. Connect your app to Neon locally using the CLI:
   ```bash
   npx neonctl@latest init
   ```
6. Create your specific database:
   ```bash
   create database webhook-db
   ```

### Step 3: Set up Managed Redis (Upstash)

1. Go to [Upstash.com](https://upstash.com/) and sign in.
2. Under the Redis section, click **Create Database**.
3. Name it `webhook-redis`, select a region, and click **Create**.
4. Scroll down on the database page and copy the connection string.
5. Paste this connection string into your GCP Secret Manager as the `REDIS_URL` secret.

### Step 4: Test & Deploy

To test the entire architecture locally before deploying to GCP, use Docker Compose to spin up the application:

```bash
docker compose up --build
```

Once local testing is successful, deploy your containerized application to Google Cloud Run using the `gcloud run deploy` command via your CI/CD pipeline or terminal.
