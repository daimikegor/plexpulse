import { getTrendingMovies } from '@/lib/tmdb';
import { requireAuth } from '@/lib/session';
import { TrendingSection } from '@/components/TrendingSection';

export default async function MoviesPage() {
  await requireAuth();
  
  const moviesData = await getTrendingMovies();
  
  return (
    <main>
      <TrendingSection 
        trendingData={moviesData} 
        heading="Trending Movies" 
        rowId="movies-row" 
      />
    </main>
  );
}
