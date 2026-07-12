'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
        {genres.map((genre) => (
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
                  : undefined
              }}
            >
              <div className="genre-tile__label">{genre.name}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
