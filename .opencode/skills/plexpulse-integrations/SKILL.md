---
name: plexpulse-integrations
description: Patterns for TMDB, Radarr, Sonarr, and Plex API integrations
---

# PlexPulse Integrations

## TMDB API Pattern

1. **Check Redis**: `redis.get('tmdb:{key}')` → parse + return if found
2. **Validate API key**: log + return empty if missing
3. **Fetch**: `https://api.themoviedb.org/3/{endpoint}`
4. **Cache + Return**: `redis.setex('tmdb:{key}', TTL, data)`

### Key Patterns & TTLs

| Data | Key | TTL |
|------|-----|-----|
| Content lists | `tmdb:trending`, `tmdb:popular`, etc. | 7200s |
| Genre content | `tmdb:genre:{mediaType}:{genreId}` | 7200s |
| Genre lists | `tmdb:genres:movie`, `tmdb:genres:tv` | 86400s |
| Plex GUIDs | `plex:library:guids:{mediaType}` | 120s |

Paginated functions skip cache entirely.

### Error Handling

- Missing key: log + return `{ results: [] }`
- HTTP error: log status, return empty
- Network failure: caught, logged, return empty
- Never crash — always valid empty structure

## TVDB Conversion

Sonarr uses TVDB IDs, Radarr uses TMDB natively.
Always call `getTvdbIdFromTmdb(tmdbId)` before Sonarr queries.
Returns `null` on failure.

## Radarr

Multi-instance loop (up to 3 via `RADARR_1/2/3_URL` + `_API_KEY`):
`GET /api/v3/movie`, match by `tmdbId`. Skip failing instances.

## Sonarr

Same multi-instance loop (via `SONARR_1/2/3_*`).
First resolve TVDB ID, then `GET /api/v3/series`, match by `tvdbId`.

## Plex Library

`GET /library/sections/{id}/all?includeGuids=1`
Build `Set` of `tmdb://{tmdbId}` entries, cache in Redis 120s.
Check: `guids.has('tmdb://{tmdbId}')`.

## Media Status Orchestration

Cache check → if fresh return; stale if 'available' >24h or other >1min.
Refresh priority: Plex → Radarr/Sonarr → 'none'.
Upsert to `media_status` with `lastChecked`.
`force=1` skips cache entirely.
