'use client';

import Image from 'next/image';
import { Check, Clock, Film } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tmdbId || !containerRef.current) return;
    let hasFetched = false;

    const fetchStatus = () => {
      if (hasFetched) return;
      hasFetched = true;
      const cacheKey = `${tmdbId}-${mediaType === 'tv' ? 'tv' : 'movie'}`;
      let request = statusRequestCache.get(cacheKey);
      if (!request) {
        request = fetch(`/api/media-status?tmdbId=${tmdbId}&mediaType=${mediaType === 'tv' ? 'tv' : 'movie'}`)
          .then(res => res.json());
        statusRequestCache.set(cacheKey, request);
      }
      request.then(data => setLiveStatus(data.status)).catch(() => setLiveStatus(null));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchStatus();
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [tmdbId, mediaType]);

  useEffect(() => {
    if (requestStatus !== 'success' || !tmdbId) return;
    const mediaTypeParam = mediaType === 'tv' ? 'tv' : 'movie';
    let pollCount = 0;
    const maxPolls = 8; // 8 * 15s = 2 minutes

    const interval = setInterval(() => {
      pollCount++;
      fetch(`/api/media-status?tmdbId=${tmdbId}&mediaType=${mediaTypeParam}&force=1`)
        .then(res => res.json())
        .then(data => {
          setLiveStatus(data.status);
          if (data.status === 'available' || pollCount >= maxPolls) {
            clearInterval(interval);
          }
        })
        .catch(() => {});
      if (pollCount >= maxPolls) clearInterval(interval);
    }, 15000);

    return () => clearInterval(interval);
  }, [requestStatus, tmdbId, mediaType]);

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
    <div ref={containerRef} className="relative group w-full h-full">
      {src ? (
        <Image 
          src={imageSrc} 
          alt={alt}
          fill
          onError={handleError}
          className={`w-full h-full object-cover rounded-lg shadow-lg transition-transform duration-200 ease-in-out hover:scale-105 ${className || ''}`}
        />
      ) : (
        <div className="poster-fallback">
          <Film size={32} />
          <span className="poster-fallback__title">{title}</span>
        </div>
      )}
      
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
                body: JSON.stringify({
                  title, year, mediaType: mediaType === 'tv' ? 'tv' : 'movie',
                  tmdbId, posterPath: src?.includes('/t/p/') ? src.split('/t/p/w342')[1] : null
                })
              });
              setRequestStatus(response.ok ? 'success' : 'error');
            } catch (err) {
              setRequestStatus('error');
            }
          }}
          className={`btn btn--gold poster-overlay__request-btn ${effectiveState === 'available' ? 'is-available' : ''} ${effectiveState === 'requested' ? 'is-requested' : ''} ${effectiveState === 'error' ? 'is-error' : ''}`}
          disabled={effectiveState !== 'idle'}
        >
          {buttonText}
        </button>
      </div>
      
      {mediaType && (
        <div className="media-type-badge" style={{ background: mediaType === 'movie' ? '#1f4fbc' : '#a329bb' }}>
          {mediaType === 'movie' ? 'Movie' : 'Series'}
        </div>
      )}

      {(effectiveState === 'available' || effectiveState === 'requested') && (
        <div className={`poster-status-badge ${effectiveState === 'available' ?
          'poster-status-badge--available' : 'poster-status-badge--requested'}`}>
          {effectiveState === 'available' ? <Check size={14} /> : <Clock size={14} />}
        </div>
      )}
    </div>
  );
}
