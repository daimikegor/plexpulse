import { requireAuth } from '@/lib/session';
import { getTrendingContent, getPopularContent, getTopRatedContent, getUpcomingContent } from '@/lib/tmdb';
import { SearchResultsGrid } from '@/components/SearchResultsGrid';

export default async function CategoryPage({
  params
}: {
  params: { type: string };
}) {
  await requireAuth();
  
  let data;
  let heading = "Not Found";
  
  switch (params.type) {
    case 'trending':
      data = await getTrendingContent();
      heading = "Trending This Week";
      break;
    case 'popular':
      data = await getPopularContent();
      heading = "Popular";
      break;
    case 'top-rated':
      data = await getTopRatedContent();
      heading = "Top Rated";
      break;
    case 'upcoming':
      data = await getUpcomingContent();
      heading = "Upcoming & New";
      break;
    default:
      data = { results: [] };
  }
  
  return (
    <main>
      <h1 className="search-context-heading">{heading}</h1>
      {data.results.length > 0 ? (
        <SearchResultsGrid items={data.results} />
      ) : (
        <p className="empty-state">No results found.</p>
      )}
    </main>
  );
}
