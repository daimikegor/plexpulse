import { db } from '@/lib/db';
import { mediaStatus } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { checkRadarrForMovie } from '@/lib/radarr';
import { checkSonarrForShow } from '@/lib/sonarr';
import { checkPlexLibrary } from '@/lib/plex-library';

export type MediaStatusKey = `${'movie' | 'tv'}-${string}`;

export function makeKey(mediaType: 'movie' | 'tv', tmdbId: string): MediaStatusKey {
  return `${mediaType}-${tmdbId}`;
}

export async function refreshMediaStatus(tmdbId: string, mediaType: 'movie' | 'tv'): Promise<'none' | 'requested' | 'available'> {
  const id = `${mediaType}-${tmdbId}`;

  const inPlex = await checkPlexLibrary(tmdbId, mediaType);
  let status: 'none' | 'requested' | 'available' = 'none';

  if (inPlex) {
    status = 'available';
  } else {
    const inArr = mediaType === 'movie'
      ? await checkRadarrForMovie(tmdbId)
      : await checkSonarrForShow(tmdbId);
    if (inArr) status = 'requested';
  }

  await db.insert(mediaStatus).values({
    id,
    tmdbId,
    mediaType,
    status,
    lastChecked: new Date(),
  }).onConflictDoUpdate({
    target: mediaStatus.id,
    set: { status, lastChecked: new Date() },
  });

  return status;
}

export async function getCachedMediaStatus(tmdbId: string, mediaType: 'movie' | 'tv'): Promise<'none' | 'requested' | 'available' | null> {
  const id = `${mediaType}-${tmdbId}`;
  const result = await db.select().from(mediaStatus).where(eq(mediaStatus.id, id)).get();
  if (!result) return null;
  const staleThreshold = result.status === 'available'
    ? 24 * 60 * 60 * 1000     // 24 hours — library availability rarely changes on its own
    : result.status === 'requested'
      ? 5 * 60 * 1000          // 5 minutes — download progress updates matter, but not every second
      : 30 * 60 * 1000;        // 30 minutes — long enough to debounce, short enough to self-correct
  const cutoff = new Date(Date.now() - staleThreshold);
  if (new Date(result.lastChecked) < cutoff) return null;
  return result.status as 'none' | 'requested' | 'available';
}

// ---------------------------------------------------------------------------
// Batch helpers — used by POST /api/media-status/batch
// ---------------------------------------------------------------------------

interface BatchItem {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
}

/**
 * Check the SQLite cache for many items in a single query.
 *
 * Returns a Map from {@link MediaStatusKey} to the cached status, or `null` for
 * items whose cached value is missing or stale.
 */
export async function getCachedMediaStatusBatch(
  items: BatchItem[],
): Promise<Map<MediaStatusKey, 'none' | 'requested' | 'available' | null>> {
  const result = new Map<MediaStatusKey, 'none' | 'requested' | 'available' | null>();

  if (items.length === 0) return result;

  // Build composite keys: "movie-123", "tv-456"
  const keys = items.map(i => makeKey(i.mediaType, i.tmdbId));

  // Initialize all entries to null (miss)
  for (const key of keys) {
    result.set(key, null);
  }

  // Query all rows in one SELECT … WHERE id IN (…)
  const rows = await db
    .select()
    .from(mediaStatus)
    .where(inArray(mediaStatus.id, keys))
    .all();

  // Apply per-status staleness thresholds
  const thresholds: Record<string, number> = {
    available: 24 * 60 * 60 * 1000,  // 24 hours
    requested: 5 * 60 * 1000,        // 5 minutes
    none: 30 * 60 * 1000,            // 30 minutes
  };

  const cutoffByStatus: Record<string, Date> = {
    available: new Date(Date.now() - thresholds.available),
    requested: new Date(Date.now() - thresholds.requested),
    none: new Date(Date.now() - thresholds.none),
  };

  for (const row of rows) {
    const key = row.id as MediaStatusKey;
    const cutoff = cutoffByStatus[row.status] ?? cutoffByStatus.none;
    if (new Date(row.lastChecked) >= cutoff) {
      result.set(key, row.status as 'none' | 'requested' | 'available');
    }
    // else: stale — leave as null so it gets refreshed
  }

  return result;
}

/**
 * Refresh many media statuses in parallel.
 *
 * Each item is checked independently against Plex + Radarr/Sonarr.  Failures
 * are caught per-item — a single broken external call will not affect others.
 *
 * Returns a Map from {@link MediaStatusKey} to the fresh status.
 */
export async function refreshMediaStatusBatch(
  items: BatchItem[],
): Promise<Map<MediaStatusKey, 'none' | 'requested' | 'available'>> {
  const result = new Map<MediaStatusKey, 'none' | 'requested' | 'available'>();

  if (items.length === 0) return result;

  const settled = await Promise.allSettled(
    items.map(item => refreshMediaStatus(item.tmdbId, item.mediaType)),
  );

  for (let i = 0; i < items.length; i++) {
    const key = makeKey(items[i].mediaType, items[i].tmdbId);
    const s = settled[i];
    result.set(
      key,
      s.status === 'fulfilled' ? s.value : 'none',
    );
  }

  return result;
}
