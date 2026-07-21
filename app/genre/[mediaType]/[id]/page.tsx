import { requireAuth } from '@/lib/session';
import { getGenreContentPage } from '@/lib/tmdb';
import { InfiniteMediaGrid } from '@/components/InfiniteMediaGrid';

export default async function GenrePage({
  params,
  searchParams
}: {
  params: Promise<{ mediaType: string; id: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  await requireAuth();

  const { mediaType, id } = await params;
  const { name: genreName } = await searchParams;

  const data = await getGenreContentPage(mediaType as 'movie' | 'tv', id, 1);
  const displayName = genreName || 'Genre';
  
  return (
    <main>
      <h1 className="search-context-heading">
        {displayName} {mediaType === 'movie' ? 'Movies' : 'Series'}
      </h1>
      <InfiniteMediaGrid
        apiEndpoint={`/api/genre-content?mediaType=${mediaType}&genreId=${id}`}
        initialResults={data.results} 
        initialPage={data.page}
        initialTotalPages={data.total_pages} />
    </main>
  );
}
