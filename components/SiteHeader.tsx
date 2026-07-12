'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Ticket } from 'lucide-react';
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
    <header className="bg-[#1A1D25] p-4 z-50">
      {/* Decorative dotted border */}
      <div className="border-t border-dotted border-amber-500 mb-4"></div>
      
      <div className="max-w-6xl mx-auto text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Ticket size={32} className="text-teal-400" />
          <Link href="/dashboard" className="text-4xl font-bold text-teal-400 hover:text-teal-300 transition-colors">
            PlexPulse
          </Link>
        </div>
        
        <p className="text-gray-400 mb-4">Discover. Request. Watch.</p>
        
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
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
