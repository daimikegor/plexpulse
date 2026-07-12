import { requireAuth } from '@/lib/session';
import { getTrendingContent } from '@/lib/tmdb';
import { TrendingSection } from '@/components/TrendingSection';

export default async function Dashboard() {
  const session = await requireAuth();
  
  const trendingData = await getTrendingContent();
  
  return (
    <main>
      <TrendingSection trendingData={trendingData} />
    </main>
  );
}
