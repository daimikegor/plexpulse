import { getSession } from '@/lib/session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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
  
  return (
    <div className="min-h-screen bg-[#0E1015] text-[#F3F1EA] flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-teal-400">Welcome, {session.username}!</h1>
        <p className="text-lg mb-8">You are successfully logged in to PlexPulse.</p>
        <div className="bg-[#1A1D25] rounded-lg p-6 border border-[#2A2D35]">
          <h2 className="text-xl font-semibold mb-4 text-teal-300">Dashboard</h2>
          <p className="mb-2">PLEX ID: {session.plexId}</p>
          <p className="mb-2">Admin: {session.isAdmin ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
}
