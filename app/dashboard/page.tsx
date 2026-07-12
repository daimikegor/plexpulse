import { requireAuth } from '@/lib/session';
import { getTrendingContent } from '@/lib/tmdb';
import { TrendingSection } from '@/components/TrendingSection';

export default async function Dashboard() {
  const session = await requireAuth();
  
  const trendingData = await getTrendingContent();
  
  return (
    <div className="min-h-screen bg-[#0E1015] text-[#F3F1EA] p-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-teal-400">Welcome, {session.username}!</h1>
        <p className="text-lg mb-8">You are successfully logged in to PlexPulse.</p>
        
        <TrendingSection trendingData={trendingData} />
      </div>
    </div>
  );
}
