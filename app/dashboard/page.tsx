import { getSession } from '@/lib/session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTrendingContent } from '@/lib/tmdb';
import { TrendingSection } from '@/components/TrendingSection';

export default async function Dashboard() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  
  if (!sessionToken) {
    redirect('/');
  }
  
  const session = await getSession(sessionToken);
  
  if (!session) {
    redirect('/');
  }
  
  const trendingData = await getTrendingContent();
  
  return (
    <div className="min-h-screen bg-[#0E1015] text-[#F3F1EA] flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-teal-400">Welcome, {session.username}!</h1>
        <p className="text-lg mb-8">You are successfully logged in to PlexPulse.</p>
        
        <TrendingSection trendingData={trendingData} />
      </div>
    </div>
  );
}
