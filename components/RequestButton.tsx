'use client';

import { useState, useEffect } from 'react';

export function RequestButton({ 
  mediaType, 
  tmdbId, 
  title, 
  year, 
  posterPath,
  initialStatus = 'idle'
}: { 
  mediaType: string; 
  tmdbId: string; 
  title: string; 
  year: number | null;
  posterPath?: string;
  initialStatus?: 'idle' | 'loading' | 'success' | 'error' | 'requested' | 'available';
}) {
  const [requestState, setRequestState] = useState<'idle' | 'loading' | 'success' | 'error' | 'requested' | 'available'>(
    initialStatus === null ? 'idle' : initialStatus
  );

  useEffect(() => {
    // If initial status is not idle, we can assume it's already been requested or is available
    if (initialStatus === 'requested' || initialStatus === 'available') {
      setRequestState(initialStatus);
    }
  }, [initialStatus]);

  const handleRequest = async () => {
    if (requestState !== 'idle') return;
    
    setRequestState('loading');
    
    try {
      const response = await fetch('/api/watchlist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          year,
          mediaType,
          tmdbId,
          posterPath
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setRequestState('success');
        // Note: The page will reload or we would have to trigger a status refresh here
        // For now, the UI will just show success state temporarily but server-side code 
        // should handle real state tracking
      } else {
        console.error('Failed to request:', result.error);
        setRequestState('error');
      }
    } catch (error) {
      console.error('Request error:', error);
      setRequestState('error');
    }
  };

  // Determine button text and styling based on current state
  const getButtonText = () => {
    switch (requestState) {
      case 'idle':
        return '✓ Request';
      case 'loading':
        return '⏳ Requesting...';
      case 'success':
        return '✔️ Requested!';
      case 'error':
        return '❌ Error';
      case 'requested':
        return '✔️ Requested!'; 
      case 'available':
        return '✔️ Available!';
      default:
        return '✓ Request';
    }
  };

  const getButtonClass = () => {
    switch (requestState) {
      case 'idle':
        return 'bg-yellow-500 text-black hover:bg-yellow-400';
      case 'loading':
        return 'bg-gray-600 text-white cursor-not-allowed';
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'requested':
        return 'bg-green-500 text-white';
      case 'available':
        return 'bg-green-500 text-white';
      default:
        return 'bg-yellow-500 text-black hover:bg-yellow-400';
    }
  };

  return (
    <button
      onClick={handleRequest}
      disabled={requestState === 'loading' || requestState === 'requested' || requestState === 'available'}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded font-semibold mb-6 ${getButtonClass()}`}
    >
      {getButtonText()}
    </button>
  );
}