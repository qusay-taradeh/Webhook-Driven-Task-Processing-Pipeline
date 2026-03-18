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

npm install -D globals eslint-plugin-security

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
