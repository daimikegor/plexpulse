'use client';

import { useEffect, useState } from 'react';
import { PosterImage } from '@/components/PosterImage';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function TrendingSection({ 
  trendingData, 
  heading = "Trending This Week",
  rowId = "trending-row",
  categorySlug
}: { 
  trendingData: any;
  heading?: string;
  rowId?: string;
  categorySlug?: string;
}) {
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  useEffect(() => {
    const row = document.getElementById(rowId);
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
  }, [rowId]);

  const handleScroll = (direction: 'left' | 'right') => {
    const row = document.getElementById(rowId);
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
        {categorySlug ? (
          <Link href={`/category/${categorySlug}`} className="shelf__heading">
            {heading}
            <ChevronRight size={14} className="heading-arrow" />
          </Link>
        ) : (
          <h2 className="shelf__heading">{heading}</h2>
        )}
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
      {trendingData && trendingData.results ? (
        <div className="relative">
          <div 
            className="shelf__row" 
            id={rowId}
          >
            {trendingData.results.map((item: any) => (
              <Link 
                key={item.id} 
                href={`/detail/${item.media_type}/${item.id}`}
                className="ticket-wrap ticket-wrap--compact"
              >
                <div className="ticket ticket--compact">
                  <div className="ticket__poster-wrap">
                    <PosterImage 
                      src={item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : ''} 
                      alt={item.name || item.title}
                      mediaType={item.media_type}
                      tmdbId={String(item.id)}
                      className="ticket__poster"
                      title={item.name || item.title}
                      year={item.release_date ? new Date(item.release_date).getFullYear() : item.first_air_date ? new Date(item.first_air_date).getFullYear() : undefined}
                      overview={item.overview}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-gray-400">Loading trending content...</p>
      )}
    </div>
  );
}
