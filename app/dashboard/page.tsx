import { requireAuth } from '@/lib/session';
import { getTrendingContent, getPopularContent, getTopRatedContent, getUpcomingContent } from '@/lib/tmdb';
import { TrendingSection } from '@/components/TrendingSection';

export default async function Dashboard() {
  const session = await requireAuth();
  
  const [trendingData, popularData, topRatedData, upcomingData] = await Promise.all([
    getTrendingContent(),
    getPopularContent(),
    getTopRatedContent(),
    getUpcomingContent()
  ]);
  
  return (
    <main>
      <TrendingSection trendingData={trendingData} />
      <TrendingSection trendingData={popularData} heading="Popular" rowId="popular-row" />
      <TrendingSection trendingData={topRatedData} heading="Top Rated" rowId="top-rated-row" />
      <TrendingSection trendingData={upcomingData} heading="Upcoming & New" rowId="upcoming-row" />
    </main>
  );
}
