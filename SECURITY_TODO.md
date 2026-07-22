# Security TODO

Living tracker for the 2026-07-20 security audit findings. Update checkboxes as items are fixed.

**Status:** 48 done · 0 open — all findings resolved ✓

---

## ✅ Done

- [x] **drizzle-orm SQL injection** (CVSS 7.5) — upgraded to `0.45.2` (`package.json:15`)
- [x] **next.js SSRF via WebSocket** (CVSS 8.6) + 13 other CVEs — upgraded to `16.2.10` (`package.json:18`)
- [x] **Secrets in git history** — rotated all keys, purged via `git filter-repo`
- [x] **Redis auth brittle** — `requirepass` configured and verified working (`docker-compose.yml:20`)
- [x] **`.dockerignore` breaking `NEXT_PUBLIC_PLEX_CLIENT_ID`** — added `ARG` + `ENV` in `Dockerfile:11-12` and build arg in `docker-compose.yml:9`
- [x] **Plex Discover title matching** — word-sequence matching replaces exact string compare (`lib/plex-watchlist.ts:33-41`)
- [x] **Auth callback JS regex escape** — fixed `\/` → `\\/` in template literal (`app/api/auth/callback/route.ts:12`)
- [x] **Docker compose missing `image:` tag** — added `image: plexpulse-app:latest` (`docker-compose.yml:4`)
- [x] **API keys in URL query params** — Plex token moved to header in `lib/plex-library.ts`, TMDB added optional `TMDB_READ_ACCESS_TOKEN` Bearer auth in `lib/tmdb.ts` (falls back to query param for existing `TMDB_API_KEY` deployments)
- [x] **No rate limiting** — any endpoint can be abused. Added Redis-backed fixed-window rate limiter (`lib/rate-limit.ts`) with Lua EVAL for atomic INCR+EXPIRE, applied to all 10 API routes with tiered limits (5–60 req/min). Zero new dependencies. (`lib/rate-limit.ts`, `lib/origin.ts`, all `app/api/**/route.ts`)
- [x] **`/api/media-status` unauthenticated** — added session cookie auth via `getSession()` matching `watchlist/add` pattern. `?force=1` is protected by the same check. (`app/api/media-status/route.ts`)
- [x] **`/api/search/live` unauthenticated + uncached** — added session cookie auth via `getSession()` matching `watchlist/add` pattern. (`app/api/search/live/route.ts`)
- [x] **Backwards `isAdmin` check** — any Plex home user with library access becomes admin. Replaced with configurable `ADMIN_PLEX_IDS` env var allowlist that checks `userData.id` against a comma-separated list of authorized Plex IDs. Warns when unset. (`app/api/auth/check/route.ts:41-49`, `.env.example:10-12`)
- [x] **No CSP or security headers** — added `headers()` export in `next.config.js` with CSP (default-src 'self', img-src TMDB + Plex CDN, frame-src YouTube, script-src 'unsafe-inline' for OAuth callback), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`. (`next.config.js`)
- [x] **Admin check silently swallows errors** — removed the silent `try/catch` around Plex library-sections fetch. `isAdmin` is now derived from the `ADMIN_PLEX_IDS` allowlist, and a warning is logged when the env var is unset. (`app/api/auth/check/route.ts:47-49`)
- [x] **Login CSRF on `/api/auth/check`** — added nonce binding between start and check: `/api/auth/start` generates a crypto nonce, stores it in Redis (`pin_nonce:{pinId}`, 5min TTL), and returns it to the client. `/api/auth/check` validates the nonce before proceeding, then issues a fresh nonce for subsequent polls (one-time-use, rotating). (`app/api/auth/start/route.ts`, `app/api/auth/check/route.ts`, `app/page.tsx`)
- [x] **No CSRF tokens on auth endpoints** — added `isTrustedOrigin()` to both `POST /api/auth/start` and `POST /api/auth/logout`. Untrusted origins receive 403. (`app/api/auth/start/route.ts:16-18`, `app/api/auth/logout/route.ts:16-18`)
- [x] **Only watchlist/add uses `isTrustedOrigin`** — added `isTrustedOrigin()` to `POST /api/auth/logout` and `POST /api/auth/start`, bringing all auth POST endpoints under origin validation. (`app/api/auth/start/route.ts:16-18`, `app/api/auth/logout/route.ts:16-18`)
- [x] **5 API routes unauthenticated** — all 5 routes now require session cookie auth via `getSession()`, matching the `media-status`/`search/live` pattern. Discover, genre-content, and category return 401 for unauthenticated requests. (`app/api/discover/route.ts`, `app/api/genre-content/route.ts`, `app/api/category/route.ts`, `app/api/search/live/route.ts`, `app/api/media-status/route.ts`)
- [x] **Docker runs as root** — added `chown -R node:node /app/data` and `USER node` in the runner stage. Container now runs as non-root. (`Dockerfile:21,29`)
- [x] **Plex Client ID in client bundle** — removed `NEXT_PUBLIC_PLEX_CLIENT_ID` entirely. The start endpoint now returns `clientID` from the server-side `PLEX_CLIENT_ID` env var, and the client uses it to construct the Plex auth URL. Removed from Dockerfile build args, docker-compose.yml, and .env.example. (`app/api/auth/start/route.ts:41`, `app/page.tsx:15,29`, `Dockerfile:9-10`, `docker-compose.yml:9`, `.env.example:3`)
- [x] **Plex auth tokens unencrypted in Redis** — added AES-256-GCM encryption for `authToken` stored in `session:{token}` keys, keyed by `SESSION_SECRET`. Legacy plaintext tokens are auto-detected and backward-compatible. (`lib/session.ts`)
- [x] **`SESSION_SECRET` unused in code** — now used as the encryption key for Redis session tokens via SHA-256 key derivation. Warns when unset. (`lib/session.ts`)
- [x] **No token rotation / sliding expiration** — `getSession()` now refreshes the TTL on every access (sliding expiration). Active sessions persist; idle/stolen sessions expire after 7 days of disuse. (`lib/session.ts`)
- [x] **Logout kills only current session** — added per-user Redis Set (`user_sessions:{plexId}`) tracking all session tokens. Logout now pipelines `DEL` for every session, terminating all devices at once via `destroyAllSessions()`. Falls back to single-token delete if session is expired. (`lib/session.ts`, `app/api/auth/logout/route.ts`)
- [x] **`/api/watchlist/add` no body validation** — added `mediaType === 'movie' || mediaType === 'tv'` guard before DB insert and downstream processing. Returns 400 for invalid values. (`app/api/watchlist/add/route.ts`)
- [x] **`parseInt` NaN risk** — page params in `category`, `discover`, and `genre-content` routes now clamped to `>= 1` via `Math.max(1, ... || 1)`, guarding against `NaN` in TMDB URLs. (`app/api/category/route.ts`, `app/api/discover/route.ts`, `app/api/genre-content/route.ts`)
- [x] **No TLS for production Redis** — added `REDIS_TLS=true` env var for explicit TLS control (ioredis already handles `rediss://` URLs natively). (`lib/redis.ts`)
- [x] **Redis defaults to unauthenticated localhost** — now logs a `FATAL`-level error when `REDIS_URL` is missing in production, surfacing the misconfiguration immediately instead of silently falling back to unauthenticated localhost. (`lib/redis.ts`)
- [x] **Redis key collision via crafted `tmdbId`** — `getMediaDetails()` and `getGenreContentPage()` now validate `tmdbId`/`genreId` are `^\d+$` before constructing Redis cache keys. Crafted IDs containing `:` are rejected. (`lib/tmdb.ts`)
- [x] **Person ID path injection** — `person/[id]` page now validates `personId` is `^\d+$` before interpolating into the TMDB fetch URL. (`app/person/[id]/page.tsx`)
- [x] **Plex token in URL query strings** — already fixed: `plex-library.ts` exclusively uses `X-Plex-Token` headers (lines 101, 128), matching `plex-watchlist.ts` pattern. No Plex tokens in query strings anywhere. (`lib/plex-library.ts`)
- [x] **`dump.rdb` on disk** — deleted existing `dump.rdb` containing potential session tokens, added `--save ""` to Redis command in docker-compose.yml to disable RDB snapshots, already covered by `.dockerignore`. (`docker-compose.yml:21`, `.dockerignore:7`)
- [x] **Docker base image stale** — updated from `node:20.18.0-slim` (~1.5 years old) to `node:20-slim` (tracks latest 20.x patch releases). (`Dockerfile:1`)
- [x] **`npm ci` without `--ignore-scripts`** — added `--ignore-scripts` to `npm ci` in Dockerfile. Safe: `@libsql/client` uses WASM (no native builds), and no other dependency requires postinstall scripts. (`Dockerfile:6`)
- [x] **`@tailwindcss/line-clamp` redundant** — removed from dependencies. Built into Tailwind 3.3+ and was never registered as a plugin. (`package.json`)
- [x] **No `middleware.ts`** — added `proxy.ts` (Next.js 16 convention) as a catch-all auth guard: verifies `session_token` cookie on all non-public routes, returns 401 for API / redirect for pages. Public paths (`/`, `/api/auth/*`, static assets) are exempt. Also applies security headers as belt-and-suspenders. (`proxy.ts`)
- [x] **`console.error` in production** — added `compiler.removeConsole: true` to `next.config.js`. Strips all `console.*` from client-side bundles in production; server-side console calls (API routes, server components) are unaffected. (`next.config.js`)
- [x] **No HEALTHCHECK in Dockerfile** — added Node.js-based health check probing `http://localhost:3000/` every 30s with 5s timeout and 3 retries. No additional packages needed (uses built-in `http` module). (`Dockerfile:31-32`)
- [x] **No restart policy in docker-compose.yml** — added `restart: unless-stopped` to both `app` and `redis` services so containers auto-recover from crashes. (`docker-compose.yml`)
- [x] **`.gitignore` doesn't block `.env.*`** — replaced separate `.env` / `.env.local` entries with `.env*` glob and `!.env.example` exception. Prevents `.env.production`, `.env.staging`, etc. from being committed. (`.gitignore`)
- [x] **Misleading `isTrustedOrigin` log message** — changed from "origin checks are disabled" to "rejecting all cross-origin requests" — the function fails closed (returns `false`), not open. (`lib/origin.ts:12`)
- [x] **No DB foreign keys** — added `.references(() => users.plexId)` on `userRequests.plexId` to document the relationship and generate FK constraints in Drizzle migrations. (`db/schema.ts:19`)
- [x] **No Redis `maxmemory`** — added `--maxmemory 256mb --maxmemory-policy allkeys-lru` to Redis command in docker-compose.yml, preventing unbounded cache growth from crashing Redis and taking sessions with it. (`docker-compose.yml:22`)
- [x] **SQLite DB unencrypted at rest** — added conditional `encryptionKey` support via `DB_ENCRYPTION_KEY` env var. When set, libSQL encrypts the database file. When unset, behavior is unchanged (unencrypted). (`lib/db.ts:5-7`)
- [x] **YouTube iframe permissive `allow`** — restricted from 6 permissions to 3: `autoplay; encrypted-media; picture-in-picture`. Removed unnecessary `accelerometer`, `clipboard-write`, `gyroscope`. (`components/TrailerButton.tsx:71`)
- [x] **`innerHTML` in auth callback** — replaced `document.body.innerHTML` with `document.body.textContent` in the fallback path (no `window.opener`). Content is static text, safe for `textContent`. (`app/api/auth/callback/route.ts:26`)
- [x] **`document.querySelector` with dynamic `src`** — replaced fragile attribute selector with React `ref` (`imageRef`) on the `next/image` component. Error handler now uses `imageRef.current` directly. (`components/PosterImage.tsx:131,185-189`)

---

## 🔴 Critical

_None remaining — all 4 critical findings resolved._

## 🟠 High

_None remaining — all 6 high findings resolved._

## 🟡 Medium

_None remaining — all 15 medium findings resolved._

## 🟢 Low

_None remaining — all 12 low findings resolved._
