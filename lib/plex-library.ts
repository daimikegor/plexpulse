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
      const queryRes = await fetch(
        `${serverUrl}/library/sections/${section.key}/all?guid=tmdb://${tmdbId}&X-Plex-Token=${token}`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!queryRes.ok) continue;
      const queryData = await queryRes.json();
      const items = queryData.MediaContainer?.Metadata || [];
      if (items.length > 0) return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking Plex library:', error);
    return false;
  }
}

