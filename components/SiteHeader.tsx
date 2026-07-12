'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function SiteHeader() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}&type=${activeFilter}`);
    }
  };

  return (
    <header className="bg-[#1A1D25] border-b border-[#2A2D35] p-4 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-4">
        <h1 className="text-2xl font-bold text-teal-400">PlexPulse</h1>
        
        <form onSubmit={handleSearch} className="flex-1 w-full max-w-2xl">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, TV shows..."
              className="w-full bg-[#0E1015] border border-[#2A2D35] rounded-lg py-2 px-4 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button 
              type="submit"
              className="absolute left-3 top-2.5 text-gray-400 hover:text-white"
            >
              🔍
            </button>
          </div>
        </form>

        <div className="flex gap-2">
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
      </div>
    </header>
  );
}
