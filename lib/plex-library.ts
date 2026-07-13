export async function checkPlexLibrary(tmdbId: string, mediaType: 'movie' | 'tv'): Promise<boolean> {
  try {
    const serverUrl = process.env.PLEX_SERVER_URL;
    const token = process.env.PLEX_SERVER_TOKEN;
    if (!serverUrl || !token) return false;

    // Check cache first
    const cacheKey = `plex:library:guids:${mediaType}`;
    const cachedGuids = await redis.get(cacheKey);
    if (cachedGuids) {
      const guids = JSON.parse(cachedGuids);
      return guids.includes(tmdbId);
    }

    // Cache miss, fetch from Plex
    const sectionsRes = await fetch(
      `${serverUrl}/library/sections?X-Plex-Token=${token}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!sectionsRes.ok) return false;
    const sectionsData = await sectionsRes.json();
    const sections = sectionsData.MediaContainer?.Directory || [];

    const targetType = mediaType === 'movie' ? 'movie' : 'show';
    const relevantSections = sections.filter((s: any) => s.type === targetType);

    const guids: string[] = [];
    for (const section of relevantSections) {
      const itemsRes = await fetch(
        `${serverUrl}/library/sections/${section.key}/all?includeGuids=1&X-Plex-Token=${token}`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!itemsRes.ok) continue;
      const itemsData = await itemsRes.json();
      const items = itemsData.MediaContainer?.Metadata || [];
      for (const item of items) {
        const guid = item.Guid?.find((g: any) => g.id.startsWith('tmdb://'));
        if (guid) {
          const tmdbIdFromGuid = guid.id.replace('tmdb://', '');
          guids.push(tmdbIdFromGuid);
        }
      }
    }

    // Cache indefinitely
    await redis.set(cacheKey, JSON.stringify(guids));

    return guids.includes(tmdbId);
  } catch (error) {
    console.error('Error checking Plex library:', error);
    return false;
  }
}

export async function invalidatePlexLibraryCache(): Promise<void> {
  await redis.del('plex:library:guids:movie');
  await redis.del('plex:library:guids:tv');
}
