'use client';

import { useState } from 'react';

export function TrailerButton({ trailerKey }: { trailerKey?: string }) {
  const [showTrailer, setShowTrailer] = useState(false);
  
  const handlePlayTrailer = () => {
    if (trailerKey) {
      setShowTrailer(true);
    }
  };

  if (!showTrailer && !trailerKey) {
    return null;
  }

  if (showTrailer) {
    return (
      <div className="mb-6">
        <button 
          onClick={() => setShowTrailer(false)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 mb-2"
        >
          🔁 Close Trailer
        </button>
        <div className="aspect-video w-full">
          <iframe 
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
            title="Trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full rounded-lg"
          />
        </div>
      </div>
    );
  }

  return (
    <button 
      onClick={handlePlayTrailer}
      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 mb-6"
    >
      ▶️ Play Trailer
    </button>
  );
}