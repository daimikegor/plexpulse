import { requireAuth } from '@/lib/session';
import { SearchResultsGrid } from '@/components/SearchResultsGrid';

export default async function SearchPage({
  searchParams
}: {
  searchParams: { q?: string; type?: 'all' | 'movie' | 'tv' };
}) {
  await requireAuth();
  
  const query = searchParams.q || '';
  const type = searchParams.type || 'all';
  
  let results = [];
  
  if (query) {
    try {
      const API_KEY = process.env.TMDB_API_KEY;
      
      if (!API_KEY) {
        throw new Error('TMDB_API_KEY is not set in environment variables');
      }
      
      let url = '';
      
      if (type === 'all') {
        url = `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
      } else {
        url = `https://api.themoviedb.org/3/search/${type}?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch search results: ${response.status}`);
      }
      
      const data = await response.json();
      results = (data.results || []).filter((item: any) => item.media_type !== 'person');
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
        
        <div className="flex gap-2 mb-6">
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              type === 'all'
                ? 'bg-teal-500 text-white'
                : 'bg-[#0E1015] text-gray-300 hover:bg-[#2A2D35]'
            }`}
          >
            All
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              type === 'movie'
                ? 'bg-teal-500 text-white'
                : 'bg-[#0E1015] text-gray-300 hover:bg-[#2A2D35]'
            }`}
          >
            Movies
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              type === 'tv'
                ? 'bg-teal-500 text-white'
                : 'bg-[#0E1015] text-gray-300 hover:bg-[#2A2D35]'
            }`}
          >
            Series
          </button>
        </div>
        
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
