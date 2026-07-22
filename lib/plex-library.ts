import { db } from '@/lib/db';
import { plexLibraryScan } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

// Track which media types we've auto-triggered a scan for in this process
// lifetime. Prevents spawning duplicate scans on every request until the
// first one completes.
const autoScanTriggered = new Set<string>();

async function getPlexLibraryGuids(mediaType: 'movie' | 'tv'): Promise<Set<string>> {
  const row = await db
    .select()
    .from(plexLibraryScan)
    .where(eq(plexLibraryScan.id, mediaType))
    .get();

  if (row) {
    return new Set(JSON.parse(row.guids));
  }

  // No scan data yet — auto-trigger a background scan so the next request
  // (in a few seconds) finds data.  Guard so we only fire once per process
  // lifetime per media type.
  if (!autoScanTriggered.has(mediaType)) {
    autoScanTriggered.add(mediaType);
    runPlexLibraryScan(mediaType).catch((err) => {
      console.error('Auto-bootstrap Plex scan failed:', err);
    });
  }

  return new Set<string>();
}

export async function checkPlexLibrary(tmdbId: string, mediaType: 'movie' | 'tv'): Promise<boolean> {
  const guids = await getPlexLibraryGuids(mediaType);
  return guids.has(tmdbId);
}

export async function runPlexLibraryScan(mediaType?: 'movie' | 'tv'): Promise<void> {
  const types: ('movie' | 'tv')[] = mediaType ? [mediaType] : ['movie', 'tv'];

  await Promise.all(types.map((type) => scanOneMediaType(type)));
}

async function scanOneMediaType(mediaType: 'movie' | 'tv'): Promise<void> {
  // Concurrency guard: atomically claim the scan slot.  If another scan is
  // already in progress for this media type, skip silently.
  const claimed = await db
    .update(plexLibraryScan)
    .set({ scanInProgress: true, lastScanAt: new Date() })
    .where(
      sql`${plexLibraryScan.id} = ${mediaType} AND (${plexLibraryScan.scanInProgress} = 0 OR ${plexLibraryScan.scanInProgress} IS NULL)`,
    )
    .returning();

  if (claimed.length === 0) {
    // Another scan is already running — nothing to do.
    return;
  }

  const serverUrl = process.env.PLEX_SERVER_URL;
  const token = process.env.PLEX_SERVER_TOKEN;
  const allGuids: string[] = [];

  if (!serverUrl || !token) {
    await finalizeScan(mediaType, allGuids, false, 'PLEX_SERVER_URL or PLEX_SERVER_TOKEN not configured');
    return;
  }

  try {
    const sectionsRes = await fetch(`${serverUrl}/library/sections`, {
      headers: { 'Accept': 'application/json', 'X-Plex-Token': token },
    });

    if (sectionsRes.ok) {
      const sectionsData = await sectionsRes.json();
      const sections = sectionsData.MediaContainer?.Directory || [];
      const targetType = mediaType === 'movie' ? 'movie' : 'show';
      const relevantSections = sections.filter((s: any) => s.type === targetType);

      for (const section of relevantSections) {
        let start = 0;
        const size = 100;
        let hasMore = true;

        while (hasMore) {
          const itemsRes = await fetch(
            `${serverUrl}/library/sections/${section.key}/all?includeGuids=1&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${size}`,
            { headers: { 'Accept': 'application/json', 'X-Plex-Token': token } },
          );

          if (!itemsRes.ok) break;

          const itemsData = await itemsRes.json();
          const items = itemsData.MediaContainer?.Metadata || [];

          for (const item of items) {
            // Match both modern (tmdb://123) and legacy
            // (com.plexapp.agents.tmdb://123?lang=en) formats
            const tmdbGuid = item.Guid?.find((g: any) => {
              const id = g.id || '';
              return id.includes('tmdb://');
            });
            if (tmdbGuid) {
              const match = tmdbGuid.id.match(/tmdb:\/\/(\d+)/);
              if (match) allGuids.push(match[1]);
            }
          }

          const totalSize = itemsData.MediaContainer?.totalSize;
          const returnedSize = itemsData.MediaContainer?.size || items.length;

          if (returnedSize === 0 || returnedSize < size || (totalSize != null && start + size >= totalSize)) {
            hasMore = false;
          } else {
            start += size;
          }
        }
      }
    }

    await finalizeScan(mediaType, allGuids, true, null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Plex library scan failed for ${mediaType}:`, message);
    await finalizeScan(mediaType, allGuids, false, message);
  }
}

async function finalizeScan(
  mediaType: 'movie' | 'tv',
  guids: string[],
  success: boolean,
  error: string | null,
): Promise<void> {
  const now = new Date();

  // Build the row shape Drizzle expects — match the schema exactly.
  const row = {
    id: mediaType,
    mediaType,
    guids: JSON.stringify(guids),
    itemCount: guids.length,
    lastScanAt: now,
    lastScanSuccess: success,
    lastScanError: error,
    scanInProgress: false,
  };

  await db
    .insert(plexLibraryScan)
    .values(row)
    .onConflictDoUpdate({
      target: plexLibraryScan.id,
      set: {
        guids: row.guids,
        itemCount: row.itemCount,
        lastScanAt: row.lastScanAt,
        lastScanSuccess: row.lastScanSuccess,
        lastScanError: row.lastScanError,
        scanInProgress: row.scanInProgress,
      },
    });
}
