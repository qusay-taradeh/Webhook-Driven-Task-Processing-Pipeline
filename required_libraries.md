######################## Required Libraries ########################

npm init -y

########################

npm install -D typescript @types/node

########################

npm install zod

########################

npm i express
npm i -D @types/express

########################

sudo apt update
sudo apt install postgresql postgresql-contrib

psql --version

sudo passwd postgres

sudo -u postgres psql

CREATE DATABASE webhook;

\c webhook

ALTER USER postgres PASSWORD 'postgres';

SELECT version();

#create .webhookconfig.json at home directory

#put the db url inside it like {"dbUrl":"postgres://postgres:postgres@localhost:5432/webhook?sslmode=disable","currentUserName":"YOUR_NAME"}

########################

npm i drizzle-orm postgres
npm i -D drizzle-kit

########################

npm i argon2

########################

npm i jsonwebtoken
npm i -D @types/jsonwebtoken

########################

npm i -D vitest

########################

npm install -D prettier eslint typescript-eslint @vitest/coverage-v8

npm install -D @eslint/js

npm install -D globals

npm install -D eslint-plugin-security

########################

#for .env file it should contains
######################## PLATFORM="dev"
######################## SECRET =""
######################## fill SECRET variable using openssl as follows in command below

openssl rand -base64 64

########################

npm install bullmq ioredis

######################## Install Docker and run redis for job queue

docker run -d -p 6379:6379 redis

########################

Go to Neon.tech and sign in (using GitHub is the fastest).

Click Create a Project. Name it something like webhook-pipeline and click Create.

You will immediately be dropped into your dashboard. Look for the Connection Details box.

Copy the connection string and paste it in GDP DATABASE_URL secret

Connect your app to Neon with a single command:

npx neonctl@latest init

create database webhook-db

For Redis

Go to Upstash.com and sign in.

Click Create Database under the Redis section. Name it webhook-redis, pick a region, and click Create.

Scroll down slightly on the database page and copy the connection string.

deploy and test

test locally by following command

docker compose up --build
