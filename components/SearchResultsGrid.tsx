'use client';

import { useState } from 'react';
import { PosterImage } from '@/components/PosterImage';
import { DetailModal } from '@/components/DetailModal';

export function SearchResultsGrid({ items }: { items: any[] }) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((item) => (
          <div 
            key={item.id} 
            className="cursor-pointer group"
            onClick={() => handlePosterClick(item)}
          >
            <div className="relative">
              {item.poster_path ? (
                <PosterImage 
                  src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} 
                  alt={item.name || item.title}
                  mediaType={item.media_type}
                />
              ) : (
                <div className="bg-gray-700 rounded-lg w-full h-48 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">No Image</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-white text-sm font-bold text-center px-2">View Details</span>
              </div>
            </div>
            <p className="mt-2 text-sm truncate">{item.name || item.title}</p>
            <p className="text-xs text-gray-400">
              {item.release_date || item.first_air_date ? new Date(item.release_date || item.first_air_date).getFullYear() : ''}
            </p>
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
