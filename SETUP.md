# PlexPulse Setup Reference

> **New to PlexPulse?** Start with [README.md](./README.md) and [QUICKSTART.md](./QUICKSTART.md) first. This page is a detailed reference for configuration, troubleshooting, and advanced setup.

---

## Environment Variables

### Quick Reference Table

| Variable | Required? | Build/Runtime | Description |
|---|---|---|---|
| `TMDB_API_KEY` | Yes | Runtime | Your TMDB API key |
| `PLEX_SERVER_URL` | Yes | Runtime | Plex server address (e.g., `http://10.0.0.50:32400`) |
| `PLEX_SERVER_TOKEN` | Yes | Runtime | Plex server access token |
| `SESSION_SECRET` | Yes | Runtime | Secret for session encryption |
| `REDIS_PASSWORD` | Yes | Runtime | Redis authentication password |
| `REDIS_URL` | Yes | Runtime | Redis connection URL (e.g., `redis://:password@redis:6379`) |
| `NEXT_PUBLIC_APP_URL` | Yes | Build | Public app URL (baked into browser bundle) |
| `NEXT_PUBLIC_PLEX_CLIENT_ID` | Yes | Build | Plex client identifier |
| `PLEX_CLIENT_ID` | Yes | Runtime | Plex client identifier (server-side) |
| `RADARR_1_URL` | Yes | Runtime | Radarr instance 1 URL (required for request routing) |
| `RADARR_1_API_KEY` | Yes | Runtime | Radarr instance 1 API key (required for request routing) |
| `SONARR_1_URL` | Yes | Runtime | Sonarr instance 1 URL (required for request routing) |
| `SONARR_1_API_KEY` | Yes | Runtime | Sonarr instance 1 API key (required for request routing) |
| `ARR_WEBHOOK_SECRET` | Yes | Runtime | Shared secret for Radarr/Sonarr webhooks (required for instant status updates) |
| `ADMIN_PLEX_IDS` | No | Runtime | Comma-separated admin Plex user IDs |
| `SCAN_SCHEDULE_HOURS` | No | Runtime | How often to scan Plex library (default: 24, 0 = disable) |
| `IS_HTTPS` | No | Runtime | Set to `true` if behind HTTPS proxy |

### Detailed Explanations

#### TMDB_API_KEY
- **What:** Your TMDB (The Movie Database) API key
- **How to get:** 
  1. Create account at https://www.themoviedb.org
  2. Go to Settings → API
  3. Copy your API key (v3 auth)
- **Example:** `abc123def456ghi789jkl012mno345pqr`

#### PLEX_SERVER_URL
- **What:** The address of your Plex Media Server
- **Format:** `http://IP:PORT` (usually `http://IP:32400`)
- **How to find:** 
  - Open Plex Web → Click username → "Account" → "Home" — Plex server IP is shown
  - Or: In Plex Web, play any video → (•••) menu → "Get Info" → "View XML" — URL bar shows your server address
- **Example:** `http://192.168.1.50:32400`

#### PLEX_SERVER_TOKEN
- **What:** Plex server's internal access token
- **How to find:**
  1. In Plex Web, play any video
  2. Click (•••) menu → "Get Info" → "View XML"
  3. Copy the `X-Plex-Token` value from the URL bar
  4. **WARNING:** Tokens are sensitive; don't commit them to Git
- **Example:** `abc123XYZdef456UVWghi789`

#### SESSION_SECRET
- **What:** Secret key for encrypting user sessions
- **How to generate:** 
  ```bash
  openssl rand -hex 32
  ```
- **Example:** `a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6`

#### REDIS_PASSWORD
- **What:** Password for Redis authentication
- **How to generate:**
  ```bash
  openssl rand -hex 32
  ```
- **Must match:** The password you set when starting the Redis container
- **Example:** `x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4z3y2x1w0`

#### REDIS_URL
- **What:** Full Redis connection string
- **Format:** `redis://:<PASSWORD>@<HOST>:<PORT>`
- **Docker Compose:** `redis://:your-password@redis:6379`
- **Manual Docker:** `redis://:your-password@plexpulse-redis:6379`
- **External Redis:** `redis://:your-password@192.168.1.100:6379`

#### NEXT_PUBLIC_APP_URL
- **What:** Public URL where users will access PlexPulse (baked into browser bundle at build time)
- **Important:** This is a **build-time variable** — if you change it, you must rebuild the Docker image
- **Docker Compose (localhost):** `http://localhost:3000`
- **Docker Compose (from another machine):** `http://192.168.1.100:3000`
- **Unraid:** `http://192.168.1.100:3000` (use your Unraid IP and mapped port)

#### PLEX_CLIENT_ID & NEXT_PUBLIC_PLEX_CLIENT_ID
- **What:** Identifier for this app when talking to Plex
- **Must match:** Both should be the same value
- **Simple value:** Just use `PlexPulse` for both

