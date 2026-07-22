# PlexPulse Setup Notes

For a general project overview and quick-start installation instructions, see README.md. This file (SETUP.md) covers detailed configuration and known gotchas.

## Environment Variables (.env)

Required variables and where to find them:

- TMDB_API_KEY — from themoviedb.org account settings, API section
- DATABASE_URL — defaults to file:./data/plexpulse.db, don't need to set manually
- NEXT_PUBLIC_APP_URL, SESSION_SECRET — core app/auth config
- PLEX_SERVER_URL — your Plex Media Server's address, e.g. http://10.0.0.X:32400
- PLEX_SERVER_TOKEN — Plex Media Server's own access token (different from user OAuth
  tokens). Get it by opening any item in Plex Web, "..." menu -> Get Info -> View XML,
  and copying the X-Plex-Token value from the URL.
- PLEX_CLIENT_ID / NEXT_PUBLIC_PLEX_CLIENT_ID — these are two separate variables for
  two different purposes, not a typo. `PLEX_CLIENT_ID` (server-only) identifies this
  app to Plex when the server kicks off the PIN login request. `NEXT_PUBLIC_PLEX_CLIENT_ID`
  is the same identifier baked into the browser bundle so client-side polling can check
  the PIN's status. Both should be set to the same value. Keep any *other* secrets
  (API keys, tokens) off the `NEXT_PUBLIC_` prefix — anything with that prefix is
  exposed in client-side JS (see the PLEX_CLIENT_ID leak gotcha below).
- ADMIN_PLEX_IDS — comma-separated list of numeric Plex user IDs who get access to
  the `/admin` dashboard (all users' request history). Find your own ID at
  https://app.plex.tv/desktop after logging in — it's in the URL: `/users/<id>/...`.
  Leave blank and no one has admin access.
- RADARR_1_URL / RADARR_1_API_KEY (and _2, _3 for additional instances) — each
  Radarr instance's base URL and API key. API key found in each instance's web UI:
  Settings -> General -> Security -> API Key.
- SONARR_1_URL / SONARR_1_API_KEY (and _2, _3) — same pattern as Radarr, for each
  Sonarr instance.
- SCAN_SCHEDULE_HOURS — how often (in hours) the in-process scheduler triggers a full
  Plex library scan to refresh "Available" status data. Defaults to 24. Set to 0 to
  disable the automatic scan entirely and rely only on on-demand status checks.
- REDIS_PASSWORD — required. Sets `--requirepass` on the Redis container in
  docker-compose.yml; generate one with `openssl rand -hex 32`. Must match the
  password embedded in REDIS_URL.
- REDIS_URL — full Redis connection string including the password, e.g.
  `redis://:<REDIS_PASSWORD>@redis:6379`. In docker-compose this can reference
  `${REDIS_PASSWORD}` via env_file expansion; see the Unraid note below for why that
  doesn't work there.
- IS_HTTPS — set to `true` only when the app is served over HTTPS (e.g. behind a
  Cloudflare Tunnel), `false` otherwise. Controls whether session cookies get the
  `Secure` flag. NODE_ENV alone can't be used for this because it's always
  `production` inside the Docker image regardless of whether traffic is actually
  HTTPS — getting this wrong either breaks login (cookie rejected) or ships a
  non-Secure cookie over HTTPS.

## Database Migrations

IMPORTANT: This project does NOT use Drizzle's real migration runner in production.
The container's startup command (see Dockerfile CMD) runs migrate.js, which is a
hand-written script that only creates tables it explicitly knows about via
CREATE TABLE IF NOT EXISTS statements. It does NOT read from the drizzle/ folder.

This means: whenever you add a new table to db/schema.ts, you must ALSO manually
add a matching CREATE TABLE IF NOT EXISTS statement to migrate.js, or the new table
will never actually get created in the running container's database.

You can still run `npm run db:generate` to keep drizzle/ migration files in sync
for reference, but they aren't what actually creates tables at runtime.

Also note: podman-compose up -d does NOT recreate an already-running container even
after rebuilding the image. Use `podman-compose down && podman-compose build
--no-cache && podman-compose up -d` to guarantee changes actually take effect.

## Sonarr TVDB Matching

Sonarr identifies TV series by TVDB ID, not TMDB ID (Radarr uses TMDB natively for
movies, but Sonarr does not for TV). PlexPulse converts TMDB TV IDs to TVDB IDs via
TMDB's /tv/{id}/external_ids endpoint before checking Sonarr — see lib/tmdb.ts's
getTvdbIdFromTmdb function and lib/sonarr.ts.

## Webhook Fast-Path (Radarr/Sonarr → PlexPulse)

`POST /api/webhooks/arr-import` lets Radarr/Sonarr notify PlexPulse the instant an
import/upgrade completes, so status flips to "Available" within seconds instead of
waiting for the 24h scheduled scan (`SCAN_SCHEDULE_HOURS`, `lib/scan-scheduler.ts`).
The scheduled scan is unaffected and still runs as a safety net.

Set `ARR_WEBHOOK_SECRET` and `PLEXPULSE_WEBHOOK_URL` in `.env`, then register the
webhook against all configured Radarr/Sonarr instances:

```
node --env-file=.env scripts/setup-arr-webhooks.js --dry-run   # inspect payloads first
node --env-file=.env scripts/setup-arr-webhooks.js              # register for real
```

The script introspects each instance's `GET /api/v3/notification/schema` response
rather than hardcoding field names, since these vary slightly by Servarr version —
use `--dry-run` to sanity-check the assembled payload against a real instance before
registering all of them.

**Manual webhook setup** (fallback if the script fails for a given instance):
Settings → Connect → **+** → Webhook.
- Name: `PlexPulse`
- Triggers: check only **On Import** and **On Upgrade** (leave On Grab and everything
  else unchecked)
- URL: `<PLEXPULSE_WEBHOOK_URL>/api/webhooks/arr-import?token=<ARR_WEBHOOK_SECRET>`
- Method: `POST`
- Leave auth fields blank
- Save, then use the instance's own "Test" button — PlexPulse responds 200 without
  acting on the test event.

## Environment Variables: Build-Time vs Runtime

Only two variables are needed WHEN THE IMAGE IS BUILT (docker build), because
Next.js bakes anything prefixed NEXT_PUBLIC_ directly into the browser-side
JavaScript at build time:

  NEXT_PUBLIC_APP_URL
  NEXT_PUBLIC_PLEX_CLIENT_ID

If these are missing when `docker build` runs, they become permanently blank in
that image — setting them afterward via container environment variables will NOT
fix this. A fresh docker build is required. If you're building on a machine
without a full .env file, create a minimal one first with just these two
variables before running the build.

Every other variable (TMDB_API_KEY, PLEX_SERVER_TOKEN, PLEX_CLIENT_ID, all
RADARR_*/SONARR_* variables, REDIS_URL, SESSION_SECRET) is read fresh at runtime
and can be supplied purely through the container's environment (e.g. Unraid's
Docker template UI) without needing to be present during the build.

