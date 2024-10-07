# Stage 1: Build
FROM --platform=linux/amd64 node:20.10.0 as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy all source files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Production
FROM --platform=linux/amd64 node:20.10.0

WORKDIR /app

# Copy only necessary files from the build stage
COPY --from=build /app /app

# Expose the application port
EXPOSE 8000

# Healthcheck on the correct port
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["node", "src/server.js"]
