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

## External Access via Cloudflare Tunnel

PlexPulse can be exposed externally the same way v2 (plex-request-hub) was —
directly through Cloudflare Tunnel, not through Nginx Proxy Manager.

1. Cloudflare Zero Trust dashboard (one.dash.cloudflare.com) -> Networks -> Tunnels
2. Select the existing tunnel -> Public Hostname tab -> Add a public hostname
3. Subdomain: plexpulse (or preferred) / Domain: mlin.ca / Service Type: HTTP /
   URL: <unraid-ip>:<port> (the internal address PlexPulse actually runs on)
4. Save

Two things to update once this is set up:

- Set IS_HTTPS=true in PlexPulse's environment variables (runtime, no rebuild
  needed) — required so session cookies get the Secure flag once traffic arrives
  over HTTPS via the tunnel.
- Rebuild the image with NEXT_PUBLIC_APP_URL set to the final public URL (e.g.
  https://plexpulse.mlin.ca) rather than the internal LAN address, since this is
  a build-time variable per the section above.

## Request/Availability Status Logic

- "Requested" = title found in any connected Radarr/Sonarr instance
- "Available" status is determined by fetching your full Plex library's TMDB guids
  (via /library/sections/{id}/all?includeGuids=1) and caching that list in Redis for
  120 seconds. This means newly added content should appear as "Available" within
  about 2 minutes, without requiring a manual cache refresh or webhook. (An earlier
  attempt used Plex's server-side guid= query filter for a lighter-weight per-title
  check, but this did not reliably return matches even for confirmed library items,
  so it was reverted in favor of this caching approach.)
- Status results are cached in the media_status database table, refreshed on-demand
  when a poster's status hasn't been checked or the cache is stale