#### RADARR_1_URL / RADARR_1_API_KEY (and _2, _3 for more instances)
- **What:** Radarr server address and API key
- **Required:** Yes — PlexPulse needs this to track movie requests and handle status updates
- **How to find API key:**
  1. In Radarr web UI: Settings → General → Security → API Key (copy it)
  2. URL: http://IP:PORT of your Radarr instance
- **Example:**
  ```
  RADARR_1_URL=http://192.168.1.60:7878
  RADARR_1_API_KEY=abc123def456ghi789jkl012mno345pq
  ```

#### SONARR_1_URL / SONARR_1_API_KEY
- **What:** Sonarr server address and API key
- **Required:** Yes — PlexPulse needs this to track TV series requests and handle status updates
- **How to find API key:**
  1. In Sonarr web UI: Settings → General → Security → API Key (copy it)
  2. URL: http://IP:PORT of your Sonarr instance
- **Example:**
  ```
  SONARR_1_URL=http://192.168.1.61:8989
  SONARR_1_API_KEY=xyz789abc123def456ghi789jkl012mn
  ```

#### ARR_WEBHOOK_SECRET
- **What:** Shared secret for Radarr/Sonarr to authenticate webhook requests
- **Required:** Yes — needed for instant status updates when imports complete
- **How to generate:**
  ```bash
  openssl rand -hex 32
  ```
- **Where it's used:** PlexPulse checks this token in `POST /api/webhooks/arr-import?token=...`
- **Important note:** This must be set in BOTH your `.env` AND the Unraid template if deploying on Unraid

#### ADMIN_PLEX_IDS
- **What:** Comma-separated Plex user IDs who can access the admin dashboard
- **How to find your Plex ID:**
  1. Go to https://app.plex.tv/desktop
  2. Log in with your Plex account
  3. Look at the URL: `https://app.plex.tv/desktop?...` — if you don't see it, check the network tab in DevTools
  4. Or: Go to your profile page; your numeric ID is in the URL
- **Optional:** Leave blank if you don't want an admin dashboard
- **Example:** `12345,67890` (two users)

#### SCAN_SCHEDULE_HOURS
- **What:** How often (in hours) PlexPulse automatically scans your Plex library for new titles
- **Default:** `24` (once per day)
- **To disable:** Set to `0`
- **Why it matters:** PlexPulse uses this to keep the "Available" status accurate without manual refreshes

#### IS_HTTPS
- **What:** Whether PlexPulse is served over HTTPS
- **When to set to `true`:** Only if you're behind an HTTPS proxy (e.g., Cloudflare Tunnel, reverse proxy with SSL)
- **Default:** `false`
- **Why it matters:** Controls whether session cookies get the `Secure` flag

---

## Complete `.env` Examples

### Example 1: Docker Compose (Localhost)

```bash
TMDB_API_KEY=abc123def456ghi789jkl012mno345pqr
PLEX_SERVER_URL=http://192.168.1.50:32400
PLEX_SERVER_TOKEN=your-plex-token-here
SESSION_SECRET=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6
REDIS_PASSWORD=x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4z3y2x1w0
REDIS_URL=redis://:x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4z3y2x1w0@redis:6379
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PLEX_CLIENT_ID=PlexPulse
PLEX_CLIENT_ID=PlexPulse
RADARR_1_URL=http://192.168.1.60:7878
RADARR_1_API_KEY=radarr-api-key-here
SONARR_1_URL=http://192.168.1.61:8989
SONARR_1_API_KEY=sonarr-api-key-here
ARR_WEBHOOK_SECRET=webhook-secret-here
ADMIN_PLEX_IDS=12345
SCAN_SCHEDULE_HOURS=24
IS_HTTPS=false
```

### Example 2: Docker Compose (Network Access)

```bash
# Same as Example 1, but:
NEXT_PUBLIC_APP_URL=http://192.168.1.100:3000
# (Replace with your actual host IP)
```

### Example 3: Unraid Deployment

```bash
TMDB_API_KEY=abc123def456ghi789jkl012mno345pqr
PLEX_SERVER_URL=http://10.0.0.97:32400
PLEX_SERVER_TOKEN=your-plex-token-here
SESSION_SECRET=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6
REDIS_PASSWORD=x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4z3y2x1w0
REDIS_URL=redis://:x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4z3y2x1w0@plexpulse-redis:6379
NEXT_PUBLIC_APP_URL=http://10.0.0.97:3000
NEXT_PUBLIC_PLEX_CLIENT_ID=PlexPulse
PLEX_CLIENT_ID=PlexPulse
RADARR_1_URL=http://10.0.0.97:7878
RADARR_1_API_KEY=radarr-api-key-here
SONARR_1_URL=http://10.0.0.97:8989
SONARR_1_API_KEY=sonarr-api-key-here
ARR_WEBHOOK_SECRET=webhook-secret-here
ADMIN_PLEX_IDS=12345
SCAN_SCHEDULE_HOURS=24
IS_HTTPS=false
```

