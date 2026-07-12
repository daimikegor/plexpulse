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
  let personName = null;
  
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
      
      // Check if any results are persons
      const personResults = allResults.filter((item: any) => item.media_type === 'person');
      
      if (personResults.length > 0) {
        // Take the first person result as most relevant
        const person = personResults[0];
        personName = person.name;
        
        // Fetch the person's combined credits
        const personCreditsResponse = await fetch(
          `https://api.themoviedb.org/3/person/${person.id}?api_key=${API_KEY}&append_to_response=combined_credits`
        );
        
        if (personCreditsResponse.ok) {
          const personData = await personCreditsResponse.json();
          
          // Extract filmography from combined_credits
          let personFilmography = [
            ...(personData.combined_credits?.cast || []),
            ...(personData.combined_credits?.crew || [])
          ];
          
          // Deduplicate by ID
          const seenIds = new Set();
          personFilmography = personFilmography.filter(item => {
            if (seenIds.has(item.id)) {
              return false;
            }
            seenIds.add(item.id);
            return true;
          }).sort((a: any, b: any) => {
            // Sort by release date or first air date (newest first)
            const dateA = a.release_date || a.first_air_date;
            const dateB = b.release_date || b.first_air_date;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          });
          
          // Combine with original search results
          const combinedResults = [...allResults, ...personFilmography];
          
          // Filter out non-movie/tv entries and deduplicate by ID
          results = combinedResults.filter((item: any) => 
            item.media_type === 'movie' || item.media_type === 'tv'
          );
          
          // Deduplicate again after combining
          const seenIds2 = new Set();
          results = results.filter(item => {
            if (seenIds2.has(item.id)) {
              return false;
            }
            seenIds2.add(item.id);
            return true;
          });
        } else {
          // If we can't fetch person credits, just use the original search results
          results = allResults.filter((item: any) => 
            item.media_type === 'movie' || item.media_type === 'tv'
          );
        }
      } else {
        // No person results, just filter existing results
        results = allResults.filter((item: any) => 
          item.media_type === 'movie' || item.media_type === 'tv'
        );
      }
      
      console.log('Raw results count:', allResults.length);
      console.log('Filtered results count:', results.length);
      
      // Log total results from first page
      if (allResults.length > 0 && allResults[0].total_results !== undefined) {
        console.log('Total results claimed by TMDB:', allResults[0].total_results);
      }
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
        
        {personName && (
          <p className="mb-4 text-teal-300">
            Results for <span className="font-semibold">{personName}</span>
          </p>
        )}
        
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
