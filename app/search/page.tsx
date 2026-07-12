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
    try {
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
      
      // Filter out non-movie/tv entries
      results = allResults.filter((item: any) => 
        item.media_type === 'movie' || item.media_type === 'tv'
      );
      
      console.log('Raw results count:', allResults.length);
      console.log('Filtered results count:', results.length);
    } catch (error) {
      console.error('Error fetching search results:', error);
    }
  }
  
  return (
    <div className="min-h-screen bg-[#0E1015] text-[#F3F1EA] p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-teal-300">Search Results</h1>
        
        {query ? (
          <p className="mb-4 text-gray-400">
            Showing results for: <span className="text-white">{query}</span>
          </p>
        ) : null}
        
        {results.length > 0 ? (
          <SearchResultsGrid items={results} />
        ) : (
          <p className="text-gray-400">
            {query ? 'No results found.' : 'Enter a search term to begin.'}
          </p>
        )}
      </div>
    </div>
  );
}
