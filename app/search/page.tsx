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
      
      const url = `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch search results: ${response.status}`);
      }
      
      const data = await response.json();
      results = (data.results || []).filter((item: any) => 
        item.media_type === 'movie' || item.media_type === 'tv'
      );
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
