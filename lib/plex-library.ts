import { redis } from './redis';

async function getPlexLibraryGuids(mediaType: 'movie' | 'tv'): Promise<Set<string>> {
  const cacheKey = `plex:library:guids:${mediaType}`;
  const cached = await redis.get(cacheKey);
  if (cached) return new Set(JSON.parse(cached));

  const serverUrl = process.env.PLEX_SERVER_URL;
  const token = process.env.PLEX_SERVER_TOKEN;
  const allGuids: string[] = [];
  if (!serverUrl || !token) return new Set(allGuids);

  try {
    const sectionsRes = await fetch(
      `${serverUrl}/library/sections`,
      { headers: { 'Accept': 'application/json', 'X-Plex-Token': token } }
    );
    if (sectionsRes.ok) {
      const sectionsData = await sectionsRes.json();
      const sections = sectionsData.MediaContainer?.Directory || [];
      const targetType = mediaType === 'movie' ? 'movie' : 'show';
      const relevantSections = sections.filter((s: any) => s.type === targetType);

      for (const section of relevantSections) {
        let start = 0;
        const size = 100; // Plex default page size
        let hasMore = true;
        
        while (hasMore) {
          const itemsRes = await fetch(
            `${serverUrl}/library/sections/${section.key}/all?includeGuids=1&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${size}`,
            { headers: { 'Accept': 'application/json', 'X-Plex-Token': token } }
          );
          if (!itemsRes.ok) break;
          
          const itemsData = await itemsRes.json();
          const items = itemsData.MediaContainer?.Metadata || [];
          
          for (const item of items) {
            // Match both modern (tmdb://123) and legacy (com.plexapp.agents.tmdb://123?lang=en) formats
            const tmdbGuid = item.Guid?.find((g: any) => {
              const id = g.id || '';
              return id.includes('tmdb://');
            });
            if (tmdbGuid) {
              const match = tmdbGuid.id.match(/tmdb:\/\/(\d+)/);
              if (match) allGuids.push(match[1]);
            }
          }
          
          // Check if we've retrieved all items
          const totalSize = itemsData.MediaContainer?.totalSize;
          const returnedSize = itemsData.MediaContainer?.size || items.length;

          // Stop if: empty page, page smaller than requested, or we know we've covered totalSize
          if (returnedSize === 0 || returnedSize < size || (totalSize != null && start + size >= totalSize)) {
            hasMore = false;
          } else {
            start += size;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error building Plex library guid cache:', error);
  }

  // Only cache if we got results — empty cache would poison status checks for 2 min
  if (allGuids.length > 0) {
    await redis.setex(cacheKey, 120, JSON.stringify(allGuids));
  } else {
    console.warn('Plex library GUID scan returned zero results — not caching');
  }
  return new Set(allGuids);
}

export async function checkPlexLibrary(tmdbId: string, mediaType: 'movie' | 'tv'): Promise<boolean> {
  const guids = await getPlexLibraryGuids(mediaType);
  return guids.has(tmdbId);
}

