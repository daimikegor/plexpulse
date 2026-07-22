'use client';

import Image from 'next/image';
import { Check, Clock, Film } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Batch queue — collects status requests across PosterImage instances and
// fires a single POST /api/media-status/batch every 50ms.
// ---------------------------------------------------------------------------

const BATCH_WINDOW_MS = 50;

interface BatchSubscriber {
  resolve: (data: { status: string }) => void;
  reject: (err: unknown) => void;
}

const batchQueue = new Map<string, BatchSubscriber[]>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;

// In-flight request cache — prevents duplicate batch entries for the same key
// across batch windows (a second PosterImage for the same tmdbId gets the
// cached resolved promise rather than re-enqueuing).
const statusRequestCache = new Map<string, Promise<{ status: string }>>();

async function flushBatch(): Promise<void> {
  batchTimer = null;

  const entries = Array.from(batchQueue.entries());
  batchQueue.clear();

  if (entries.length === 0) return;

  const items = entries.map(([key]) => {
    const dashIdx = key.indexOf('-');
    return {
      tmdbId: key.slice(dashIdx + 1),
      mediaType: key.slice(0, dashIdx) as 'movie' | 'tv',
    };
  });

  try {
    const response = await fetch('/api/media-status/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      // 401, 429, etc. — reject all queued subscribers
      const error = new Error(`Batch request failed: ${response.status}`);
      for (const [, subs] of entries) {
        for (const s of subs) s.reject(error);
      }
      return;
    }

    const data = await response.json();
    const resultMap = new Map<string, string>();
    for (const r of data.results) {
      resultMap.set(`${r.mediaType}-${r.tmdbId}`, r.status);
    }

    for (const [key, subs] of entries) {
      const status = resultMap.get(key) ?? 'none';
      for (const s of subs) s.resolve({ status });
    }
  } catch (err) {
    // Network error — reject all
    for (const [, subs] of entries) {
      for (const s of subs) s.reject(err);
    }
  }
}

function enqueueBatchRequest(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
): Promise<{ status: string }> {
  const key = `${mediaType}-${tmdbId}`;

  // Deduplicate across batch windows: if same key was already requested, reuse
  let cached = statusRequestCache.get(key);
  if (cached) return cached;

  // Create a new promise and queue it
  const promise = new Promise<{ status: string }>((resolve, reject) => {
    const subs = batchQueue.get(key);
    if (subs) {
      subs.push({ resolve, reject });
    } else {
      batchQueue.set(key, [{ resolve, reject }]);
    }
  });

  statusRequestCache.set(key, promise);

  // Schedule flush if not already pending
  if (!batchTimer) {
    batchTimer = setTimeout(flushBatch, BATCH_WINDOW_MS);
  }

  return promise;
}

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
      const mType = mediaType === 'tv' ? 'tv' : 'movie';
      enqueueBatchRequest(tmdbId, mType)
        .then(data => setLiveStatus(data.status as 'none' | 'requested' | 'available'))
        .catch(() => setLiveStatus(null));
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
            e.preventDefault(); // Prevent default navigation behavior
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
              if (response.ok) {
                return; // Prevent further execution after successful request
              }
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
