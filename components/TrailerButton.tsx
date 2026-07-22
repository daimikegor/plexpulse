'use client';

import { useState } from 'react';

export function TrailerButton({ 
  videos,
  className = "inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 mb-6"
}: { 
  videos: any[];
  className?: string;
}) {
  const [isDisabled, setIsDisabled] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  
  const playTrailer = () => {
    if (!videos || videos.length === 0) return;
    
    setIsDisabled(true);
    try {
      const trailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
      if (trailer) {
        setShowTrailer(true);
      } else {
        // Fallback to first video if no trailer found
        const firstVideo = videos[0];
        if (firstVideo) {
          setShowTrailer(true);
        }
      }
    } catch (error) {
      console.error('Error playing trailer:', error);
    } finally {
      setIsDisabled(false);
    }
  };

  const closeTrailer = () => {
    setShowTrailer(false);
  };

  if (!videos || videos.length === 0) {
    return (
      <button 
        className={`${className} cursor-not-allowed opacity-50`}
        disabled
      >
        ▶️ Play Trailer
      </button>
    );
  }

  if (showTrailer) {
    const trailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
    const videoKey = trailer ? trailer.key : videos[0]?.key;
    
    if (!videoKey) return null;
    
    return (
      <div className="relative">
        <button 
          className={`${className} mb-2`}
          onClick={closeTrailer}
        >
          ✕ Close Trailer
        </button>
        <div className="relative pt-[56.25%] mb-4"> {/* 16:9 aspect ratio */}
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoKey}?autoplay=1`}
            title="Trailer"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <button 
      className={className}
      onClick={playTrailer}
      disabled={isDisabled}
    >
      ▶️ Play Trailer
    </button>
  );
}