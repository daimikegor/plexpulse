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
    <div className="mb-12">
      <div className="flex justify-between items-center mb-4 relative">
        <h2 className="text-2xl font-bold text-teal-300">Trending This Week</h2>
        {showScrollButtons && (
          <>
            <button 
              onClick={() => handleScroll('left')}
              className="absolute right-12 w-8 h-8 bg-[#1A1D25] rounded-full flex items-center justify-center text-teal-400 hover:bg-[#2A2D35] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => handleScroll('right')}
              className="absolute right-0 w-8 h-8 bg-[#1A1D25] rounded-full flex items-center justify-center text-teal-400 hover:bg-[#2A2D35] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>
      {trendingData && trendingData.results ? (
        <div className="relative">
          <div 
            className="flex overflow-x-auto pb-4 space-x-4 scrollbar-hide" 
            id="trending-row"
          >
            {trendingData.results.map((item: any) => (
              <div 
                key={item.id} 
                className="flex-shrink-0 w-48 relative cursor-pointer"
                onClick={() => handlePosterClick(item)}
              >
                <div className="absolute top-2 left-2 z-10">
                  <span className={`text-white text-xs px-2 py-1 rounded-full ${
                    item.media_type === 'movie' ? 'bg-[#1f4fbc]' : 'bg-[#a329bb]'
                  }`}>
                    {item.media_type === 'movie' ? 'Movie' : 'Series'}
                  </span>
                </div>
                <PosterImage 
                  src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} 
                  alt={item.name || item.title}
                />
                <p className="mt-2 text-sm truncate">{item.name || item.title}</p>
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
