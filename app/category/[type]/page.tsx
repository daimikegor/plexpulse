import { requireAuth } from '@/lib/session';
import { getTrendingPage, getPopularPage, getTopRatedPage, getUpcomingPage } from '@/lib/tmdb';
import { InfiniteMediaGrid } from '@/components/InfiniteMediaGrid';

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
      data = await getTrendingPage(1);
      heading = "Trending This Week";
      break;
    case 'popular':
      data = await getPopularPage(1);
      heading = "Popular";
      break;
    case 'top-rated':
      data = await getTopRatedPage(1);
      heading = "Top Rated";
      break;
    case 'upcoming':
      data = await getUpcomingPage(1);
      heading = "Upcoming & New";
      break;
    default:
      data = { results: [], page: 1, total_pages: 1 };
  }

  return (
    <main>
      <h1 className="search-context-heading">{heading}</h1>
      {data.results.length > 0 ? (
        <InfiniteMediaGrid
          apiEndpoint={`/api/category?type=${params.type}`}
          initialResults={data.results}
          initialPage={data.page}
          initialTotalPages={data.total_pages}
          showFilter={true}
        />
      ) : (
        <p className="empty-state">No results found.</p>
      )}
    </main>
  );
}
