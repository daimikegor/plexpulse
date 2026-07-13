'use client';
import { useState } from 'react';
import { FilmographyItem } from '@/components/FilmographyItem';
import { DetailModal } from '@/components/DetailModal';
export function FilmographyGrid({ 
  items 
}: { 
  items: any[]; 
}) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'movie' | 'tv'>('all');
  
  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };
  
  const filteredItems = activeFilter === 'all' 
    ? items 
    : items.filter(item => item.media_type === activeFilter);

  return (
    <>
      <div className="filter-toggle">
        <button
          onClick={() => setActiveFilter('all')}
          className={`filter-toggle__btn ${activeFilter === 'all' ? 'is-active' : ''}`}
        >
          All
        </button>
        <button
          onClick={() => setActiveFilter('movie')}
          className={`filter-toggle__btn ${activeFilter === 'movie' ? 'is-active' : ''}`}
        >
          Movies
        </button>
        <button
          onClick={() => setActiveFilter('tv')}
          className={`filter-toggle__btn ${activeFilter === 'tv' ? 'is-active' : ''}`}
        >
          Series
        </button>
      </div>
      
      <div className="results-grid">
        {filteredItems.map((item: any) => (
          <FilmographyItem 
            key={item.id} 
            item={item}
            onClick={() => handleItemClick(item)}
          />
        ))}
      </div>
      
      {isModalOpen && selectedItem && (
        <DetailModal 
          item={selectedItem} 
          isOpen={isModalOpen} 
          onClose={closeModal} 
        />
      )}
    </>
  );
}
