'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type CastMember = {
  id: string;
  name: string;
  character: string;
  profile_path?: string;
};

export function CastSection({
  cast,
  heading = "CAST",
  showNavButtons = true
}: {
  cast: CastMember[];
  heading?: string;
  showNavButtons?: boolean;
}) {
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  useEffect(() => {
    const row = document.getElementById('cast-row');
    if (!row) return;

    // Check if scrolling is needed
    const handleScroll = () => {
      setShowScrollButtons(row.scrollWidth > row.clientWidth);
    };

    // Initial check
    handleScroll();

    // Listen for scroll events
    row.addEventListener('scroll', handleScroll);
    
    // Handle window resize
    window.addEventListener('resize', handleScroll);

    return () => {
      row.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    const row = document.getElementById('cast-row');
    if (!row) return;

    const scrollAmount = 300;
    if (direction === 'right') {
      row.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    } else {
      row.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  if (!cast || cast.length === 0) return null;

  return (
    <div className="shelf">
      <div className="shelf__head">
        <h2 className="shelf__heading">{heading}</h2>
        {showScrollButtons && showNavButtons && (
          <div className="shelf__nav-group">
            <button 
              onClick={() => handleScroll('left')}
              className="shelf__nav"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => handleScroll('right')}
              className="shelf__nav"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
      
      {/* Cast with nav buttons similar to other sections */}
      <div className="relative">
        <div 
          id="cast-row"
          className="flex overflow-x-auto pb-4 space-x-4 scrollbar-hide"
        >
          {cast.slice(0, 20).map((actor: CastMember) => (
            <div key={actor.id} className="text-left flex-shrink-0 w-32">
              <div className="bg-gray-800 rounded-full p-2 mb-2 flex items-center justify-center w-32 h-32">
                {actor.profile_path ? (
                  <img 
                    src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                    alt={actor.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                    {actor.name.charAt(0)}
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-white" title={actor.name}>{actor.name}</h3>
              <p className="text-sm text-gray-400 line-clamp-2" title={actor.character}>{actor.character}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}