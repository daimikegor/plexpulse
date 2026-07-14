# PlexPulse Setup Notes

## Environment Variables (.env)

Required variables and where to find them:

- TMDB_API_KEY — from themoviedb.org account settings, API section
- DATABASE_URL — defaults to file:./data/plexpulse.db, don't need to set manually
- NEXT_PUBLIC_APP_URL, SESSION_SECRET, NEXT_PUBLIC_PLEX_CLIENT_ID — core app/auth config
- PLEX_SERVER_URL — your Plex Media Server's address, e.g. http://10.0.0.15:32400
- PLEX_SERVER_TOKEN — Plex Media Server's own access token (different from user OAuth
  tokens). Get it by opening any item in Plex Web, "..." menu -> Get Info -> View XML,
  and copying the X-Plex-Token value from the URL.
- RADARR_1_URL / RADARR_1_API_KEY (and _2, _3 for additional instances) — each
  Radarr instance's base URL and API key. API key found in each instance's web UI:
  Settings -> General -> Security -> API Key.
- SONARR_1_URL / SONARR_1_API_KEY (and _2, _3) — same pattern as Radarr, for each
  Sonarr instance.

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

## Request/Availability Status Logic

- "Requested" = title found in any connected Radarr/Sonarr instance
- "Available" = title found directly in the Plex Media Server library (not the
  watchlist, a completely separate check) — checked live via Plex's native guid filtering
  (querying /library/sections/{id}/all?guid=tmdb://{id} directly) rather than caching the
  full library, so no manual refresh or webhook setup is required for this to stay accurate.
- Status results are cached in the media_status database table, refreshed on-demand
  when a poster's status hasn't been checked or the cache is stale
