'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const tilePalette = [
  ['rgba(107,36,50,0.55)', 'rgba(58,20,28,0.85)'],   // red
  ['rgba(138,106,31,0.55)', 'rgba(74,56,16,0.85)'],  // gold/amber
  ['rgba(61,16,16,0.55)', 'rgba(26,8,8,0.85)'],      // dark red
  ['rgba(36,64,107,0.55)', 'rgba(20,34,58,0.85)'],   // blue
  ['rgba(122,47,82,0.55)', 'rgba(63,23,42,0.85)'],   // magenta
  ['rgba(31,107,96,0.55)', 'rgba(18,58,51,0.85)'],   // teal
  ['rgba(74,47,107,0.55)', 'rgba(39,26,58,0.85)'],   // purple
  ['rgba(47,107,53,0.55)', 'rgba(26,58,30,0.85)'],   // green
  ['rgba(107,79,36,0.55)', 'rgba(58,42,20,0.85)'],   // orange
  ['rgba(36,90,107,0.55)', 'rgba(20,50,58,0.85)'],   // cyan
];

export function GenreRow({ 
  genres, 
  mediaType, 
  heading 
}: { 
  genres: any[]; 
  mediaType: 'movie' | 'tv'; 
  heading: string; 
}) {
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  useEffect(() => {
    const row = document.getElementById(`${mediaType}-genre-row`);
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
  }, [mediaType]);

  const handleScroll = (direction: 'left' | 'right') => {
    const row = document.getElementById(`${mediaType}-genre-row`);
    if (!row) return;

    const scrollAmount = 300;
    if (direction === 'right') {
      row.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    } else {
      row.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="shelf">
      <div className="shelf__head">
        <h2 className="shelf__heading">{heading}</h2>
        {showScrollButtons && (
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
      <div 
        id={`${mediaType}-genre-row`} 
        className="shelf__row shelf__row--genre-tiles"
      >
        {genres.map((genre) => {
          const [tintStart, tintEnd] = tilePalette[genre.id % tilePalette.length];
          return (
            <Link 
              key={genre.id} 
              href={`/genre/${mediaType}/${genre.id}?name=${encodeURIComponent(genre.name)}`}
              className="genre-tile"
            >
              <div 
                className="genre-tile__image"
                style={{
                  backgroundImage: genre.backdrop_path 
                    ? `url(https://image.tmdb.org/t/p/w500${genre.backdrop_path})` 
                    : undefined,
                  '--tile-tint-1': tintStart,
                  '--tile-tint-2': tintEnd
                } as React.CSSProperties}
              >
                <div className="genre-tile__label">{genre.name}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
