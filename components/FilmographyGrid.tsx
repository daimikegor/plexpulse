'use client';
import { useState } from 'react';
import { FilmographyItem } from '@/components/FilmographyItem';
import Link from 'next/link';

export function FilmographyGrid({ 
  items 
}: { 
  items: any[]; 
}) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'movie' | 'tv'>('all');
  
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
          <Link 
            key={item.id} 
            href={`/detail/${item.media_type}/${item.id}`}
            className="ticket-wrap"
          >
            <FilmographyItem 
              item={item}
            />
          </Link>
        ))}
      </div>
    </>
  );
}