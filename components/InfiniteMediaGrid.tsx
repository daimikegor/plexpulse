'use client';

import { useState, useEffect, useRef } from 'react';
import { PosterImage } from '@/components/PosterImage';
import { DetailModal } from '@/components/DetailModal';

export function InfiniteMediaGrid({
  apiEndpoint,
  initialResults,
  initialPage,
  initialTotalPages
}: {
  apiEndpoint: string;
  initialResults: any[];
  initialPage: number;
  initialTotalPages: number;
}) {
  const [results, setResults] = useState(initialResults);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const sentinel = entries[0];
        if (sentinel.isIntersecting && page < totalPages && !isLoading) {
          loadMore();
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [page, totalPages, isLoading]);

  const loadMore = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiEndpoint}&page=${page + 1}`);
      const data = await response.json();
      
      // Filter out duplicates
      const newResults = data.results.filter((newItem: any) => 
        !results.some((existingItem: any) => existingItem.id === newItem.id)
      );
      
      setResults(prev => [...prev, ...newResults]);
      setPage(data.page);
      setTotalPages(data.total_pages);
    } catch (error) {
      console.error('Error loading more content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="results-grid">
        {results.map((item: any) => (
          <div 
            key={item.id} 
            className="ticket-wrap ticket-wrap--compact"
            onClick={() => handleItemClick(item)}
          >
            <div className="ticket ticket--compact">
              <div className="ticket__poster-wrap">
                <PosterImage 
                  src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} 
                  alt={item.title || item.name} 
                  tmdbId={String(item.id)}
                  title={item.title || item.name}
                  year={item.release_date ? new Date(item.release_date).getFullYear() : item.first_air_date ? new Date(item.first_air_date).getFullYear() : ''}
                  overview={item.overview}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div ref={sentinelRef} />
      
      {isLoading && (
        <p className="empty-state">Loading more...</p>
      )}

      {isModalOpen && selectedItem && (
        <DetailModal 
          item={selectedItem} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </>
  );
}
