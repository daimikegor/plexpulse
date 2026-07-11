FROM node:20.18.0-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* .npmrc ./
RUN ls -la /app && cat /app/.npmrc || echo ".npmrc NOT FOUND"
RUN apt-get update && apt-get install -y python3 make g++ \
    && npm ci --build-from-source

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# better-sqlite3 native bindings must be copied explicitly for standalone mode
COPY --from=deps /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
