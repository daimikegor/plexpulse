import { requireAuth } from '@/lib/session';
import { getGenreContent } from '@/lib/tmdb';
import { SearchResultsGrid } from '@/components/SearchResultsGrid';

export default async function GenrePage({
  params,
  searchParams
}: {
  params: { mediaType: string; id: string };
  searchParams: { name?: string };
}) {
  await requireAuth();
  
  const data = await getGenreContent(params.mediaType as 'movie' | 'tv', params.id);
  const genreName = searchParams.name || 'Genre';
  
  return (
    <main>
      <h1 className="search-context-heading">
        {genreName} {params.mediaType === 'movie' ? 'Movies' : 'Series'}
      </h1>
      {data.results.length > 0 ? (
        <SearchResultsGrid items={data.results} hideFilters={true} />
      ) : (
        <p className="empty-state">No results found.</p>
      )}
    </main>
  );
}
