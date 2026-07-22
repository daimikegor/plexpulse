# PlexPulse - Project Context

## Overview
Self-hosted media discovery and request app for Plex servers. Users browse trending/popular/top-rated/upcoming movies & TV, search live, and one-click request titles to their Plex watchlist. Status tracking (Requested/Available) checked against Radarr, Sonarr, and Plex library via [Pulsarr](https://github.com/jamcalli/Pulsarr) for actual downloads.

## Tech Stack
- **Framework**: Next.js 14 (App Router), TypeScript, React 18
- **Styling**: Tailwind CSS with custom theme (`plex-dark` #0E1015 bg, `plex-orange` #E5A00D accent)
- **Database**: libSQL (SQLite) via Drizzle ORM — hand-written migration script (`migrate.js`)
- **Cache**: Redis (ioredis) for TMDB API responses and session storage
- **External APIs**: TMDB, Plex OAuth/PIN-based auth, Radarr, Sonarr

## Architecture

### Directory Structure
- `app/` — Next.js App Router pages and API routes
  - `api/auth/` — Plex OAuth flow (start → callback → check → logout)
  - `api/tmdb/`, `api/discover/`, `api/search/live/`, `api/watchlist/`, `api/media-status/`, `api/genre-content/`, `api/category/` — data fetchers
  - `dashboard/`, `movies/`, `series/`, `search/`, `genres/`, `genre/`, `category/`, `person/`, `requests/`, `admin/` — UI pages
- `components/` — React components (InfiniteMediaGrid, LiveSearchResults, DetailModal, AppShell, MobileBottomNav, Sidebar, PosterImage, etc.)
- `lib/` — business logic and integrations
  - `tmdb.ts` — TMDB API calls with Redis caching (2h TTL for most, 24h for genre data)
  - `redis.ts` — Redis connection singleton
  - `session.ts` — Session/auth management (Redis-backed session tokens + cookie-based auth)
  - `media-status.ts` — Status check orchestrator against Plex/Radarr/Sonarr ('available' → 24h, 'requested' → 5min, 'none' → 30min)
  - `radarr.ts`, `sonarr.ts`, `plex-library.ts`, `plex-watchlist.ts` — individual service integrations
  - `db.ts` — Drizzle database connection
- `db/schema.ts` — Drizzle schema: `users`, `media_status`, `user_requests` tables

### Patterns
- All TMDB functions follow the same pattern: Redis cache check → API fetch → Redis setex with TTL → return data. Graceful degradation on errors.
- Primary key format convention: `${type}-${id}` (e.g., `movie-12345`, `user-plexId-movie-tmdbId`)
- Session stored in Redis as `session:{token}` → `{ plexId, authToken }`. User data from DB by `plexId`
- API routes return JSON; pages use Server Components with client components for interactivity
- Responsive: dedicated mobile layout using `MobileBottomNav` component

### Conventions to Follow
1. All new external API calls should use Redis caching with appropriate TTL
2. Handle errors gracefully — return empty data, never crash
3. Use `media_type` field to distinguish 'movie' | 'tv' throughout the codebase
4. Primary keys should use the existing `${type}-${id}` composite format
5. Keep styling consistent with the Plex dark theme (`plex-dark` bg, `plex-orange` accent)
6. API routes should validate authentication using `requireAuth()` when access is required
7. Drizzle queries use sqlite-core — no Postgres-specific features

## Security Fixes Applied
- `/api/watchlist/add` POST: origin validation via `isTrustedOrigin()` — rejects requests whose Origin/Referer doesn't match `NEXT_PUBLIC_APP_URL`. Logs a console.warn when the env var is missing but fails closed regardless.
- `/api/auth/callback` HTML: postMessage target changed from wildcard `*` to `NEXT_PUBLIC_APP_URL` — prevents any site from spoofing the auth-complete event.
- Redis auth: `docker-compose.yml` redis service gets `--requirepass`; `.env.example` has `REDIS_PASSWORD` + `REDIS_URL` with embedded password.
- `NEXT_PUBLIC_APP_URL` is passed as a Docker build arg (Dockerfile ARG) and from compose via `${NEXT_PUBLIC_APP_URL:-default}`.

## Known Gotchas
- **NEXT_PUBLIC_ env leak**: PLEX_CLIENT_ID was mistakenly prefixed with NEXT_PUBLIC_, 
  exposing it in client bundles. Keep all API keys as server-only env vars.
- **better-sqlite3 Docker build failures**: The native C compilation requirement caused 
  repeated Docker build issues (.npmrc, g++ installs, --build-from-source). Replaced 
  with @libsql/client — do NOT revert to better-sqlite3.
- **Session cookie Secure flag**: NODE_ENV is unreliable in Docker (always 'production'). 
  Use the explicit IS_HTTPS env var for secure cookie configuration.
- **Media status cache thresholds**: `'available' → 24h`, `'requested' → 5min`, `'none' → 30min`. The old 60s default caused hundreds of external API calls per page load — do not change back.
- **Plex library GUID detection — three-layer cascading cache bug**: `getPlexLibraryGuids()` in `lib/plex-library.ts` scans the entire Plex library and caches extracted TMDB IDs in Redis (120s TTL). Three bugs combined to produce persistent false negatives:
  1. **GUID format blind spot**: only matched `startsWith('tmdb://')`, missing legacy agent GUIDs like `com.plexapp.agents.tmdb://123?lang=en`. Fixed by using `includes('tmdb://')` + regex to extract numeric ID.
  2. **Empty/partial scans cached**: if a network error or parse failure occurred mid-scan, the partial result was cached anyway, poisoning all status checks in that 120s window. Fixed by only caching when `allGuids.length > 0`.
  3. **Fragile pagination**: `totalSize || 0` treated a missing `totalSize` as 0, causing an immediate pagination stop after page 1. Fixed with `!= null` check.
  The `'none'` DB cache TTL (was 6h) amplified any transient miss — reduced to 30min. When editing `plex-library.ts` or `media-status.ts`, do not reintroduce any of these three failure modes.
- **TMDB-to-TVDB ID conversion needed for Sonarr**: Sonarr uses TVDB IDs, not TMDB IDs. 
  Always resolve via getTvdbIdFromTmdb() before querying Sonarr.
- **Unraid template env vars don't expand ${...}**: unlike docker-compose env_file, Unraid templates pass values literally. Hardcode full URLs (e.g., `redis://:password@host:port`) in the UI — `${REDIS_PASSWORD}` will not work there.
- **Plex OAuth cleanup on exit paths**: The polling interval and message event listener 
  must be cleared on all exit paths (popup close, auth success, timeout) to prevent leaks.
- **CRITICAL: app/detail/[mediaType]/[tmdbId]/page.tsx must NEVER contain onClick, useState, useEffect, or 'use client'. It is a server component (imports lib/tmdb.ts which uses Redis). ALL interactivity belongs in separate client component files (TrailerButton.tsx, RequestButton.tsx, etc.) that receive data via props. This exact bug has broken the build/runtime 4 times — check this before editing page.tsx.**
- **Next.js standalone server loopback binding**: The Next.js standalone output's server uses the `HOSTNAME` env var to decide which interface to bind to. Without `ENV HOSTNAME=0.0.0.0` in the Dockerfile runner stage, the server binds only to the container's external network interface — external browser traffic still works, but any internal health check or same-container request to `127.0.0.1` or `localhost` fails with `ECONNREFUSED`. Always pair `ENV NODE_ENV=production` with `ENV HOSTNAME=0.0.0.0` in the runner stage.

## Commands
- `npm run dev` — start dev server (next dev)
- `npm run build` — production build (next build)
- `npm start` — start prod server (next start)
- `npm run db:generate` — generate Drizzle schema migrations
- `npm run db:migrate` — apply Drizzle migrations
- `npm run test` — run the Vitest suite once
- `npm run test:watch` — run Vitest in watch mode

No lint or typecheck scripts are configured.

## Testing
Vitest (`vitest.config.ts`, `test/mocks/` for shared Redis/DB fakes) covers the highest-risk logic touched in the 2026-07-22 hardening pass:
- `lib/rate-limit.test.ts` — Redis-backed rate limiter: limit/remaining accounting, fail-open behavior on Redis outage, IP extraction precedence, window bucketing.
- `lib/session.test.ts` — encrypted session storage, legacy plaintext back-compat, sliding TTL, `requireAuth()` redirect paths.
- `app/api/auth/csrf-flow.test.ts` — the nonce-based CSRF flow across `start`/`check` routes, including one-time-use replay protection and the admin allowlist.
- `lib/plex-library.test.ts` — the scan concurrency guard, the stale-`scanInProgress` fix, GUID extraction (modern + legacy formats), pagination edge cases.
- `lib/plex-watchlist.test.ts` — Plex title word-sequence matching (punctuation/quote/dash normalization) and year matching.

When editing any of these five files, add or update the corresponding test(s) in the same change — this suite exists specifically to catch regressions of bugs (like the plex-library cascading cache bug above) that have already bitten this project once.

### Docker
- Entry point runs `node migrate.js && node server.js` on container start
- Rebuild & redeploy: `docker compose up -d --build`

## Deployment
- Docker-based (Docker Compose or Unraid templates included)
- Environment variables split between build-time and runtime — see SETUP.md
- Redis: **production uses a separate standalone Redis container at 10.0.0.X:6380 with requirepass auth**. The compose redis service is dev-only and not used in production.
- Docker networking: implicit compose default network (no custom network defined)

## Media Workflow
1. **PlexPulse** → adds title to Plex watchlist
2. **Pulsarr** → monitors watchlist, routes to Radarr/Sonarr instances
3. **Radarr/Sonarr** → pass download jobs to **nzbdav** (usenet streaming)
4. **nzbdav** → notifies Arrs when ready
5. **Arrs** → trigger partial library scan on Plex via Autopulse
6. **PlexPulse** → detects "Available" status in `media-status.ts`

## Git Workflow
- **Claude Code**: Run git commands directly with per-command approval (commit, push, etc.).
- **OpenCode**: Always delegate commits to the @git-commit subagent.