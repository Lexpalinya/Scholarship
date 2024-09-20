# Stage 1: Build
FROM node:16-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .

# Stage 2: Production
FROM node:16-alpine

WORKDIR /app
COPY --from=build /app /app
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["npx", "prisma", "generate", "&&", "node", "src/server.js"]
