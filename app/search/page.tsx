import { requireAuth } from '@/lib/session';
import { SearchResultsGrid } from '@/components/SearchResultsGrid';
import { redirect } from 'next/navigation';

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
      redirect(`/person/${person.id}`);
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
