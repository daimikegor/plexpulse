'use client';

import Image from 'next/image';
import { useState } from 'react';

export function PosterImage({ 
  src, 
  alt, 
  mediaType, 
  className,
  title,
  year,
  overview,
  onRequestClick
}: { 
  src: string; 
  alt: string; 
  mediaType?: 'movie' | 'tv'; 
  className?: string;
  title: string;
  year?: string | number;
  overview?: string;
  onRequestClick?: () => void;
}) {
  const [imageSrc, setImageSrc] = useState(src);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleError = () => {
    // Simply hide the broken image by setting display to none
    const imgElement = document.querySelector(`img[src="${src}"]`);
    if (imgElement) {
      (imgElement as HTMLImageElement).style.display = 'none';
    }
  };

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
          className={`btn btn--gold poster-overlay__request-btn ${requestStatus === 'success'
            ? 'is-added' : ''} ${requestStatus === 'error' ? 'is-error' : ''}`}
          disabled={requestStatus === 'loading' || requestStatus === 'success'}
        >
          {requestStatus === 'loading' ? 'Requesting...' : requestStatus === 'success' ? 'Requested' : requestStatus === 'error' ? 'Not Found' : 'Request'}
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
