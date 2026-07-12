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
    <header className="marquee">
      <div className="marquee__bulbs"></div>
      
      <div className="marquee__brand">
        <Ticket size={32} className="marquee__mark" />
        <Link href="/dashboard" className="marquee__title">
          PlexPulse
        </Link>
      </div>
      
      <p className="marquee__subtitle">Discover. Request. Watch.</p>
      
      <div className="search-bar">
        <form onSubmit={handleSearch} className="search-bar__row">
          <div className="search-bar__input-wrapper">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, TV shows..."
              id="search-input"
              className="search-bar__input"
            />
            <button 
              type="submit"
              className="search-bar__submit"
            >
              <Search size={20} />
            </button>
          </div>
        </form>
      </div>
    </header>
  );
}