## Additional Database Tables

Beyond `users` and `media_status`, this project also has:
- `user_requests` — tracks which specific user requested which specific title
  (separate from media_status, which tracks overall status regardless of who
  requested it). Powers the "My Requests" and admin "All Requests" pages.

Remember: since this project's migrate.js is hand-written (not a real migration
runner), any new table OR new column added to db/schema.ts must ALSO be
manually added to migrate.js, or it will never actually get created in a fresh
database. Recent example: adding avatar_url to the users table required an
ALTER TABLE statement wrapped in a try/catch (to safely no-op on databases
where the column already exists).

## Unraid Deployment Notes

Generic Unraid templates are included in unraid-templates/ in this repo. When
filling them in on your own server, never commit a version with your actual
API keys/tokens filled in — only the blank template belongs in version control.

A recurring gotcha during deployment: Unraid's "Force Update" button (or a full
stop/remove/re-add) is required to pick up a freshly built Docker image —
docker restart or stop+start alone will keep running the OLD image even after
rebuilding. Always verify with:
  docker inspect --format='{{.Image}}' plexpulse-app
  docker images plexpulse-app --format "{{.ID}}"
These two values should match after any update.

## Testing

`npm run test` runs the Vitest suite once; `npm run test:watch` runs it in watch
mode. Coverage focuses on the highest-risk logic: the rate limiter, session/CSRF
auth, the Plex library scan guard, and Plex watchlist title matching — see
AGENTS.md for the full breakdown of what each test file covers. If you edit any
of those five source files, add or update the matching test in the same change.

## Request/Availability Status Logic

- "Requested" = title found in any connected Radarr/Sonarr instance
- "Available" status is determined by checking a title's TMDB ID against a full
  scan of your Plex library's GUIDs (via /library/sections/{id}/all?includeGuids=1),
  matching both modern (`tmdb://123`) and legacy (`com.plexapp.agents.tmdb://123`)
  GUID formats. Unlike the original design, scan results are no longer held only in
  a short-lived Redis cache — they're persisted to the `plex_library_scan` SQLite
  table (one row per media type, storing the full GUID list, item count, and last
  scan outcome), so they survive container restarts and Redis flushes.
- **Self-bootstrapping**: if a status check finds no scan row yet for a media type
  (e.g. a brand-new install), it treats the library as empty for that request and
  fires off a background scan so the *next* check has real data — no manual step
  required to get the first scan going.
- **Automatic daily scan**: `lib/scan-scheduler.ts` schedules a recurring scan
  based on `SCAN_SCHEDULE_HOURS` (default 24, set to 0 to disable). On every
  startup it reads the most recent `last_scan_at` from `plex_library_scan` and
  schedules the next run for whatever's left of the interval, rather than always
  waiting a full interval after boot — so frequent container restarts/redeploys
  don't perpetually delay a scan that's actually already overdue. A short initial
  delay (5 min) is used when no prior scan exists, to let the container settle.
- **Manual rescan**: admins can trigger an on-demand scan (all media types, or a
  specific one) via `POST /api/admin/plex-scan` from the admin dashboard. It's a
  fire-and-forget call — the scan runs in the background and the endpoint responds
  immediately (202) rather than blocking on the scan's completion.
- A `scan_in_progress` flag on each row guards against overlapping scans for the
  same media type; a scan that's been "in progress" for more than 30 minutes is
  treated as stale (e.g. a crashed process) and a new one is allowed to proceed.
- Status results are additionally cached in the `media_status` database table,
  refreshed on-demand when a poster's status hasn't been checked or the cache is
  stale.
