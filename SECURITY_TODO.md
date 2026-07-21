# Security TODO

Living tracker for the 2026-07-20 security audit findings. Update checkboxes as items are fixed.

**Status:** 13 done · 35 open (0 critical · 6 high · 17 medium · 12 low)

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
- [x] **No CSP or security headers** — added `headers()` export in `next.config.js` with CSP (default-src 'self', img-src TMDB + Plex CDN, frame-src YouTube, script-src 'unsafe-inline' for OAuth callback), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`. (`next.config.js`)

---

## 🔴 Critical

_None remaining — all 4 critical findings resolved._

## 🟠 High

- [ ] **Login CSRF on `/api/auth/check`** — attacker can link victim to attacker's Plex PIN, hijacking session. Add CSRF token or nonce binding between start and check steps (`app/api/auth/check/route.ts:7-9`, `app/api/auth/start/route.ts`).
- [ ] **Backwards `isAdmin` check** — any Plex home user with library access becomes admin. Replace with configurable `ADMIN_PLEX_IDS` env var allowlist (`app/api/auth/check/route.ts:33-39`).
- [ ] **5 API routes unauthenticated** — discover, search/live, genre-content, category, media-status all lack auth. Add `requireAuth()` to each (`app/api/discover/route.ts`, `app/api/search/live/route.ts`, `app/api/genre-content/route.ts`, `app/api/category/route.ts`, `app/api/media-status/route.ts`).
- [ ] **Docker runs as root** — no `USER node` directive. Add `RUN chown -R node:node /app/data` + `USER node` in runner stage (`Dockerfile:18`).
- [ ] **No CSRF tokens on auth endpoints** — logout and auth-start POST have no origin validation. Add `isTrustedOrigin()` or SameSite strict (`app/api/auth/logout/route.ts:5`, `app/api/auth/start/route.ts:3`).
- [ ] **Plex Client ID in client bundle** — partially addressed (ARG wired for Docker build), but still `NEXT_PUBLIC_` in source. Move to server-side URL construction via `/api/auth/start` (`app/page.tsx:28`).

## 🟡 Medium

- [ ] **Plex auth tokens unencrypted in Redis** — `session:{token}` stores raw `authToken` with 7-day TTL. Encrypt with `SESSION_SECRET` or reduce TTL (`app/api/auth/check/route.ts:54-58`, `lib/session.ts:10`).
- [ ] **`SESSION_SECRET` unused in code** — defined in `.env.example` but never read. Either encrypt Redis sessions with it or remove the dead config (`.env.example:3`, all code).
- [ ] **No token rotation / sliding expiration** — stolen token valid for full 7 days. Rotate tokens on use or add sliding TTL (`app/api/auth/check/route.ts:57`).
- [ ] **Logout kills only current session** — multi-device users can't terminate all sessions. Add `plexId`-based scan-and-delete (`app/api/auth/logout/route.ts:11`).
- [ ] **`/api/watchlist/add` no body validation** — `mediaType` unchecked before DB insert. Validate `mediaType === 'movie' || mediaType === 'tv'` (`app/api/watchlist/add/route.ts:41`).
- [ ] **`parseInt` NaN risk** — unvalidated page params produce `NaN` in TMDB URLs. Add `isNaN(page) || page < 1` guard (`app/api/category/route.ts:7`, `app/api/discover/route.ts:7`, `app/api/genre-content/route.ts:8`).
- [ ] **Admin check silently swallows errors** — if Plex server unreachable, all users silently lose admin. Log warning when check fails (`app/api/auth/check/route.ts:35-39`).
- [ ] **No TLS for production Redis** — auth tokens traverse network in cleartext. Add `tls: {}` to ioredis config or use `rediss://` URL scheme (`lib/redis.ts:3`).
- [ ] **Redis defaults to unauthenticated localhost** — `REDIS_URL` fallback has no auth. Throw startup error if missing in production (`lib/redis.ts:3`).
- [ ] **Redis key collision via crafted `tmdbId`** — `:` in tmdbId could poison cache keys. Sanitize to digits only at API boundary, or use Redis hashes (`lib/tmdb.ts:507`).
- [ ] **Person ID path injection** — unvalidated URL param in server-side fetch. Validate numeric only (`app/person/[id]/page.tsx:19-20`).
- [ ] **Plex token in URL query strings** — visible in server/proxy logs. Switch to `X-Plex-Token` header, matching `plex-watchlist.ts` pattern (`lib/plex-library.ts:14-15,30-31`).
- [ ] **Only watchlist/add uses `isTrustedOrigin`** — logout and start have no origin validation. Add to both POST endpoints (`app/api/auth/logout/route.ts:5`, `app/api/auth/start/route.ts:3`).
- [ ] **Docker base image stale** — `node:20.18.0-slim` is ~1.5 years old. Update to `node:20-slim` or pin to latest 20.x (`Dockerfile:1`).
- [ ] **`npm ci` without `--ignore-scripts`** — postinstall scripts from dependencies execute during build. Evaluate hardening, test with `@libsql/client` (may need native builds) (`Dockerfile:6`).
- [ ] **`@tailwindcss/line-clamp` redundant** — built into Tailwind 3.3+, not even registered as plugin. Remove from dependencies (`package.json:14`).
- [ ] **`dump.rdb` on disk** — Redis snapshot may contain session tokens. Delete file, configure `save ""` in Redis, ensure `.dockerignore` covers it.

## 🟢 Low

- [ ] **No `middleware.ts`** — new routes can be added without auth by accident. Add a global auth guard or at minimum security headers middleware.
- [ ] **`console.error` in production** — client components log error objects with potential internal details. Strip in production builds.
- [ ] **No HEALTHCHECK in Dockerfile** — can't detect hung containers. Add `HEALTHCHECK` instruction.
- [ ] **No restart policy in docker-compose.yml** — container failures don't auto-recover. Add `restart: unless-stopped` to both services.
- [ ] **`.gitignore` doesn't block `.env.*`** — `.env.production` etc. could be committed. Change `.env` → `.env*` with `!.env.example` exception.
- [ ] **Misleading `isTrustedOrigin` log message** — says "disabled" but actually fails closed. Change to "rejecting all requests" (`app/api/watchlist/add/route.ts:13`).
- [ ] **No DB foreign keys** — orphaned request records possible. Add `.references()` to schema (`db/schema.ts:18-26`).
- [ ] **No Redis `maxmemory`** — cache growth could crash Redis, taking sessions with it. Add `--maxmemory 256mb --maxmemory-policy allkeys-lru` (`docker-compose.yml:20`).
- [ ] **SQLite DB unencrypted at rest** — contains Plex IDs, usernames, request history. Use libSQL encryption key (`lib/db.ts:3-6`).
- [ ] **YouTube iframe permissive `allow`** — clipboard-write and gyroscope unnecessary. Restrict to `autoplay; encrypted-media; picture-in-picture` (`components/TrailerButton.tsx:67-73`).
- [ ] **`innerHTML` in auth callback** — static content (safe), but flagged by scanners. Replace with `textContent` (`app/api/auth/callback/route.ts:17`).
- [ ] **`document.querySelector` with dynamic `src`** — fragile selector in PosterImage. Replace with React ref (`components/PosterImage.tsx:91-94`).
