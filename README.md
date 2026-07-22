# PlexPulse

A self-hosted media discovery and request app for your Plex server, built with
Next.js 14. Browse trending, popular, and top-rated movies/TV, search with live
results as you type, and request titles directly to your Plex watchlist — with
real-time status tracking (Requested / Available) checked against your actual
Radarr, Sonarr, and Plex library.

## Features

- Plex OAuth login (PIN-based, no password entry)
- Browse trending, popular, top rated, and upcoming movies/series
- Genre browsing with real backdrop artwork
- Infinite scroll on every list
- Live-as-you-type search across movies, TV shows, and people
- One-click request → adds to your Plex watchlist automatically
- Requests work by adding titles to your Plex watchlist — actually downloading and
  organizing them is handled by [Pulsarr](https://github.com/jamcalli/Pulsarr),
  which watches your watchlist and routes new items to Sonarr/Radarr
  automatically. PlexPulse doesn't talk to Sonarr/Radarr to *add* things directly
  (only to check status) — Pulsarr (or a similar tool) is required for requests to
  actually result in anything being downloaded.
- Live Requested/Available status, checked against Radarr, Sonarr, and your Plex
  library directly (supports multiple instances of each)
- Personal request history ("My Requests")
- Admin dashboard showing every user's request history
- Automatic daily Plex library scan (configurable, survives container restarts)
  to keep "Available" status accurate without manual refreshes
- Fully responsive — dedicated mobile layout with bottom navigation
- Real Plex avatar shown in the header

## Screenshots

_Add a few screenshots here — the dashboard, live search, and a detail modal are
good candidates to show off the Plex-themed UI. Drop images in a `docs/` or
`.github/` folder and reference them with `![Dashboard](docs/dashboard.png)`._

## Tech Stack

Next.js 14 (App Router), TypeScript, Tailwind CSS, Drizzle ORM with libSQL
(SQLite), Redis, TMDB API, Plex API, Radarr/Sonarr APIs.

## Prerequisites

- A Plex Media Server
- A [TMDB API key](https://www.themoviedb.org/settings/api) (free)
- Docker (or Podman)
- Optionally: Radarr and/or Sonarr instances, for request status tracking

## Installation

### Option 1: Docker Compose

1. Clone this repository
2. Copy `.env.example` to `.env` and fill in your values (see SETUP.md for
   where to find each one)
3. Run:
```bash
   docker compose up -d --build
```
4. Visit `http://localhost:3000`

### Option 2: Unraid

Two Unraid Community Applications-style templates are included in the
`unraid-templates/` folder — one for the app, one for a dedicated Redis instance.

1. Copy both `.xml` files from `unraid-templates/` into
   `/boot/config/plugins/dockerMan/templates-user/` on your Unraid server
2. In the Unraid UI, start `plexpulse-redis` first from the Docker tab's
   template dropdown
3. SSH into Unraid, clone this repo, and build the app image locally (this
   image is not published to a registry):
```bash
   git clone <your-fork-or-this-repo-url> plexpulse-src
   cd plexpulse-src
   docker build -t plexpulse-app:latest .
```
4. Start `plexpulse-app` from the Docker tab's template dropdown, filling in
   your environment variables (see SETUP.md for the full list and where to
   find each value)

**Important:** whenever you rebuild the image after pulling new code, use
Unraid's "Force Update" (or stop/remove and re-add the container) — a plain
restart does not pick up a newly built image. See SETUP.md for details.

### Option 3: Manual Docker

Build and run the app and Redis containers manually using the Dockerfile
included in this repo, supplying the same environment variables documented in
`.env.example` and SETUP.md.

## Security

Since PlexPulse handles Plex auth tokens and talks to your Radarr/Sonarr/Plex
instances, it's had a dedicated hardening pass:

- Origin validation on state-changing requests (watchlist adds) — rejects any
  request whose Origin/Referer doesn't match your configured app URL
- OAuth callback postMessage locked to your app's origin, not broadcast wildcard
- Nonce-based CSRF protection with one-time-use replay protection on the auth flow
- Redis-backed rate limiting (fails open on Redis outage, so an outage never
  locks out real users)
- Encrypted session storage (with legacy-format back-compat)
- Redis requires a password (`--requirepass`) rather than running open
- A Vitest suite (`npm run test`) covers all of the above — see AGENTS.md for
  the full list of what's tested

## Configuration

See [SETUP.md](./SETUP.md) for:
- The full list of environment variables and where to find each value
- Which variables must be set at build time vs. runtime (important, easy to
  get wrong)
- Database migration notes (this project uses a hand-written migration script,
  not Drizzle's built-in migration runner)
- Sonarr's TVDB ID requirement and how this project handles it
- Cloudflare Tunnel setup for external access
- Running the test suite (`npm run test`)

## Acknowledgments

- [Seerr](https://github.com/seerr-team/seerr) (formerly known as Overseerr) — design and feature inspiration for the request/discovery flow
- [TMDB](https://www.themoviedb.org/) — movie/TV metadata and artwork
- [Plex](https://www.plex.tv/) — media server and watchlist integration
- [Radarr](https://radarr.video/) / [Sonarr](https://sonarr.tv/) — status checks against your download automation
- [Pulsarr](https://github.com/jamcalli/Pulsarr) — watches the Plex watchlist and routes requests to Radarr/Sonarr

## License

Personal project, not currently licensed for redistribution.
