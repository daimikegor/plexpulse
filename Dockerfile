FROM node:20.18.0-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p ./data
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN mkdir -p ./data
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/db ./db
EXPOSE 3000
ENV PORT=3000
CMD ["sh", "-c", "node migrate.js && node server.js"]
