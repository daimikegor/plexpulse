import { getDiscoverPage } from '@/lib/tmdb';
import { requireAuth } from '@/lib/session';
import { InfiniteMediaGrid } from '@/components/InfiniteMediaGrid';

export default async function SeriesPage() {
  await requireAuth();
  
  const data = await getDiscoverPage('tv', 1);
  
  return (
    <main>
      <h1 className="search-context-heading">Series</h1>
      <InfiniteMediaGrid 
        apiEndpoint="/api/discover?mediaType=tv" 
        initialResults={data.results}
        initialPage={data.page} 
        initialTotalPages={data.total_pages} 
      />
    </main>
  );
}
