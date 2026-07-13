export async function checkPlexLibrary(tmdbId: string, mediaType: 'movie' | 'tv'): Promise<boolean> {
  try {
    const serverUrl = process.env.PLEX_SERVER_URL;
    const token = process.env.PLEX_SERVER_TOKEN;
    if (!serverUrl || !token) return false;

    const sectionsRes = await fetch(
      `${serverUrl}/library/sections?X-Plex-Token=${token}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!sectionsRes.ok) return false;
    const sectionsData = await sectionsRes.json();
    const sections = sectionsData.MediaContainer?.Directory || [];

    const targetType = mediaType === 'movie' ? 'movie' : 'show';
    const relevantSections = sections.filter((s: any) => s.type === targetType);

    for (const section of relevantSections) {
      const itemsRes = await fetch(
        `${serverUrl}/library/sections/${section.key}/all?includeGuids=1&X-Plex-Token=${token}`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!itemsRes.ok) continue;
      const itemsData = await itemsRes.json();
      const items = itemsData.MediaContainer?.Metadata || [];
      const found = items.find((item: any) =>
        item.Guid?.some((g: any) => g.id === `tmdb://${tmdbId}`)
      );
      if (found) return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking Plex library:', error);
    return false;
  }
}
