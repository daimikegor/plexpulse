'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import Link from 'next/link';

export function SiteHeader() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}&type=all`);
    }
  };

  return (
    <header className="bg-[#1A1D25] border-b border-[#2A2D35] p-4 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-4">
        <Link href="/dashboard" className="text-2xl font-bold text-teal-400 hover:text-teal-300 transition-colors">
          PlexPulse
        </Link>
        
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
              <Search size={20} />
            </button>
            <button 
              type="button"
              onClick={handleSearch}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
            >
              <Search size={20} />
            </button>
          </div>
        </form>
      </div>
    </header>
  );
}
