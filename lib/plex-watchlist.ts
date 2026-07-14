export async function findPlexRatingKey(title: string, year: number | undefined,
mediaType: 'movie' | 'tv', plexToken: string): Promise<string | null> {
  const searchType = mediaType === 'movie' ? 'movies' : 'tv';
  const url = `https://discover.provider.plex.tv/library/search?query=${encodeURIComponent(title)}&searchTypes=${searchType}&searchProviders=discover&includeMetadata=1`;
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Plex-Token': plexToken
      }
    });
    if (!response.ok) {
      console.error(`Plex Discover search failed: ${response.status} ${response.statusText} for query "${title}"`);
      return null;
    }
    const data = await response.json();
    const searchResults = data.MediaContainer?.SearchResults || [];
    const externalResults = searchResults.find((s: any) => s.id === 'external')?.SearchResult || [];
    
    // Try to find a result matching both title (case-insensitive) and year
    const match = externalResults.find((r: any) => {
      const meta = r.Metadata;
      if (!meta) return false;
      const metaYear = meta.year;
      const titleMatch = meta.title?.toLowerCase() === title.toLowerCase();
      const yearMatch = !year || metaYear === year;
      return titleMatch && yearMatch;
    });
    
    if (!match) {
      console.log(`No Plex Discover match found for "${title}" (${year}) among ${externalResults.length} results`);
    }
    
    if (!match?.Metadata?.guid) return null;
    // Extract ratingKey from guid, e.g. "plex://movie/5d776824..." -> "5d776824..."
    return match.Metadata.guid.split('/').pop();
  } catch (error) {
    console.error('Error searching Plex Discover:', error);
    return null;
  }
}

export async function addToPlexWatchlist(ratingKey: string, plexToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://discover.provider.plex.tv/actions/addToWatchlist?ratingKey=${ratingKey}`,
      {
        method: 'PUT',
        headers: { 'X-Plex-Token': plexToken }
      }
    );
    return response.ok;
  } catch (error) {
    console.error('Error adding to Plex watchlist:', error);
    return false;
  }
}
