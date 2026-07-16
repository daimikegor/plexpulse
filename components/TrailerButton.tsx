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
  
  const playTrailer = () => {
    if (!videos || videos.length === 0) return;
    
    setIsDisabled(true);
    try {
      const trailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
      if (trailer) {
        window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
      } else {
        // Fallback to first video if no trailer found
        const firstVideo = videos[0];
        if (firstVideo) {
          window.open(`https://www.youtube.com/watch?v=${firstVideo.key}`, '_blank');
        }
      }
    } catch (error) {
      console.error('Error playing trailer:', error);
    } finally {
      setIsDisabled(false);
    }
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