import { db } from '@/lib/db';
import { plexLibraryScan } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
    console.log(`[plex-scan] Auto-bootstrapping initial scan for ${mediaType}`);
    runPlexLibraryScan(mediaType).catch((err) => {
      console.error('[plex-scan] Auto-bootstrap scan failed:', err);
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
  console.log(`[plex-scan] Scan requested for: ${types.join(', ')}`);

  await Promise.all(types.map((type) => scanOneMediaType(type)));

  console.log(`[plex-scan] Scan completed for: ${types.join(', ')}`);
}

async function scanOneMediaType(mediaType: 'movie' | 'tv'): Promise<void> {
  console.log(`[plex-scan] ${mediaType}: starting scan`);

  // ── Concurrency guard ───────────────────────────────────────────────
  // On the first-ever scan there is no row in the table, so an UPDATE
  // matches nothing.  We use a SELECT → INSERT-or-UPDATE pattern instead.
  const existing = await db
    .select()
    .from(plexLibraryScan)
    .where(eq(plexLibraryScan.id, mediaType))
    .get();

  const STALE_SCAN_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
  if (existing && existing.scanInProgress) {
    const age = Date.now() - existing.lastScanAt.getTime();
    if (age < STALE_SCAN_THRESHOLD_MS) {
      console.log(`[plex-scan] ${mediaType}: scan already in progress — skipping`);
      return;
    }
    console.warn(
      `[plex-scan] ${mediaType}: stale scanInProgress detected ` +
      `(${Math.round(age / 1000)}s old) — clearing and proceeding`,
    );
    // Fall through — the upsert below will re-claim the slot
  }

  // Claim the slot.  Upsert so it works whether or not a row exists yet.
  await db
    .insert(plexLibraryScan)
    .values({
      id: mediaType,
      mediaType,
      guids: existing ? existing.guids : '[]',
      itemCount: existing ? existing.itemCount : 0,
      lastScanAt: new Date(),
      lastScanSuccess: existing ? existing.lastScanSuccess : false,
      lastScanError: existing ? existing.lastScanError : null,
      scanInProgress: true,
    })
    .onConflictDoUpdate({
      target: plexLibraryScan.id,
      set: { scanInProgress: true, lastScanAt: new Date() },
    });

  console.log(`[plex-scan] ${mediaType}: scan slot claimed`);

  // ── Scan ────────────────────────────────────────────────────────────
  const serverUrl = process.env.PLEX_SERVER_URL;
  const token = process.env.PLEX_SERVER_TOKEN;
  const allGuids: string[] = [];

  if (!serverUrl || !token) {
    console.error(`[plex-scan] ${mediaType}: PLEX_SERVER_URL or PLEX_SERVER_TOKEN not configured`);
    await finalizeScan(mediaType, allGuids, false, 'PLEX_SERVER_URL or PLEX_SERVER_TOKEN not configured');
    return;
  }

  console.log(`[plex-scan] ${mediaType}: fetching library sections from ${serverUrl}`);

  try {
    const sectionsRes = await fetch(`${serverUrl}/library/sections`, {
      headers: { 'Accept': 'application/json', 'X-Plex-Token': token },
    });

    if (!sectionsRes.ok) {
      console.error(`[plex-scan] ${mediaType}: sections request failed HTTP ${sectionsRes.status}`);
      await finalizeScan(mediaType, allGuids, false, `Plex API returned HTTP ${sectionsRes.status} for /library/sections`);
      return;
    }

    const sectionsData = await sectionsRes.json();
    const sections = sectionsData.MediaContainer?.Directory || [];
    const targetType = mediaType === 'movie' ? 'movie' : 'show';
    const relevantSections = sections.filter((s: any) => s.type === targetType);

    console.log(`[plex-scan] ${mediaType}: found ${relevantSections.length} ${targetType} section(s)`);

    for (const section of relevantSections) {
      console.log(`[plex-scan] ${mediaType}: scanning section "${section.title}" (key=${section.key})`);
      let start = 0;
      const size = 100;
      let hasMore = true;
      let pageCount = 0;

      while (hasMore) {
        pageCount++;
        const itemsRes = await fetch(
          `${serverUrl}/library/sections/${section.key}/all?includeGuids=1&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${size}`,
          { headers: { 'Accept': 'application/json', 'X-Plex-Token': token } },
        );

        if (!itemsRes.ok) {
          console.error(`[plex-scan] ${mediaType}: items request failed HTTP ${itemsRes.status} (section ${section.key}, page ${pageCount})`);
          break;
        }

        const itemsData = await itemsRes.json();
        const items = itemsData.MediaContainer?.Metadata || [];
        let tmdbFoundOnPage = 0;

        for (const item of items) {
          // Match both modern (tmdb://123) and legacy
          // (com.plexapp.agents.tmdb://123?lang=en) formats
          const tmdbGuid = item.Guid?.find((g: any) => {
            const id = g.id || '';
            return id.includes('tmdb://');
          });
          if (tmdbGuid) {
            const match = tmdbGuid.id.match(/tmdb:\/\/(\d+)/);
            if (match) {
              allGuids.push(match[1]);
              tmdbFoundOnPage++;
            }
          }
        }

        const totalSize = itemsData.MediaContainer?.totalSize;
        const returnedSize = itemsData.MediaContainer?.size || items.length;

        console.log(`[plex-scan] ${mediaType}: page ${pageCount} — ${returnedSize} items, ${tmdbFoundOnPage} TMDB IDs extracted (total: ${allGuids.length}/${totalSize ?? '?'})`);

        if (returnedSize === 0 || returnedSize < size || (totalSize != null && start + size >= totalSize)) {
          hasMore = false;
        } else {
          start += size;
        }
      }
    }

    console.log(`[plex-scan] ${mediaType}: scan finished — ${allGuids.length} total TMDB IDs`);
    await finalizeScan(mediaType, allGuids, true, null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[plex-scan] ${mediaType}: scan threw an error:`, error);
    await finalizeScan(mediaType, allGuids, false, message);
  }
}

// ---------------------------------------------------------------------------
// Live single-item lookup — used by the arr-import webhook fast path to check
// Plex directly instead of waiting on the periodic full-library scan/snapshot
// above. Deliberately does not read or write plexLibraryScan in any way.
// ---------------------------------------------------------------------------

function extractTmdbIdFromGuids(guids: { id: string }[] | undefined): string | null {
  const tmdbGuid = guids?.find((g) => (g.id || '').includes('tmdb://'));
  if (!tmdbGuid) return null;
  const match = tmdbGuid.id.match(/tmdb:\/\/(\d+)/);
  return match ? match[1] : null;
}

async function getRelevantSectionKeys(
  serverUrl: string,
  token: string,
  mediaType: 'movie' | 'tv',
): Promise<string[]> {
  const sectionsRes = await fetch(`${serverUrl}/library/sections`, {
    headers: { 'Accept': 'application/json', 'X-Plex-Token': token },
  });
  if (!sectionsRes.ok) return [];

  const sectionsData = await sectionsRes.json();
  const sections = sectionsData.MediaContainer?.Directory || [];
  const targetType = mediaType === 'movie' ? 'movie' : 'show';
  return sections.filter((s: any) => s.type === targetType).map((s: any) => s.key);
}

/**
 * Checks Plex directly for a single tmdbId, without touching the
 * plexLibraryScan snapshot. Only looks at each relevant section's most
 * recently added items (bounded, not a full library walk) — appropriate for
 * checking "did the title I just imported show up in Plex yet", not for
 * general library membership checks (use checkPlexLibrary for that).
 *
 * TV note: Plex's recentlyAdded for a show-type section returns episodes,
 * whose own Guids are episode-level TMDB ids, not the series'. Each unique
 * episode's parent show is resolved via its own metadata lookup to get the
 * series-level Guid instead.
 */
export async function checkPlexLibraryLive(tmdbId: string, mediaType: 'movie' | 'tv'): Promise<boolean> {
  const serverUrl = process.env.PLEX_SERVER_URL;
  const token = process.env.PLEX_SERVER_TOKEN;

  if (!serverUrl || !token) {
    console.error('[plex-live-check] PLEX_SERVER_URL or PLEX_SERVER_TOKEN not configured');
    return false;
  }

  try {
    const sectionKeys = await getRelevantSectionKeys(serverUrl, token, mediaType);

    if (mediaType === 'movie') {
      for (const key of sectionKeys) {
        const res = await fetch(
          `${serverUrl}/library/sections/${key}/recentlyAdded?includeGuids=1&X-Plex-Container-Size=100&X-Plex-Container-Start=0`,
          { headers: { 'Accept': 'application/json', 'X-Plex-Token': token } },
        );
        if (!res.ok) continue;

        const data = await res.json();
        const items = data.MediaContainer?.Metadata || [];
        for (const item of items) {
          if (extractTmdbIdFromGuids(item.Guid) === tmdbId) return true;
        }
      }
      return false;
    }

    // TV: resolve each unique recently-added episode's parent show and check
    // the show's own Guids instead of the episode's.
    const checkedShowKeys = new Set<string>();
    for (const key of sectionKeys) {
      const res = await fetch(
        `${serverUrl}/library/sections/${key}/recentlyAdded?includeGuids=1&X-Plex-Container-Size=100&X-Plex-Container-Start=0`,
        { headers: { 'Accept': 'application/json', 'X-Plex-Token': token } },
      );
      if (!res.ok) continue;

      const data = await res.json();
      const episodes = data.MediaContainer?.Metadata || [];

      for (const episode of episodes) {
        const showKey = episode.grandparentRatingKey;
        if (!showKey || checkedShowKeys.has(showKey)) continue;
        checkedShowKeys.add(showKey);

        const showRes = await fetch(`${serverUrl}/library/metadata/${showKey}?includeGuids=1`, {
          headers: { 'Accept': 'application/json', 'X-Plex-Token': token },
        });
        if (!showRes.ok) continue;

        const showData = await showRes.json();
        const show = showData.MediaContainer?.Metadata?.[0];
        if (show && extractTmdbIdFromGuids(show.Guid) === tmdbId) return true;
      }
    }
    return false;
  } catch (error) {
    console.error('[plex-live-check] error:', error);
    return false;
  }
}

async function finalizeScan(
  mediaType: 'movie' | 'tv',
  guids: string[],
  success: boolean,
  error: string | null,
): Promise<void> {
  const now = new Date();

  console.log(`[plex-scan] ${mediaType}: finalizing — success=${success}, guids=${guids.length}` +
    (error ? `, error="${error}"` : ''));

  await db
    .insert(plexLibraryScan)
    .values({
      id: mediaType,
      mediaType,
      guids: JSON.stringify(guids),
      itemCount: guids.length,
      lastScanAt: now,
      lastScanSuccess: success,
      lastScanError: error,
      scanInProgress: false,
    })
    .onConflictDoUpdate({
      target: plexLibraryScan.id,
      set: {
        guids: JSON.stringify(guids),
        itemCount: guids.length,
        lastScanAt: now,
        lastScanSuccess: success,
        lastScanError: error,
        scanInProgress: false,
      },
    });

  console.log(`[plex-scan] ${mediaType}: finalized and written to DB`);
}
