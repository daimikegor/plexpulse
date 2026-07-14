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
      const movieOrTvResults = allResults.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');

      // Only treat this as a "person search" if the best-matching person result
      // ranks higher (appears earlier) in the results than the best-matching
      // movie/tv result — otherwise a coincidental person match shouldn't hijack
      // a search that's really about a movie or show.
      const firstPersonIndex = allResults.findIndex((item: any) => item.media_type === 'person');
      const firstMovieOrTvIndex = allResults.findIndex((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
      const isPersonSearch = personResults.length > 0 &&
        (firstMovieOrTvIndex === -1 || firstPersonIndex < firstMovieOrTvIndex);

      if (isPersonSearch) {
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

          personFilmography = personFilmography.filter((item: any) => {
            const genreIds = item.genre_ids || [];
            return !genreIds.includes(10767) && !genreIds.includes(10763);
          });
          
          // When we've identified a specific person, show ONLY their actual
          // filmography, not raw fuzzy text search matches (which can include
          // unrelated titles that just happen to share a word with the query).
          results = personFilmography.filter((item: any) => 
            item.media_type === 'movie' || item.media_type === 'tv'
          );
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
