# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/
COPY src ./src/

# Generate Prisma client, then compile TypeScript
RUN npx prisma generate && npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output and Prisma artifacts from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated
# Copy route source files so swagger-jsdoc can read @openapi JSDoc comments at runtime
COPY --from=builder /app/src/routes ./src/routes
COPY --from=builder /app/src/app.ts ./src/app.ts
COPY prisma ./prisma/
COPY prisma.config.ts ./

EXPOSE 3000

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]
