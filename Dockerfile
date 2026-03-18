# ==========================================
# STAGE 1: Build the application
# ==========================================
FROM --platform=linux/amd64 node:22-slim AS builder

# Install build tools required for native extensions like argon2
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install ALL dependencies (including devDependencies like typescript)
RUN npm install

# Copy the rest of the project files (src folder, tsconfig, etc.)
COPY . .

# Generate Drizzle migrations
RUN npm run generate

# Compile TypeScript to JavaScript (generates the /dist folder)
RUN npm run build

# ==========================================
# STAGE 2: Run the application
# ==========================================
FROM --platform=linux/amd64 node:22-slim AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies (ignores typescript, vitest, etc.)
RUN npm install --omit=dev

# Copy the compiled JavaScript from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the generated Drizzle migrations folder from the builder stage
COPY --from=builder /app/src/lib/db/migrations ./src/lib/db/migrations

# Copy the static HTML file
COPY --from=builder /app/src/app/index.html ./src/app/index.html

# Expose the Express server port
EXPOSE 8080

# Start the application
CMD ["node", "dist/index.js"]