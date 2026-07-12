import { getSession } from '@/lib/session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTrendingContent } from '@/lib/tmdb';

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
        
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-teal-300">Trending This Week</h2>
          {trendingData && trendingData.results ? (
            <div className="flex overflow-x-auto pb-4 space-x-4 scrollbar-hide">
              {trendingData.results.map((item: any) => (
                <div key={item.id} className="flex-shrink-0 w-48">
                  <img 
                    src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} 
                    alt={item.name || item.title}
                    className="w-full h-auto rounded-lg shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-image.jpg';
                    }}
                  />
                  <p className="mt-2 text-sm truncate">{item.name || item.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">Loading trending content...</p>
          )}
        </div>
        
        <div className="bg-[#1A1D25] rounded-lg p-6 border border-[#2A2D35]">
          <h2 className="text-xl font-semibold mb-4 text-teal-300">Dashboard</h2>
          <p className="mb-2">PLEX ID: {session.plexId}</p>
          <p className="mb-2">Admin: {session.isAdmin ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
}
