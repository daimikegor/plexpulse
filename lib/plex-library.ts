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
            const tmdbGuid = item.Guid?.find((g: any) => g.id?.startsWith('tmdb://'));
            if (tmdbGuid) allGuids.push(tmdbGuid.id);
          }
          
          // Check if we've retrieved all items
          const totalSize = itemsData.MediaContainer?.totalSize || 0;
          const returnedSize = itemsData.MediaContainer?.size || items.length;
          
          if (returnedSize < size || start + size >= totalSize) {
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

  await redis.setex(cacheKey, 120, JSON.stringify(allGuids));
  return new Set(allGuids);
}

export async function checkPlexLibrary(tmdbId: string, mediaType: 'movie' | 'tv'): Promise<boolean> {
  const guids = await getPlexLibraryGuids(mediaType);
  return guids.has(`tmdb://${tmdbId}`);
}

