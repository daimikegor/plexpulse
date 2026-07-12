import { getTrendingSeries } from '@/lib/tmdb';
import { requireAuth } from '@/lib/session';
import { TrendingSection } from '@/components/TrendingSection';

export default async function SeriesPage() {
  await requireAuth();
  
  const seriesData = await getTrendingSeries();
  
  return (
    <main>
      <TrendingSection 
        trendingData={seriesData} 
        heading="Trending Series" 
        rowId="series-row" 
      />
    </main>
  );
}
