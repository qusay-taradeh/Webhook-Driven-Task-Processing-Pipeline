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

#for .env file it should contains 
######################## PLATFORM="dev"
######################## POLKA_KEY =""
######################## SECRET =""
######################## fill SECRET and POLKA_KEY variables using openssl as follows in command below

openssl rand -base64 64
