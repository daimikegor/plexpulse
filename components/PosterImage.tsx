'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

const statusRequestCache = new Map<string, Promise<any>>();

export function PosterImage({ 
  src, 
  alt, 
  mediaType, 
  className,
  title,
  year,
  overview,
  tmdbId,
  onRequestClick
}: { 
  src: string; 
  alt: string; 
  mediaType?: 'movie' | 'tv'; 
  className?: string;
  title: string;
  year?: string | number;
  overview?: string;
  tmdbId: string;
  onRequestClick?: () => void;
}) {
  const [imageSrc, setImageSrc] = useState(src);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [liveStatus, setLiveStatus] = useState<'none' | 'requested' | 'available' | null>(null);

  useEffect(() => {
    if (!tmdbId) return;
    const cacheKey = `${tmdbId}-${mediaType === 'tv' ? 'tv' : 'movie'}`;
    let request = statusRequestCache.get(cacheKey);
    if (!request) {
      request = fetch(`/api/media-status?tmdbId=${tmdbId}&mediaType=${mediaType === 'tv' ? 'tv' : 'movie'}`)
        .then(res => res.json());
      statusRequestCache.set(cacheKey, request);
    }
    request.then(data => setLiveStatus(data.status)).catch(() => setLiveStatus(null));
  }, [tmdbId, mediaType]);

  const handleError = () => {
    // Simply hide the broken image by setting display to none
    const imgElement = document.querySelector(`img[src="${src}"]`);
    if (imgElement) {
      (imgElement as HTMLImageElement).style.display = 'none';
    }
  };

  const effectiveState = liveStatus === 'available' ? 'available'
    : (liveStatus === 'requested' || requestStatus === 'success') ? 'requested'
    : requestStatus === 'loading' ? 'loading'
    : requestStatus === 'error' ? 'error'
    : 'idle';

  const buttonText = effectiveState === 'available' ? 'Available'
    : effectiveState === 'requested' ? 'Requested'
    : effectiveState === 'loading' ? 'Requesting...'
    : effectiveState === 'error' ? 'Not Found'
    : 'Request';

  return (
    <div className="relative group">
      <Image 
        src={imageSrc} 
        alt={alt}
        width={342}
        height={513}
        onError={handleError}
        className={`w-full h-auto rounded-lg shadow-lg transition-transform duration-200 ease-in-out hover:scale-105 ${className || ''}`}
      />
      
      <div className="poster-overlay group-hover:opacity-100">
        {year && (
          <div className="poster-overlay__year">
            {year}
          </div>
        )}
        <div className="poster-overlay__title">
          {title}
        </div>
        
        {overview && (
          <p className="poster-overlay__overview">
            {overview}
          </p>
        )}
        
        <button 
          onClick={async (e) => {
            e.stopPropagation();
            if (onRequestClick) {
              onRequestClick();
              return;
            }
            if (requestStatus !== 'idle') return;
            setRequestStatus('loading');
            try {
              const response = await fetch('/api/watchlist/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, year, mediaType: mediaType === 'tv' ? 'tv' : 'movie' })
              });
              setRequestStatus(response.ok ? 'success' : 'error');
            } catch (err) {
              setRequestStatus('error');
            }
          }}
        >
          {buttonText}
        </button>
      </div>
      
      {mediaType && (
        <div className="absolute top-2 left-2 z-10">
          <span className={`text-white text-xs px-2 py-1 rounded-full ${
            mediaType === 'movie' ? 'bg-[#1f4fbc]' : 'bg-[#a329bb]'
          }`}>
            {mediaType === 'movie' ? 'Movie' : 'Series'}
          </span>
        </div>
      )}
    </div>
  );
}
