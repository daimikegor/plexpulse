import { requireAuth } from '@/lib/session';
import { getGenreContentPage } from '@/lib/tmdb';
import { InfiniteMediaGrid } from '@/components/InfiniteMediaGrid';

export default async function GenrePage({
  params,
  searchParams
}: {
  params: { mediaType: string; id: string };
  searchParams: { name?: string };
}) {
  await requireAuth();
  
  const data = await getGenreContentPage(params.mediaType as 'movie' | 'tv', params.id, 1);
  const genreName = searchParams.name || 'Genre';
  
  return (
    <main>
      <h1 className="search-context-heading">
        {genreName} {params.mediaType === 'movie' ? 'Movies' : 'Series'}
      </h1>
      <InfiniteMediaGrid
        apiEndpoint={`/api/genre-content?mediaType=${params.mediaType}&genreId=${params.id}`}
        initialResults={data.results} 
        initialPage={data.page}
        initialTotalPages={data.total_pages} />
    </main>
  );
}
