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
  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };
  return (
    <>
      <div className="results-grid">
        {items.map((item: any) => (
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
