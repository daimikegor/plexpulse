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
  - `media-status.ts` — Status check orchestrator against Plex/Radarr/Sonarr (1h stale threshold)
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

## Known Gotchas
- **NEXT_PUBLIC_ env leak**: PLEX_CLIENT_ID was mistakenly prefixed with NEXT_PUBLIC_, 
  exposing it in client bundles. Keep all API keys as server-only env vars.
- **better-sqlite3 Docker build failures**: The native C compilation requirement caused 
  repeated Docker build issues (.npmrc, g++ installs, --build-from-source). Replaced 
  with @libsql/client — do NOT revert to better-sqlite3.
- **Session cookie Secure flag**: NODE_ENV is unreliable in Docker (always 'production'). 
  Use the explicit IS_HTTPS env var for secure cookie configuration.
- **TMDB-to-TVDB ID conversion needed for Sonarr**: Sonarr uses TVDB IDs, not TMDB IDs. 
  Always resolve via getTvdbIdFromTmdb() before querying Sonarr.
- **Plex OAuth cleanup on exit paths**: The polling interval and message event listener 
  must be cleared on all exit paths (popup close, auth success, timeout) to prevent leaks.

## Commands
- `npm run dev` — start dev server (next dev)
- `npm run build` — production build (next build)
- `npm start` — start prod server (next start)
- `npm run db:generate` — generate Drizzle schema migrations
- `npm run db:migrate` — apply Drizzle migrations

No lint or typecheck scripts are configured.

### Docker
- Entry point runs `node migrate.js && node server.js` on container start
- Rebuild & redeploy: `docker compose up -d --build`

## Deployment
- Docker-based (Docker Compose or Unraid templates included)
- Environment variables split between build-time and runtime — see SETUP.md
- Redis: port 6379 internally, exposed as 6379 in docker-compose, defaults to host 
  port 6380 in Unraid template (to avoid conflicts with other Redis containers)
- Docker networking: implicit compose default network (no custom network defined)