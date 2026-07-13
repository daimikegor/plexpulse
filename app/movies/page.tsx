import { getDiscoverPage } from '@/lib/tmdb';
import { requireAuth } from '@/lib/session';
import { InfiniteMediaGrid } from '@/components/InfiniteMediaGrid';

export default async function MoviesPage() {
  await requireAuth();
  
  const data = await getDiscoverPage('movie', 1);
  
  return (
    <main>
      <h1 className="search-context-heading">Movies</h1>
      <InfiniteMediaGrid 
        apiEndpoint="/api/discover?mediaType=movie" 
        initialResults={data.results}
        initialPage={data.page} 
        initialTotalPages={data.total_pages} 
      />
    </main>
  );
}
