'use client';

import { useState, useEffect, useRef } from 'react';
import { PosterImage } from '@/components/PosterImage';
import Link from 'next/link';

export function InfiniteMediaGrid({
  apiEndpoint,
  initialResults,
  initialPage,
  initialTotalPages,
  showFilter = false
}: {
  apiEndpoint: string;
  initialResults: any[];
  initialPage: number;
  initialTotalPages: number;
  showFilter?: boolean;
}) {
  const [results, setResults] = useState(initialResults);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'movie' | 'tv'>('all');
  
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

  const filteredResults = activeFilter === 'all' ? results :
    results.filter((item: any) => item.media_type === activeFilter);

  return (
    <>
      {showFilter && (
        <div className="filter-toggle">
          <button onClick={() => setActiveFilter('all')} className={`filter-toggle__btn
            ${activeFilter === 'all' ? 'is-active' : ''}`}>All</button>
          <button onClick={() => setActiveFilter('movie')} className={`filter-toggle__btn
            ${activeFilter === 'movie' ? 'is-active' : ''}`}>Movies</button>
          <button onClick={() => setActiveFilter('tv')} className={`filter-toggle__btn
            ${activeFilter === 'tv' ? 'is-active' : ''}`}>Series</button>
        </div>
      )}
      
      <div className="results-grid">
        {filteredResults.map((item: any) => (
          <Link 
            key={item.id} 
            href={`/detail/${item.media_type}/${item.id}`}
            className="ticket-wrap ticket-wrap--compact"
          >
            <div className="ticket ticket--compact">
              <div className="ticket__poster-wrap">
                <PosterImage 
                  src={item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : ''} 
                  alt={item.title || item.name} 
                  tmdbId={String(item.id)}
                  mediaType={item.media_type}
                  title={item.title || item.name}
                  year={item.release_date ? new Date(item.release_date).getFullYear() : item.first_air_date ? new Date(item.first_air_date).getFullYear() : ''}
                  overview={item.overview}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div ref={sentinelRef} />
      
      {isLoading && (
        <p className="empty-state">Loading more...</p>
      )}
    </>
  );
}
