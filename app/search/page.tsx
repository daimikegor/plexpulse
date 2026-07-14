import { requireAuth } from '@/lib/session';
import { SearchResultsGrid } from '@/components/SearchResultsGrid';

export default async function SearchPage({
  searchParams
}: {
  searchParams: { q?: string; type?: 'all' | 'movie' | 'tv' };
}) {
  await requireAuth();
  
  const query = searchParams.q || '';
  let results = [];
  
  if (query) {
    const API_KEY = process.env.TMDB_API_KEY;
    
    if (!API_KEY) {
      throw new Error('TMDB_API_KEY is not set in environment variables');
    }
    
    // Fetch first 3 pages to get more results
    let allResults: any[] = [];
    for (let page = 1; page <= 3; page++) {
      const url = `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=${page}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch search results page ${page}: ${response.status}`);
      }
      
      const data = await response.json();
      allResults = allResults.concat(data.results || []);
    }
    
    // Deduplicate by a composite key (media_type + id), since IDs aren't
    // guaranteed unique across different media types.
    const seenKeys = new Set();
    results = allResults.filter((item: any) => {
      if (!['movie', 'tv', 'person'].includes(item.media_type)) return false;
      const key = `${item.media_type}-${item.id}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });
    
    console.log('Raw results count:', allResults.length);
    console.log('Filtered results count:', results.length);
    
    // Log total results from first page
    if (allResults.length > 0 && allResults[0].total_results !== undefined) {
      console.log('Total results claimed by TMDB:', allResults[0].total_results);
    }
  }
  
  return (
    <main>
      <h1 className="search-context-heading">Search Results</h1>
      
      {query ? (
        <p style={{ marginBottom: '1.25rem' }}>
          Showing results for: <span className="text-white">{query}</span>
        </p>
      ) : null}
      
      {results.length > 0 ? (
        <SearchResultsGrid items={results} />
      ) : (
        <p>
          {query ? 'No results found.' : 'Enter a search term to begin.'}
        </p>
      )}
    </main>
  );
}
