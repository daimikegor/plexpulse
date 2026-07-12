import { requireAuth } from '@/lib/session';
import { getTrendingContent } from '@/lib/tmdb';
import { TrendingSection } from '@/components/TrendingSection';

export default async function Dashboard() {
  const session = await requireAuth();
  
  const trendingData = await getTrendingContent();
  
  return (
    <div className="min-h-screen bg-[#0E1015] text-[#F3F1EA] p-4">
      <div className="max-w-4xl mx-auto">
        
        <TrendingSection trendingData={trendingData} />
      </div>
    </div>
  );
}
