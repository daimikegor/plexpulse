FROM node:20-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

FROM base AS builder
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p ./data
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN mkdir -p ./data && chown -R node:node ./data
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/db ./db
COPY --from=builder /app/migrate.js ./migrate.js
# Next.js writes to .next/cache at runtime (image optimization, fetch cache, etc.).
# The standalone output may or may not include this directory — create it if missing
# so the chown always has a target.
RUN mkdir -p ./.next/cache && chown -R node:node ./.next/cache
EXPOSE 3000
ENV PORT=3000
# Health check: probe the Next.js server every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
# Fix permissions on volume mounts and cache dir at runtime (volume overrides
# build-time chown), then drop to unprivileged node user.
CMD ["sh", "-c", "chown -R node:node /app/data /app/.next/cache 2>/dev/null; exec su node -c 'node migrate.js && node server.js'"]
