'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlexPulseIcon } from '@/components/PlexPulseIcon';

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
      `https://app.plex.tv/auth#?clientID=${process.env.NEXT_PUBLIC_PLEX_CLIENT_ID}&code=${code}&forwardUrl=${encodeURIComponent(`${window.location.origin}/api/auth/callback`)}`,
      'PlexAuth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // 3. Poll backend for token approval
    let popupClosedHandled = false;
    const pollInterval = setInterval(async () => {
      if (popup?.closed && !popupClosedHandled) {
        popupClosedHandled = true;
        clearInterval(pollInterval);
        
        // Do a few final checks after popup closes, as Plex may take a moment to finalize the token
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          try {
            const checkRes = await fetch(`/api/auth/check?pinId=${pinId}`);
            const data = await checkRes.json();
            if (data.authenticated) {
              router.push('/dashboard');
              router.refresh();
              return;
            }
          } catch (e) {
            console.error('Final polling error', e);
          }
        }
        setLoading(false);
        return;
      }

      if (popupClosedHandled) return;

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
    setTimeout(() => {
      clearInterval(pollInterval);
      setLoading(false);
    }, 60000);
  };

  return (
    <main className="login-page">
      <div className="login-page__brand">
        <div className="login-page__bulbs"></div>
        <div className="login-page__brand-row">
          <PlexPulseIcon size={40} className="login-page__mark" />
          <h1 className="login-page__title">PlexPulse</h1>
        </div>
        <p className="login-page__tagline">Discover. Request. Watch.</p>
      </div>
      <button
        onClick={handleSignIn}
        disabled={loading}
        className="btn btn--gold login-page__signin-btn"
      >
        {loading ? 'Connecting...' : 'Sign in with Plex'}
      </button>
    </main>
  );
}
