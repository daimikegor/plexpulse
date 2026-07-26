# Quick Start — Copy-Paste Deployments

Choose your deployment method below and follow the steps. Each option takes about **10 minutes** to get a working app.

**Not sure which to pick?**
- **Docker Compose** (recommended for most) — easiest, all-in-one
- **Unraid** — if you're running Unraid as your homelab OS
- **Manual Docker** — if you want fine-grained control over containers

---

## Prerequisites Checklist

Before starting, make sure you have:

- [ ] **Plex Media Server** running (note its IP address or hostname, e.g., `192.168.1.50`)
- [ ] **TMDB API key** (free from https://www.themoviedb.org/settings/api)
- [ ] **Radarr** — for movie request routing and status tracking
- [ ] **Sonarr** — for TV series request routing and status tracking
- [ ] **Pulsarr** — running and configured (see https://github.com/jamcalli/pulsarr for setup)
- [ ] **Docker or Docker Compose** installed (if using container options)
- [ ] **10 minutes** and a terminal

**⚠️ Important:** Radarr, Sonarr, and Pulsarr are **required** for PlexPulse to function properly. Without them, requests won't be routed and status tracking won't work.

**To find your Plex Server URL and Token:**
1. Open Plex Web and play any video
2. Click the three dots (•••) menu → "Get Info" → "View XML"
3. In the URL bar, you'll see: `http://your-plex-ip:32400?X-Plex-Token=ABC123XYZ`
   - Your Plex Server URL: `http://your-plex-ip:32400`
   - Your Plex Server Token: `ABC123XYZ`

---

## Option 1: Docker Compose (Recommended)

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/plexpulse.git
cd plexpulse
```

### Step 2: Create Your `.env` File

Copy the content below and save it as `.env` in the plexpulse directory. **Fill in your own values** (see bracketed instructions):

```bash
# === REQUIRED ===
TMDB_API_KEY=abc123def456...
# Get this from https://www.themoviedb.org/settings/api

PLEX_SERVER_URL=http://192.168.1.50:32400
# Replace with your actual Plex IP/hostname and port

PLEX_SERVER_TOKEN=your-plex-server-token-here
# From the "Get Info" > "View XML" step above

SESSION_SECRET=$(openssl rand -hex 32)
# Or generate one: openssl rand -hex 32

REDIS_PASSWORD=$(openssl rand -hex 32)
# Or generate one: openssl rand -hex 32

NEXT_PUBLIC_APP_URL=http://localhost:3000
# If you access PlexPulse from a different machine, use that IP instead:
# NEXT_PUBLIC_APP_URL=http://192.168.1.100:3000

NEXT_PUBLIC_PLEX_CLIENT_ID=PlexPulse
PLEX_CLIENT_ID=PlexPulse
# (These can stay as-is)

# === REQUIRED (for request routing and status tracking) ===
RADARR_1_URL=http://192.168.1.60:7878
RADARR_1_API_KEY=radarr-api-key-here

SONARR_1_URL=http://192.168.1.61:8989
SONARR_1_API_KEY=sonarr-api-key-here

ARR_WEBHOOK_SECRET=$(openssl rand -hex 32)
# Generate one: openssl rand -hex 32
# Used by Radarr/Sonarr to notify PlexPulse of imports

# === OPTIONAL ===
ADMIN_PLEX_IDS=
# Comma-separated Plex user IDs (e.g., 123456,789012)
# Find your ID at https://app.plex.tv/desktop after logging in — it's in the URL

SCAN_SCHEDULE_HOURS=24
# How often to scan your Plex library for new titles (0 to disable)

IS_HTTPS=false
# Set to true only if you're behind an HTTPS proxy (e.g., Cloudflare Tunnel)
```

### Step 3: Start the Application

```bash
docker compose up -d --build
```

**What this does:**
- Builds the PlexPulse Docker image
- Starts PlexPulse and Redis containers
- Creates the SQLite database

**Wait 30 seconds for startup**, then check:

```bash
docker compose logs plexpulse-app
```

You should see: `ready - started server on 0.0.0.0:3000`

### Step 4: Open PlexPulse

Open your browser to:
```
http://localhost:3000
```

(Or replace `localhost` with your server's IP if accessing from another machine)

### Step 5: Log In

Click "Sign in with Plex" and complete the PIN-based OAuth flow. **No password needed.**

---

## Option 2: Unraid

### Step 1: Build the Docker Image

SSH into your Unraid server and run:

```bash
git clone https://github.com/yourusername/plexpulse.git plexpulse-src
cd plexpulse-src
docker build -t plexpulse-app:latest .
```

This takes 2-3 minutes.

### Step 2: Add the Docker Templates

1. Copy both `.xml` files from `unraid-templates/` in the repo to:
   ```
   /boot/config/plugins/dockerMan/templates-user/
   ```
2. Restart the Unraid Docker service or refresh the web UI

### Step 3: Create a Redis Container

1. In the Unraid web UI, go to **Docker** tab
2. Click **Add Container** → select template **plexpulse-redis**
3. Fill in (or accept defaults):
   - **Name:** `plexpulse-redis`
   - **Redis password:** (generate via `openssl rand -hex 32`)
4. Click **Apply**

Wait for the container to start.

### Step 4: Create a PlexPulse Container

1. Click **Add Container** → select template **plexpulse-app**
2. Fill in environment variables:
   - **TMDB_API_KEY:** (your TMDB API key)
   - **PLEX_SERVER_URL:** (your Plex server IP, e.g., `http://10.0.0.50:32400`)
   - **PLEX_SERVER_TOKEN:** (from "Get Info" > "View XML")
   - **SESSION_SECRET:** (generate via `openssl rand -hex 32`)
   - **REDIS_PASSWORD:** (same as Step 3)
   - **NEXT_PUBLIC_APP_URL:** (e.g., `http://192.168.1.100:3000`)
   - **NEXT_PUBLIC_PLEX_CLIENT_ID:** `PlexPulse`
   - **PLEX_CLIENT_ID:** `PlexPulse`
   - **RADARR_1_URL:** (your Radarr server address)
   - **RADARR_1_API_KEY:** (your Radarr API key)
   - **SONARR_1_URL:** (your Sonarr server address)
   - **SONARR_1_API_KEY:** (your Sonarr API key)
   - **ARR_WEBHOOK_SECRET:** (generate via `openssl rand -hex 32`)
   - **IS_HTTPS:** `false` (unless behind HTTPS proxy)
3. Click **Apply**

Wait 30 seconds for startup.

### Step 5: Find the Port

Run this in Unraid terminal:

```bash
docker port plexpulse-app
```

You'll see something like:
```
3000/tcp -> 0.0.0.0:3000
```

Open your browser to that port (e.g., `http://192.168.1.100:3000`).

---

## Option 3: Manual Docker

### Step 1: Clone and Build

```bash
git clone https://github.com/yourusername/plexpulse.git
cd plexpulse
docker build -t plexpulse-app:latest .
```

### Step 2: Start Redis

```bash
docker run -d \
  --name plexpulse-redis \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --requirepass your-redis-password-here
```

Generate a secure password:
```bash
openssl rand -hex 32
```

### Step 3: Create `.env` File

Create a `.env` file (same as Option 1 above, with all required Radarr/Sonarr variables).

### Step 4: Start PlexPulse

```bash
docker run -d \
  --name plexpulse-app \
  -p 3000:3000 \
  --env-file .env \
  -e REDIS_URL="redis://:your-redis-password-here@plexpulse-redis:6379" \
  --link plexpulse-redis:plexpulse-redis \
  plexpulse-app:latest
```

### Step 5: Open PlexPulse

```
http://localhost:3000
```

---

## Troubleshooting

### "Connection refused" when accessing PlexPulse

**Symptom:** Browser shows "Cannot reach http://localhost:3000"

**Fix:**
1. Check that the container is running:
   ```bash
   docker ps | grep plexpulse-app
   ```
2. If not listed, check logs:
   ```bash
   docker compose logs plexpulse-app
   # or (manual Docker):
   docker logs plexpulse-app
   ```
3. If you see `ECONNREFUSED`, the app crashed on startup. **Most common cause:** missing or incorrect environment variables. Check the logs for the specific error.

### "Invalid Plex Server Token"

**Symptom:** App starts but login fails or says "Plex server unreachable"

**Fix:**
1. Verify your `PLEX_SERVER_URL` is correct (test it in your browser)
2. Re-copy your token from "Get Info" > "View XML" (tokens expire after copy-paste)
3. Make sure PlexPulse can reach your Plex server on the local network (not from localhost if Plex is on another machine)

### "Redis connection failed"

**Symptom:** App won't start, logs show "Error connecting to Redis"

**Fix:**
1. Check that Redis container is running:
   ```bash
   docker ps | grep redis
   ```
2. Verify `REDIS_PASSWORD` matches in both `.env` and the Redis container startup
3. Verify `REDIS_URL` in the app includes the correct password

### "TMDB API key invalid"

**Symptom:** Search returns no results or error

**Fix:**
1. Double-check your TMDB API key (copy from https://www.themoviedb.org/settings/api)
2. Confirm it's set in `.env` as `TMDB_API_KEY=abc123...` (no spaces)
3. Restart the container for env changes to take effect:
   ```bash
   docker compose restart plexpulse-app
   # or (manual Docker):
   docker restart plexpulse-app
   ```

### "Requests not being routed to Radarr/Sonarr"

**Symptom:** Watchlist items aren't being added to Radarr/Sonarr

**Fix:**
1. Verify Pulsarr is running and configured correctly (see https://github.com/jamcalli/pulsarr)
2. Check that `RADARR_1_URL`, `RADARR_1_API_KEY`, `SONARR_1_URL`, and `SONARR_1_API_KEY` are correct in PlexPulse
3. Verify your Plex watchlist is being monitored by Pulsarr
4. Check Pulsarr logs for errors

### "Status tracking not working (Requested/Available always shows as None)"

**Symptom:** Requests show status as "None" instead of "Requested" or "Available"

**Fix:**
1. Verify all Radarr and Sonarr variables are correctly set in PlexPulse
2. Check that Radarr/Sonarr instances are reachable from PlexPulse
3. Verify the API keys are correct (test them directly in Radarr/Sonarr)
4. See [SETUP.md](./SETUP.md) for webhook fast-path setup to speed up status updates

### Port 3000 already in use

**Symptom:** Container won't start or "bind: address already in use"

**Fix:**
1. Find what's using port 3000:
   ```bash
   lsof -i :3000
   # or (macOS/Linux):
   netstat -tulpn | grep 3000
   ```
2. Either:
   - Kill the conflicting process, or
   - Map PlexPulse to a different port (e.g., 3001 in docker-compose.yml or `docker run -p 3001:3000`)

### Still stuck?

See the **[SETUP.md](./SETUP.md)** troubleshooting section for more detailed info on environment variables, webhooks, and advanced configuration.

---

## Next Steps

Once PlexPulse is running:

1. **Explore** — browse trending and popular content
2. **Search** — find movies/TV shows
3. **Request** — click to add titles to your Plex watchlist
4. **Verify routing** — check that Pulsarr is routing watchlist items to Radarr/Sonarr (see https://github.com/jamcalli/pulsarr)
5. **Monitor status** — watch requests move from "Requested" to "Available" as imports complete
6. **(Admin) Set up webhooks** — see [SETUP.md](./SETUP.md#webhook-fast-path-radarrsonarr--plexpulse) for instant status updates
7. **(Admin) Manage library** — use the admin dashboard to manually rescan movies/series if needed
