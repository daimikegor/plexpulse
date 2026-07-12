'use client';

import { useEffect } from 'react';
import { PosterImage } from '@/components/PosterImage';

export function TrendingSection({ trendingData }: { trendingData: any }) {
  useEffect(() => {
    const row = document.getElementById('trending-row');
    if (!row) return;

    const leftButton = document.createElement('button');
    leftButton.innerHTML = '&lt;';
    leftButton.className = 'absolute right-12 top-0 w-8 h-8 bg-[#1A1D25] rounded-full flex items-center justify-center text-teal-400 hover:bg-[#2A2D35] transition-colors';
    leftButton.id = 'scroll-left';

    const rightButton = document.createElement('button');
    rightButton.innerHTML = '&gt;';
    rightButton.className = 'absolute right-0 top-0 w-8 h-8 bg-[#1A1D25] rounded-full flex items-center justify-center text-teal-400 hover:bg-[#2A2D35] transition-colors';
    rightButton.id = 'scroll-right';

    row.parentElement?.appendChild(leftButton);
    row.parentElement?.appendChild(rightButton);

    const handleScroll = (direction: 'left' | 'right') => {
      if (row) {
        const scrollAmount = 300;
        if (direction === 'right') {
          row.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        } else {
          row.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }
      }
    };

    leftButton.addEventListener('click', () => handleScroll('left'));
    rightButton.addEventListener('click', () => handleScroll('right'));

    return () => {
      leftButton.remove();
      rightButton.remove();
    };
  }, []);

  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-4 relative">
        <h2 className="text-2xl font-bold text-teal-300">Trending This Week</h2>
      </div>
      {trendingData && trendingData.results ? (
        <div className="relative">
          <div className="flex overflow-x-auto pb-4 space-x-4 scrollbar-hide" id="trending-row">
            {trendingData.results.map((item: any) => (
              <div key={item.id} className="flex-shrink-0 w-48">
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
    </div>
  );
}