---

## Database Migrations

This project does **NOT** use Drizzle's real migration runner in production. The container startup runs `migrate.js`, a hand-written script that only creates tables it explicitly knows about via `CREATE TABLE IF NOT EXISTS`.

### Important

- When you add a new table to `db/schema.ts`, you **must also manually add** a matching `CREATE TABLE IF NOT EXISTS` statement to `migrate.js`
- If you forget, the new table will never be created in a running container
- You can still run `npm run db:generate` to keep the `drizzle/` folder in sync, but those files aren't used at runtime

### Example: Adding a New Table

1. Add to `db/schema.ts`:
   ```typescript
   export const newTable = sqliteTable('new_table', {
     id: text().primaryKey(),
     value: text(),
   });
   ```

2. Add to `migrate.js`:
   ```javascript
   db.exec(`
     CREATE TABLE IF NOT EXISTS new_table (
       id TEXT PRIMARY KEY,
       value TEXT
     );
   `);
   ```

3. Restart the container.

---

## Webhook Fast-Path (Radarr/Sonarr → PlexPulse)

When Radarr/Sonarr imports or upgrades a title, they can notify PlexPulse instantly via `POST /api/webhooks/arr-import`. This makes the status flip to "Available" within seconds instead of waiting for the next 24-hour scan.

### What You Need

1. `ARR_WEBHOOK_SECRET` — shared secret (generate via `openssl rand -hex 32`)
2. `PLEXPULSE_WEBHOOK_URL` — the URL Radarr/Sonarr use to reach PlexPulse (e.g., `http://192.168.1.100:3000`)
3. A one-time setup script run on your system

### Setup: Automated Script

1. Generate the webhook secret:
   ```bash
   openssl rand -hex 32
   ```

2. Set in `.env` (for the script to read):
   ```
   ARR_WEBHOOK_SECRET=your-generated-secret
   PLEXPULSE_WEBHOOK_URL=http://192.168.1.100:3000
   ```

3. Also set `ARR_WEBHOOK_SECRET` in your Unraid template if using Unraid (it needs to be in the running container).

4. Run the setup script:
   ```bash
   node --env-file=.env scripts/setup-arr-webhooks.js --dry-run
   # Review the output, then:
   node --env-file=.env scripts/setup-arr-webhooks.js
   ```

The script will register the webhook on all configured Radarr/Sonarr instances.

### Setup: Manual (Fallback)

If the script fails, set up manually in Radarr:

1. **Settings → Connect → + → Webhook**
2. **Name:** `PlexPulse`
3. **Triggers:** Check only **On Import** and **On Upgrade**
4. **URL:** `http://192.168.1.100:3000/api/webhooks/arr-import?token=YOUR_WEBHOOK_SECRET`
5. **Method:** `POST`
6. Click **Test** (PlexPulse will respond with 200)
7. Save

Repeat for Sonarr.

### Verify It Works

After setting up, when Radarr/Sonarr imports a title:

1. Check PlexPulse logs for "Webhook received"
2. The status should flip to "Available" within ~5 minutes (includes a retry window for Plex scanning)

---

## Deployment: Build-Time vs Runtime Variables

### Build-Time Variables (needed when `docker build` runs)

