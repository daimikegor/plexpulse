export async function findPlexRatingKey(title: string, year: number | undefined,
mediaType: 'movie' | 'tv', plexToken: string): Promise<string | null> {
  const searchType = mediaType === 'movie' ? 'movies' : 'tv';

  // Normalize Unicode characters that Plex Discover won't match in search queries
  // (e.g. TMDB uses … while Plex uses ...). Applied to both the query and the
  // result comparison below.
  const norm = (s: string) =>
    s.toLowerCase()
      .replace(/…/g, '...')       // ellipsis → three periods
      .replace(/[‘’]/g, "'")  // smart single quotes → apostrophe
      .replace(/[“”]/g, '"')  // smart double quotes
      .replace(/[–—]/g, '-')  // en/em dash → hyphen
      .replace(/ /g, ' ');         // non-breaking space → space

  const query = norm(title);
  const url = `https://discover.provider.plex.tv/library/search?query=${encodeURIComponent(query)}&searchTypes=${searchType}&searchProviders=discover&includeMetadata=1`;
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Plex-Token': plexToken
      }
    });
    if (!response.ok) {
      console.error(`Plex Discover search failed: ${response.status} ${response.statusText} for query "${query}"`);
      return null;
    }
    const data = await response.json();
    const searchResults = data.MediaContainer?.SearchResults || [];
    const externalResults = searchResults.find((s: any) => s.id === 'external')?.SearchResult || [];

    // Try to find a result matching both normalized title and year
    const match = externalResults.find((r: any) => {
      const meta = r.Metadata;
      if (!meta) return false;
      const metaYear = meta.year;
      const titleMatch = norm(meta.title) === norm(title);
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
