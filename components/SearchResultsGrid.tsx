'use client';

import { useState } from 'react';
import { PosterImage } from '@/components/PosterImage';
import { DetailModal } from '@/components/DetailModal';

export function SearchResultsGrid({ items, hideFilters }: { items: any[]; hideFilters?: boolean }) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredItems = activeFilter === 'all' 
    ? items 
    : items.filter(item => item.media_type === activeFilter);

  const handlePosterClick = (item: any) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  return (
    <div>
      {!hideFilters && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-teal-500 text-white'
                : 'bg-[#0E1015] text-gray-300 hover:bg-[#2A2D35]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('movie')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'movie'
                ? 'bg-teal-500 text-white'
                : 'bg-[#0E1015] text-gray-300 hover:bg-[#2A2D35]'
            }`}
          >
            Movies
          </button>
          <button
            onClick={() => setActiveFilter('tv')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'tv'
                ? 'bg-teal-500 text-white'
                : 'bg-[#0E1015] text-gray-300 hover:bg-[#2A2D35]'
            }`}
          >
            Series
          </button>
        </div>
      )}

      <div className="results-grid">
        {filteredItems.map((item) => (
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
                  title={item.name || item.title}
                  year={item.release_date || item.first_air_date ? new Date(item.release_date || item.first_air_date).getFullYear() : undefined}
                  overview={item.overview}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
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