Only these two are baked into the browser bundle at build time:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_PLEX_CLIENT_ID`

If these are missing or wrong during build, setting them later won't help — you must rebuild the image.

**For Docker Compose:** include them in `.env` before running `docker compose up -d --build`.

**For Unraid:** make sure they're in the template before building the image.

### Runtime Variables (can be set anytime)

Every other variable is read fresh at runtime:

- `TMDB_API_KEY`
- `PLEX_SERVER_URL`
- `PLEX_SERVER_TOKEN`
- `SESSION_SECRET`
- `REDIS_PASSWORD`
- `REDIS_URL`
- `PLEX_CLIENT_ID`
- `RADARR_*` / `SONARR_*` variables
- `ARR_WEBHOOK_SECRET`
- `SCAN_SCHEDULE_HOURS`
- `IS_HTTPS`

**For Docker Compose:** Set in `.env`, which is loaded via `env_file:` in `docker-compose.yml`.

**For Unraid:** Set directly in the `plexpulse-app` template's environment variables. **A `.env` file on the Unraid host is ignored** — Unraid only reads from its template UI.

---

## Unraid Deployment Notes

### Initial Setup

1. Copy both `.xml` files from `unraid-templates/` to `/boot/config/plugins/dockerMan/templates-user/`
2. Build the image on your Unraid host:
   ```bash
   git clone <repo> plexpulse-src
   cd plexpulse-src
   docker build -t plexpulse-app:latest .
   ```
3. Add containers from the Unraid Docker template UI

### Rebuilding After Code Changes

**Important:** `docker restart` does not pick up a newly built image. You must:

1. Stop and remove the `plexpulse-app` container in Unraid
2. Rebuild the image:
   ```bash
   docker build -t plexpulse-app:latest --no-cache .
   ```
3. Re-add the container from the template

Or use Unraid's "Force Update" button (equivalent to stop/remove/re-add).

### Verify the Update Took Effect

```bash
docker inspect --format='{{.Image}}' plexpulse-app
docker images plexpulse-app --format "{{.ID}}"
```

These two values should match after an update.

---

## Testing

Run the test suite with:

```bash
npm run test              # Run once
npm run test:watch       # Run in watch mode
```

The suite covers:

- Rate limiting
- Session/CSRF authentication
- Plex library scanning
- Plex watchlist title matching

**Before submitting code changes** that touch these areas, run the tests to confirm nothing broke.

---

## Troubleshooting

### "Cannot connect to Plex"

**Symptom:** Login fails or "Plex server unreachable"

**Fix:**
1. Verify `PLEX_SERVER_URL` is reachable from PlexPulse container (ping it from the container)
2. Check `PLEX_SERVER_TOKEN` is current (re-copy from "Get Info" > "View XML")
3. Ensure Plex server allows remote/local connections (Plex settings)

### "Invalid TMDB API key"

**Symptom:** Search returns no results or API errors

**Fix:**
1. Double-check your key at https://www.themoviedb.org/settings/api
2. Confirm `TMDB_API_KEY=...` in `.env` (no spaces)
3. Restart the app after changing

### "Port already in use"

**Symptom:** "bind: address already in use"

**Fix:**
1. Find what's using port 3000:
   ```bash
   lsof -i :3000
   ```
2. Either kill it or map PlexPulse to a different port (modify `docker-compose.yml` or use `-p 3001:3000`)

### "Plex library scan not working"

**Symptom:** "Available" status not updating

**Fix:**
1. Verify `SCAN_SCHEDULE_HOURS` is not `0`
2. Check container logs for scan errors:
   ```bash
   docker compose logs plexpulse-app | grep -i scan
   ```
3. Manually trigger a scan from the admin dashboard (if you have admin access)

### "Redis connection failed"

**Symptom:** App won't start; logs show Redis errors

**Fix:**
1. Check Redis container is running:
   ```bash
   docker ps | grep redis
   ```
2. Verify `REDIS_PASSWORD` matches between `.env` and Redis container
3. Verify `REDIS_URL` includes the correct password and host

### "Requests not being routed to Radarr/Sonarr"

**Symptom:** Watchlist items aren't being added to Radarr/Sonarr

**Fix:**
1. Verify **Pulsarr is running and configured correctly** (see https://github.com/jamcalli/pulsarr)
2. Verify PlexPulse can reach Radarr/Sonarr (test the URLs in your browser)
3. Check that `RADARR_1_URL`, `RADARR_1_API_KEY`, `SONARR_1_URL`, and `SONARR_1_API_KEY` are correct
4. Verify your Plex watchlist is being monitored by Pulsarr
5. Check Pulsarr logs for errors

### "Webhook not triggering"

**Symptom:** "Available" status doesn't update when Radarr/Sonarr imports

**Fix:**
1. Verify webhook is registered in Radarr/Sonarr settings
2. Trigger a test webhook (Radarr/Sonarr has a "Test" button)
3. Check PlexPulse logs:
   ```bash
   docker compose logs plexpulse-app | grep -i webhook
   ```
4. Verify `ARR_WEBHOOK_SECRET` matches in both `.env` and Unraid template (if using Unraid)

### "Status tracking not working (Requested/Available always shows as None)"

**Symptom:** Requests show status as "None" instead of "Requested" or "Available"

**Fix:**
1. Verify all Radarr and Sonarr variables are correctly set in PlexPulse (`RADARR_1_URL`, `RADARR_1_API_KEY`, `SONARR_1_URL`, `SONARR_1_API_KEY`)
2. Check that Radarr/Sonarr instances are reachable from PlexPulse (test the URLs)
3. Verify the API keys are correct (test them directly in Radarr/Sonarr)
4. Ensure **Pulsarr is running** and actually routing items (without Pulsarr, nothing appears in Radarr/Sonarr)
5. See webhook fast-path setup above to speed up status updates

### Still stuck?

Check the logs and verify all Radarr/Sonarr/Pulsarr are properly configured and reachable. Most issues stem from misconfigured or unreachable downstream services.
