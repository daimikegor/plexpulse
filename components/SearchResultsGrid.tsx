'use client';

import { useState } from 'react';
import { PosterImage } from '@/components/PosterImage';
import { useRouter } from 'next/navigation';

export function SearchResultsGrid({ items, hideFilters }: { items: any[]; hideFilters?: boolean }) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const filteredItems = activeFilter === 'all' 
    ? items 
    : items.filter(item => item.media_type === activeFilter);

  const handlePosterClick = (item: any) => {
    if (item.media_type === 'person') {
      router.push(`/person/${item.id}`);
    } else {
      setSelectedItem(item);
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  return (
    <div>
      {!hideFilters && (
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
      )}

      <div className="results-grid">
        {filteredItems.map((item) => {
          if (item.media_type === 'person') {
            return (
              <div key={item.id} className="person-card" onClick={() => router.push(`/person/${item.id}`)}>
                {item.profile_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${item.profile_path}`}
                    alt={item.name}
                    className="person-card__photo"
                  />
                ) : (
                  <div className="person-card__photo person-card__photo--fallback">
                    {item.name?.charAt(0)}
                  </div>
                )}
                <p className="person-card__name">{item.name}</p>
              </div>
            );
          }
          
          return (
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
                    title={item.name || item.title}
                    year={item.release_date || item.first_air_date ? new Date(item.release_date || item.first_air_date).getFullYear() : undefined}
                    overview={item.overview}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
