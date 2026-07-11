'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Landing() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async () => {
    setLoading(true);
    
    // 1. Request PIN from backend
    const startRes = await fetch('/api/auth/start', { method: 'POST' });
    const { pinId, code } = await startRes.json();
    
    if (!pinId) {
      alert('Failed to initiate login');
      setLoading(false);
      return;
    }

    // 2. Open Plex Auth Popup
    const width = 600, height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const popup = window.open(
      `https://app.plex.tv/auth#?clientID=${process.env.NEXT_PUBLIC_PLEX_CLIENT_ID}&code=${code}&forwardUrl=${window.location.origin}/api/auth/callback`,
      'PlexAuth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // 3. Poll backend for token approval
    const pollInterval = setInterval(async () => {
      if (popup?.closed) {
        clearInterval(pollInterval);
        setLoading(false);
        return;
      }
      
      try {
        const checkRes = await fetch(`/api/auth/check?pinId=${pinId}`);
        const data = await checkRes.json();
        
        if (data.authenticated) {
          clearInterval(pollInterval);
          router.push('/dashboard');
          router.refresh();
        }
      } catch (e) {
        console.error('Polling error', e);
      }
    }, 2000);

    // Safety timeout after 60 seconds
    setTimeout(() => clearInterval(pollInterval), 60000);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-5xl font-bold tracking-tight mb-2 bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">
        PlexPulse
      </h1>
      <p className="text-gray-400 mb-8">Discover. Request. Watch.</p>
      <button 
        onClick={handleSignIn}
        disabled={loading}
        className="px-6 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-teal-500/20"
      >
        {loading ? 'Connecting...' : 'Sign in with Plex'}
      </button>
    </main>
  );
}
