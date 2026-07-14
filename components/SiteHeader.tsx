'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Menu } from 'lucide-react';

export function SiteHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}&type=all`);
    }
  };

  return (
    <div className="top-search-bar">
      <div className="search-bar">
        <button className="mobile-menu-btn" onClick={onMenuClick} aria-label="Open menu">
          <Menu size={22} />
        </button>
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
    </div>
  );
}
