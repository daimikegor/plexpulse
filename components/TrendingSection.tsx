'use client';

import { useEffect, useState } from 'react';
import { PosterImage } from '@/components/PosterImage';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DetailModal } from '@/components/DetailModal';

export function TrendingSection({ trendingData }: { trendingData: any }) {
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const row = document.getElementById('trending-row');
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
    const row = document.getElementById('trending-row');
    if (!row) return;

    const scrollAmount = 300;
    if (direction === 'right') {
      row.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    } else {
      row.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const handlePosterClick = (item: any) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  return (
    <div className="shelf">
      <div className="shelf__head">
        <h2 className="shelf__heading">Trending This Week</h2>
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
            id="trending-row"
          >
            {trendingData.results.map((item: any) => (
              <div 
                key={item.id} 
                className="ticket-wrap ticket-wrap--compact"
                onClick={() => handlePosterClick(item)}
              >
                <div className="ticket ticket--compact">
                  <div className="ticket__poster-wrap">
                    <PosterImage 
                      src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} 
                      alt={item.name || item.title}
                      mediaType={item.media_type}
                      className="ticket__poster"
                    />
                  </div>
                  <div className="ticket__stub">
                    <p className="ticket__title">
                      {item.name || item.title}
                      {(item.release_date || item.first_air_date) &&
                        ` (${new Date(item.release_date || item.first_air_date).getFullYear()})`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-gray-400">Loading trending content...</p>
      )}
      
      {isModalOpen && selectedItem && (
        <DetailModal 
          item={selectedItem} 
          isOpen={isModalOpen} 
          onClose={closeModal} 
        />
      )}
    </div>
  );
}
